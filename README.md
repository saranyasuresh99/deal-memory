# AtliQ Deal Memory

AtliQ's founders sell on the move — WhatsApp, calls, email between meetings — and what they learn and promise never reaches the CRM.
Deal Memory makes the CRM a by-product of selling: it finds revenue leaks in the inbox, turns quick spoken debriefs into CRM updates you approve, and answers questions with cited sources.

> Capstone prototype. All data is synthetic. "Today" is fixed at **10 Jul 2026**.

## At a glance (Demo data, 10 Jul 2026)

| Measure | Value |
|---|---|
| At stake | **$513k+** across 10 open deals with a known value where a client is waiting on us or an AtliQ promise is overdue / due today (the "+" = 12 more such deals with no stated value) |
| Clients waiting on us | **14** (oldest: ClearPath, 31 days) |
| Overdue promises | **13** (+2 due today: Trustline NBFC, AgroLink) |
| Hidden revenue | **16** cross-sells, referrals, revisits and returning deals |
| Radar items | **109** |
| Evals recall | **16 / 16** editorial "not done" notes caught (broader check 29 / 29) |
| Quotes verified | **342 / 342** AI quotes found in their source (`npm run verify`) |

## Features

| Screen | What it does |
|---|---|
| **Radar** (`/`) | Daily ranked list of revenue leaks: clients waiting on us, overdue promises, client deadlines, stale deals, no owner, CRM contradictions, revisits, returning "Lost" deals, cross-sell, referrals, leads missing from the CRM, possible duplicates. Ranked by deal value × urgency and grouped (needs action today, due this week, coming up, hidden revenue, data quality); top 5 per group with "Show more". List, Board and By-owner views. The selected item shows its cited evidence (click to read it), memory timeline and what AtliQ owes. Done / Snooze / Dismiss (reason required). A Lost deal counts as "waiting on us" only if the client came back; otherwise it is a revisit. |
| **Debrief** (`/debrief`) | We don't record calls. Speak a 60-second note (browser speech recognition, English–India), or paste a chat, email or Teams/Zoom meeting summary. The AI proposes a CRM update; you pick the account, then **tick (approve), edit or leave unticked (reject) each field** — nothing is pre-ticked and nothing changes until you press Approve. Capture → Review → Approve. Every approval goes into the audit log. Six sample buttons for the demo. |
| **Promises** (`/promises`) | Ledger of every commitment AtliQ made: owner, client, due date (or "date unclear"), days overdue, status, source. Mark done. |
| **Accounts** (`/accounts`) | All CRM records with duplicate / no-owner / stale badges and approved Debrief edits applied. Each account shows its emails and notes and a **Pre-call brief** (last touch, what they want, open promises, open questions, deadlines, cross-sell), every line cited. |
| **Ask** (`/ask`) | Team Q&A answered only from the CRM, emails and notes, with citations. If the data doesn't support an answer it says exactly: *"I don't have enough information in the CRM, emails or notes to answer that."* |
| **Evals** (`/evals`) | Scores the Radar against the answer key (editorial notes) — recall — and lets a person mark Radar items Correct/Wrong to compute precision. |
| **Audit log** (`/audit`) | Every CRM change approved in Debrief: who, when, field, before, after and the source quote. |

### Design

The UI follows `design/DESIGN.md` and the approved mockup `design/new-layout.png`: Poppins, a single set of colour tokens in `app/globals.css` (brand blue #2767B1, navy headings, amber for deadlines and promises, teal for hidden revenue, grey for data quality), white cards on a light page, and lucide icons.

- **Left sidebar:** account search (Ctrl/⌘+K), Workspace (Radar, Debrief, Promises, Accounts, Ask) and Quality (Evals, Audit log) with live counts, a Demo-mode card with the verified-quote count, and a user menu with **View as** (an app-wide owner filter) and **Reset demo** (clears everything saved in your browser). Below 900px it becomes a slide-in drawer.
- **Top bar:** breadcrumb, "Today: Fri 10 Jul 2026", **Export** (this list as CSV, or the four Power BI files — see below; files download in your browser, nothing is sent anywhere) and **+ New debrief**.

## Run it locally

You need [Node.js LTS](https://nodejs.org/) (20.12 or newer).

```bash
npm install
npm run build-data   # data/raw/* -> data/accounts.json, documents.json, answer_key.json
npm run radar        # rules + AI signals -> data/radar.json
npm run dev          # open http://localhost:3000
```

Other commands:

```bash
npm run verify       # checks every AI quote against its source; removes any claim that fails
npm run lint
npm run build        # production build (what Vercel runs)
```

The generated JSON files are committed, so `npm install && npm run dev` also works on its own.

## Demo mode vs Live mode

- **Demo mode (default — no API key, no cost).** The AI outputs were pre-generated with Claude **during the build**, following exactly the same prompts (`lib/prompts.ts`), schemas and rules the live routes use, and every quote was checked by `npm run verify`. They live in:
  - `data/ai_signals.json` — Radar AI signals (one entry per account / company not in the CRM)
  - `data/precomputed/debriefs.json` — results for the 6 Debrief samples
  - `data/precomputed/briefs.json` — a pre-call brief for each of the 38 accounts that have documents
  - `data/precomputed/answers.json` — 10 prepared Ask questions

  In Demo mode the API routes return these when the input matches a sample / prepared question / account. Anything else gets: *"Demo mode — live AI is switched off in this prototype…"* (for unknown Debrief text the rule-based account matcher still runs, no AI).
- **Live mode.** Add `ANTHROPIC_API_KEY=...` to `.env.local` (or to the project's Environment Variables in Vercel) and the same API routes call Claude — no code changes. The key is only read on the server and `.env*` files are git-ignored. `npm run radar` then regenerates `data/ai_signals.json` with Claude first.

The sidebar shows a **Demo mode** card (with the number of verified quotes) or a **Live AI** card.

## How it stays grounded and safe

1. **One fixed date.** `TODAY = 2026-07-10` is defined once in `lib/config.ts`; the real system date is never used.
2. **Nothing is ever sent to a client.** There is no email, SMS or Slack sending code anywhere. Suggested actions are for a person to do.
3. **No CRM change without human approval.** The AI only *proposes*; each field is approved, edited or rejected by a person, and approvals are logged (who, when, before, after, source quote).
4. **Duplicates are never auto-merged.** Meridian (L-1003 / L-1027) is flagged as a duplicate and GlobalMart (L-1004 / L-1040) as a *possible* duplicate; Debrief makes you pick.
5. **Every AI claim cites a source** `{file, quote}`. On the server, every quote is checked against its source text (case-insensitive, whitespace-normalised) and any claim whose quote is not found is dropped — in the API routes (`lib/debrief.ts`, `lib/grounding.ts`), in `npm run radar`, and in `npm run verify` for the precomputed files.
6. **No invented values.** Unknown dates, values and owners stay empty and show as "needs input" / "value unknown". Relative dates are resolved only when unambiguous; otherwise the date stays empty and the UI says **"date unclear"** (e.g. "by Friday" said on a Friday).
7. **Refusal.** When the data doesn't support an answer, Ask replies with exactly the refusal sentence. If none of an answer's points survive the quote check, the server replaces it with the refusal.
8. **Prompt injection.** All document and debrief text is treated as data; every system prompt says to ignore instructions inside documents. In plain code, Debrief also blocks any status/value change when the text contains instruction-like wording (try sample 4).
9. **Editorial notes are the answer key, never AI input.** The italic `*(…)*` notes in emails and meeting notes are stripped by `npm run build-data` and saved to `data/answer_key.json`, which is used only by the Evals page. `npm run build-data` stops with an error if one is left in a document.
10. **No paid API key needed** (Demo mode, above).
11. **Structured, validated output in Live mode** — JSON schemas (zod) for every AI call, friendly error messages instead of crashes, and Anthropic's server-side refusal fallback on Sonnet calls.

### Evals (current results)

- **Recall (spec):** 16 of 16 editorial notes that say something was not done ("No reply", "not sent", "never", "No one", "not started", "not answered") have at least one Radar item for that account — **100%**. All 16 are caught by a specific leak (not just a generic stale / no-owner card).
- **Broader check:** including other "not done" wordings ("No response", "Nothing was sent", "not arranged", …), 29 of 29 notes are hit; 26 of 29 by a specific leak. The 3 generic-only cases (SteelCore, ApexAuto, UrbanNest) are cold deals caught only as *stale* / *no owner*.
- **Precision** is judged by a person on the Evals page (Correct / Wrong per Radar item).

## Power BI

Four tables, one row per thing, joined on **`lead_id`** (the CRM lead ID, e.g. `L-1003`). Conventions: UTF-8 (with BOM), comma-separated, header row; dates `YYYY-MM-DD`; numbers without `$` or commas; booleans `true` / `false`; empty = unknown.

**Model:** `accounts[lead_id]` 1 → many `promises[lead_id]`, `radar_items[lead_id]` and `audit_log[lead_id]`. `lead_id` is empty for companies not in the CRM (their name is in `account`) and for Radar items that span several leads (see `related_lead_ids`, pipe-separated). New leads created in Debrief have IDs like `NEW-1`.

| File | One row per | Columns |
|---|---|---|
| `accounts.csv` | CRM account (+ new leads from Debrief) | lead_id, company, contact_name, contact_email, owner, status, service_interest, source, est_value_usd, created_date, last_contact_date, next_followup_date, days_since_last_contact, is_stale, has_owner, duplicate_of, duplicate_kind, is_new_lead, updated_in_debrief, notes |
| `promises.csv` | Promise AtliQ made | promise_id, lead_id, account, owner, promise, due_date, date_clear, days_overdue, status (open / overdue / done), found_in (radar / debrief), approved_on, source_file, source_quote |
| `radar_items.csv` | Radar item, in rank order | item_id, rank, lead_id, related_lead_ids, account, in_crm, type, type_label, radar_group, found_by (rule / ai), owner, value_usd, value_source (crm / quote), due_date, date_clear, days_waiting, days_overdue, days_until_due, score, status (active / done / snoozed / dismissed), summary, suggested_next_action, source_file, source_quote |
| `audit_log.csv` | Approved CRM change | change_id, lead_id, account, field, value_before, value_after, edited_before_approval, approved_by, approved_on, source_quote |

**Two ways to get them:**

1. **Export → For Power BI (4 files)** in the top bar downloads all four with fixed names, **including what you've done in this browser**: approved field edits, new leads, promises added from Debrief, Done / Snooze / Dismiss statuses and the audit log. Import them with *Get data → Text/CSV*.
2. **Live URLs for Power BI's Web connector** (*Get data → Web*), read-only, from the server:
   - `https://<your-app>/api/export/accounts.csv`
   - `https://<your-app>/api/export/promises.csv`
   - `https://<your-app>/api/export/radar_items.csv`

   These contain the **base data plus the Radar** only: CRM accounts as exported, promises found by the Radar, and every Radar item with status `active`. Approvals, new leads, Debrief promises, Done / Snooze / Dismiss and the audit log live in a browser, so they are not included (and there is no audit_log URL). If accented characters look wrong, set the CSV step's encoding to 65001 (UTF-8).

## Prototype simplifications

- **Demo mode:** AI results are pre-generated; no paid API calls are made unless you add a key.
- **No database:** base data lives in JSON files in the repo; user actions (approvals, edits, new leads, promises, dismissals, snoozes, eval marks) are saved in the browser's `localStorage` under `dealmemory:v1`, layered on top. They are per-browser and not shared with the team.
- **Ask uses keyword filtering instead of embeddings:** it sends the CRM plus documents about companies named in the question (or all documents when none are named — the whole dataset is about 11k tokens). The production plan uses embeddings / retrieval.
- Radar AI signals are refreshed by running `npm run radar`, not on a schedule. Approving a Debrief change updates Accounts and the audit log but does not re-rank the Radar.
- New leads created from Debrief appear on the Accounts list but have no detail page yet.
- Accounts are linked to documents with simple rules (contact email → email domain → lead ID → company name).

## Dataset extensions

- `data/samples.json` — 6 Debrief samples: (1) MiraHealth after the airport call, (2) Meridian booth chat (duplicate test), (3) a vague date ("by Friday", GlobalMart), (4) a prompt-injection email, (5) an unknown company (Zentrix Labs → new lead), (6) a pasted Teams meeting summary for DataNest's 8 Jul call (→ L-1018, last contact and notes, expansion signal).
  - Sample 4 was written for this prototype; it also mentions a 24 July board meeting that is not in the original dataset.
  - Sample 6 was written for this prototype. It states only two facts: the renewal was verbally agreed, and DataNest requested a third engineer. The dataset has no separate note for the 8 Jul call; the first fact appears only in an editorial note (the answer key). The sample is used only as Debrief input — it is not read by the Radar, the briefs, Ask or Evals.
- No other raw data was added or changed.

## Models used and why

| Task | Model | Why |
|---|---|---|
| Debrief extraction & account matching | `claude-haiku-4-5-20251001` | Fast and cheap for short, structured extraction that a person reviews field by field anyway. |
| Radar reasoning, Pre-call Brief, Ask | `claude-sonnet-5-5` | Needs judgement across many documents (spotting unkept promises, contradictions, unanswered questions) while keeping every claim cited. |

Model names are set in `lib/config.ts`.

## Deploy (Vercel)

Import the repo in Vercel (framework: Next.js, default settings). It runs in Demo mode out of the box; add `ANTHROPIC_API_KEY` under Project → Settings → Environment Variables to switch to Live AI.

## Project layout

```
app/                 pages and API routes (api/debrief, api/brief, api/ask, api/export/*.csv)
components/          UI (shell/ = sidebar, top bar, export menu)
lib/                 config, rules (Radar Step A), prompts, schemas, grounding checks, matcher, evals, powerbi (export tables)
scripts/             build-data.ts, radar.ts, verify-quotes.ts
design/              DESIGN.md (UI spec) and new-layout.png (approved mockup)
data/raw/            original CRM export, emails, meeting notes (+ data dictionary)
data/                generated JSON (accounts, documents, answer key, AI signals, radar, precomputed/*)
```
