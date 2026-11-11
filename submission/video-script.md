# CreatorPay Agent — demo video script

**Target length:** under 2:45 (Devpost limit is 3:00; leave a little headroom).
**Format:** 16:9 screen recording, 1080p if you can, voiceover in your own voice. No copyrighted music — a soft bed of original or royalty-free audio is fine, or just voice.
**YouTube:** upload as **Public** (or Unlisted only if Devpost accepts it; Public is safer). Title suggestion: `CreatorPay Agent — PayPal AI Hackathon demo`.

## Before you hit record

1. Open the app full screen (browser zoom ~100–110%). The header badges should read **PayPal Sandbox · live** and **AI · gemini-3.5-flash-lite** (or whichever Gemini model is active). If PayPal is still in mock mode, say so honestly in the voiceover — don't imply a mock invoice is a live sandbox invoice.
2. Prefer a fresh-looking dashboard: a couple of older outstanding invoices is useful for the "who hasn't paid" beat. If the sandbox is empty, create one overdue invoice before recording (or use mock data, and say it's mock).
3. **Invoice prompt — use a sandbox Personal account email** if you have one, so PayPal can actually email the pay link. If you don't, `billing@acme.com` still shows create + send + dashboard; just don't linger on "the client just got this email."
4. Hide any secrets. Don't scroll through `.env` or the PayPal dashboard keys.
5. Do a silent dry run of every click first, so you aren't waiting on a slow Gemini call with dead air. If the model is slow, keep talking through the tool badges (`ƒ prepare_invoice`) while it thinks.

**Prompts to type on screen** (copy-paste, then pretend to type if you want it to feel live):

1. `Invoice Acme Corp, billing@acme.com, $500 for 2 sponsored X posts, due Friday`
2. `Who hasn't paid me yet?`
3. `Draft a polite reminder for the most overdue client`

Buttons you will click, exactly as labelled: **Send**, **Create & send via PayPal**, **Send reminder via PayPal**, **Mark paid**, and optionally **↻ Sync**.

---

## 0:00–0:18 — Hook (the problem)

**On screen:** You, or a quick crop of a chat/DM feel (optional). Then cut to the CreatorPay Agent home screen — chat on the left, dashboard on the right, badges visible. Don't type yet.

**Voiceover:**
> I'm Ziggy, a crypto creator in Nigeria. Brand deals still land in my DMs: five hundred dollars, two sponsored posts, pay by Friday. Then I have to turn that into an invoice, remember who paid, and chase the ones who didn't — without sounding awkward. That's how a lot of us end up unpaid.

---

## 0:18–0:28 — The product, in one line

**On screen:** Hold the home screen. Maybe hover the input so the placeholder is readable: `e.g. "Invoice Acme, billing@acme.com, $500 for 2 sponsored posts, due Friday"`.

**Voiceover:**
> So I built CreatorPay Agent. You say the deal in plain English. It becomes a real PayPal invoice. Then it helps me get paid.

---

## 0:28–0:50 — Type a deal

**On screen:** Click the chat input (or the first suggestion chip, which is the same sentence). Type or paste, clearly enough to read:

```
Invoice Acme Corp, billing@acme.com, $500 for 2 sponsored X posts, due Friday
```

Click **Send**. Show the typing dots, then the assistant reply and the **ƒ prepare_invoice** badge.

**Voiceover:**
> "Invoice Acme Corp, billing@acme.com, five hundred dollars for two sponsored X posts, due Friday." That's the whole brief. The agent uses a tool called prepare invoice — it doesn't send anything yet.

---

## 0:50–1:08 — AI preview (human in the loop)

**On screen:** Zoom or slowly scroll the **Invoice preview** card. Point out:

- Bill to: Acme Corp
- Email: billing@acme.com
- Due date: the upcoming Friday (a real `YYYY-MM-DD`, not the word "Friday")
- Line items: quantity **2**, unit price **$250**, total **$500.00**
- The friendly note
- The buttons **Discard** and **Create & send via PayPal**

Optionally tweak the note by a word, to show it's editable.

**Voiceover:**
> Here's the preview. It split the five hundred across two posts at two fifty each, and it resolved "Friday" to a real date. I can edit anything. Nothing goes to the client until I confirm.

---

## 1:08–1:25 — Create and send via PayPal

**On screen:** Click **Create & send via PayPal**. Wait for "Creating & sending…", then the success line: **✓ Invoice [number] sent to [email]**. If a sandbox **Open in PayPal ↗** link appears, you can click it for one second of the hosted pay page, then come back. On the right, the new invoice should appear and the **Invoiced** / **Outstanding** totals should move. If they don't, click **↻ Sync**.

**Voiceover:**
> I hit Create and send via PayPal. That's the real Invoicing API in the sandbox — it creates the draft and sends it. PayPal emails the client a pay link, and they can pay with PayPal, Venmo, or a card. And it lands on my dashboard: invoiced, paid, outstanding, overdue.

---

## 1:25–1:40 — "Who hasn't paid me?"

**On screen:** Type exactly:

```
Who hasn't paid me yet?
```

Click **Send**. Show **ƒ list_invoices**, the assistant's list, and the mini invoice rows (status pills + amounts). Glance at the dashboard so it feels like one system.

**Voiceover:**
> "Who hasn't paid me yet?" The agent calls PayPal, checks live statuses, and lists everyone still outstanding — including who's overdue.

---

## 1:40–2:02 — AI reminder

**On screen:** Type exactly:

```
Draft a polite reminder for the most overdue client
```

Click **Send**. Show **ƒ list_invoices** and **ƒ prepare_reminder**, then the **Payment reminder** card (subject + body). You may tweak one line. Click **Send reminder via PayPal**. Wait for **✓ Reminder sent via PayPal**.

**Voiceover:**
> "Draft a polite reminder for the most overdue client." I don't want to sound like a debt collector — I want something warm, with the invoice number, the amount, and the due date. I can edit it, then PayPal delivers it with the pay link.

---

## 2:02–2:15 — Mark paid

**On screen:** On the dashboard, hover an open invoice (the Acme one you just sent is a clean choice). Click **Mark paid**. The status should flip to **PAID** (or **MARKED_AS_PAID**), **Paid** should go up, **Outstanding** should go down.

**Voiceover:**
> When the client pays — or, for this demo, when I hit Mark paid — we record the payment through PayPal and the invoice flips to paid. That's the full loop, end to end.

---

## 2:15–2:35 — The tech, in 20 seconds

**On screen:** Stay on the app. You can briefly point at the header badges and the `ƒ` tool chips. Do **not** open a code editor unless you can do it in a couple of seconds; this beat is short.

**Voiceover:**
> Under the hood: Next.js, the Vercel AI SDK, and Gemini, with tool calling and Zod validation. Three tools: prepare invoice, list invoices, prepare reminder. PayPal Invoicing handles create, send, remind, and record payment. And I kept a human in the loop — the AI drafts, I approve anything that emails a client or touches money.

---

## 2:35–2:45 — Close

**On screen:** Hold a clean frame of the app (preview + dashboard, or the paid invoice). End card, 3–4 seconds, with:

- **CreatorPay Agent**
- **Say the deal. Get paid.**
- github.com/0xZiggy19/creatorpay-agent
- @0xZiggy_eth

**Voiceover:**
> CreatorPay Agent: say the deal, get paid. Built for the PayPal AI Hackathon. The repo is public, MIT licensed. I'm Ziggy — thanks for watching.

---

## Timing check

| Block | Clock | Approx. VO |
|---|---|---|
| Hook | 0:00–0:18 | ~18s |
| Intro | 0:18–0:28 | ~10s |
| Type a deal | 0:28–0:50 | ~22s |
| Preview | 0:50–1:08 | ~18s |
| Create & send | 1:08–1:25 | ~17s |
| Who hasn't paid | 1:25–1:40 | ~15s |
| Reminder | 1:40–2:02 | ~22s |
| Mark paid | 2:02–2:15 | ~13s |
| Tech | 2:15–2:35 | ~20s |
| Close | 2:35–2:45 | ~10s |
| **Total** | **~2:45** | |

If you run long, trim the PayPal-hosted-page cutaway and shorten the hook by a sentence. If a model call is slow, keep the tech line ready as fill, or cut the wait in edit. Hard cap: 2:59. Do not add background music you don't have the rights to.

## Edit notes

- Burn in the prompts as captions if the text is small on mobile YouTube.
- Cut dead waits; leave the tool badges on screen long enough to read.
- Don't claim Live PayPal, shopping, or automatic sending. Mark paid is a sandbox record-payment action, and the voiceover already says that.
- Export, upload to YouTube, set visibility to Public, and paste the link into Devpost.
