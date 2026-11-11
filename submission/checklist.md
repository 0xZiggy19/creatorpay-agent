# CreatorPay Agent — Devpost submission checklist

Deadline: **Thursday, Nov 12, 2026, 12:00pm PST** = **9:00 PM WAT (Africa/Lagos)**. Submit early enough that a YouTube process or Devpost hiccup doesn't burn the last hour.

Hackathon page: https://paypalaihackathon.devpost.com/

The submission folder (`submission/`) is local only until you decide to commit it. Do not push secrets, sandbox keys, or this checklist with a private demo password.

## Account and entry

- [ ] Devpost account is set up, and **Join hackathon** is clicked on the PayPal AI Hackathon page.
- [ ] Project created on Devpost. Name: **CreatorPay Agent**.
- [ ] Tagline pasted (150 characters, under the 200 limit):

  > Say the deal. Get paid. An AI invoicing agent that turns a brand deal in plain English into a real PayPal invoice, then tracks and chases the payment.

- [ ] You are listed as the sole team member (Ziggy / @0xZiggy_eth). Add a teammate later only if someone actually contributed.

## Code and license

- [ ] GitHub repo is **public**: https://github.com/0xZiggy19/creatorpay-agent
- [ ] **MIT** `LICENSE` is in the repo root (already there).
- [ ] `README.md` has the problem, features, architecture, PayPal endpoints, AI tools, and run instructions (already there).
- [ ] No API keys, tokens, or `.env.local` in the repo. `.env.example` has empty values only.
- [ ] Latest working code is pushed to `main` / `master` before you submit the link.

## Working demo for judges

Judges need either a hosted URL **or** a repo they can run themselves. Prefer both.

- [ ] **Hosted demo (preferred):** deploy to Vercel or Render as a Next.js app. Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_API_BASE=https://api-m.sandbox.paypal.com`, `PAYPAL_ALLOW_LIVE=false`, and `GEMINI_API_KEY` (plus optional `PAYPAL_INVOICER_NAME` / `PAYPAL_INVOICER_BUSINESS`). Confirm the header shows **PayPal Sandbox · live** and a Gemini model, not mock / rule-based, unless you are deliberately showing fallback.
- [ ] Paste the public demo URL into Devpost **Try it out**.
- [ ] If hosting isn't ready, Devpost still works with clear run steps (already in the README):

  ```bash
  git clone https://github.com/0xZiggy19/creatorpay-agent
  cd creatorpay-agent
  npm install
  cp .env.example .env.local   # optional keys; blank = mock + rule-based fallback
  npm run dev                  # http://localhost:3000
  ```

- [ ] Click through the live flow once on the build you are submitting: type a deal → preview → **Create & send via PayPal** → **Who hasn't paid me yet?** → reminder → **Mark paid**.
- [ ] Confirm the PayPal sandbox app has **Invoicing** ticked and saved on the **same** app the keys came from (not a different Default Application).

## Written description

Paste from `submission/devpost.md` into the matching Devpost boxes:

- [ ] Inspiration
- [ ] What it does
- [ ] How we built it
- [ ] Challenges we ran into
- [ ] Accomplishments that we're proud of
- [ ] What we learned
- [ ] What's next
- [ ] Built with tags: `nextjs, react, typescript, tailwindcss, vercel-ai-sdk, google-gemini, paypal, paypal-invoicing-api, zod, nodejs`
- [ ] **Tools used** (AI tools and how) — required by the brief. Paste the "Tools used" section from `devpost.md`.

## Screenshots and images

- [ ] Upload gallery images. Ready-made shots live in the repo under `docs/`:

  - `docs/screenshot-home.png`
  - `docs/screenshot-preview.png`
  - `docs/screenshot-sent.png`
  - `docs/screenshot-reminder.png`

- [ ] Use the preview or home screenshot as the cover image. No secrets in frame.

## Demo video

- [ ] Record from `submission/video-script.md` (target **under 2:45**, hard cap **3:00**).
- [ ] No copyrighted music.
- [ ] Voiceover matches what is on screen. Don't claim Live PayPal, auto-send, or a shopping agent.
- [ ] Uploaded to **YouTube**, visibility **Public**.
- [ ] Title something like: `CreatorPay Agent — PayPal AI Hackathon demo`.
- [ ] YouTube link pasted into the Devpost video field. Play it back in an incognito window to confirm it isn't private.

## Prize categories and judging

If the form lets you pick categories, select:

- [ ] **Best Use of PayPal + AI** — strongest fit (Gemini + Invoicing v2, end to end).
- [ ] **Most Impactful** — real unpaid-invoice problem for creators and freelancers.
- [ ] **Best Use of Agentic Commerce** — only if it still fits after you read the category text. The product is an agent that runs a PayPal invoicing and collection workflow with human confirmation, not a shop-and-checkout agent. Don't stretch the write-up.

Sense-check against the criteria before you submit:

- [ ] **Technological implementation** — tool calling, Zod, PayPal Invoicing v2 (create, send, list, remind, record payment), fallbacks, live-API lock.
- [ ] **Design** — clear chat + dashboard, editable preview, reminder card, status badges.
- [ ] **Potential impact** — a real audience (creators, freelancers) and a real payment problem.
- [ ] **Innovation** — natural-language invoicing with a human in the loop, plus "who hasn't paid me?" and AI reminders on real PayPal data.
- [ ] **Presentation** — tight video, honest README, screenshots, this write-up.

## Final submit

- [ ] Preview the Devpost project as a logged-out visitor. Every link opens.
- [ ] Click **Submit** (a draft is not entered).
- [ ] Confirm the entry shows as submitted, not in-progress, before 12:00pm PST.
