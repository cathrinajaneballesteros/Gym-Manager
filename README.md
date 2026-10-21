# Smart Gym Finance Manager (SGFM)

A web app for gym owners in the Philippines to run their gym's money side: members and renewals, cash and GCash payments, walk-ins, expenses, check-ins, reports, and simple forecasts. Each gym's data is private to its owner and the staff they invite.

<img src="public/logo.svg" alt="Smart Gym Finance Manager" width="96" />

---

## 🌟 Features

- **Gym setup**: new owners go through a short onboarding (gym name, logo, contact details, opening hours, membership plans, walk-in price).
- **Members**: register members on a plan, track active / expiring / expired status, check-ins (once per day), and send payment reminders by email or SMS.
- **Payments**: record Cash and GCash payments and walk-ins. GCash payments stay pending until the receipt's reference number is checked. Print a receipt with the gym's logo and details.
- **Expenses**: log running costs by category, with spending checks that compare each month to the gym's own past months.
- **Reports**: revenue, expenses, profit and loss, and monthly/annual views, exported to PDF or Excel.
- **Analytics**: a revenue forecast from past months, members at risk of not renewing (based on real visits), saving tips, and optional AI summaries (Google Gemini).
- **Owner and Staff roles**: owners see everything; staff handle check-ins, members and payments. Staff are invited by email and choose to join. Access is enforced in the database (row-level security), not just the UI.
- **Audit log**: who did what, written by the database so it can't be skipped or faked.
- **Works on phones**: bottom tab bar, layouts that fit small screens.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) 16 (App Router), [React](https://react.dev/) 19, [TypeScript](https://www.typescriptlang.org/)
- **Styling**: plain CSS (`app/globals.css`) and inline styles
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage)
- **Email / SMS / AI**: [Resend](https://resend.com/), [textbee](https://textbee.dev/), [Google Gemini](https://ai.google.dev/), all optional
- **Exports**: `xlsx`, `jspdf`, `jspdf-autotable`
- **Icons and charts**: [Lucide React](https://lucide.dev/), [Recharts](https://recharts.org/)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20.9 or newer
- A Supabase project

### 2. Install

```bash
git clone https://github.com/jastennx/Gym-Manager.git
cd Gym-Manager
npm install
```

### 3. Environment variables

Create `.env.local`:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key

# Optional: without these the feature is simulated or turned off
GEMINI_API_KEY=        # AI summaries on Analytics
RESEND_API_KEY=        # reminder emails
TEXTBEE_API_KEY=       # reminder SMS (textbee.dev)
TEXTBEE_DEVICE_ID=     # the linked phone, from the textbee dashboard
```

On Vercel, add the same variables under Project Settings → Environment Variables, then redeploy.

### 4. Database

In the Supabase SQL Editor, run these **in order**:

1. `supabase/schema.sql`
2. Every file in `supabase/migrations/`, from `001_multi_tenant.sql` to `008_invite_accept_and_server_audit.sql`

Each migration is safe to run again. Optional demo data: sign up in the app as `demo@smartgym.com`, then run `supabase/seed.sql`. It fills that account with plans, 16 sample members, 6 months of payments, walk-ins, check-ins and expenses, dated relative to the day you run it. Running it again refreshes the sample rows and keeps anything you added. Other accounts start empty.

### 5. Supabase Auth settings

Under **Authentication → URL Configuration**:

- **Site URL**: your live site, e.g. `https://your-app.vercel.app`.
- **Redirect URLs**: add `https://your-app.vercel.app/**`, plus `http://localhost:3000/**` for local development.

This makes email confirmation, password reset and Google sign-in links return to the app. You can use `supabase/email-templates/confirm-signup.html` as the signup confirmation email.

### 6. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📝 Notes

- **Resend test sender**: until you verify a domain in Resend, emails from `onboarding@resend.dev` are only delivered to the Resend account's own email.
- **Usage limits**: each account can send up to 20 reminder emails, 20 SMS and 30 AI requests per hour.
- **Vercel Hobby plan**: deployments are blocked for commits authored by someone other than the Vercel project owner. The owner can use **Redeploy** in the Vercel dashboard after merging.

---

## 📄 License

This project is proprietary and intended for gym management operations.
