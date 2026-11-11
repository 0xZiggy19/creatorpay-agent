export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "SCHEDULED"
  | "PAID"
  | "MARKED_AS_PAID"
  | "PARTIALLY_PAID"
  | "PAYMENT_PENDING"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "MARKED_AS_REFUNDED"
  | "UNPAID";

export interface InvoiceItemInput {
  name: string;
  description?: string;
  quantity: number;
  unitAmount: number;
}

/** Structured invoice data produced by the AI from natural language. */
export interface InvoiceDraft {
  recipientName: string;
  recipientEmail: string;
  businessName?: string;
  currency: string;
  items: InvoiceItemInput[];
  dueDate: string; // YYYY-MM-DD
  note?: string;
  memo?: string;
}

/** Normalized invoice summary used by the dashboard + AI tools. */
export interface InvoiceSummary {
  id: string;
  number: string;
  status: InvoiceStatus | string;
  recipientName: string;
  recipientEmail: string;
  businessName?: string;
  currency: string;
  total: number;
  amountDue: number;
  invoiceDate?: string;
  dueDate?: string;
  note?: string;
  items: InvoiceItemInput[];
  payerViewUrl?: string;
  overdue: boolean;
  daysOverdue: number;
  lastReminderAt?: string;
}

export interface AgentResponse {
  reply: string;
  draft?: InvoiceDraft;
  invoices?: InvoiceSummary[];
  reminder?: { invoiceId: string; invoiceNumber: string; recipientName: string; subject: string; note: string };
  toolsUsed: string[];
  engine: string;
}

export interface SystemStatus {
  paypalMode: "sandbox" | "mock";
  aiProvider: string | null;
  aiModel: string | null;
}
