# Project Requirements

Progress as of Oct 12, 2026.

| Requirement | Status |
| --- | --- |
| Payment reminders via SMS and email | Mostly done |
| Receipt checker (manual) | Done |
| Expense historical data | Done |
| User auditing | Done |
| AI analytics that help owners save money | Mostly done |
| Test with at least 5 gym owners | — |
| 5 gym owners, each with their own gym profile | Partly done |
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
- Warns when another payment already uses the same reference number.
- Receipts can be printed.

## Expense historical data — Done
- Expenses can be filtered by this month, last month, last 3 months, and last 6 months.
- Shows this month against last month, and a 6-month breakdown by category with monthly averages.
- Expense history exports to CSV.

## User auditing — Done
- Records sign-in, sign-up, and sign-out, plus every create, edit, and delete for members, payments, expenses, plans, and settings. Also records receipt checks and reminders.
- Edits show the old and new value of each field, and deleted records keep their key details.
- Filters by action, entity, and date range; search also looks inside event details. Exports to CSV.
- Left: the log is stored in the browser, so it can be cleared and isn't shared across devices (see the gym profiles section below).

## AI analytics that help owners save money — Mostly done
- Analytics page with a revenue forecast, member churn risk, and expense leak detection with estimated monthly and yearly savings.
- Churn risk uses recorded check-ins: staff check members in from the Attendance page (or from Members, a member's page, or the Dashboard), and a drop in visits over the last 30 days raises the risk. The Attendance page also lists current members not seen in 14+ days.
- Gemini writes an executive brief and personalised member messages.
- The dashboard shows the top AI insights.
- Left: when a gym has no expense history yet, leak detection compares against fixed peso amounts instead of the gym's own numbers, and one-off equipment purchases count as savings that would repeat every month.

## Test with at least 5 gym owners

## 5 gym owners, each with their own gym profile — Partly done
- Each owner signs up with their own account and gym profile (name, gym name, currency, phone), stored in Supabase.
- The Supabase schema already has per-owner tables for plans, members, payments, and expenses, with row-level security.
- Left: members, payments, expenses, plans, and the audit log are still saved in the browser, not in Supabase. Two owners using the same browser would see each other's data, and an owner's data doesn't follow them to another device.

## Calendar method — Done
- Monthly calendar of membership expirations, completed payments, and expenses, with a filter for each.
- Each month shows its expiration count and revenue.
- From a day, you can record a payment or send a reminder.

## Clickable dashboard — Done
- The revenue, expenses, profit, and members cards each open a detailed breakdown.
- Sections link to Analytics, expiring members, and Payments.
- Quick buttons add a payment, a member, or an expense without leaving the dashboard.
