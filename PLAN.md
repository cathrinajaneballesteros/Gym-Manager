# PLAN.md

> **How to use this file — keep it updated!**
> - `[ ]` = not done, `[x]` = done. Tick a box **only when the item is fully delivered and verified**; untick it (`[x]` → `[ ]`) if it regresses or is reopened.
> - When a **project requirement** moves between *Not started / Partial / Done*, update its checkbox **and** the matching line in `## Current Status`.
> - When an **issue** ([B]/[S]/[P]/[Q]/[U]) or a **feature request** ([F]) is completed, remove its entry (or tick it with a short `Done:` note).
> - `[DB-free]` marks work that needs **no** Supabase DB access.

## Project Requirements (from sheet)
- [ ] 1. Payment reminders via SMS and email
- [ ] 2. Receipt checker (manual)
- [ ] 3. Expense historical data
- [x] 4. User auditing
- [ ] 5. AI analytics that help owners save money
- [ ] 6. Test with at least 5 gym owners
- [ ] 7. Calendar method

## Current Status
1. **Payment reminders (SMS + email) — Partial.** Resend email service exists but is never called from the UI; no SMS, no scheduling/reminders.
2. **Receipt checker (manual) — Partial.** The "Receipt" button only shows a fake `Receipt Verified` alert; `/api/email/receipt` exists but is dead code.
3. **Expense historical data — Partial.** Expenses live only in `localStorage`; monthly aggregation is dynamic, but history is not durable.
4. **User auditing — Done.** `localStorage`-backed action trail (`DBService.recordAudit` / `getAuditLogs`) records member/payment/expense mutations plus login/logout/signup, surfaced on `/audit` with filters, summaries, and live refresh.
5. **AI analytics to save money — Partial.** Gemini narrative + heuristic churn/leak detection, but leak baselines are hardcoded and the leak window is wrong (B17).
6. **Test with 5 gym owners — Unknown.** Not determinable from code (no fixtures/feedback artifacts).
7. **Calendar method — Not started.** No calendar/check-in UI; `attendance_logs` / `AttendanceLog` exist but are unused.

## Scan Summary
The UI is polished and consistent (Apple-style inline styles, SweetAlert2, Recharts) and the type contracts in `types/database.ts` / `types/ai.ts` are clean. Architecturally it is still a prototype: **all business data lives in `localStorage` via `DBService`** — Supabase is used only for auth and a single `profiles` upsert — so `schema.sql` is largely unused, and there is **no `middleware.ts`** (routes are unprotected and sessions are not refreshed server-side). Financial windows, churn dates, and date pills are now dynamic; HTML escaping, profile/email edits, expiry math, and the renewal rate have been fixed. The remaining critical gaps are on a clean install: no plans workflow (**B13**), modals that don't reinitialize (**B14**), and non-functional report tabs (**B15**).

## Top Priorities (critical path)
1. **B13** — Plans workflow (blocks creating members/payments on a clean install).
2. **B14** — Modal reinitialization (breaks Edit and preselected payments).
3. **B15** — Reports tabs do nothing.
4. **B16** — Double-count from the unrequested auto-payment.
5. **B17** — Leak detector window mismatch.

## Issues

### Bugs
- [ ] **[B8] Deleting a member orphans their payments** — `[DB-free]` · risk: medium
  - **Where:** `lib/data/db-service.ts` (`deleteMember`)
  - **Problem:** payments remain after the member is removed, still count toward revenue, and render as "Direct Guest" (`PaymentList.tsx`), losing attribution.
  - **Fix:** preserve history — soft-delete (`status: 'inactive'` + restore) or snapshot the payer's name on the payment. Decide the approach first.

- [ ] **[B13] No way to create membership plans** — `[DB-free]` · risk: high
  - **Where:** `lib/data/mock-data.ts` (`INITIAL_PLANS = []`), `lib/data/db-service.ts` (`addPlan`, unused), `components/members/MemberModal.tsx`
  - **Problem:** there is no plans UI and `addPlan` is never called, so `getPlans()` is always empty on a fresh install. Member registration requires a plan, so members and payments can never be created.
  - **Fix:** add a Plans management surface (list + create/edit) or seed default plans; wire `addPlan`.

- [ ] **[B14] Modals don't reinitialize when reopened** — `[DB-free]` · risk: high
  - **Where:** `components/members/MemberModal.tsx`, `components/expenses/ExpenseModal.tsx`, `components/payments/PaymentModal.tsx`
  - **Problem:** `useForm` caches `defaultValues` at first mount and no `reset()` runs when `initialMember` / `preselectedMemberId` changes; parents keep the modals mounted. Editing shows stale/blank data, and "Record Payment" from a member row ignores the preselected member.
  - **Fix:** `useEffect(() => reset(nextValues), [isOpen, initialMember, preselectedMemberId])`, or remount the modal with a `key`.

- [ ] **[B15] Reports tabs are non-functional** — `[DB-free]` · risk: high
  - **Where:** `components/reports/ReportsView.tsx`
  - **Problem:** `activeTab` only styles the segmented control; every tab renders the same content.
  - **Fix:** conditionally render per-tab content, or remove the tabs if one view is intended.

- [ ] **[B16] Registering a member silently records a payment** — `[DB-free]` · risk: high
  - **Where:** `lib/data/db-service.ts` (`addMember`)
  - **Problem:** `addMember` unconditionally creates a **completed** payment at `plan.price`. Recording the same enrollment again via `PaymentModal` double-counts revenue.
  - **Fix:** make the auto-payment explicit/optional (caller flag) or remove it and always record payment through the modal.

- [ ] **[B17] Leak detector compares all-time totals to monthly baselines** — `[DB-free]` · risk: high
  - **Where:** `lib/ai/leak-detector.ts`
  - **Problem:** sums every expense ever recorded (no date window) and compares to per-month baselines, so categories false-positive after ~2 months and `potentialMonthlySavings` is massively overstated. The docstring says a 30% threshold while the code triggers at 25%.
  - **Fix:** restrict aggregation to the current month (or a rolling average) and align the threshold with the doc.

- [ ] **[B18] UTC vs local date inconsistency** — `[DB-free]` · risk: medium
  - **Where:** `lib/data/db-service.ts` (`getMembers`, `addMember` use `toISOString()`), `lib/ai/churn-detector.ts`, `components/audit/AuditLogView.tsx` ("Events Today")
  - **Problem:** status/expiry use UTC while KPI/trend months use local time, so near midnight memberships and counts flip a day early or late.
  - **Fix:** derive "today" consistently in local time via a single helper.

- [ ] **[B19] Dashboard "Active Members" change is always 0%** — `[DB-free]` · risk: medium
  - **Where:** `components/dashboard/DashboardOverview.tsx`, `DBService.getDashboardKPIs`
  - **Problem:** `activeMembers` is computed from all members regardless of timeframe, so "this month vs last month" is always identical.
  - **Fix:** compute member counts per timeframe, or drop the delta.

### Security
- [ ] **[S3] Gemini key sent in the URL query string** — `[DB-free]` · risk: medium
  - **Where:** `lib/ai/gemini-service.ts` (`?key=${apiKey}`)
  - **Problem:** API keys in URLs leak via logs, proxies, and caches.
  - **Fix:** send the key in the `x-goog-api-key` request header.

### Performance
- [ ] **[P1] 1.9 MB logo shipped as a raw `<img>`** — `[DB-free]` · risk: medium
  - **Where:** `public/logo.png` (also committed at repo root)
  - **Problem:** ~1.9 MB on every page, including the landing page; no compression and no `next/image`.
  - **Fix:** compress to under ~100 KB and adopt `next/image`.

- [ ] **[P2] Synchronous storage reads inside render** — `[DB-free]` · risk: medium
  - **Where:** `lib/data/db-service.ts` (all getters)
  - **Problem:** components call `DBService.getX()` during render; each call re-parses JSON from `localStorage` with no caching.
  - **Fix:** load once into React state/context, or memoize per storage key.

### Code Quality
- [ ] **[Q1] Email/password auth UI is dead code** — `[DB-free]` · risk: low
  - **Where:** `app/(auth)/login/page.tsx`
  - **Problem:** the app is Google-OAuth-only but still ships full signIn/signUp forms; default mode is `signup`.
  - **Fix:** remove the credential paths, or document them if intentionally kept.

- [ ] **[Q3] Duplicated list/pagination UI** — `[DB-free]` · risk: low
  - **Where:** `components/members/MemberList.tsx`, `components/payments/PaymentList.tsx`, `components/expenses/ExpenseList.tsx`
  - **Problem:** the search bar, filter row, and pagination markup are copy-pasted three times.
  - **Fix:** extract a shared `DataTable` / pagination component.

- [ ] **[Q5] Docs drift** — `[DB-free]` · risk: low
  - **Where:** `README.md`
  - **Problem:** the README overstates delivered features (Monte Carlo projection, seasonality, RBAC roles), lists Node `18.17+` while `next@16` requires `>=20.9`, and its env example omits `GEMINI_API_KEY` / `RESEND_API_KEY`.
  - **Fix:** correct the claims, bump the Node requirement, and add the AI/email env vars.

- [ ] **[Q6] Leak detector uses hardcoded ₱ baselines** — `[DB-free]` · risk: medium
  - **Where:** `lib/ai/leak-detector.ts`
  - **Problem:** category baselines are fixed magic numbers rather than real history, and one-off equipment spend is counted as recurring "potential savings".
  - **Fix:** compute baselines from each gym's own historical averages (see also B17).

- [ ] **[Q7] No tests, no test script** — `[DB-free]` · risk: medium
  - **Where:** `package.json` (no `test` script)
  - **Problem:** financial math and AI heuristics are entirely untested.
  - **Fix:** add Vitest + unit tests for `db-service` KPI/trend math and the AI modules.

### UX
- [ ] **[U1] Blank flash while data loads** — `[DB-free]` · risk: low
  - **Where:** `DashboardOverview.tsx`, `AnalyticsView.tsx`, `ReportsView.tsx`
  - **Problem:** components `return null` until state is set, showing an empty frame on first paint.
  - **Fix:** render skeleton loaders.

- [ ] **[U2] Notifications are simulated** — `[DB-free]` · risk: low
  - **Where:** `components/analytics/AnalyticsView.tsx` (`handleContactMember`)
  - **Problem:** "Direct Ping" only shows a toast; nothing is sent to the member.
  - **Fix:** wire to the Resend/SMS path or relabel the action to "Copy message".

- [ ] **[U3] Receipt button fakes verification** — `[DB-free]` · risk: low
  - **Where:** `components/payments/PaymentList.tsx`
  - **Problem:** the "Receipt" action shows a success alert with no receipt content or PDF.
  - **Fix:** generate a real receipt (PDF/email) or clearly relabel the action.

- [ ] **[U4] Header search, bell, and date pill are non-functional** — `[DB-free]` · risk: low
  - **Where:** `components/layout/Header.tsx`
  - **Problem:** the search input and notification bell do nothing, and the date pill has `cursor: pointer` + a chevron but no handler (its label is now dynamic).
  - **Fix:** implement them or remove the misleading affordances.

### Feature Requests (Requested)
- [ ] **[F1] Clickable dashboard with drill-down overview** — `[DB-free]` · risk: low
  - **Where:** `components/ui/MetricCard.tsx`, `components/dashboard/DashboardOverview.tsx`
  - **Problem:** dashboard cards, charts, and rows are static — no `onClick`/`href`.
  - **Fix:** add `onClick`/`href` to `MetricCard` + chart cards and open a detail view (modal or `/dashboard/...` route): Revenue → payment ledger, Expenses → category breakdown, Net Profit → P&L, Members → member list.

## Recommended Order
1. **[DB-free]** Unblock the core demo: plans workflow (**B13**), modal reinitialization (**B14**), reports tabs (**B15**).
2. **[DB-free]** Restore trustworthy numbers: double-count (**B16**), leak window (**B17**), date consistency (**B18**), dashboard delta (**B19**).
3. **[DB-free]** Security, performance, quality, UX: **S3**, **P1**/**P2**, **Q1**/**Q3**/**Q5**/**Q6**/**Q7**, **U1**–**U4**, **F1**; plus decide **B8**.
