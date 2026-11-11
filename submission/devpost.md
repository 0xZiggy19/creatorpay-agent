# CreatorPay Agent — Devpost submission

Paste each section into the matching Devpost field. Written in the first person as Ziggy (@0xZiggy_eth). Do not claim a live demo URL until one is deployed.

**Repo:** https://github.com/0xZiggy19/creatorpay-agent
**License:** MIT
**Deadline:** Thursday, Nov 12, 2026, 12:00pm PST (9:00 PM WAT / Africa/Lagos)

Prize categories to select if Devpost lets you: **Best Use of PayPal + AI**, **Most Impactful**, and **Best Use of Agentic Commerce** (it fits as an agent that runs a PayPal payment workflow — invoicing, status, reminders — with a human in the loop. It is not a shopping or checkout agent; don't describe it as one).

---

## Project name

CreatorPay Agent

## Tagline

Say the deal. Get paid. An AI invoicing agent that turns a brand deal in plain English into a real PayPal invoice, then tracks and chases the payment.

*(150 characters, under the 200-character limit.)*

## Inspiration

I'm Ziggy, a crypto and web3 creator in Nigeria. Brand deals still happen the way most creator work happens: in a DM or a Telegram chat. Someone writes "$500 for 2 sponsored posts, pay by Friday?" I say yes. Then the awkward part starts.

I have to turn that sentence into a proper invoice, send it, remember who has actually paid, and chase the ones who haven't — without sounding desperate. A lot of the time I just skip the invoice and hope. That's how creators end up unpaid. I built this for myself, and for every freelancer and KOL who is better at the work than at the admin.

PayPal is already how a lot of international brand deals get settled. I wanted the invoice to start the same way the deal did: in plain English.

## What it does

CreatorPay Agent is a chat + dashboard app. You describe a deal the way you'd text a friend, and the agent turns it into a structured PayPal invoice.

Try: *"Invoice Acme Corp, billing@acme.com, $500 for 2 sponsored X posts, due Friday."*

The agent extracts the recipient, email, currency, and a short note. It splits the total across line items (2 × $250), and it resolves relative dates like "Friday", "net 30", or "end of month" against today's date. It never invents an email address — if you leave one out, it asks.

You get an **editable preview**. Nothing reaches a client until you click **Create & send via PayPal**. That creates a draft through the PayPal Invoicing API, sends it, and PayPal emails the client a hosted pay link. They can pay with PayPal, Venmo, or a card.

After that, you can just ask:

- *"Who hasn't paid me yet?"* — the agent lists outstanding and overdue invoices from live PayPal status, with amounts and due dates.
- *"Draft a polite reminder for the most overdue client."* — it writes a warm, personalised reminder. You review it (and can edit the subject and body), then it goes out through PayPal's reminder endpoint.

The dashboard on the right shows **Invoiced**, **Paid**, **Outstanding**, and **Overdue** totals, plus every invoice with its live PayPal status (DRAFT, SENT, PAID, and so on). Open invoices have one-click **Remind**, a sandbox **Mark paid** action (it records a payment through PayPal so you can demo the full lifecycle), and a pay link when you're in sandbox.

Human-in-the-loop is deliberate: the AI only *prepares* drafts. Creating or sending an invoice, and sending a reminder, always needs an explicit click.

## How we built it

It's a Next.js (App Router) app in TypeScript, with a chat pane and a live invoice dashboard on one screen.

The agent runs on the server (`POST /api/agent`) through the **Vercel AI SDK** (`generateText`, tool calling, a short multi-step loop). Tool inputs are validated with **Zod** before anything is used. There are three tools:

- `prepare_invoice` — structured draft (recipient, email, items, currency, due date, note). Missing or invalid email is rejected; the model has to ask.
- `list_invoices` — live invoices from PayPal, filtered as all / unpaid / overdue / paid.
- `prepare_reminder` — subject + body for one unpaid invoice, after the agent has looked it up.

The loop stops as soon as a preview or reminder card is ready, so we don't spend an extra model round-trip on text the UI already shows. Each call has a timeout and a single retry.

The default model is **Google Gemini** `gemini-3.5-flash-lite`, with automatic fallback to `gemini-3.5-flash` and `gemini-flash-latest` when one is rate-limited. If `GEMINI_API_KEY` isn't set, the app can use the **Vercel AI Gateway** or OpenAI instead. If no AI key is set, or every model fails, a **rule-based parser** stands in so the UI still works. A badge in the header always shows which engine is active.

PayPal talks to `https://api-m.sandbox.paypal.com` through a small Invoicing v2 client: OAuth2 (token cached), generate next invoice number, create draft, send, list, get, remind, and record payment. Confirmations go through route handlers (`POST /api/invoices`, `/remind`, `/pay`). If PayPal keys are missing, the same interface runs against an **in-memory mock store**, which is useful for development and offline demos. As a safety lock, the client refuses a non-sandbox API base unless `PAYPAL_ALLOW_LIVE` is explicitly set — I learned the hard way how easy it is to paste Live keys by mistake.

## Challenges we ran into

**PayPal sandbox app permissions and scopes.** Getting a real invoice out of the sandbox was harder than writing the client. Live credentials were rejected by the sandbox (they look similar in the dashboard). Invoicing is a per-app feature: you can tick it on one REST app and still call with keys from another, and PayPal returns `403 NOT_AUTHORIZED`. Even after enabling Invoicing, a cached OAuth token may predate the new scope. I added a clearer error that tells you to tick Invoicing and save, and the client now refreshes the token once on 401/403 before failing.

**Free-tier Gemini rate limits.** The model I wanted for a fast demo is also the one that gets rate-limited first. I made the model chain configurable (`GEMINI_MODEL`) and defaulted to flash-lite, then flash, then `gemini-flash-latest`, because each model has its own free-tier limit. The agent loop is short — early stop on `prepare_invoice` / `prepare_reminder`, a 15s timeout, one retry — and if every model is down, we fall back to the rule-based parser so a demo doesn't just die.

**Natural-language dates and amounts.** Creators don't speak in ISO dates and unit prices. "Friday", "next week", "net 30", and "end of month" have to become a real `YYYY-MM-DD`. "$500 for 2 sponsored X posts" is a total, not two $500 line items. The system prompt tells the model to divide totals across quantities, and the fallback parser does the same with regexes for currency symbols, "k" shorthand, weekdays, and `net N`. Getting that reliable — and refusing to invent a billing email — took more care than I expected.

## Accomplishments that we're proud of

- A full invoice lifecycle in one sitting: say the deal, preview, send via PayPal, ask who hasn't paid, draft a reminder, mark it paid.
- Money-safe design. The agent cannot email a client or create an invoice until I click. The app also refuses the live PayPal API unless I explicitly allow it.
- It still runs if something is missing. No PayPal keys → mock mode. No AI key, or a provider outage → rule-based fallback. Judges can clone the repo and try the flow without any credentials.
- Built as a solo creator, for a problem I actually have, in a very tight window.

## What we learned

PayPal's Invoicing API is a complete payment workflow if you use it properly — number, create, send, list, remind, record payment — but the developer dashboard's Live/Sandbox toggle and per-app feature flags are easy to get wrong. Scopes are on the app, not just the keys, and tokens don't always pick up a newly enabled feature until you refresh.

I also learned to treat the LLM as one engine, not the product. Tool schemas, validation, early stopping, and a deterministic fallback mattered as much as the model. And "human in the loop" isn't a slogan when invoices are involved; it's the difference between a useful agent and a dangerous one.

## What's next

- A hosted demo on Vercel or Render so judges don't have to run it locally.
- Live PayPal, once I'm ready to send real invoices, behind the existing safety lock.
- Pulling deals in from where they already happen — X DMs and email — so I don't have to retype them.
- A paid-invoice notification, and better defaults for international brand deals (currency, due terms).
- Recurring retainers, which are common in creator work and map cleanly onto PayPal invoices.

## Built with

- nextjs
- react
- typescript
- tailwindcss
- vercel-ai-sdk
- google-gemini
- paypal
- paypal-invoicing-api
- zod
- nodejs

Suggested Devpost tag string:

`nextjs, react, typescript, tailwindcss, vercel-ai-sdk, google-gemini, paypal, paypal-invoicing-api, zod, nodejs`

## Tools used

This is the "which AI tools you used and how" note Devpost asks for. Paste it into that field, or into *How we built it* if there isn't a separate box.

**Google Gemini** (`@ai-sdk/google`) is the runtime model. The default is `gemini-3.5-flash-lite`, chosen because it's fast and good at tool calling. If that model is rate-limited, the app automatically tries `gemini-3.5-flash`, then `gemini-flash-latest`. Gemini powers `prepare_invoice`, `list_invoices` answers (it decides to call the tool, then writes the reply from live PayPal data), and `prepare_reminder`.

**Vercel AI SDK** (`ai` v7) is the agent layer: `generateText`, tool definitions, the multi-step tool loop (`stopWhen` on step count or a preview tool call), and Zod schemas that validate model output before the UI or PayPal ever sees it.

**Vercel AI Gateway / OpenAI** are optional alternatives if a Gemini key isn't set (`AI_GATEWAY_API_KEY` or `OPENAI_API_KEY`). They are supported in the code; the submission demo is intended to run on Gemini.

**Rule-based fallback** (not an LLM) is a deterministic parser for invoices, dates, unpaid-invoice questions, and reminder drafts. It is used only when no AI key is configured, or when every model in the chain fails, so the product stays demoable.

**Grok Bot** (an AI coding agent) helped scaffold the Next.js app, implement the agent, PayPal client, UI, and docs. I reviewed the code, ran the flows, and own the product decisions — including human confirmation before any PayPal send, the live-API lock, and the fallback behaviour.

No other generative tools were used to produce the invoices or reminders in the product itself.
