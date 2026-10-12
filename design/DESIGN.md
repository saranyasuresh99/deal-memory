# Deal Memory — UI Redesign Spec (approved by the PM)

The approved mockup is `design/new-layout.png`. Look at it first and match it closely.
This is a VISUAL redesign only. Keep every feature, route, data file, guardrail and
the localStorage key `dealmemory:v1` exactly as they are. Do not change any AI output,
quotes, counts or the verify step.

## 1. Design tokens (put them in one place: `app/globals.css` CSS variables + Tailwind theme)
| Token | Value | Use |
|---|---|---|
| blue | #2767B1 | primary buttons, active nav, links, focus rings (Codebasics brand blue) |
| blue-dark | #1D4F8C | hover on primary, text on blue tint |
| navy | #0F2A4F | headings, big numbers, active segmented control, "hot" items |
| tint | #EEF4FB | active nav background, icon circles, info cards |
| tint-2 | #DCE8F6 | borders on tinted areas |
| page | #EEF2F7 | area behind the app shell |
| surface | #FFFFFF | app shell, cards |
| sidebar | #FBFCFE | sidebar background |
| subtle | #F7F9FC | table header, quote blocks, mini stats |
| line | #E3E8EF | all borders and dividers |
| text | #1B2433 | body text |
| muted | #5B6576 | secondary text (keep contrast ≥ 4.5:1) |
| amber-bg / amber-text | #FFF4DD / #8A5A00 | deadlines, "our promise", date warnings |
| teal-bg / teal-text | #E9F5F2 / #1E6B5B | hidden revenue: referral, cross-sell, revisit, returning deal |
| grey-pill | #EEF1F5 / #4A5568 | data-quality items (stale, no owner, duplicate) |
| blue-pill | #E8F0FB / #1D4F8C | waiting on us |

Font: **Poppins** via `next/font/google` (weights 400, 500, 600). Radius: 8px controls, 12px cards,
16px app shell, 999px pills. Shadow: only `0 1px 2px rgba(15,42,79,.04)` on cards. No gradients, no emoji.

## 2. App shell (all pages)
- Page background `page`; the app sits in a white rounded container (16px radius, 20px margin on desktop).
- **Left sidebar (236px):** logo (blue rounded square with "D" + "Deal Memory"), search box
  ("Search accounts…" filters accounts by name and jumps to the account page), sections:
  - WORKSPACE: Radar (badge = total radar items), Debrief, Promises (badge = overdue count), Accounts (badge = account count), Ask
  - QUALITY: Evals (badge = recall %), Audit log (move the existing audit log into its own page `/audit`)
  - Bottom: tinted "Demo mode" card ("AI results pre-generated with Claude. N/N quotes verified." — N from the verify output data, not hard-coded) and a **user card** "Bhavin · Founder" with a dropdown: View as Team / Bhavin / Dhaval / Karandeep / Jay (sets the owner filter app-wide, saved in localStorage) and **Reset demo**.
  - Icons: lucide-react, 18px, stroke 2.
- **Top bar (62px):** breadcrumb ("Workspace / Page name"), right side: "Today: Fri 10 Jul 2026" chip, an Export button (downloads the current list as CSV), and the primary **"+ New debrief"** button (goes to /debrief).
- Below 900px: sidebar becomes a slide-in drawer opened from a menu button in the top bar; tables scroll horizontally inside their card.

## 3. Radar page (`/`) — match the mockup
1. Title "Revenue Leak Radar" + one-line subtitle.
2. **4 KPI cards** (icon in a tint circle, label, big navy number, muted sub-line). Compute every number from the data:
   - At stake: sum of values of items waiting on an overdue AtliQ action (show "$440k+" style) · sub: "N deals waiting on an overdue action"
   - Clients waiting on us: count · sub: "Oldest: X days (Account)"
   - Overdue promises: count · sub: "+N due today (Account)" when any
   - Hidden revenue: count of cross-sell + referral + revisit + returning-deal items · sub: "Cross-sells, referrals, returning deals"
3. **Two columns:** Leak list (flexible) + Selected panel (340px). Below 1100px the panel moves under the list.
4. **Leak list card:** header with title, segmented control **List / Board / By owner**, filters "Owner: All ▾" and "Type: All ▾".
   - Table columns: ACCOUNT (name + muted sub-line: lead ID · contact or short context) · LEAK (pill) · OWNER (initials avatar; grey "—" if none) · WAITING / DUE (main + muted sub-line) · VALUE (right-aligned; "value unknown" in muted text).
   - **Groups** with a coloured dot and count: **Needs action today** (waiting on us, promises due today, returning "Lost" deals), **Due this week** (client deadlines and promises due within 7 days), **Hidden revenue** (cross-sell, referral, revisit, returning deal). Other items (data quality: stale, no owner, duplicates, missing next step) go in a 4th group **Data quality**, collapsed by default.
   - Each group shows its top 5 (ranked as today) then "Show N more · names…". This keeps the anti-alert-fatigue rule from the PRD.
   - Clicking a row selects it (blue left bar + light blue row background) and fills the right panel. The first row is selected on load.
   - **Board:** the same groups as columns of compact cards (account, pill, owner, value). **By owner:** groups by owner instead of urgency.
5. **Selected panel:** "Selected" label, account name, sub-line (lead ID · CRM status · owner), leak pill top-right; 3 mini stats (Deal value · Waiting/Due · Last CRM update); the evidence quote block with its source link (opens the existing document side panel); **Memory timeline** = the last 4 linked documents/CRM events for that account, newest first (dot + one-line summary + date · type); **What AtliQ owes** = open radar items for that account (label + days); buttons **Open account** and **Mark done**, plus a small "⋯" menu with **Snooze** and **Dismiss** (dismiss still requires a reason).

## 4. Other pages (same shell, same components)
- **Accounts (`/accounts`):** title + KPI row (Accounts · Duplicates · No owner · Stale) as clickable filter cards; a table like the Radar list: Account (name + contact) · Status pill · Owner avatar · Last contact · Docs · Value · Flags (pills). Keep "+N new leads from Debrief" in the subtitle.
- **Account detail (`/accounts/[leadId]`):** three columns — left: account card (name, lead ID, contact, email, owner, source, created, status, value; "needs input" stays amber); middle: **Pre-call brief** card (keep Generate/Regenerate and the "Before the call" warning) and a full **Memory timeline** of all linked documents; right: **What AtliQ owes** and a **CRM is out of date** card when the documents are newer than last_contact_date. Keep the duplicate warning at the top.
- **Debrief (`/debrief`):** one centred card with a 3-step stepper **Capture → Review → Approve**. Capture = the mic / paste tabs + sample chips. Review = matched account card, warnings (date, injection) in amber, proposed changes as cards with a checkbox, before → after and the quote. Approve = confirmation plus the promises "Add to ledger" list. The audit log moves to `/audit` (link to it after approving).
- **Promises (`/promises`):** grouped list like the Radar table: Overdue · Due soon · Date unclear · Done (collapsed), columns Promise · Client · Owner · Due · Source.
- **Ask (`/ask`):** chat inside a card; example questions as chips; answers as cards with cited points (quote + file) exactly as now; refusal text unchanged.
- **Evals (`/evals`):** 3 KPI cards (Recall · Strict recall · Broader check) + the hit/miss table and the precision helper in the new table style.
- **Audit log (`/audit`):** the existing audit table in the new table style.

## 5. Done means
- Every page uses the shell and tokens; nothing uses the old indigo colours.
- Same numbers as before (15 · 13 · 15 · 16 · 51 etc. on the old counters must still be derivable).
- `npm run verify` still passes, `npm run build` passes, mobile layout works at 390px.
