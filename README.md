# Smart Gym Finance Manager (SGFM)

An intelligent, cloud-based financial management platform and modern web application engineered for fitness center operators, gym owners, and studio managers. Built with an Apple-inspired minimalist design aesthetic, real-time analytics, and automated financial intelligence.

![Smart Gym Finance Manager](public/logo.png)

---

## 🌟 Key Features

- **Apple-Grade Modern UI/UX**: Frosted glassmorphism, responsive spring animations, fluid micro-interactions, and tight typography hierarchy.
- **AI-Powered Predictive Financials**:
  - **90-Day Cash Flow Projections**: Automated Monte Carlo simulation forecasting future revenues and operating margins.
  - **Member Churn Radar**: Risk scoring identifying at-risk renewals before revenue leakage occurs.
  - **Expense Anomaly Sentinel**: Flagging irregular cost spikes across equipment maintenance, utilities, and payroll.
- **Comprehensive Ledger & Multi-Payment Processing**: Real-time tracking across Cash, Bank Transfer, GCash, and Card payments.
- **Instant Board-Ready Reports**: 1-click export of structured Financial Statements, P&L, and Ledger summaries in Excel (`.xlsx`) and PDF formats.
- **Role-Based Access Control**: Granular roles for Admins, Managers, and Staff with row-level security policies.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Frontend**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Vanilla CSS Modules & Design System (`app/globals.css`), Tailwind CSS
- **Database & Auth**: [Supabase](https://supabase.com/) & PostgreSQL
- **Icons**: [Lucide React](https://lucide.dev/)
- **Data Exporting**: `xlsx`, `jspdf`, `jspdf-autotable`

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.17+ or 20+ installed
- Git installed

### 2. Installation

Clone the repository:
```bash
git clone https://github.com/jastennx/Gym-Manager.git
cd Gym-Manager
```

Install dependencies:
```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file based on `.env.example`:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_CURRENCY=₱
```

### 4. Database Setup

Execute the migration script in Supabase SQL Editor:
```
supabase/migrations/20260927_init_sgfm.sql
```

### 5. Running the Application

Start the local development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Privacy

- Sensitive `.env` and environment configuration files are strictly excluded via `.gitignore`.
- Authentication handled via secure encrypted sessions and Supabase Auth.
- Strict Row Level Security (RLS) policies protecting tenant and financial ledger records.

---

## 📄 License

This project is proprietary and intended for gym management operations.
