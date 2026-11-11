import "server-only";
import type { InvoiceDraft, InvoiceSummary, InvoiceItemInput } from "./types";
import { addDays, daysBetween, todayISO } from "./dates";

/**
 * PayPal Invoicing v2 client.
 * - Real mode: PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET set -> talks to the sandbox (or PAYPAL_API_BASE).
 * - Mock mode: creds missing -> an in-memory store with the same interface, so the UI works offline.
 */

const BASE = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";
if (!BASE.includes("sandbox") && process.env.PAYPAL_ALLOW_LIVE !== "true") {
  throw new Error("Refusing to use the live PayPal API. Set PAYPAL_ALLOW_LIVE=true if you really mean to send real invoices.");
}

export function paypalMode(): "sandbox" | "mock" {
  return process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET ? "sandbox" : "mock";
}

export class PayPalError extends Error {
  constructor(message: string, public status?: number, public details?: unknown) {
    super(message);
  }
}

// ---------------------------------------------------------------- OAuth
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.token;
  const id = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await safeJson(res)) as { error?: string; error_description?: string } | null;
    const hint =
      body?.error === "invalid_client" && BASE.includes("sandbox")
        ? " — these credentials were rejected by the sandbox. Make sure you copied the Client ID/Secret from the *Sandbox* tab in developer.paypal.com (live keys don't work against the sandbox)."
        : "";
    throw new PayPalError(`PayPal auth failed (${res.status}${body?.error ? ` ${body.error}` : ""})${hint}`, res.status, body);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function pp<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}, retried = false): Promise<T> {
  const token = await getAccessToken();
  const { json, headers, ...rest } = init;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(headers || {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  const body = await safeJson(res);
  // A cached token may predate a scope change (e.g. Invoicing just enabled on the app): refresh once.
  if ((res.status === 401 || res.status === 403) && !retried) {
    cachedToken = null;
    return pp<T>(path, init, true);
  }
  if (!res.ok) {
    if (res.status === 403 && (body as { name?: string } | null)?.name === "NOT_AUTHORIZED") {
      throw new PayPalError(
        "PayPal 403 NOT_AUTHORIZED: this REST app doesn't have the Invoicing permission. In developer.paypal.com → Apps & Credentials (Sandbox) → your app → Features, tick \"Invoicing\" and save, then retry.",
        403,
        body
      );
    }
    const b = body as { message?: string; details?: { issue?: string; description?: string }[] } | null;
    const detail = b?.details?.[0]?.description || b?.details?.[0]?.issue;
    throw new PayPalError(`PayPal ${res.status}: ${b?.message || "request failed"}${detail ? ` — ${detail}` : ""}`, res.status, body);
  }
  return body as T;
}

// ---------------------------------------------------------------- Mapping
/* eslint-disable @typescript-eslint/no-explicit-any */
function splitName(full: string): { given_name: string; surname?: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { given_name: parts[0] };
  return { given_name: parts.slice(0, -1).join(" "), surname: parts[parts.length - 1] };
}

function money(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function withOverdue(s: Omit<InvoiceSummary, "overdue" | "daysOverdue">): InvoiceSummary {
  const openStatuses = ["SENT", "UNPAID", "PARTIALLY_PAID", "SCHEDULED"];
  const days = s.dueDate ? daysBetween(s.dueDate, todayISO()) : 0;
  const overdue = openStatuses.includes(String(s.status)) && days > 0;
  return { ...s, overdue, daysOverdue: overdue ? days : 0 };
}

function fromPayPal(inv: any): InvoiceSummary {
  const r = inv.primary_recipients?.[0]?.billing_info ?? {};
  const name =
    r.name?.full_name || [r.name?.given_name, r.name?.surname].filter(Boolean).join(" ") || r.business_name || r.email_address || "Unknown";
  const items: InvoiceItemInput[] = (inv.items ?? []).map((it: any) => ({
    name: it.name,
    description: it.description,
    quantity: Number(it.quantity ?? 1),
    unitAmount: Number(it.unit_amount?.value ?? 0),
  }));
  const total = Number(inv.amount?.value ?? inv.amount?.breakdown?.item_total?.value ?? 0);
  const due = inv.due_amount?.value !== undefined ? Number(inv.due_amount.value) : total;
  return withOverdue({
    id: inv.id,
    number: inv.detail?.invoice_number ?? inv.id,
    status: inv.status,
    recipientName: name,
    recipientEmail: r.email_address ?? "",
    businessName: r.business_name,
    currency: inv.detail?.currency_code ?? inv.amount?.currency_code ?? "USD",
    total,
    amountDue: ["PAID", "MARKED_AS_PAID"].includes(inv.status) ? 0 : due,
    invoiceDate: inv.detail?.invoice_date,
    dueDate: inv.detail?.payment_term?.due_date,
    note: inv.detail?.note,
    items,
    payerViewUrl: inv.detail?.metadata?.recipient_view_url,
  });
}

function toPayPalBody(d: InvoiceDraft, invoiceNumber?: string) {
  const invoicerName = process.env.PAYPAL_INVOICER_NAME;
  const invoicerBusiness = process.env.PAYPAL_INVOICER_BUSINESS;
  return {
    detail: {
      ...(invoiceNumber ? { invoice_number: invoiceNumber } : {}),
      invoice_date: todayISO(),
      currency_code: d.currency.toUpperCase(),
      note: d.note || undefined,
      memo: d.memo || "Created by CreatorPay Agent",
      payment_term: { due_date: d.dueDate },
    },
    ...(invoicerName || invoicerBusiness
      ? {
          invoicer: {
            ...(invoicerName ? { name: splitName(invoicerName) } : {}),
            ...(invoicerBusiness ? { business_name: invoicerBusiness } : {}),
          },
        }
      : {}),
    primary_recipients: [
      {
        billing_info: {
          name: splitName(d.recipientName),
          email_address: d.recipientEmail,
          ...(d.businessName ? { business_name: d.businessName } : {}),
        },
      },
    ],
    items: d.items.map((it) => ({
      name: it.name.slice(0, 200),
      ...(it.description ? { description: it.description.slice(0, 1000) } : {}),
      quantity: String(it.quantity),
      unit_amount: { currency_code: d.currency.toUpperCase(), value: money(it.unitAmount) },
      unit_of_measure: "QUANTITY",
    })),
    configuration: { allow_tip: true },
  };
}

// ---------------------------------------------------------------- Mock store
type MockStore = { invoices: InvoiceSummary[]; seq: number };
const g = globalThis as unknown as { __creatorpayMock?: MockStore };

function mockStore(): MockStore {
  if (!g.__creatorpayMock) {
    const t = todayISO();
    const seed = (
      n: number,
      status: string,
      name: string,
      email: string,
      biz: string,
      items: InvoiceItemInput[],
      invoiceDate: string,
      dueDate: string,
      note?: string
    ): InvoiceSummary => {
      const total = items.reduce((s, i) => s + i.quantity * i.unitAmount, 0);
      return withOverdue({
        id: `INV2-MOCK-${String(n).padStart(4, "0")}`,
        number: `CP-${String(n).padStart(4, "0")}`,
        status,
        recipientName: name,
        recipientEmail: email,
        businessName: biz,
        currency: "USD",
        total,
        amountDue: ["PAID", "MARKED_AS_PAID"].includes(status) ? 0 : total,
        invoiceDate,
        dueDate,
        note,
        items,
        payerViewUrl: `https://www.sandbox.paypal.com/invoice/p/#INV2-MOCK-${String(n).padStart(4, "0")}`,
      });
    };
    g.__creatorpayMock = {
      seq: 5,
      invoices: [
        seed(4, "SENT", "Maya Chen", "maya@layerzero-labs.xyz", "Nebula Wallet", [{ name: "Launch thread + quote-post campaign", quantity: 1, unitAmount: 1200 }], addDays(t, -2), addDays(t, 12), "Thanks for working with me!"),
        seed(3, "SENT", "Jordan Blake", "jordan@degenpass.io", "DegenPass", [{ name: "Sponsored X Space (60 min)", quantity: 1, unitAmount: 750 }], addDays(t, -20), addDays(t, -6), "Payment due within 14 days."),
        seed(2, "PAID", "Sofia Martins", "sofia@onchainweekly.com", "Onchain Weekly", [{ name: "Newsletter feature", quantity: 2, unitAmount: 300 }], addDays(t, -30), addDays(t, -16)),
        seed(1, "SENT", "Alex Rivera", "alex@meme-dao.org", "Meme DAO", [{ name: "Meme pack (10 custom memes)", quantity: 10, unitAmount: 40 }, { name: "Rush delivery", quantity: 1, unitAmount: 100 }], addDays(t, -35), addDays(t, -21), "Appreciate the collab 🙏"),
      ],
    };
  }
  return g.__creatorpayMock;
}

// ---------------------------------------------------------------- Public API
export async function listInvoices(): Promise<InvoiceSummary[]> {
  if (paypalMode() === "mock") return mockStore().invoices.map((i) => withOverdue(i));
  const data = await pp<{ items?: any[] }>(`/v2/invoicing/invoices?page=1&page_size=50&total_required=true`, { method: "GET" });
  const items = (data.items ?? []).map(fromPayPal);
  return items.sort((a, b) => (b.invoiceDate ?? "").localeCompare(a.invoiceDate ?? "") || b.number.localeCompare(a.number));
}

export async function getInvoice(id: string): Promise<InvoiceSummary> {
  if (paypalMode() === "mock") {
    const inv = mockStore().invoices.find((i) => i.id === id || i.number === id);
    if (!inv) throw new PayPalError(`Invoice ${id} not found`, 404);
    return withOverdue(inv);
  }
  return fromPayPal(await pp(`/v2/invoicing/invoices/${encodeURIComponent(id)}`, { method: "GET" }));
}

/** Create a draft invoice and immediately send it (PayPal emails the recipient). */
export async function createAndSendInvoice(d: InvoiceDraft): Promise<InvoiceSummary> {
  if (paypalMode() === "mock") {
    const s = mockStore();
    const n = s.seq++;
    const total = d.items.reduce((sum, i) => sum + i.quantity * i.unitAmount, 0);
    const inv = withOverdue({
      id: `INV2-MOCK-${String(n).padStart(4, "0")}`,
      number: `CP-${String(n).padStart(4, "0")}`,
      status: "SENT",
      recipientName: d.recipientName,
      recipientEmail: d.recipientEmail,
      businessName: d.businessName,
      currency: d.currency.toUpperCase(),
      total,
      amountDue: total,
      invoiceDate: todayISO(),
      dueDate: d.dueDate,
      note: d.note,
      items: d.items,
      payerViewUrl: `https://www.sandbox.paypal.com/invoice/p/#INV2-MOCK-${String(n).padStart(4, "0")}`,
    });
    s.invoices.unshift(inv);
    return inv;
  }

  let invoiceNumber: string | undefined;
  try {
    const next = await pp<{ invoice_number: string }>(`/v2/invoicing/generate-next-invoice-number`, { method: "POST" });
    invoiceNumber = next.invoice_number;
  } catch {
    invoiceNumber = undefined; // PayPal will auto-assign
  }
  const created = await pp<any>(`/v2/invoicing/invoices`, { method: "POST", json: toPayPalBody(d, invoiceNumber) });
  const id: string = created.id ?? String(created.href ?? "").split("/").pop();
  await pp(`/v2/invoicing/invoices/${id}/send`, {
    method: "POST",
    json: { send_to_invoicer: true, send_to_recipient: true },
  });
  return getInvoice(id);
}

export async function sendReminder(id: string, subject: string, note: string): Promise<void> {
  if (paypalMode() === "mock") {
    const inv = mockStore().invoices.find((i) => i.id === id);
    if (!inv) throw new PayPalError(`Invoice ${id} not found`, 404);
    inv.lastReminderAt = new Date().toISOString();
    return;
  }
  await pp(`/v2/invoicing/invoices/${encodeURIComponent(id)}/remind`, {
    method: "POST",
    json: { subject: subject.slice(0, 4000), note: note.slice(0, 4000), send_to_invoicer: true },
  });
}

/** Sandbox/demo helper: record an external payment so the invoice flips to PAID / MARKED_AS_PAID. */
export async function recordPayment(id: string): Promise<InvoiceSummary> {
  if (paypalMode() === "mock") {
    const inv = mockStore().invoices.find((i) => i.id === id);
    if (!inv) throw new PayPalError(`Invoice ${id} not found`, 404);
    inv.status = "PAID";
    inv.amountDue = 0;
    Object.assign(inv, withOverdue(inv));
    return inv;
  }
  const inv = await getInvoice(id);
  await pp(`/v2/invoicing/invoices/${encodeURIComponent(id)}/payments`, {
    method: "POST",
    json: {
      method: "BANK_TRANSFER",
      payment_date: todayISO(),
      amount: { currency_code: inv.currency, value: money(inv.amountDue || inv.total) },
      note: "Recorded via CreatorPay Agent",
    },
  });
  return getInvoice(id);
}

export async function cancelInvoice(id: string): Promise<void> {
  if (paypalMode() === "mock") {
    const inv = mockStore().invoices.find((i) => i.id === id);
    if (inv) Object.assign(inv, withOverdue({ ...inv, status: "CANCELLED", amountDue: 0 }));
    return;
  }
  await pp(`/v2/invoicing/invoices/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    json: { subject: "Invoice cancelled", note: "This invoice has been cancelled.", send_to_invoicer: true, send_to_recipient: true },
  });
}
