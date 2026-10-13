# Project Requirements

Progress as of Oct 13, 2026.

| Requirement | Status |
| --- | --- |
| Payment reminders via SMS and email | Mostly done |
| Receipt checker (manual) | Done |
| Expense historical data | Done |
| User auditing | Done |
| AI analytics that help owners save money | Done |
| Test with at least 5 gym owners | — |
| 5 gym owners, each with their own gym profile | Mostly done |
| Calendar method | Done |
| Clickable dashboard | Done |

## Payment reminders via SMS and email — Mostly done
- Reminders can be sent from Members, Payments, the Calendar, and the Dashboard.
- Email goes through Resend and SMS through Semaphore. Without an API key, sending is simulated.
- Every reminder that goes out is recorded in the Audit Log.
- Left: reminders are only sent by hand; nothing sends them automatically before a due date. Email still uses Resend's test sender, which only delivers to the account owner's address until a domain is verified.

## Receipt checker (manual) — Done
- GCash payments are flagged "Needs Verification", with a count and a filter on the Payments page.
- A receipt can be verified (with notes) or rejected (with a required reason). Rejecting sets the payment back to pending.
- Warns when another payment already uses the same reference number (spaces ignored), and when the reference isn't a 13-digit GCash number.
- New GCash payments (including walk-ins) need a reference number and stay pending until verified. Only then do they count as revenue and activate or extend the membership, so a rejected receipt never gives free time.
- Receipts can be printed.

## Expense historical data — Done
- Expenses can be filtered by this month, last month, last 3 months, and last 6 months.
- Shows this month against last month, and a 6-month breakdown by category with monthly averages.
- Expense history exports to CSV.

## User auditing — Done
- Records sign-in, sign-up, and sign-out, plus every create, edit, and delete for members, payments, expenses, plans, and settings. Also records receipt checks and reminders.
- Edits show the old and new value of each field, and deleted records keep their key details.
- Filters by action, entity, and date range; search also looks inside event details. Exports to CSV.
- Saved in Supabase per gym. Staff actions are recorded under the staff member's email; only the owner can read the log.

## AI analytics that help owners save money — Done
- Analytics page with a revenue forecast, member churn risk, and expense leak detection with estimated monthly and yearly savings.
- Churn risk uses recorded check-ins: staff check members in from the Attendance page (or from Members, a member's page, or the Dashboard), and a drop in visits over the last 30 days raises the risk. The Attendance page also lists current members not seen in 14+ days.
- Gemini writes an executive brief and personalised member messages.
- The dashboard shows the top AI insights.
- Spending checks compare each month with the gym's own earlier months (after 2 months of expenses), treat equipment as one-time purchases, and size the money-saving tips to what the gym actually spends.

## Test with at least 5 gym owners

## 5 gym owners, each with their own gym profile — Mostly done
- All data (plans, members, payments, expenses, check-ins, audit log) is saved in Supabase per gym. Row-level security keeps each gym's data to its own team, and app pages require login.
- After signing up, a new owner goes through onboarding: gym name and address, contact details, opening hours, and their first membership plans. All of it can be edited later in Settings → Gym.
- Owners invite staff by email in Settings → Staff. Staff join the gym when they sign up or sign in with that email. Staff can register and edit members, check members in, record payments, and approve GCash receipts. Expenses, reports, AI analytics, the audit log, plans, gym settings, and deleting members are owner-only.
- Walk-ins (one-time visitors) can be recorded from Attendance or Payments without registering a member. They count toward revenue, show as "Walk-ins" in revenue by plan, and use the gym's walk-in price (set in onboarding or Settings → Gym).
- Owners can upload their gym's logo (onboarding or Settings → Gym). It's stored in Supabase Storage and shown in the sidebar for the whole team.
- New owners start with no data. Sample data for presentations is seeded into one demo account (`supabase/seed.sql`).
- Left: not yet tested with real gym owners. Invites aren't emailed; the owner tells the staff member which email to sign up with. A person can belong to only one gym.

## Calendar method — Done
- Monthly calendar of membership expirations, completed payments, and expenses, with a filter for each.
- Each month shows its expiration count and revenue.
- From a day, you can record a payment or send a reminder.

## Clickable dashboard — Done
- The revenue, expenses, profit, and members cards each open a detailed breakdown.
- Sections link to Analytics, expiring members, and Payments.
- Quick buttons add a payment, a member, or an expense without leaving the dashboard.
