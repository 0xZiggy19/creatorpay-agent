"use client";
import { useState } from "react";
import type { AgentResponse } from "@/lib/types";
import { PayPalMark } from "./ui";

export function ReminderCard({ reminder, onSent }: { reminder: NonNullable<AgentResponse["reminder"]>; onSent: () => void }) {
  const [subject, setSubject] = useState(reminder.subject);
  const [note, setNote] = useState(reminder.note);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setState("sending");
    setError(null);
    const res = await fetch(`/api/invoices/${encodeURIComponent(reminder.invoiceId)}/remind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, note }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to send reminder");
      setState("idle");
      return;
    }
    setState("sent");
    onSent();
  }

  return (
    <div className="rise mt-2 overflow-hidden rounded-xl glass">
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-rose-500/10 px-4 py-2.5">
        <div className="text-xs font-semibold tracking-wide text-zinc-300 uppercase">✉️ Payment reminder · {reminder.invoiceNumber}</div>
        <span className="text-[11px] text-zinc-400">to {reminder.recipientName}</span>
      </div>
      <div className="space-y-2 px-4 py-3">
        <input disabled={state !== "idle"} value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-md bg-white/5 px-2 py-1.5 text-sm font-medium ring-1 ring-white/10 outline-none focus:ring-amber-400/50" />
        <textarea disabled={state !== "idle"} value={note} onChange={(e) => setNote(e.target.value)} rows={6} className="w-full resize-none rounded-md bg-white/5 px-2 py-1.5 text-sm leading-relaxed text-zinc-300 ring-1 ring-white/10 outline-none focus:ring-amber-400/50" />
        {error && <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">{error}</div>}
      </div>
      <div className="flex justify-end border-t border-white/10 px-4 py-3">
        {state === "sent" ? (
          <span className="text-sm text-emerald-300">✓ Reminder sent via PayPal</span>
        ) : (
          <button onClick={send} disabled={state === "sending"} className="flex items-center gap-2 rounded-lg bg-[#0070e0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0062c4] disabled:opacity-60">
            <PayPalMark className="h-4 w-4 rounded-sm bg-white p-[1px]" />
            {state === "sending" ? "Sending…" : "Send reminder via PayPal"}
          </button>
        )}
      </div>
    </div>
  );
}
