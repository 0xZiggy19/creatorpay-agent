import type { InvoiceSummary } from "@/lib/types";

export function money(n: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  MARKED_AS_PAID: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  SENT: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  UNPAID: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  PARTIALLY_PAID: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  PAYMENT_PENDING: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  DRAFT: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
  SCHEDULED: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  CANCELLED: "bg-zinc-700/30 text-zinc-400 ring-zinc-600/30",
  OVERDUE: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

export function StatusPill({ inv }: { inv: Pick<InvoiceSummary, "status" | "overdue"> }) {
  const key = inv.overdue ? "OVERDUE" : String(inv.status);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${STATUS_STYLES[key] ?? STATUS_STYLES.DRAFT}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {key === "MARKED_AS_PAID" ? "PAID · RECORDED" : key.replace(/_/g, " ")}
    </span>
  );
}

export function PayPalMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#009cde" d="M20.07 7.9c-.6 3.32-2.84 5.36-6.38 5.36h-1.6a.8.8 0 0 0-.79.68l-.98 6.2h-2.5a.48.48 0 0 1-.47-.56l.12-.77 1-6.33h1.95c3.98 0 6.9-1.75 7.73-5.4.12.27.03.54-.08.82Z" />
      <path fill="#012169" d="M17.9 4.6C17.04 3.6 15.4 3.2 13.3 3.2H7.18a.88.88 0 0 0-.87.74L3.76 20.07a.53.53 0 0 0 .52.61h3.78l.95-6.02-.03.19a.88.88 0 0 1 .86-.74h1.8c3.53 0 6.3-1.43 7.1-5.58l.07-.36c.24-1.53 0-2.57-.83-3.51Z" />
    </svg>
  );
}
