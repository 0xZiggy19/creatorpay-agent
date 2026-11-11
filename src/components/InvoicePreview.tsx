"use client";
import { useState } from "react";
import type { InvoiceDraft, InvoiceSummary } from "@/lib/types";
import { money, PayPalMark } from "./ui";

export function InvoicePreview({
  draft: initial,
  mode,
  onSent,
}: {
  draft: InvoiceDraft;
  mode: "sandbox" | "mock";
  onSent: (inv: InvoiceSummary) => void;
}) {
  const [d, setD] = useState<InvoiceDraft>(initial);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "discarded">("idle");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<InvoiceSummary | null>(null);
  const total = d.items.reduce((s, i) => s + i.quantity * i.unitAmount, 0);
  const locked = state !== "idle";

  async function send() {
    setState("sending");
    setError(null);
    const res = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create invoice");
      setState("idle");
      return;
    }
    setSent(data.invoice);
    setState("sent");
    onSent(data.invoice);
  }

  const field = "w-full rounded-md bg-white/5 px-2 py-1 text-sm ring-1 ring-white/10 outline-none focus:ring-sky-400/60 disabled:opacity-80 disabled:ring-transparent disabled:bg-transparent disabled:px-0";

  if (state === "discarded") return <div className="text-xs text-zinc-500 italic">Invoice discarded.</div>;

  return (
    <div className="rise mt-2 overflow-hidden rounded-xl glass">
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-sky-500/10 to-violet-500/10 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-zinc-300 uppercase">
          <PayPalMark /> Invoice preview
        </div>
        <span className="text-[11px] text-zinc-400">{state === "sent" ? "Sent" : "Review before sending"}</span>
      </div>
      <div className="grid grid-cols-6 gap-x-3 gap-y-2 px-4 py-3">
        <label className="col-span-3 space-y-1">
          <span className="text-[11px] text-zinc-500 uppercase">Company</span>
          <input disabled={locked} className={field} placeholder="—" value={d.businessName ?? ""} onChange={(e) => setD({ ...d, businessName: e.target.value || undefined })} />
        </label>
        <label className="col-span-3 space-y-1">
          <span className="text-[11px] text-zinc-500 uppercase">Contact</span>
          <input disabled={locked} className={field} value={d.recipientName} onChange={(e) => setD({ ...d, recipientName: e.target.value })} />
        </label>
        <label className="col-span-3 space-y-1">
          <span className="text-[11px] text-zinc-500 uppercase">Email</span>
          <input disabled={locked} className={field} value={d.recipientEmail} onChange={(e) => setD({ ...d, recipientEmail: e.target.value })} />
        </label>
        <label className="col-span-2 space-y-1">
          <span className="text-[11px] text-zinc-500 uppercase">Due date</span>
          <input disabled={locked} type="date" className={field} value={d.dueDate} onChange={(e) => setD({ ...d, dueDate: e.target.value })} />
        </label>
        <label className="col-span-1 space-y-1">
          <span className="text-[11px] text-zinc-500 uppercase">Currency</span>
          <input disabled={locked} className={field} value={d.currency} maxLength={3} onChange={(e) => setD({ ...d, currency: e.target.value.toUpperCase() })} />
        </label>
      </div>
      <div className="px-4">
        <div className="grid grid-cols-[1fr_56px_96px_96px] gap-2 border-b border-white/10 pb-1 text-[11px] text-zinc-500 uppercase">
          <span>Item</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Price</span>
          <span className="text-right">Amount</span>
        </div>
        {d.items.map((it, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_56px_96px_96px] items-center gap-2 border-b border-white/5 py-1.5 text-sm">
            <input disabled={locked} className={field} value={it.name} onChange={(e) => setD({ ...d, items: d.items.map((x, j) => (j === idx ? { ...x, name: e.target.value } : x)) })} />
            <input disabled={locked} type="number" min={1} className={`${field} text-right`} value={it.quantity} onChange={(e) => setD({ ...d, items: d.items.map((x, j) => (j === idx ? { ...x, quantity: Number(e.target.value) } : x)) })} />
            <input disabled={locked} type="number" min={0} step="0.01" className={`${field} text-right`} value={it.unitAmount} onChange={(e) => setD({ ...d, items: d.items.map((x, j) => (j === idx ? { ...x, unitAmount: Number(e.target.value) } : x)) })} />
            <span className="text-right font-mono text-zinc-200">{money(it.quantity * it.unitAmount, d.currency)}</span>
          </div>
        ))}
        <div className="flex items-baseline justify-end gap-3 py-3">
          <span className="text-xs text-zinc-500 uppercase">Total</span>
          <span className="text-2xl font-semibold tracking-tight">{money(total, d.currency)}</span>
        </div>
      </div>
      {d.note && <div className="mx-4 mb-3 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-zinc-400 italic">“{d.note}”</div>}
      {error && <div className="mx-4 mb-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">{error}</div>}
      <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
        {state === "sent" && sent ? (
          <div className="flex w-full items-center justify-between">
            <div className="text-sm text-emerald-300">
              ✓ Invoice <span className="font-mono">{sent.number}</span> sent to {sent.recipientEmail}
              {mode === "mock" && <span className="ml-1 text-zinc-500">(mock)</span>}
            </div>
            {sent.payerViewUrl && mode === "sandbox" && (
              <a href={sent.payerViewUrl} target="_blank" className="text-xs text-sky-300 hover:underline">
                Open in PayPal ↗
              </a>
            )}
          </div>
        ) : (
          <>
            <button onClick={() => setState("discarded")} disabled={state === "sending"} className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5">
              Discard
            </button>
            <button
              onClick={send}
              disabled={state === "sending"}
              className="flex items-center gap-2 rounded-lg bg-[#0070e0] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-900/40 transition hover:bg-[#0062c4] disabled:opacity-60"
            >
              <PayPalMark className="h-4 w-4 rounded-sm bg-white p-[1px]" />
              {state === "sending" ? "Creating & sending…" : "Create & send via PayPal"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
