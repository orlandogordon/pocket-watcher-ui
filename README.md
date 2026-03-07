# Pocket Watcher UI

A personal finance management dashboard for tracking accounts, transactions, budgets, investments, and debt repayment.

## Features

- **Accounts** — Manage checking, savings, credit card, loan, and investment accounts with balance tracking
- **Transactions** — Full transaction list with filtering by account, category, tags, type, date range, and description search. Supports split categories, amortization, and transaction relationships (refunds, offsets, reversals)
- **Budgets** — Create budgets with per-category allocations and track spending against them with performance breakdowns
- **Categories & Tags** — Hierarchical category tree with subcategories, plus color-coded tags for flexible transaction labeling
- **Statement Uploads** — Upload CSV/PDF bank statements with duplicate detection, preview review, and bulk editing before import
- **Investments** — Portfolio overview with holdings, cost basis tracking, and investment transaction history (buys, sells, dividends)
- **Debt Repayment** — Debt payoff plans with strategy selection (avalanche/snowball), linked accounts, payment tracking, and progress visualization
- **Financial Plans** — Monthly financial planning with income/expense projections and actual vs planned comparisons
- **Dashboard** — Summary stats, net worth chart, active budget progress, and recent transactions at a glance

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui (Radix UI primitives)
- TanStack Query v5
- React Router v7
- React Hook Form + Zod

## Getting Started

```bash
npm install
npm run dev
```

The app expects the Pocket Watcher API running at `http://localhost:8000`. Configure via the `VITE_API_URL` environment variable if needed.
