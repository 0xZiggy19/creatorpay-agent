"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentResponse, InvoiceSummary, SystemStatus } from "@/lib/types";
import { InvoicePreview } from "@/components/InvoicePreview";
import { ReminderCard } from "@/components/ReminderCard";
import { Dashboard } from "@/components/Dashboard";
import { PayPalMark, StatusPill, money } from "@/components/ui";

type Msg = { id: string; role: "user" | "assistant"; content: string; data?: AgentResponse };

const SUGGESTIONS = [
  "Invoice Acme Corp, billing@acme.com, $500 for 2 sponsored X posts, due Friday",
  "Who hasn't paid me yet?",
  "Draft a polite reminder for the most overdue client",
  "Bill Nebula Wallet (ops@nebula.xyz) $1,800 for a YouTube integration + 3 threads, net 30",
];

function renderText(t: string) {
  return t.split("\n").map((line, i) => (
    <p key={i} className={line.trim() === "" ? "h-2" : ""}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => (part.startsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part))}
    </p>
  ));
}

export default function Home() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [invLoading, setInvLoading] = useState(true);
  const [invError, setInvError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey 👋 I'm your CreatorPay Agent. Tell me about a deal in plain English and I'll turn it into a PayPal invoice, send it, and chase the payment for you.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const mode = status?.paypalMode ?? "mock";

  const refresh = useCallback(async () => {
    setInvLoading(true);
    try {
      const res = await fetch("/api/invoices", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load invoices");
      setInvoices(data.invoices);
      setInvError(null);
    } catch (e) {
      setInvError(e instanceof Error ? e.message : "Failed to load invoices");
    } finally {
      setInvLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then(setStatus);
    refresh();
  }, [refresh]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || thinking) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setThinking(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m.id !== "welcome").map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Agent error");
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: data.reply, data }]);
    } catch (e) {
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : "Something went wrong"}` }]);
    } finally {
      setThinking(false);
    }
  }

  async function markPaid(inv: InvoiceSummary) {
    const res = await fetch(`/api/invoices/${encodeURIComponent(inv.id)}/pay`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setInvError(data.error);
    refresh();
  }

  return (
    <div className="mx-auto flex h-screen w-full max-w-[1500px] flex-col px-5 py-4">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0070e0] to-violet-600 shadow-lg shadow-sky-900/40">
            <span className="text-lg font-bold text-white">C</span>
          </div>
          <div>
            <h1 className="text-lg leading-tight font-semibold tracking-tight">CreatorPay Agent</h1>
            <p className="text-xs text-zinc-500">Say the deal. Get paid. AI invoicing on PayPal for creators.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ${mode === "sandbox" ? "bg-sky-500/10 text-sky-300 ring-sky-500/30" : "bg-amber-500/10 text-amber-300 ring-amber-500/30"}`}>
            <PayPalMark className="h-3.5 w-3.5" /> PayPal {mode === "sandbox" ? "Sandbox · live" : "Mock mode"}
          </span>
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ${status?.aiModel ? "bg-violet-500/10 text-violet-300 ring-violet-500/30" : "bg-zinc-500/10 text-zinc-400 ring-zinc-500/30"}`}>
            ✦ {status?.aiModel ? `AI · ${status.aiModel}` : "AI offline · rule-based fallback"}
          </span>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* Chat */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl glass">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-sm font-semibold">Agent</span>
            <span className="text-[11px] text-zinc-500">natural language → PayPal invoices</span>
          </div>
          <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((m) => (
              <div key={m.id} className={`rise flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={m.role === "user" ? "max-w-[85%]" : "w-full max-w-[95%]"}>
                  <div
                    className={
                      m.role === "user"
                        ? "rounded-2xl rounded-br-sm bg-[#0070e0] px-3.5 py-2 text-sm text-white shadow-lg shadow-sky-900/30"
                        : "rounded-2xl rounded-bl-sm bg-white/[0.04] px-3.5 py-2.5 text-sm leading-relaxed text-zinc-200 ring-1 ring-white/5"
                    }
                  >
                    {renderText(m.content)}
                  </div>
                  {m.data?.toolsUsed?.length ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {m.data.toolsUsed.map((t) => (
                        <span key={t} className="rounded-md bg-violet-500/10 px-1.5 py-0.5 font-mono text-[10px] text-violet-300 ring-1 ring-violet-500/20">
                          ƒ {t}
                        </span>
                      ))}
                      <span className="px-1 text-[10px] text-zinc-600">{m.data.engine}</span>
                    </div>
                  ) : null}
                  {m.data?.draft && <InvoicePreview draft={m.data.draft} mode={mode} onSent={() => refresh()} />}
                  {m.data?.reminder && <ReminderCard reminder={m.data.reminder} onSent={() => refresh()} />}
                  {m.data?.invoices && m.data.invoices.length > 0 && !m.data.reminder && (
                    <div className="rise mt-2 divide-y divide-white/5 overflow-hidden rounded-xl glass">
                      {m.data.invoices.map((i) => (
                        <div key={i.id} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="min-w-0">
                            <div className="truncate">{i.businessName || i.recipientName}</div>
                            <div className="font-mono text-[11px] text-zinc-500">{i.number}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusPill inv={i} />
                            <span className="font-mono">{money(i.amountDue, i.currency)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="typing flex gap-1 px-2 text-2xl leading-none text-zinc-500">
                <span>•</span>
                <span>•</span>
                <span>•</span>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="border-t border-white/10 p-3">
            {messages.length <= 2 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full bg-white/[0.04] px-2.5 py-1 text-left text-[11px] text-zinc-400 ring-1 ring-white/10 transition hover:bg-white/[0.08] hover:text-zinc-200">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-1.5 ring-1 ring-white/10 focus-within:ring-sky-500/50"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='e.g. "Invoice Acme, billing@acme.com, $500 for 2 sponsored posts, due Friday"'
                className="flex-1 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-zinc-600"
              />
              <button disabled={thinking || !input.trim()} className="rounded-lg bg-[#0070e0] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#0062c4] disabled:opacity-40">
                Send
              </button>
            </form>
          </div>
        </section>

        {/* Dashboard */}
        <section className="min-h-0">
          <Dashboard
            invoices={invoices}
            loading={invLoading}
            error={invError}
            mode={mode}
            onRefresh={refresh}
            onRemind={(inv) => send(`Draft a polite payment reminder for ${inv.businessName || inv.recipientName} (invoice ${inv.number}, id ${inv.id})`)}
            onMarkPaid={markPaid}
          />
        </section>
      </main>
    </div>
  );
}
