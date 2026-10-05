# PLAN

## Project Requirements
- Payment reminders via SMS and email
- Receipt checker (manual)
- Expense historical data
- User auditing
- AI analytics that help owners save money
- Test with at least 5 gym owners
- 5 gym owners, each with their own gym profile
- Calendar method
- Clickable dashboard

## Bugs
- **Deleting a member leaves their payments behind** — `lib/data/db-service.ts` — after a member is removed their payments stay, still count as revenue, and show up as "Direct Guest", losing who paid.
- **Membership plans can't be created** — `lib/data/mock-data.ts`, `lib/data/db-service.ts`, `components/members/MemberModal.tsx` — there's no plans screen and the add-plan function is never called, so on a fresh install you can't create members or payments because a plan is required.
- **Reports tabs don't do anything** — `components/reports/ReportsView.tsx` — every tab shows the same content; only the highlight changes.
- **Adding a member also records a payment on its own** — `lib/data/db-service.ts` — it always creates a completed payment for the plan's price, so recording that payment again double-counts revenue.
- **Spending leak detector compares the wrong periods** — `lib/ai/leak-detector.ts` — it adds up every expense ever made and compares that to monthly baselines, so after a couple of months it falsely flags categories and hugely overstates possible savings; it also triggers at 25% while the comment says 30%.
- **Dates are handled in UTC in some places and local time in others** — `lib/data/db-service.ts`, `lib/ai/churn-detector.ts`, `components/audit/AuditLogView.tsx` — memberships and counts can flip a day early or late near midnight.
- **"Active Members" change on the dashboard is always 0%** — `components/dashboard/DashboardOverview.tsx`, `lib/data/db-service.ts` — active members are counted across all time, so this month and last month are always the same.

## Security
- **The Gemini API key is put in the URL** — `lib/ai/gemini-service.ts` — the key is sent as a `?key=` query parameter, which can leak through logs, proxies, and caches.

## Performance
- **A 1.9 MB logo loads on every page** — `public/logo.png` — it's a plain uncompressed image with no Next.js image optimization, and it's also committed at the repo root.
- **Data is re-read from browser storage on every render** — `lib/data/db-service.ts` — every getter parses the same JSON out of `localStorage` again with no caching, and components call them during render.

## Code Quality
- **Dead email/password login code** — `app/(auth)/login/page.tsx` — the app only uses Google sign-in but still ships full sign-in/sign-up forms, and it opens on sign-up.
- **Copy-pasted list and pagination UI** — `components/members/MemberList.tsx`, `components/payments/PaymentList.tsx`, `components/expenses/ExpenseList.tsx` — the search bar, filter row, and pagination are duplicated three times.
- **README is out of date** — `README.md` — it claims features that aren't delivered, says Node 18.17+ while Next 16 needs 20.9+, and omits the Gemini/Resend environment variables.
- **Leak detector uses hardcoded peso baselines** — `lib/ai/leak-detector.ts` — category limits are fixed numbers instead of the gym's real history, and one-off equipment buys are counted as recurring savings.
- **No tests** — `package.json` — there's no test script, so the finance math and AI logic are untested.

## UX
- **Blank flash while data loads** — `components/dashboard/DashboardOverview.tsx`, `components/analytics/AnalyticsView.tsx`, `components/reports/ReportsView.tsx` — these render nothing until data is ready, so the page flashes empty.
- **Search, bell, and date control in the header do nothing** — `components/layout/Header.tsx` — they look clickable but have no behavior.
