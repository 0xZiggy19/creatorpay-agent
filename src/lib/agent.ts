import "server-only";
import { generateText, tool, isStepCount, type ModelMessage } from "ai";
import { z } from "zod";
import { getModel } from "./ai";
import { listInvoices, getInvoice } from "./paypal";
import { fallbackRespond } from "./fallback";
import { todayISO, weekdayName } from "./dates";
import type { AgentResponse, InvoiceDraft, InvoiceSummary } from "./types";

const itemSchema = z.object({
  name: z.string().describe("Short line-item name, e.g. 'Sponsored X post'"),
  description: z.string().optional().describe("Optional extra detail for the line item"),
  quantity: z.number().positive().describe("Number of units (posts, videos, hours...)"),
  unitAmount: z.number().nonnegative().describe("Price per unit. If the user gave a total for N units, divide by N."),
});

const draftSchema = z.object({
  recipientName: z.string().describe("Client contact or company name"),
  recipientEmail: z.string().describe("Client billing email address"),
  businessName: z.string().optional().describe("Client company name, if known"),
  currency: z.string().length(3).describe("ISO 4217 code, default USD"),
  items: z.array(itemSchema).min(1),
  dueDate: z.string().describe("Due date as YYYY-MM-DD, resolved relative to today's date"),
  note: z.string().optional().describe("Short friendly note to the client shown on the invoice"),
});

function systemPrompt() {
  const today = todayISO();
  return `You are CreatorPay Agent, an invoicing assistant for content creators and freelancers (KOLs, X/Twitter creators, YouTubers, designers).
Today is ${weekdayName(today)}, ${today}. Resolve relative dates ("Friday", "next week", "net 30", "end of month") against today. "Friday" means the next upcoming Friday.

You manage real PayPal invoices through tools:
- prepare_invoice: when the user wants to bill someone. Extract recipient, email, line items, currency (default USD), due date (default 14 days from today if not given) and write a short warm note.
  If the user gives a total for N units, set quantity=N and unitAmount=total/N. Never invent an email address: if it's missing, ask for it instead of calling the tool.
  This only prepares a preview; the user confirms in the UI before it is created and sent via PayPal.
- list_invoices: to answer anything about invoice status, who has/hasn't paid, totals, overdue clients, or before writing a reminder.
- prepare_reminder: to draft a polite payment reminder for an unpaid invoice (call list_invoices first to get the invoiceId). Write a warm, professional, concise note (3-5 sentences) in the creator's voice, mentioning the invoice number, amount and due date. The user reviews it, then it's sent through PayPal's reminder endpoint.

Keep replies short, friendly and skimmable (bullets for lists, amounts with currency). Don't repeat everything the preview card already shows.`;
}

export async function runAgent(messages: { role: "user" | "assistant"; content: string }[]): Promise<AgentResponse> {
  const m = getModel();
  if (!m) {
    const last = [...messages].reverse().find((x) => x.role === "user")?.content ?? "";
    return fallbackRespond(last, await listInvoices());
  }

  let draft: InvoiceDraft | undefined;
  let invoices: InvoiceSummary[] | undefined;
  let reminder: AgentResponse["reminder"];
  const toolsUsed: string[] = [];

  const tools = {
    prepare_invoice: tool({
      description: "Prepare a structured invoice preview from the user's request. Does not send anything.",
      inputSchema: draftSchema,
      execute: async (input) => {
        toolsUsed.push("prepare_invoice");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.recipientEmail)) return { ok: false, error: "Invalid or missing email; ask the user for it." };
        draft = { ...input, currency: input.currency.toUpperCase() };
        const total = input.items.reduce((s, i) => s + i.quantity * i.unitAmount, 0);
        return { ok: true, total, dueDate: input.dueDate, message: "Preview shown to the user for confirmation." };
      },
    }),
    list_invoices: tool({
      description: "List the creator's PayPal invoices with live status, amounts due and overdue flags.",
      inputSchema: z.object({
        filter: z.enum(["all", "unpaid", "overdue", "paid"]).describe("unpaid = sent but not paid yet"),
      }),
      execute: async ({ filter }) => {
        toolsUsed.push("list_invoices");
        const all = await listInvoices();
        const open = ["SENT", "UNPAID", "PARTIALLY_PAID", "SCHEDULED"];
        const res = all.filter((i) =>
          filter === "all" ? true : filter === "paid" ? ["PAID", "MARKED_AS_PAID"].includes(String(i.status)) : filter === "overdue" ? i.overdue : open.includes(String(i.status))
        );
        if (filter !== "all") invoices = res;
        return res.map((i) => ({
          invoiceId: i.id,
          number: i.number,
          client: i.recipientName,
          company: i.businessName,
          email: i.recipientEmail,
          status: i.status,
          total: `${i.currency} ${i.total.toFixed(2)}`,
          amountDue: `${i.currency} ${i.amountDue.toFixed(2)}`,
          dueDate: i.dueDate,
          daysOverdue: i.daysOverdue,
        }));
      },
    }),
    prepare_reminder: tool({
      description: "Prepare a payment reminder (subject + note) for one unpaid invoice. The user confirms before it is sent via PayPal.",
      inputSchema: z.object({
        invoiceId: z.string(),
        subject: z.string().describe("Email subject line"),
        note: z.string().describe("The reminder message body"),
      }),
      execute: async ({ invoiceId, subject, note }) => {
        toolsUsed.push("prepare_reminder");
        const inv = await getInvoice(invoiceId);
        reminder = { invoiceId: inv.id, invoiceNumber: inv.number, recipientName: inv.recipientName, subject, note };
        return { ok: true, message: "Reminder shown to the user for review." };
      },
    }),
  };

  const result = await generateText({
    model: m.model,
    system: systemPrompt(),
    messages: messages as ModelMessage[],
    tools,
    stopWhen: isStepCount(6),
  });

  return {
    reply: result.text || (draft ? "Here's your invoice preview — confirm to send it via PayPal." : "Done."),
    draft,
    invoices,
    reminder,
    toolsUsed: [...new Set(toolsUsed)],
    engine: `${m.provider} · ${m.modelId}`,
  };
}
