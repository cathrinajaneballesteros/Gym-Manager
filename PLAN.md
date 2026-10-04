# PLAN.md

> **How to use this file — keep it updated!**
> - `[ ]` = not done, `[x]` = done. Tick a box **only when the item is fully delivered and verified**; untick it (`[x]` → `[ ]`) if it regresses or is reopened.
> - When a **project requirement** moves between *Not started / Partial / Done*, update its checkbox **and** the matching line in `## Current Status`.
> - When an **issue** ([B]/[S]/[P]/[Q]/[U]) or a **feature request** ([F]) is completed, tick its box and append a short `Done:` note describing what changed.
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
1. Payment reminders (SMS + email) — **Partial**: Resend email service exists but is never called from the UI; no SMS, no scheduling/reminders.
2. Receipt checker (manual) — **Partial**: "Receipt" button only shows a fake `Receipt Verified` alert; `/api/email/receipt` exists but is dead code.
3. Expense historical data — **Partial**: expenses live only in `localStorage`; monthly aggregation is hardcoded to Apr–Sep 2026.
4. User auditing — **Done**: localStorage-backed action audit trail (`DBService.recordAudit` / `getAuditLogs`) records member/payment/expense mutations plus login/logout/signup, surfaced on a new `/audit` page with filters, summaries, and live refresh. Note: `attendance_logs` / `AttendanceLog` is unrelated to auditing and belongs to requirement 7.
5. AI analytics to save money — **Partial**: Gemini narrative + heuristic churn/leak detection, but leak baselines are hardcoded.
6. Test with 5 gym owners — **Unknown**: not determinable from code (no fixtures/feedback artifacts).
7. Calendar method — **Not started**: no calendar/check-in UI; header date pill is hardcoded.

## Scan Summary
The UI is polished and consistent (Apple-style inline styles, SweetAlert2, Recharts), and type contracts in `types/database.ts` / `types/ai.ts` are clean. However, the app is a functional prototype rather than a cloud product: **all business data lives in `localStorage` via `DBService`** — Supabase is used only for auth and a single `profiles` upsert — so the well-written `schema.sql` (tables, indexes, RLS) is largely unused. There is **no `middleware.ts`**, so protected routes are not actually protected and Supabase sessions are never refreshed server-side. Several analytics results are driven by hardcoded dates/baselines (`'2026-09-27'`, Apr–Sep 2026, ₱ category baselines), and the `app/api/*` routes have no auth or rate limiting. Overall: strong presentation, thin/fragile data + security layer; the highest-value work is correctness of the financial math and real auth/session handling — both achievable without DB access.

## Issues

### Bugs
- [ ] **[B8] Deleting a member orphans their payments**
  - File: `lib/data/db-service.ts` (line 209)
  - Problem: `deleteMember` doesn't remove related payments, which still count toward revenue.
  - Fix: cascade-delete payments for that `member_id`.
  - Risk: medium / Needs DB access: no

- [ ] **[B9] Password-reset flow is broken**
  - File: `app/(auth)/forgot-password/page.tsx` (line 18)
  - Problem: errors are swallowed (always shows success) and `redirectTo` points at `/settings`, which has no recovery-token handler.
  - Fix: surface errors and add a `/reset-password` route that calls `updateUser({ password })`.
  - Risk: medium / Needs DB access: no

- [ ] **[B10] Receipt email endpoint is dead code**
  - File: `app/api/email/receipt/route.ts` (whole file)
  - Problem: no component ever calls it, so receipts cannot actually be emailed to members.
  - Fix: wire an "Email receipt" action in `PaymentList` / `PaymentModal` to this route.
  - Risk: low / Needs DB access: no

### Security
- [ ] **[S1] No middleware → routes unprotected, sessions not refreshed**
  - File: `app/(app)/layout.tsx` (no `middleware.ts` in repo)
  - Problem: `(app)` pages render for anyone; `lib/supabase/server.ts` assumes a session-refreshing middleware that does not exist.
  - Fix: add `middleware.ts` using `@supabase/ssr` `updateSession` + redirect unauthenticated users to `/login`.
  - Risk: high / Needs DB access: no

- [ ] **[S2] API routes have no auth or rate limiting**
  - File: `app/api/ai/narrative/route.ts`, `app/api/email/receipt/route.ts`
  - Problem: public POST endpoints can burn Gemini quota and send arbitrary emails from your domain.
  - Fix: require a Supabase session and add per-user rate limiting + recipient allow-listing.
  - Risk: high / Needs DB access: no

- [ ] **[S3] Gemini key sent in the URL query string**
  - File: `lib/ai/gemini-service.ts` (line 53)
  - Problem: `?key=${apiKey}` can leak the API key through logs, proxies, and caches.
  - Fix: send it in the `x-goog-api-key` request header instead.
  - Risk: medium / Needs DB access: no

- [x] **[S4] Unescaped user input injected into HTML**
  - File: `components/analytics/AnalyticsView.tsx` (line 129), `lib/email/resend-service.ts` (line 72), `app/(auth)/login/page.tsx` (line 156)
  - Problem: member names / AI messages are interpolated raw into SweetAlert and email HTML.
  - Fix: HTML-escape interpolated values before rendering.
  - Risk: medium / Needs DB access: no
  - Done: added `escapeHtml()` (`lib/ui/escape.ts`) and applied it to the AI brief / retention-message HTML (`AnalyticsView`), the Resend receipt HTML, and the login confirmation block.

- [ ] **[S5] Password change ignores the current password**
  - File: `components/settings/SettingsView.tsx` (line 95)
  - Problem: `oldPassword` state is captured in the UI but never verified or sent to Supabase.
  - Fix: re-authenticate before `updateUser({ password })`, or remove the unused field.
  - Risk: medium / Needs DB access: no

### Performance
- [ ] **[P1] 1.9 MB logo shipped as a raw `<img>`**
  - File: `public/logo.png` (also committed at repo root)
  - Problem: ~1.9 MB loaded on every page incl. the landing page; no compression and no `next/image`.
  - Fix: compress to under ~100 KB and adopt `next/image`.
  - Risk: medium / Needs DB access: no

- [ ] **[P2] Synchronous storage reads inside render**
  - File: `lib/data/db-service.ts` (all getters)
  - Problem: components call `DBService.getX()` during render; each call re-parses JSON from `localStorage` with no caching.
  - Fix: load once into React state/context, or memoize per storage key.
  - Risk: medium / Needs DB access: no

- [ ] **[P3] Import-time localStorage scan/wipe**
  - File: `lib/data/db-service.ts` (lines 30–46)
  - Problem: module top-level code iterates and clears keys on import (runs on every page importing it).
  - Fix: move the migration into an explicit versioned one-time init / `useEffect`.
  - Risk: low / Needs DB access: no

- [ ] **[P4] O(months × rows) trend computation**
  - File: `lib/data/db-service.ts` (`getMonthlyTrends`, line 358)
  - Problem: re-scans the full payments/expenses arrays once per month bucket.
  - Fix: single pass building a `Map<monthKey, totals>`.
  - Risk: low / Needs DB access: no

### Code Quality
- [ ] **[Q1] Email/password auth UI is dead code**
  - File: `app/(auth)/login/page.tsx` (lines 100–168)
  - Problem: the app is Google-OAuth-only but still ships full signIn/signUp forms; default mode is `signup`.
  - Fix: remove the credential paths, or document them if intentionally kept.
  - Risk: low / Needs DB access: no

- [ ] **[Q2] Pervasive `any` types**
  - File: `components/analytics/AnalyticsView.tsx` (line 103), `app/api/*/route.ts` (`catch (error: any)`), modals (`err: any`)
  - Problem: defeats the value of `strict` TypeScript and hides shape mismatches.
  - Fix: use `unknown` + narrowing and real domain types.
  - Risk: low / Needs DB access: no

- [ ] **[Q3] Duplicated list/pagination UI**
  - File: `components/members/MemberList.tsx`, `components/payments/PaymentList.tsx`, `components/expenses/ExpenseList.tsx`
  - Problem: search bar, filter row, and pagination markup are copy-pasted three times.
  - Fix: extract a shared `DataTable` / pagination component.
  - Risk: low / Needs DB access: no

- [x] **[Q4] Hardcoded dates presented as live UI**
  - File: `components/layout/Header.tsx` (line 116), `components/payments/PaymentList.tsx` (line 206)
  - Problem: fixed "Apr 1 – Apr 30, 2026" pills look interactive but never change.
  - Fix: render the real current period or make them non-interactive labels.
  - Risk: low / Needs DB access: no
  - Done: replaced the static pills with `getCurrentMonthRangeLabel()` (`lib/ui/date.ts`) in `Header`, `ReportsView`, `ExpenseList`, and `PaymentList`.

- [x] **[Q5] Docs/config drift**
  - File: `README.md`, `.env.example`, `types/database.ts`
  - Problem: README references a non-existent `supabase/migrations/…` path; `SUPABASE_SERVICE_ROLE_KEY` is unused; `AttendanceLog` type is unused.
  - Fix: correct the README and remove unused config/types (or actually use them).
  - Risk: low / Needs DB access: no
  - Done: README now points at `supabase/schema.sql` and drops the Tailwind mention. Kept `SUPABASE_SERVICE_ROLE_KEY` (reserved for future server-side use) and the `AttendanceLog` type (needed for requirement 7).

- [ ] **[Q6] Leak detector uses hardcoded ₱ baselines**
  - File: `lib/ai/leak-detector.ts` (lines 6–15)
  - Problem: category baselines are fixed magic numbers, not real history; one-off equipment spend is also counted as "potential savings".
  - Fix: compute baselines from each gym's own historical averages.
  - Risk: medium / Needs DB access: no

- [ ] **[Q7] No tests, no test script**
  - File: `package.json` (no `test` script)
  - Problem: financial math and AI heuristics are entirely untested.
  - Fix: add Vitest + unit tests for `db-service` KPI/trend math and the AI modules.
  - Risk: medium / Needs DB access: no

### UX
- [ ] **[U1] Blank flash while data loads**
  - File: `components/dashboard/DashboardOverview.tsx` (line 61), `components/analytics/AnalyticsView.tsx` (line 150), `components/reports/ReportsView.tsx` (line 46)
  - Problem: components `return null` until state is set, showing an empty frame on first paint.
  - Fix: render skeleton loaders.
  - Risk: low / Needs DB access: no

- [ ] **[U2] Notifications are simulated**
  - File: `components/analytics/AnalyticsView.tsx` (`handleContactMember`, line 171)
  - Problem: "Direct Ping" only shows a toast; nothing is actually sent to the member.
  - Fix: wire to the Resend/SMS path or relabel the action to "Copy message".
  - Risk: low / Needs DB access: no

- [ ] **[U3] Receipt button fakes verification**
  - File: `components/payments/PaymentList.tsx` (line 330)
  - Problem: the "Receipt" action shows a success alert with no receipt content or PDF.
  - Fix: generate a real receipt (PDF/email) or clearly relabel the action.
  - Risk: low / Needs DB access: no

- [ ] **[U4] Header search + bell are non-functional**
  - File: `components/layout/Header.tsx` (lines 81, 121)
  - Problem: the search input and notification bell do nothing (the bell only clears a dot).
  - Fix: implement them or remove them to avoid misleading affordances.
  - Risk: low / Needs DB access: no

- [ ] **[U5] No calendar / check-in surface (requirement 7)**
  - File: `components/layout/Sidebar.tsx` (nav list)
  - Problem: no calendar or attendance route exists despite the `attendance_logs` table and `AttendanceLog` type being defined.
  - Fix: add a Calendar page backed by `attendance_logs`.
  - Risk: medium / Needs DB access: yes

### Feature Requests (Requested)
- [ ] **[F1] Clickable dashboard with drill-down overview**
  - File: `components/ui/MetricCard.tsx`; `components/dashboard/DashboardOverview.tsx` (KPI cards L137–167, charts L182–209)
  - Problem: dashboard cards, charts, and rows are static — no `onClick`/`href`, so clicking a metric does nothing.
  - Fix: add `onClick`/`href` to `MetricCard` + chart cards, and open a full detail view (modal or `/dashboard/...` route) of the clicked item (e.g. Revenue → payment ledger, Expenses → category breakdown, Net Profit → P&L, Members → member list).
  - Risk: low / Needs DB access: no

## Recommended Order
1. **[DB-free]** Add `middleware.ts` for Supabase session refresh + route protection ([S1]) — biggest security win, no schema changes.
2. **[DB-free]** Decide member-deletion behavior ([B8]) so payments keep attribution (soft-delete or name snapshot) instead of cascade-deleting.
3. **[DB-free]** Harden `app/api/*`: require auth + rate limit ([S2]) and move the Gemini key to a header ([S3]).
4. **[DB-free]** Remaining product/infra work: password reset ([B9]), receipt email ([B10]), leak baselines ([Q6]), tests ([Q7]), calendar/attendance ([U5]), clickable dashboard ([F1]).
