"use client";
import type { InvoiceSummary } from "@/lib/types";
import { money, StatusPill } from "./ui";

export function Dashboard({
  invoices,
  loading,
  error,
  mode,
  onRefresh,
  onRemind,
  onMarkPaid,
}: {
  invoices: InvoiceSummary[];
  loading: boolean;
  error: string | null;
  mode: "sandbox" | "mock";
  onRefresh: () => void;
  onRemind: (inv: InvoiceSummary) => void;
  onMarkPaid: (inv: InvoiceSummary) => void;
}) {
  const live = invoices.filter((i) => !["CANCELLED", "DRAFT"].includes(String(i.status)));
  const paid = live.filter((i) => ["PAID", "MARKED_AS_PAID"].includes(String(i.status)));
  const open = live.filter((i) => ["SENT", "UNPAID", "PARTIALLY_PAID", "SCHEDULED"].includes(String(i.status)));
  const overdue = open.filter((i) => i.overdue);
  const sum = (a: InvoiceSummary[], k: "total" | "amountDue") => a.reduce((s, i) => s + i[k], 0);
  const stats = [
    { label: "Invoiced", value: money(sum(live, "total")), sub: `${live.length} invoices`, tone: "text-zinc-100" },
    { label: "Paid", value: money(sum(paid, "total")), sub: `${paid.length} paid`, tone: "text-emerald-300" },
    { label: "Outstanding", value: money(sum(open, "amountDue")), sub: `${open.length} awaiting`, tone: "text-sky-300" },
    { label: "Overdue", value: money(sum(overdue, "amountDue")), sub: `${overdue.length} late`, tone: "text-rose-300" },
  ];

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl glass px-4 py-3">
            <div className="text-[11px] tracking-wide text-zinc-500 uppercase">{s.label}</div>
            <div className={`mt-1 text-xl font-semibold tracking-tight ${s.tone}`}>{s.value}</div>
            <div className="text-[11px] text-zinc-500">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl glass">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Invoices</div>
            <div className="text-[11px] text-zinc-500">Live status from PayPal Invoicing API{mode === "mock" ? " (mock data)" : " · sandbox"}</div>
          </div>
          <button onClick={onRefresh} className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 ring-1 ring-white/10 hover:bg-white/5">
            {loading ? "Syncing…" : "↻ Sync"}
          </button>
        </div>
        {error && <div className="m-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">{error}</div>}
        <div className="scroll-thin min-h-0 flex-1 divide-y divide-white/5 overflow-y-auto">
          {!loading && invoices.length === 0 && !error && (
            <div className="p-8 text-center text-sm text-zinc-500">No invoices yet. Ask the agent to bill your first client →</div>
          )}
          {invoices.map((inv) => {
            const isOpen = ["SENT", "UNPAID", "PARTIALLY_PAID"].includes(String(inv.status));
            return (
              <div key={inv.id} className="group rise flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/30 to-violet-500/30 text-xs font-semibold ring-1 ring-white/10">
                  {inv.recipientName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{inv.businessName || inv.recipientName}</span>
                    <StatusPill inv={inv} />
                  </div>
                  <div className="truncate text-[11px] text-zinc-500">
                    <span className="font-mono">{inv.number}</span> · {inv.items[0]?.name ?? inv.recipientEmail}
                    {inv.dueDate && <> · {inv.overdue ? <span className="text-rose-300">{inv.daysOverdue}d overdue</span> : <>due {inv.dueDate}</>}</>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">{money(inv.total, inv.currency)}</div>
                  {isOpen && (
                    <div className="mt-1 flex justify-end gap-1 opacity-70 transition group-hover:opacity-100">
                      <button onClick={() => onRemind(inv)} className="rounded px-1.5 py-0.5 text-[11px] text-amber-300 ring-1 ring-amber-400/30 hover:bg-amber-400/10">
                        Remind
                      </button>
                      <button onClick={() => onMarkPaid(inv)} title="Record a payment (sandbox demo)" className="rounded px-1.5 py-0.5 text-[11px] text-emerald-300 ring-1 ring-emerald-400/30 hover:bg-emerald-400/10">
                        Mark paid
                      </button>
                      {inv.payerViewUrl && mode === "sandbox" && (
                        <a href={inv.payerViewUrl} target="_blank" className="rounded px-1.5 py-0.5 text-[11px] text-sky-300 ring-1 ring-sky-400/30 hover:bg-sky-400/10">
                          Pay link ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
