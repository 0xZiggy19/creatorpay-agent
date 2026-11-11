import type { AgentResponse, InvoiceDraft, InvoiceSummary } from "./types";
import { addDays, todayISO, weekdayName } from "./dates";

/**
 * Deterministic, rule-based stand-in for the LLM. Only used when no AI key is configured,
 * so the UI can be developed and demoed offline. The real agent lives in agent.ts.
 */

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function parseDueDate(text: string, today = todayISO()): string {
  const t = text.toLowerCase();
  let m;
  if ((m = t.match(/net\s*(\d{1,3})/))) return addDays(today, Number(m[1]));
  if ((m = t.match(/in\s+(\d{1,3})\s*(day|week)s?/))) return addDays(today, Number(m[1]) * (m[2] === "week" ? 7 : 1));
  if (/due\s+tomorrow|by\s+tomorrow/.test(t)) return addDays(today, 1);
  if (/due\s+today|by\s+today/.test(t)) return today;
  if (/next\s+week/.test(t)) return addDays(today, 7);
  if (/end of (the )?month/.test(t)) {
    const d = new Date(today + "T12:00:00");
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
  }
  if ((m = t.match(/(\d{4})-(\d{2})-(\d{2})/))) return m[0];
  if ((m = t.match(new RegExp(`(${MONTHS.join("|")})[a-z]*\\.?\\s+(\\d{1,2})`)))) {
    const year = Number(today.slice(0, 4));
    const mm = MONTHS.indexOf(m[1]) + 1;
    let iso = `${year}-${String(mm).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
    if (iso < today) iso = `${year + 1}${iso.slice(4)}`;
    return iso;
  }
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`(next\\s+)?${WEEKDAYS[i]}`).test(t)) {
      const cur = new Date(today + "T12:00:00").getDay();
      let diff = (i - cur + 7) % 7 || 7;
      if (new RegExp(`next\\s+${WEEKDAYS[i]}`).test(t) && diff < 7) diff += 7;
      return addDays(today, diff);
    }
  }
  return addDays(today, 14);
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseInvoice(text: string): { draft?: InvoiceDraft; missing: string[] } {
  const missing: string[] = [];
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0]?.replace(/[.,]$/, "");
  if (!email) missing.push("the client's email");

  let currency = "USD";
  if (/€|\beur\b/i.test(text)) currency = "EUR";
  else if (/£|\bgbp\b/i.test(text)) currency = "GBP";
  else if (/\bcad\b/i.test(text)) currency = "CAD";

  const amtMatch = text.match(/[$€£]\s?(\d[\d,]*(?:\.\d{1,2})?)\s*(k)?/i) || text.match(/(\d[\d,]*(?:\.\d{1,2})?)\s*(k)?\s*(?:usd|eur|gbp|cad|dollars)/i) || text.match(/\b(\d[\d,]*(?:\.\d{1,2})?)\s*(k)\b/i);
  const amount = amtMatch ? Number(amtMatch[1].replace(/,/g, "")) * (amtMatch[2] ? 1000 : 1) : NaN;
  const each = /\beach\b|\bper\b|\/\s?(post|video|hour|thread)/i.test(text);
  if (!amount) missing.push("the amount");

  // recipient: "Invoice Acme Corp, ..." / "Bill Acme Corp for ..."
  const recMatch = text.match(/(?:invoice|bill|charge)\s+(?:to\s+)?([A-Z0-9][\w&.' -]*?)(?=\s*(?:,|\(|<|\bat\b|\bfor\b|\$|€|£|\d|$))/i);
  const recipientRaw = recMatch?.[1]?.trim() || (email ? titleCase(email.split("@")[1].split(".")[0]) : "");
  if (!recipientRaw) missing.push("who to bill");

  // item: "for 2 sponsored X posts" / "for a YouTube integration"
  const forMatch = text.match(/for\s+(?:(\d+)\s+|an?\s+)?([^,.$€£]+?)(?=\s*(?:,|\.|\bdue\b|\bby\b|\bnet\b|$|\$))/i);
  let qty = forMatch?.[1] ? Number(forMatch[1]) : 1;
  let itemName = forMatch?.[2]?.trim() || "Creator services";
  if (/^\$|^\d/.test(itemName)) itemName = "Creator services";
  if (!Number.isFinite(qty) || qty < 1) qty = 1;
  itemName = itemName.charAt(0).toUpperCase() + itemName.slice(1);
  const unit = each ? amount : amount / qty;

  if (missing.length) return { missing };
  const noteMatch = text.match(/note[:\s]+"?([^"]+)"?$/i);
  return {
    missing,
    draft: {
      recipientName: recipientRaw,
      recipientEmail: email!,
      businessName: recipientRaw,
      currency,
      items: [{ name: itemName, quantity: qty, unitAmount: Math.round(unit * 100) / 100 }],
      dueDate: parseDueDate(text),
      note: noteMatch?.[1] || `Thanks for the collab, ${recipientRaw}! Payment can be made securely via PayPal.`,
    },
  };
}

export async function fallbackRespond(text: string, loadInvoices: () => Promise<InvoiceSummary[]>, engine = "Rule-based fallback (no AI key)"): Promise<AgentResponse> {
  const t = text.toLowerCase();
  const needsInvoices = /remind|nudge|follow up|chase/.test(t) || (/who|unpaid|hasn'?t paid|haven'?t paid|owe|overdue|outstanding|status|list|show|pending|paid me/.test(t) && !/@/.test(t));
  const invoices = needsInvoices ? await loadInvoices() : [];
  const fmt = (i: InvoiceSummary) => `${i.currency} ${i.amountDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  if (/remind|nudge|follow up|chase/.test(t)) {
    const open = invoices.filter((i) => i.overdue || ["SENT", "UNPAID", "PARTIALLY_PAID"].includes(String(i.status)));
    const target = open.find((i) => t.includes(i.recipientName.toLowerCase().split(" ")[0]) || (i.businessName && t.includes(i.businessName.toLowerCase()))) || [...open].sort((a, b) => b.daysOverdue - a.daysOverdue)[0];
    if (!target) return { reply: "Everyone's paid up — there's nothing to remind anyone about. 🎉", toolsUsed: ["list_invoices"], engine };
    const first = target.recipientName.split(" ")[0];
    return {
      reply: `Here's a friendly reminder for ${target.recipientName} (${target.number}, ${fmt(target)}${target.overdue ? `, ${target.daysOverdue} days overdue` : ""}). Review it and hit send — PayPal will email it with the pay link.`,
      reminder: {
        invoiceId: target.id,
        invoiceNumber: target.number,
        recipientName: target.recipientName,
        subject: `Friendly reminder: invoice ${target.number}`,
        note: `Hi ${first},\n\nHope you're well! Just a quick nudge that invoice ${target.number} for ${fmt(target)}${target.dueDate ? ` was due on ${target.dueDate}` : ""}. You can pay securely in a couple of clicks via the PayPal link.\n\nThanks again for the collab — let me know if you need anything from my side.`,
      },
      toolsUsed: ["list_invoices", "prepare_reminder"],
      engine,
    };
  }

  if (/who|unpaid|hasn'?t paid|haven'?t paid|owe|overdue|outstanding|status|list|show|pending|paid me/.test(t) && !/@/.test(t)) {
    const open = invoices.filter((i) => ["SENT", "UNPAID", "PARTIALLY_PAID", "SCHEDULED"].includes(String(i.status)));
    const overdue = open.filter((i) => i.overdue);
    const totalOpen = open.reduce((s, i) => s + i.amountDue, 0);
    const lines = open.map((i) => `• ${i.recipientName} — ${fmt(i)} (${i.number}) ${i.overdue ? `⚠️ ${i.daysOverdue}d overdue` : `due ${i.dueDate}`}`);
    return {
      reply: open.length
        ? `${open.length} client${open.length > 1 ? "s haven't" : " hasn't"} paid yet — $${totalOpen.toLocaleString("en-US")} outstanding, ${overdue.length} overdue:\n${lines.join("\n")}${overdue.length ? "\n\nWant me to draft a reminder for the overdue ones?" : ""}`
        : "Everyone has paid. 🎉",
      invoices: open,
      toolsUsed: ["list_invoices"],
      engine,
    };
  }

  const { draft, missing } = parseInvoice(text);
  if (!draft) {
    return {
      reply: `I can turn that into an invoice — I just need ${missing.join(" and ")}. Try: "Invoice Acme Corp, billing@acme.com, $500 for 2 sponsored X posts, due Friday."`,
      toolsUsed: [],
      engine,
    };
  }
  const total = draft.items.reduce((s, i) => s + i.quantity * i.unitAmount, 0);
  return {
    reply: `Got it — here's the invoice for ${draft.recipientName}: ${draft.currency} ${total.toFixed(2)}, due ${weekdayName(draft.dueDate)} ${draft.dueDate}. Check the details and hit **Create & send via PayPal**.`,
    draft,
    toolsUsed: ["prepare_invoice"],
    engine,
  };
}
