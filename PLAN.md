# PLAN.md

> **How to use this file — keep it updated!**
> - `[ ]` = not done, `[x]` = done. Tick a box **only when the item is fully delivered and verified**; untick it (`[x]` → `[ ]`) if it regresses or is reopened.
> - When a **project requirement** moves between *Not started / Partial / Done*, update its checkbox **and** the matching line in `## Current Status`.
> - When an **issue** ([B]/[S]/[P]/[Q]/[U]) or a **feature request** ([F]) is completed, tick its box and append a short `Done:` note describing what changed.
> - `[DB-free]` marks work that needs **no** Supabase DB access. Items under **Delegated** require Supabase/DB work and are handled by the teammate.

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
3. **Expense historical data — Partial.** Expenses live only in `localStorage`. Monthly aggregation is now dynamic (not hardcoded), but history is still non-durable.
4. **User auditing — Done.** `localStorage`-backed action trail (`DBService.recordAudit` / `getAuditLogs`) records member/payment/expense mutations plus login/logout/signup, surfaced on `/audit` with filters, summaries, and live refresh. Persistence is not yet durable (Supabase deferred).
5. **AI analytics to save money — Partial.** Gemini narrative + heuristic churn/leak detection, but leak baselines are hardcoded and the leak window is wrong (see B17).
6. **Test with 5 gym owners — Unknown.** Not determinable from code (no fixtures/feedback artifacts).
7. **Calendar method — Not started.** No calendar/check-in UI; `attendance_logs` / `AttendanceLog` exist but are unused.

## Scan Summary
The UI is polished and consistent (Apple-style inline styles, SweetAlert2, Recharts) and the type contracts in `types/database.ts` / `types/ai.ts` are clean. Architecturally it is still a prototype: **all business data lives in `localStorage` via `DBService`** — Supabase is used only for auth and a single `profiles` upsert — so `schema.sql` (tables, indexes, RLS) is largely unused, and there is **no `middleware.ts`** (routes are unprotected and sessions are not refreshed server-side). Financial windows and churn dates are now dynamic; the remaining weaknesses are AI baselines and the lack of a plans workflow. A fresh scan found **critical functional gaps on a clean install** — no plans management (B13), modals that don't reinitialize (B14), and non-functional report tabs (B15) — plus an incomplete HTML-escaping fix (S4) and a leak-detector window mismatch (B17). Auth/DB-dependent work is delegated.

## Top Priorities (critical path)
1. **B13** — Plans workflow (blocks creating members/payments on a clean install).
2. **B14** — Modal reinitialization (breaks Edit and preselected payments).
3. **B15** — Reports tabs do nothing.
4. **S4** — Finish HTML escaping (SweetAlert `title` still injects).
5. **B16** — Double-count from unrequested auto-payment.
6. **B17** — Leak detector window mismatch.

## Issues

### Bugs
- [ ] **[B8] Deleting a member orphans their payments** — `[DB-free]` · risk: medium
  - **Where:** `lib/data/db-service.ts` (`deleteMember`)
  - **Problem:** `deleteMember` removes the member but leaves their payments. Those rows still count toward revenue and render as "Direct Guest" (`PaymentList.tsx`), losing attribution.
  - **Fix:** preserve history rather than cascade-delete — soft-delete (`status: 'inactive'` + restore) or snapshot the payer's name on the payment. Decide the approach first.

- [ ] **[B13] No way to create membership plans** — `[DB-free]` · risk: high
  - **Where:** `lib/data/mock-data.ts` (`INITIAL_PLANS = []`), `lib/data/db-service.ts` (`addPlan`, unused), `components/members/MemberModal.tsx`
  - **Problem:** there is no plans UI and `addPlan` is never called, so `getPlans()` is always empty on a fresh install. Member registration requires a plan, so members and payments can never be created.
  - **Fix:** add a Plans management surface (list + create/edit) or seed sensible default plans; wire `addPlan`.

- [ ] **[B14] Modals don't reinitialize when reopened** — `[DB-free]` · risk: high
  - **Where:** `components/members/MemberModal.tsx`, `components/expenses/ExpenseModal.tsx`, `components/payments/PaymentModal.tsx`
  - **Problem:** `useForm` caches `defaultValues` at first mount and no `reset()` runs when `initialMember` / `preselectedMemberId` changes; parents keep the modals mounted. Editing shows stale/blank data, and "Record Payment" from a member row ignores the preselected member.
  - **Fix:** `useEffect(() => reset(nextValues), [isOpen, initialMember, preselectedMemberId])`, or remount the modal with a `key`.

- [ ] **[B15] Reports tabs are non-functional** — `[DB-free]` · risk: high
  - **Where:** `components/reports/ReportsView.tsx`
  - **Problem:** `activeTab` only styles the segmented control; every tab renders the same content, so Revenue/Expenses/P&L/Monthly/Annual are identical.
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

- [ ] **[B20] Settings email edits are silently discarded** — `[DB-free]` · risk: medium
  - **Where:** `components/settings/SettingsView.tsx`
  - **Problem:** `handleSaveProfile` omits `email` from `updateProfile`, so the editable Email field persists nothing locally.
  - **Fix:** include `email` in the local update, or make the field read-only.

- [ ] **[B21] Expenses "This Month" card shows the all-time total** — `[DB-free]` · risk: medium
  - **Where:** `components/expenses/ExpenseList.tsx`
  - **Problem:** the card labeled "This Month" renders the sum of all expenses.
  - **Fix:** use `getDashboardKPIs('this-month').totalExpenses`.

- [ ] **[B22] Expense method filter can't match created methods** — `[DB-free]` · risk: medium
  - **Where:** `components/expenses/ExpenseList.tsx`
  - **Problem:** the filter offers `Card`, but expenses can be `Credit Card` / `Check` / `Other`, so those records can't be filtered.
  - **Fix:** align the filter options with `ExpenseModal`'s method list.

- [ ] **[B23] Member expiry ignores the chosen start date** — `[DB-free]` · risk: medium
  - **Where:** `components/members/MemberModal.tsx`
  - **Problem:** changing plan computes `end_date` from `new Date()` rather than the selected `start_date`, mis-dating back- or future-dated memberships.
  - **Fix:** base `end_date` on `start_date`.

- [ ] **[B24] Profile name reverts on navigation** — `[DB-free]` · risk: medium
  - **Where:** `app/template.tsx`
  - **Problem:** on every navigation the template overwrites `full_name` with OAuth metadata, undoing edits made in Settings.
  - **Fix:** only populate profile fields when they are currently empty (don't clobber user edits).

### Security
- [ ] **[S3] Gemini key sent in the URL query string** — `[DB-free]` · risk: medium
  - **Where:** `lib/ai/gemini-service.ts` (`?key=${apiKey}`)
  - **Problem:** API keys in URLs leak via logs, proxies, and caches.
  - **Fix:** send the key in the `x-goog-api-key` request header.

- [ ] **[S4] Unescaped user input injected into HTML** — `[DB-free]` · risk: medium
  - **Where:** `components/analytics/AnalyticsView.tsx` (body **and `title`**), `components/members/MemberList.tsx` (toast), `components/expenses/ExpenseList.tsx` (toast), `lib/email/resend-service.ts`, `app/(auth)/login/page.tsx`
  - **Problem:** `escapeHtml` was added and applied to the AI/email bodies, but **SweetAlert renders `title` as HTML** and still receives raw member names / expense titles (`showToast`, `showSuccess`), so injection remains.
  - **Fix:** escape every value passed to a SweetAlert `title` (or configure SweetAlert to treat titles as text).
  - **Done (partial):** `escapeHtml()` (`lib/ui/escape.ts`) applied to the AI brief, retention-message body, Resend receipt body, and login confirmation block.

### Performance
- [ ] **[P1] 1.9 MB logo shipped as a raw `<img>`** — `[DB-free]` · risk: medium
  - **Where:** `public/logo.png` (also committed at repo root)
  - **Problem:** ~1.9 MB loaded on every page, including the landing page; no compression and no `next/image`.
  - **Fix:** compress to under ~100 KB and adopt `next/image`.

- [ ] **[P2] Synchronous storage reads inside render** — `[DB-free]` · risk: medium
  - **Where:** `lib/data/db-service.ts` (all getters)
  - **Problem:** components call `DBService.getX()` during render; each call re-parses JSON from `localStorage` with no caching.
  - **Fix:** load once into React state/context, or memoize per storage key.

- [ ] **[P3] Import-time localStorage scan/wipe** — `[DB-free]` · risk: low
  - **Where:** `lib/data/db-service.ts` (fresh-slate block)
  - **Problem:** module top-level code iterates and clears keys on import; if the guard flag fails to persist, data is re-wiped on every import.
  - **Fix:** move the migration into an explicit versioned one-time init.

### Code Quality
- [ ] **[Q1] Email/password auth UI is dead code** — `[DB-free]` · risk: low
  - **Where:** `app/(auth)/login/page.tsx`
  - **Problem:** the app is Google-OAuth-only but still ships full signIn/signUp forms; default mode is `signup`.
  - **Fix:** remove the credential paths, or document them if intentionally kept.

- [ ] **[Q2] Pervasive `any` types** — `[DB-free]` · risk: low
  - **Where:** `components/analytics/AnalyticsView.tsx`, `app/api/*/route.ts` (`catch (error: any)`), modals (`err: any`)
  - **Problem:** defeats the value of `strict` TypeScript and hides shape mismatches.
  - **Fix:** use `unknown` + narrowing and real domain types.

- [ ] **[Q3] Duplicated list/pagination UI** — `[DB-free]` · risk: low
  - **Where:** `components/members/MemberList.tsx`, `components/payments/PaymentList.tsx`, `components/expenses/ExpenseList.tsx`
  - **Problem:** the search bar, filter row, and pagination markup are copy-pasted three times.
  - **Fix:** extract a shared `DataTable` / pagination component.

- [ ] **[Q5] Docs drift** — `[DB-free]` · risk: low
  - **Where:** `README.md`, `.env.example`
  - **Problem:** the README overstates delivered features (Monte Carlo projection, seasonality, RBAC roles), lists Node `18.17+` while `next@16` requires `>=20.9`, and its env example omits `GEMINI_API_KEY` / `RESEND_API_KEY`. `AttendanceLog` remains unused (kept for requirement 7); `SUPABASE_SERVICE_ROLE_KEY` is kept intentionally.
  - **Fix:** correct the README claims, bump the Node requirement, and add the AI/email env vars.
  - **Done (partial):** README now points at `supabase/schema.sql` and no longer mentions Tailwind.

- [ ] **[Q6] Leak detector uses hardcoded ₱ baselines** — `[DB-free]` · risk: medium
  - **Where:** `lib/ai/leak-detector.ts`
  - **Problem:** category baselines are fixed magic numbers, not real history, and one-off equipment spend is counted as recurring "potential savings".
  - **Fix:** compute baselines from each gym's own historical averages (see also B17).

- [ ] **[Q7] No tests, no test script** — `[DB-free]` · risk: medium
  - **Where:** `package.json` (no `test` script)
  - **Problem:** financial math and AI heuristics are entirely untested.
  - **Fix:** add Vitest + unit tests for `db-service` KPI/trend math and the AI modules.

- [ ] **[Q8] `renewalRate` excludes `'inactive'` and isn't a true renewal rate** — `[DB-free]` · risk: medium
  - **Where:** `lib/data/db-service.ts` (`getDashboardKPIs`)
  - **Problem:** the denominator drops `'inactive'` members, and the metric is really "active share"; it is reused by forecasting as a renewal probability.
  - **Fix:** include `'inactive'` (or rename the field), and derive a real renewal rate.

- [ ] **[Q9] Dead code and duplication** — `[DB-free]` · risk: low
  - **Where:** `lib/data/db-service.ts` (`getAuditLogs` unused; `HISTORICAL_MONTHLY_DATA` unused import), `components/audit/AuditLogView.tsx` (hardcodes the storage key instead of using the service), `components/dashboard/AIInsightsWidget.tsx`, `components/charts/ForecastChart.tsx`, `components/charts/ProfitTrendChart.tsx`, `components/ui/Badge.tsx`, `components/ui/EmptyState.tsx`
  - **Problem:** unused functions/components and a duplicated storage key risk drift.
  - **Fix:** route the audit view through `DBService.getAuditLogs()` and remove or adopt the dead modules.

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

- [ ] **[U6] Pagination caps at 5 page buttons** — `[DB-free]` · risk: low
  - **Where:** `MemberList.tsx`, `PaymentList.tsx`, `ExpenseList.tsx`, `AuditLogView.tsx`
  - **Problem:** pages beyond the 5th can only be reached one Next-click at a time.
  - **Fix:** window the page numbers or add first/last controls.

- [ ] **[U7] Row action dropdowns never close on outside click** — `[DB-free]` · risk: low
  - **Where:** `components/members/MemberList.tsx`
  - **Problem:** the menu closes only when toggling the same button or selecting an item.
  - **Fix:** close on outside click / scroll / Escape.

- [ ] **[U8] Modals lack dialog semantics and focus management** — `[DB-free]` · risk: low
  - **Where:** `components/ui/Modal.tsx`
  - **Problem:** no `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, or initial focus.
  - **Fix:** add ARIA attributes and a focus trap.

### Feature Requests (Requested)
- [ ] **[F1] Clickable dashboard with drill-down overview** — `[DB-free]` · risk: low
  - **Where:** `components/ui/MetricCard.tsx`, `components/dashboard/DashboardOverview.tsx`
  - **Problem:** dashboard cards, charts, and rows are static — no `onClick`/`href`.
  - **Fix:** add `onClick`/`href` to `MetricCard` + chart cards and open a detail view (modal or `/dashboard/...` route): Revenue → payment ledger, Expenses → category breakdown, Net Profit → P&L, Members → member list.

## requires Supabase / DB
These depend on Supabase integration or schema work and are out of scope for the DB-free pass:
- **[S1] No middleware → routes unprotected, sessions not refreshed.** Add `middleware.ts` using `@supabase/ssr` `updateSession` + redirect unauthenticated users to `/login`.
- **[S2] API routes have no auth or rate limiting.** `app/api/ai/narrative/route.ts`, `app/api/email/receipt/route.ts` — require a Supabase session, add per-user rate limiting, and enforce a recipient allow-list.
- **[B9] Password-reset flow is broken.** `app/(auth)/forgot-password/page.tsx` swallows errors and redirects to `/settings`, which has no recovery-token handler; needs a `/reset-password` route calling `updateUser({ password })`.
- **[S5] Password change ignores the current password.** `components/settings/SettingsView.tsx` captures `oldPassword` but never verifies it before `updateUser({ password })`.
- **[U5] No calendar / check-in surface (requirement 7).** Add a Calendar page backed by `attendance_logs`.

## Recommended Order
1. **[DB-free]** Unblock the core demo: plans workflow (**B13**), modal reinitialization (**B14**), reports tabs (**B15**).
2. **[DB-free]** Restore trustworthy numbers: double-count (**B16**), leak window (**B17**), date consistency (**B18**).
3. **[DB-free]** Security & polish: finish escaping (**S4**), then the medium bugs (**B19**–**B24**).
4. **[DB-free]** Performance, quality, and UX: **P1**–**P3**, **Q1**–**Q9**, **U1**–**U4**, **U6**–**U8**, and **F1**.