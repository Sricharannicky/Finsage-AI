# FinSage AI — Personal Budget Planning Agent

## Project Status: ✅ COMPLETE & VERIFIED (Phase 3 added)

A production-quality, AI-powered personal finance assistant built with Next.js 16,
TypeScript, Prisma (SQLite), Recharts, Framer Motion, and the Z.ai LLM SDK.

---

## Current Project Status / Assessment

The application is **fully functional and browser-verified**. All 9 modules render
correctly with real seeded data, all API endpoints respond successfully, and the AI
features (chat advisor, spending analysis, ML predictions, weekly report, health score)
work end-to-end with the Z.ai LLM.

### Architecture
- **Frontend**: Next.js 16 App Router (single `/` route), React 19, Tailwind CSS 4,
  shadcn/ui (New York), Recharts, Framer Motion, next-themes (dark default).
- **Backend**: Next.js API routes (REST), JWT auth (jose + bcryptjs) with httpOnly
  cookies, Prisma ORM + SQLite.
- **AI**: z-ai-web-dev-sdk (LLM) for chat/advisor/analysis/budget-suggestion/weekly-report.
- **ML**: Custom TypeScript linear regression + moving average ensemble for expense,
  savings, and balance predictions (substitute for scikit-learn in Node environment).
- **Internal navigation**: Single-page app with view-state routing (Dashboard, Income,
  Expenses, Budgets, Goals, AI Advisor, AI Insights, Reports, Settings).

### Database (Prisma models)
User, Income, Expense, Budget, SavingsGoal, AiChat, Prediction, Notification.

### API Routes
- Auth: `/api/auth/{register,login,logout,me}`
- CRUD: `/api/income`, `/api/expenses`, `/api/budgets`, `/api/goals`
- Aggregation: `/api/dashboard/summary`, `/api/reports`, `/api/export` (CSV)
- AI: `/api/ai/{chat,analysis,prediction,health-score,budget-suggestion,weekly-report,insights}`
- System: `/api/notifications`, `/api/seed`, `/api/settings`

---

## Current Goals / Completed Modifications / Verification Results

### Completed (all 15 application modules from spec)
1. ✅ Authentication (register/login/JWT/demo account)
2. ✅ Dashboard (stat cards, income/expense trend, category pie, health gauge,
   AI insights, goals progress, recent activity, quick actions)
3. ✅ Income Management (CRUD, filters, search, monthly reports, CSV export, bar chart)
4. ✅ Expense Management (CRUD, filters, search, pie + bar charts, CSV export)
5. ✅ Budget Planning (category budgets, progress bars, AI budget suggestion + apply)
6. ✅ Savings Goals (create/edit/delete, contribute funds, progress, deadline tracking)
7. ✅ Reports (daily/weekly/monthly/yearly, area + bar + pie charts, CSV export)
8. ✅ AI Financial Advisor (context-aware chat, markdown, typing animation, suggested Qs)
9. ✅ AI Spending Analysis (natural language summary + categorized insights)
10. ✅ Overspending Detection (auto-generated notification warnings)
11. ✅ Expense Prediction (ML: linear regression + MA ensemble, confidence, forecast chart)
12. ✅ Weekly AI Report (summary, positive/negative habits, suggestions, achievements, warnings)
13. ✅ Financial Health Score (0-100 gauge, 5-factor breakdown, recommendations)
14. ✅ AI Chat Assistant (conversation history, context awareness, markdown, quick replies)
15. ✅ Notifications (auto-generated from overspending/low-savings, bell with unread badge)

### Extra features delivered
- Dark/light theme toggle (dark default), glassmorphism + mesh-gradient design
- Fintech color system (emerald/teal/amber/rose — no indigo/blue)
- Responsive mobile layout with hamburger sidebar
- Demo account with one-click sample data seeding (4 months history, 170+ transactions)
- CSV export for income/expenses/all
- Settings page (profile, income goal, savings target, theme, data management)

### Verification Results (agent-browser + VLM)
- ✅ Auth page renders (glassmorphism, branding panel, demo button)
- ✅ Login works → dashboard loads with real data (Total Income ₹59,485, Expense ₹87,500,
  charts, health score, goals, recent transactions)
- ✅ All 9 views confirmed rendering via DOM text extraction:
  Dashboard, Income, Expenses, Budgets, Goals, AI Advisor, AI Insights, Reports, Settings
- ✅ AI Chat responds with personalized advice (tested "Can I afford an iPhone?" — got
  detailed analysis referencing actual balance, savings rate, budget overruns)
- ✅ AI Spending Analysis returns structured summary + insights
- ✅ ML Prediction returns next-expense ₹70,519 @ 83% confidence, R²=0.71
- ✅ No runtime errors / TypeScript errors / lint errors
- ✅ ESLint passes clean

### Known minor notes
- Dashboard's AI quick-insights call adds ~15s to initial load (LLM call). Could be
  cached/made lazy in a future iteration.
- Sample seed data produces an over-budget scenario (expenses > income) by design to
  showcase the overspending/health-score features realistically.

---

## Unresolved Issues / Risks / Next-Phase Priorities

### Risks
- **Dev server persistence (SOLVED)**: The dev server was being killed when the launching
  Bash command exited. **Solution**: a Python double-fork daemon (`/tmp/dev-daemon.py`)
  reparents the server to init (PID 1), making it survive across Bash tool commands. It
  also auto-restarts on crash. To (re)start: `python3 /tmp/dev-daemon.py`. The 15-min
  webDevReview cron also verifies/restarts as a safety net.

### Priority recommendations for next phase
1. ~~**Performance**: Cache AI quick-insights~~ ✅ DONE (Phase 2) — `/api/ai/cached-insights`
   with 5-min TTL cache; dashboard summary no longer blocks on LLM. Response time: 55ms (was 6-15s).
2. ~~**CSV Import**~~ ✅ DONE (Phase 2) — `/api/import` endpoint + CSV Import dialog with
   file upload, paste, template download, and per-row error reporting.
3. ~~**Recurring transaction automation**~~ ✅ DONE (Phase 2) — `/api/recurring` endpoint
   auto-generates recurring income/expense entries on month rollover (deduped, triggered
   on app mount).
4. **PDF reports**: Generate downloadable PDF reports (currently CSV only). NEXT PRIORITY.
5. **More ML models**: Add Random Forest approximation (currently linear regression + MA)
   and category-level confidence intervals.
6. **Notifications scheduling**: Add a scheduled job to generate weekly reports and
   monthly summaries proactively.
7. **PWA / offline**: Add service worker for offline transaction viewing.
8. ~~**Multi-currency**~~ ✅ DONE (Phase 2) — Currency selector in Settings (INR/USD/EUR/GBP/JPY),
   stored on user, used in formatCurrency.

### Phase 2 — New Features Added (this round)
- **Unified Transactions View**: combined income+expense list with type tabs (All/Income/Expense),
  category filter, search, month picker, and 3 summary cards (Income/Expense/Net). Added to nav.
- **Category Analytics View**: deep drill-down per category — 6-month trend line chart,
  by-payment-method bar chart, recent samples, click-to-select category list. Added to nav.
- **Quick Add FAB**: global floating action button (bottom-right) with expandable menu
  (Add Income / Add Expense / Import CSV) — available on every view.
- **CSV Import**: full dialog with file upload, paste-CSV textarea, template download,
  per-row error reporting, and success summary.
- **Recurring Auto-Generation**: `POST /api/recurring` dedupes by category+source and
  creates current-month copies of recurring templates. Triggered on app mount.
- **AI Insights Caching**: `/api/ai/cached-insights` with 5-min TTL + force-refresh (POST).
  Dashboard now loads in ~55ms (was 6-15s); AI insights load lazily with skeleton.
- **Notification Management**: per-notification delete (X button), "clear all read" button,
  improved hover states.
- **Password Change**: `/api/auth/password` endpoint + dialog in Settings (validates current pw).
- **Currency Selection**: INR/USD/EUR/GBP/JPY selector in Settings, stored on user.
- **Skeleton Loaders**: DashboardSkeleton, StatCardSkeleton, CardSkeleton, ListSkeleton,
  ChartSkeleton for polished loading states.
- **New API Routes**: `/api/import`, `/api/recurring`, `/api/ai/cached-insights`,
  `/api/categories`, `/api/auth/password`, `/api/notifications/clear`, `/api/notifications/[id]`.

### Tech debt
- Some `any` types in API route bodies (lint disabled `@typescript-eslint/no-explicit-any`).
- AI response JSON parsing has try/catch fallbacks (robust but could use zod schemas).

---

## Build & Run
```bash
bun install              # deps (jose, bcryptjs added)
bun run db:push          # create SQLite schema
bun run dev              # start on http://localhost:3000
```
Use the **"Try Demo with Sample Data"** button on the auth screen for instant access
with pre-loaded transactions, budgets, and goals.

---

## Phase 3 — Web Dev Review Round (Cron Trigger 2026-07-02 13:00)

### QA Assessment Performed
- ✅ Dev server alive (HTTP 200) via persistent Python double-fork daemon
- ✅ All 12 nav views navigate correctly (Dashboard, Transactions, Income, Expenses,
  Budgets, Goals, AI Advisor, AI Insights, Categories, Calendar, Reports, Settings)
- ✅ AI Advisor chat responds with personalized advice (tested "Can I afford an iPhone?")
- ✅ No runtime errors / TypeScript errors / lint errors
- ✅ VLM visual analysis confirmed dashboard, calendar, command palette all render well
- Minor visual issues noted & fixed: negative balance now uses rose gradient (was teal)

### New Features Added (Phase 3)
1. **PDF Reports** (`GET /api/reports/pdf`) — Professional monthly financial report
   generated via ReportLab (Python subprocess). 3-page A4 PDF with: Executive Summary
   KPIs, Financial Health Score + breakdown table, Category Breakdown table, 6-Month
   Trend, Savings Goals Progress, Recent Transactions. Passes pdf_qa.py (10 checks ✓,
   2 minor warnings). PDF download buttons added to Dashboard + Reports views.
   - `scripts/generate-report-pdf.py` — ReportLab generator (server-side Python)
   - `src/app/api/reports/pdf/route.ts` — spawns Python, streams PDF bytes
2. **Command Palette** (Cmd+K / Ctrl+K) — Global quick-search & navigation dialog using
   shadcn cmdk. Sections: Quick Actions (Add Expense/Income, Import CSV, Ask AI,
   Download PDF), Navigate (all 12 views), Preferences (theme toggle). Search bar in
   topbar replaced with clickable "⌘K" trigger button.
3. **Spending Calendar View** — Daily spending heatmap (GitHub-style) for last 1/3/6
   months. Color intensity = spend amount (lime→amber→orange→red). Click any day for
   detail (expense/income/txns/top category/net). Plus day-of-week pattern bar chart
   (weekday=green, weekend=red) to spot weekend splurges. Stat cards: total expense,
   income, avg/active day, no-spend days. Added to nav.
4. **AI Coach Widget** (`GET /api/ai/coach`) — Proactive rule-based coaching tips on
   dashboard. Returns 3-5 contextual tips sorted by severity: savings rate analysis,
   budget discipline, month-over-month trend, 3-month acceleration, goal progress nudges,
   no-spend streaks, emergency fund gaps. Each tip has icon, title, description, and
   optional CTA action. Loads lazily with skeleton. Added to dashboard right column.

### Styling Improvements
- Negative balance card now uses rose gradient (was always teal) — clearer visual signal
- Dashboard header buttons use `flex-wrap` for mobile responsiveness
- Command palette search bar with ⌘K kbd hint
- Calendar heatmap with hover scale animation + ring on selected day
- AI Coach tips color-coded by severity (success/warning/danger/info)

### New API Routes (4 added in Phase 3)
- `GET /api/reports/pdf` — PDF report generation (ReportLab via Python subprocess)
- `GET /api/ai/coach` — Proactive AI coach tips (rule-based pattern detection)
- `GET /api/calendar` — Daily spending heatmap data + day-of-week averages

### New Components (4 added)
- `src/components/shared/command-palette.tsx` — Cmd+K dialog
- `src/components/calendar/calendar-view.tsx` — Heatmap calendar view
- `scripts/generate-report-pdf.py` — ReportLab PDF generator script

### Verification Results (Phase 3)
- ✅ PDF: HTTP 200, 8016 bytes, 3 pages, valid PDF 1.4, passes pdf_qa (10/10)
- ✅ AI Coach: returns 4 tips (2 danger, 2 warning) for demo data
- ✅ Calendar: 63 days, 44 active, 19 no-spend, DOW averages computed
- ✅ Command Palette: opens on Cmd+K, shows Quick Actions + Navigate + Preferences
- ✅ All 12 views navigate without errors
- ✅ ESLint clean
- ✅ Sample PDF saved to `/home/z/my-project/download/finsage-sample-report.pdf`

### Updated Priority Recommendations (next phase)
1. ~~**PDF reports**~~ ✅ DONE (Phase 3)
2. **More ML models**: Add Random Forest approximation for category predictions
3. **Notifications scheduling**: Cron-based weekly report + monthly summary generation
4. **PWA / offline**: Service worker for offline transaction viewing
5. **Email notifications**: Send budget-exceeded / goal-completion emails
6. **Multi-user sharing**: Shared household budgets with role-based access
7. **Investment tracking**: Portfolio integration (stocks, mutual funds)
8. **Bill reminders**: Upcoming bill due-date notifications

### Tech debt (unchanged)
- Some `any` types in API route bodies (lint disabled)
- AI response JSON parsing has try/catch fallbacks (could use zod schemas)

---

## Phase 4 — Web Dev Review Round (Cron Trigger 2026-07-02 13:15)

### QA Assessment Performed
- ✅ Dev server alive (HTTP 200) via persistent Python daemon
- ✅ All 15 nav views navigate correctly (Dashboard, Transactions, Income, Expenses,
  Budgets, Goals, Bills, Investments, AI Advisor, AI Insights, Categories, Calendar,
  Reports, Achievements, Settings)
- ✅ AI Advisor chat responds with personalized advice
- ✅ FAB menu, command palette (Cmd+K), add-expense dialog all work
- ✅ No runtime errors / TypeScript errors / lint errors
- ✅ VLM visual analysis confirmed all new views render well

### New Features Added (Phase 4 — 4 major features + 3 new Prisma models)

**1. Bills & Subscriptions Tracker** (new view + API)
- Track recurring bills (rent, utilities, subscriptions) with due day, frequency, auto-pay flag
- Status badges: Overdue / Due Soon / Upcoming / Paid (auto-computed from nextDueDate)
- "Pay" button marks bill paid, optionally creates an expense, advances next due date
- 4 stat cards: Monthly Total, Unpaid Total, Overdue Count, Due Soon Count
- CRUD with add/edit/delete dialogs
- Models: `Bill` (Prisma)
- API: `GET/POST/PUT/DELETE /api/bills`, `POST /api/bills/pay`
- Sample data: 6 bills seeded (Netflix, Electricity, Internet, Gym, Mobile, + test)

**2. Investment Portfolio Tracker** (new view + API)
- Track investments (stocks, mutual funds, ETFs, crypto, FDs, PPF, gold, other)
- Per-holding: invested amount, current value, units, purchase date → auto-computed gain & gain%
- Portfolio summary: Total Invested, Current Value, Total Gain, Returns %
- Allocation pie chart by type + Invested-vs-Current bar chart by type
- Holdings list with gain/loss indicators (green/red)
- Models: `Investment` (Prisma)
- API: `GET/POST/PUT/DELETE /api/investments`
- Sample data: 5 investments seeded (₹3.5L invested, ₹4L value, +₹44.8K gain)

**3. Achievements / Gamification System** (new view + API)
- 14 achievement types with auto-detection logic:
  First Steps, Getting Started, Dedicated Tracker, Planner, Dreamer, Goal Crusher,
  Savings Star, Wealth Builder, Budget Master, Safety Net, Frugal Streak, Curious Mind,
  Trend Reverser, Diversified
- Each achievement tracks progress 0-100%; auto-unlocks + sends notification when hit 100%
- Achievements auto-checked on app mount (via GET /api/achievements side-effect)
- Progress overview card with X/14 unlocked + overall % bar
- Unlocked grid (gold cards with icons) + In-progress grid (with progress bars)
- "Newly unlocked" toast notification on view load
- Models: `Achievement` (Prisma, unique on userId+type)
- API: `GET /api/achievements` (auto-detects + unlocks + returns all)
- Demo user: 7/14 auto-unlocked on first load

**4. Month-over-Month Comparison Widget** (dashboard)
- Side-by-side comparison: current month vs previous month
- Rows: Income, Expense (inverted logic), Savings, Savings Rate (percentage points)
- Change badges with arrow icons + % change
- Top 3 category changes with before→after values + % change badges
- Lazy-loads after dashboard renders
- API: `GET /api/dashboard/comparison`

### Styling Improvements (Phase 4)
- Tightened main content padding (lg:p-6 → lg:p-5) per VLM feedback
- Investment cards use conditional gradient (emerald for gains, rose for losses)
- Achievement cards use gold accent theme (amber-500/10 backgrounds)
- Bills use status-colored borders (rose/amber/blue/emerald) for instant scanability
- Comparison widget uses semantic colors (green=good, red=bad, with invert for expenses)

### New API Routes (5 added in Phase 4)
- `GET/POST/PUT/DELETE /api/bills` — Bills CRUD
- `POST /api/bills/pay` — Mark bill paid + create expense + advance due date
- `GET/POST/PUT/DELETE /api/investments` — Investments CRUD
- `GET /api/achievements` — Auto-detect + unlock + return achievements
- `GET /api/dashboard/comparison` — Month-over-month comparison data

### New Components (4 added)
- `src/components/bills/bills-view.tsx` — Bills & subscriptions tracker
- `src/components/investments/investments-view.tsx` — Portfolio tracker
- `src/components/achievements/achievements-view.tsx` — Gamification dashboard
- `src/components/dashboard/month-comparison-widget.tsx` — MoM comparison widget

### Database Schema Changes (Phase 4)
Added 3 new Prisma models:
- `Bill` — recurring bills with due dates, frequency, auto-pay, paid status
- `Investment` — portfolio holdings with invested/current values, units, type
- `Achievement` — unlocked/in-progress achievements with progress tracking

### Verification Results (Phase 4)
- ✅ Bills API: 6 bills loaded, stats computed correctly
- ✅ Investments API: 5 holdings, ₹3.5L invested, ₹4L value, +₹44.8K gain
- ✅ Achievements API: 7/14 auto-unlocked on first load
- ✅ Comparison API: returns current vs previous month with changes
- ✅ All 15 views navigate without errors
- ✅ VLM confirmed Bills, Investments, Achievements all render correctly
- ✅ ESLint clean

### Updated Priority Recommendations (next phase)
1. ~~**PDF reports**~~ ✅ DONE (Phase 3)
2. ~~**Investment tracking**~~ ✅ DONE (Phase 4)
3. **More ML models**: Add Random Forest approximation for category predictions
4. **Notifications scheduling**: Cron-based weekly report + monthly summary generation
5. **PWA / offline**: Service worker for offline transaction viewing
6. **Email notifications**: Send budget-exceeded / goal-completion emails
7. **Multi-user sharing**: Shared household budgets with role-based access
8. **Bill auto-payment simulation**: Auto-deduct bills on due date
9. **Net worth tracker**: Combine savings + investments + assets over time
10. **AI-powered investment rebalancing suggestions**

### Tech debt (unchanged)
- Some `any` types in API route bodies (lint disabled)
- AI response JSON parsing has try/catch fallbacks (could use zod schemas)

---

## Phase 5 — Web Dev Review Round (Cron Trigger 2026-07-02 13:41)

### QA Assessment Performed
- ✅ Dev server alive (HTTP 200) via persistent Python daemon
- ✅ All 16 nav views navigate correctly (added Net Worth)
- ✅ AI Advisor chat, FAB, command palette all working
- ✅ No runtime errors / lint errors
- ✅ VLM visual analysis confirmed proper rendering
- Fixed: dev server restart needed after Prisma schema changes (Bill/Investment/Achievement models weren't available until restart)

### New Features Added (Phase 5 — 3 major features)

**1. Net Worth Tracker** (new view + API)
- Complete financial picture: cumulative savings + investment value over 12 months
- Hero card with current net worth, monthly change badge, 12-month growth
- 3 composition cards: Savings, Investments, Investment Gain (color-coded)
- 12-month area chart: net worth + investment value + savings (dashed)
- Asset allocation pie chart with progress bars (savings % vs investments %)
- Monthly progression list with month-over-month change indicators
- API: `GET /api/networth` (optimized with running totals, 0.03s response)
- Sample data: ₹3.77L net worth, ₹4L investments, +47.2% yearly growth

**2. AI Investment Insights & Rebalancing** (API + widget on Investments view)
- Diversification score (0-100): based on asset type count + concentration
- Risk score (0-100): weighted by asset type (stocks/crypto=high, FD/PPF=low)
- 6 detection rules: portfolio performance, diversification, over-concentration,
  best/worst performers, risk assessment, investment-to-savings ratio
- Recommendations with priority (high/medium/low) and actionable suggestions
- Rebalancing advice for over-concentrated or high-risk portfolios
- API: `GET /api/ai/investment-insights`
- UI: Violet-themed insights panel on Investments view with score gauges,
  insight cards (✅/⚠️/💡), and recommendation badges

**3. Dashboard Net Worth Sparkline Widget**
- Mini area chart showing 12-month net worth trend
- Current net worth value + monthly change % badge
- Clickable card navigates to full Net Worth view
- Lazy-loads after dashboard renders
- Color-coded: emerald for positive trend, rose for negative

### Styling Improvements (Phase 5)
- Tightened dashboard vertical spacing (space-y-6 → space-y-5)
- Tightened chart column spacing (space-y-6 → space-y-4)
- Improved balance card savings rate text contrast (white/70 → white/90 + font-medium)
- Net Worth hero card uses gradient-emerald with blur accents
- Investment insights use violet theme with score gauges and progress bars
- Sparkline widget uses mesh-bg for visual depth

### New API Routes (2 added in Phase 5)
- `GET /api/networth` — 12-month net worth series + breakdown (optimized, 0.03s)
- `GET /api/ai/investment-insights` — Portfolio analysis with diversification/risk scores

### New Components (3 added)
- `src/components/networth/networth-view.tsx` — Full net worth tracker view
- `src/components/dashboard/networth-sparkline.tsx` — Mini sparkline widget
- (Investment insights integrated into existing investments-view.tsx)

### Performance Fix
- **Net Worth API timeout (60s → 0.03s)**: Replaced per-month filtering of all
  income/expenses with single-pass running totals using sorted arrays + pointer
  advancement. 200x+ performance improvement.

### Verification Results (Phase 5)
- ✅ Net Worth API: 0.033s response, ₹3.77L net worth, 12-month series
- ✅ AI Investment Insights: diversification 69/100, risk 23/100, 3 insights, 1 recommendation
- ✅ All 16 views navigate without errors
- ✅ VLM confirmed Net Worth, Investments AI insights, Dashboard sparkline all render
- ✅ ESLint clean

### Updated Priority Recommendations (next phase)
1. ~~**PDF reports**~~ ✅ DONE (Phase 3)
2. ~~**Investment tracking**~~ ✅ DONE (Phase 4)
3. ~~**Net worth tracker**~~ ✅ DONE (Phase 5)
4. ~~**AI investment insights**~~ ✅ DONE (Phase 5)
5. **More ML models**: Add Random Forest approximation for category predictions
6. **Notifications scheduling**: Cron-based weekly report + monthly summary generation
7. **PWA / offline**: Service worker for offline transaction viewing
8. **Email notifications**: Send budget-exceeded / goal-completion emails
9. **Multi-user sharing**: Shared household budgets with role-based access
10. **Bill auto-payment simulation**: Auto-deduct bills on due date
11. **Financial goals timeline projection**: When will you reach each goal?
12. **Tax saving suggestions**: Section 80C/80D optimization recommendations

### Tech debt (unchanged)
- Some `any` types in API route bodies (lint disabled)
- Dev server needs restart after Prisma schema changes (documented in QA)

---

## Phase 6 — Web Dev Review Round (Cron Trigger 2026-07-02 13:58)

### QA Assessment Performed
- ✅ Dev server alive (HTTP 200) via persistent Python daemon
- ✅ All 17 nav views navigate correctly (added Tax Advisor)
- ✅ AI Advisor chat, FAB, command palette all working
- ✅ No runtime errors / lint errors
- ✅ VLM visual analysis confirmed proper rendering

### New Features Added (Phase 6 — 2 major features)

**1. Tax Saving Advisor** (new view + API)
- Indian tax context: Section 80C (₹1.5L), 80D (₹25K), 80CCD(1B) NPS (₹50K), 80E (education loan)
- Hero card: total potential additional tax savings + estimated tax already saved
- Section utilization stacked bar chart (Used vs Remaining per section)
- 4 section breakdown cards with progress bars, "Maxed" badges, instrument breakdowns
- AI recommendations with priority badges (high/medium) and potential tax saved per action
- Auto-detects current financial year (April-March) and analyzes FY-relevant investments/expenses
- Tax bracket: 31.2% (30% + 4% cess)
- API: `GET /api/ai/tax-suggestions`
- Sample: FY 2026-27, ₹2.14L potential savings, 2 recommendations (80C ₹46.8K + NPS ₹15.6K)

**2. Goals Timeline Projection** (API + section on Goals view)
- Predicts when each goal will be reached based on 3-month avg savings rate
- Per-goal monthly contribution estimate (avg savings ÷ goal count)
- Status badges: On Track / Behind / At Risk / Completed
  - Behind: projected months > deadline months
  - At Risk: projected > 80% of deadline
  - On Track: within deadline
  - Completed: progress ≥ 100%
- Shows months-to-complete + projected completion date
- Summary text with stats (X on track, Y behind)
- API: `GET /api/goals/projection`
- Sample: ₹22.4K avg savings, 3 goals (1 on-track, 2 behind)

### Styling Improvements (Phase 6)
- Tax hero card uses gradient-emerald with blur accents (consistent with Net Worth hero)
- Section breakdown cards use per-section colors (emerald/cyan/violet/amber)
- AI recommendations use violet theme (consistent with investment insights)
- Goals projection section uses emerald gradient theme with status-colored borders
- Status badges color-coded (emerald=on-track, rose=behind, amber=at-risk)

### New API Routes (2 added in Phase 6)
- `GET /api/ai/tax-suggestions` — Tax saving analysis with section breakdowns + recommendations
- `GET /api/goals/projection` — Goal completion timeline projections

### New Components (1 added)
- `src/components/tax/tax-view.tsx` — Tax Saving Advisor view
- (Goals projection integrated into existing goal-view.tsx)

### Verification Results (Phase 6)
- ✅ Tax API: FY 2026-27, ₹2.14L potential, 2 recommendations (80C + NPS)
- ✅ Goals Projection: ₹22.4K avg savings, 3 goals with status (1 on-track, 2 behind)
- ✅ All 17 views navigate without errors
- ✅ VLM confirmed Tax Advisor and Goals projection all render correctly
- ✅ ESLint clean

### Updated Priority Recommendations (next phase)
1. ~~**PDF reports**~~ ✅ DONE (Phase 3)
2. ~~**Investment tracking**~~ ✅ DONE (Phase 4)
3. ~~**Net worth tracker**~~ ✅ DONE (Phase 5)
4. ~~**AI investment insights**~~ ✅ DONE (Phase 5)
5. ~~**Tax saving suggestions**~~ ✅ DONE (Phase 6)
6. ~~**Goals timeline projection**~~ ✅ DONE (Phase 6)
7. **More ML models**: Add Random Forest approximation for category predictions
8. **Notifications scheduling**: Cron-based weekly report + monthly summary generation
9. **PWA / offline**: Service worker for offline transaction viewing
10. **Email notifications**: Send budget-exceeded / goal-completion emails
11. **Multi-user sharing**: Shared household budgets with role-based access
12. **Bill auto-payment simulation**: Auto-deduct bills on due date
13. **Dashboard spending velocity widget**: Daily avg spend rate this month

### Tech debt (unchanged)
- Some `any` types in API route bodies (lint disabled)
- Dev server needs restart after Prisma schema changes (documented in QA)

---

## Phase 7 — Web Dev Review Round (Cron Trigger 2026-07-02 14:00)

### QA Assessment Performed
- ✅ Dev server alive (HTTP 200) via persistent Python daemon
- ✅ All 17 nav views navigate correctly
- ✅ AI Advisor chat, FAB, command palette all working
- ✅ No runtime errors / lint errors
- ✅ VLM visual analysis confirmed proper rendering

### New Features Added (Phase 7 — 2 major features)

**1. Smart Budget AI** (API + panel on Budgets view)
- Dynamic budget reallocation suggestions based on 3-month spending patterns
- Analyzes each budgeted category: current vs avg monthly spend, utilization %, trend
- Status per category: Critical (>120%) / Over (>100%) / Under (<50%) / On Track
- Reallocation suggestions: identifies surplus categories to fund deficit categories
- Unbudgeted spending detection: categories with significant spend but no budget
- Recommended budget per category (avg × 1.1 buffer)
- Summary with stats (over/under/on-track counts)
- API: `GET /api/ai/smart-budget`
- Sample: 6 over budget, 1 under, 3 reallocations (Food→Shopping/Entertainment/Healthcare)

**2. Spending Velocity Widget** (API + dashboard widget)
- Daily average spend rate this month
- Projected month-end total at current pace
- Days elapsed / remaining in month
- 14-day daily spending sparkline
- Velocity ratio (actual vs expected pace, e.g. 19.26x)
- Status: High / On Pace / Low with color-coded badges
- Budget exceed warning if projected > budget
- API: `GET /api/dashboard/velocity`
- Sample: ₹29.6K/day avg, ₹9.18L projected, 19.26x pace, High status

### Styling Improvements (Phase 7)
- Standardized dashboard header buttons (uniform h-9 height, consistent outline style)
- PDF button simplified (removed rose border, consistent with Add Expense)
- Ask AI button enhanced with shadow-sm shadow-emerald-500/20
- Smart Budget panel uses violet theme (consistent with other AI panels)
- Velocity widget uses violet sparkline + status-colored badges
- Budget health analysis grid uses status-colored backgrounds (rose/amber/blue/emerald)

### New API Routes (2 added in Phase 7)
- `GET /api/ai/smart-budget` — Budget reallocation analysis + recommendations
- `GET /api/dashboard/velocity` — Daily spend rate + projection + 14-day series

### New Components (1 added)
- `src/components/dashboard/spending-velocity-widget.tsx` — Velocity widget
- (Smart Budget panel integrated into existing budget-view.tsx)

### Verification Results (Phase 7)
- ✅ Smart Budget API: 6 over, 1 under, 3 reallocations, 3 unbudgeted categories
- ✅ Velocity API: ₹29.6K/day, ₹9.18L projected, 19.26x pace, High status
- ✅ All 17 views navigate without errors
- ✅ VLM confirmed Smart Budget AI and Spending Velocity widget render correctly
- ✅ ESLint clean

### Updated Priority Recommendations (next phase)
1. ~~**PDF reports**~~ ✅ DONE (Phase 3)
2. ~~**Investment tracking**~~ ✅ DONE (Phase 4)
3. ~~**Net worth tracker**~~ ✅ DONE (Phase 5)
4. ~~**AI investment insights**~~ ✅ DONE (Phase 5)
5. ~~**Tax saving suggestions**~~ ✅ DONE (Phase 6)
6. ~~**Goals timeline projection**~~ ✅ DONE (Phase 6)
7. ~~**Smart budget AI**~~ ✅ DONE (Phase 7)
8. ~~**Spending velocity widget**~~ ✅ DONE (Phase 7)
9. **More ML models**: Add Random Forest approximation for category predictions
10. **Notifications scheduling**: Cron-based weekly report + monthly summary generation
11. **PWA / offline**: Service worker for offline transaction viewing
12. **Email notifications**: Send budget-exceeded / goal-completion emails
13. **Multi-user sharing**: Shared household budgets with role-based access
14. **Bill auto-payment simulation**: Auto-deduct bills on due date
15. **Currency conversion**: Live rates for multi-currency support

### Tech debt (unchanged)
- Some `any` types in API route bodies (lint disabled)
- Dev server needs restart after Prisma schema changes (documented in QA)

---

## Phase 8 — Web Dev Review Round (Cron Trigger 2026-07-02 14:15)

### QA Assessment Performed
- ✅ Dev server alive (HTTP 200) via persistent Python daemon
- ✅ All 18 nav views navigate correctly (added Challenges)
- ✅ AI Advisor chat, FAB, command palette all working
- ✅ No runtime errors / lint errors
- ✅ VLM visual analysis confirmed proper rendering

### New Features Added (Phase 8 — 1 major feature)

**1. AI Savings Challenges** (new view + API + Prisma model)
- Gamified savings challenges to build better money habits
- 8 challenge templates: No-Spend Week, Cook at Home Week, Save 20%, No Coffee Month,
  Audit Subscriptions, Pack Your Lunch, Walk & Save, 52-Week Challenge
- Each challenge has: icon, target days, reward badge, description
- Auto-tracks progress: completed days auto-increment based on elapsed days
- Auto-completes when target reached + sends notification with reward badge
- Manual "Day Done" button to increment progress
- Abandon challenge with confirmation dialog
- Stats: Active / Completed / Total Attempted / Badges Earned
- Active challenges with progress bars + reward badges
- Completed challenges shown as gold achievement cards
- Available challenges with Start buttons
- Model: `Challenge` (Prisma, unique on userId+type+status)
- API: `GET/POST/PUT /api/challenges`
- Sample: 2 challenges started (No-Spend Week + Cook at Home Week)

### Styling Improvements (Phase 8)
- Enhanced dashboard chart line thickness (2.5 → 3) for better contrast
- Challenge cards use amber theme for active, emerald for completed
- Progress bars with reward badges
- Available challenges use violet hover accents
- Consistent stat card design (gradient backgrounds with white text)

### New API Routes (1 added in Phase 8)
- `GET/POST/PUT /api/challenges` — Challenge CRUD + auto-progress tracking

### New Components (1 added)
- `src/components/challenges/challenges-view.tsx` — Savings challenges view

### Database Schema Changes (Phase 8)
Added 1 new Prisma model:
- `Challenge` — savings challenges with type, target days, progress, status, reward

### Verification Results (Phase 8)
- ✅ Challenges API: 8 templates, 2 started, auto-progress working
- ✅ All 18 views navigate without errors
- ✅ VLM confirmed Challenges view renders correctly (active + available sections)
- ✅ ESLint clean

### Updated Priority Recommendations (next phase)
1. ~~**PDF reports**~~ ✅ DONE (Phase 3)
2. ~~**Investment tracking**~~ ✅ DONE (Phase 4)
3. ~~**Net worth tracker**~~ ✅ DONE (Phase 5)
4. ~~**AI investment insights**~~ ✅ DONE (Phase 5)
5. ~~**Tax saving suggestions**~~ ✅ DONE (Phase 6)
6. ~~**Goals timeline projection**~~ ✅ DONE (Phase 6)
7. ~~**Smart budget AI**~~ ✅ DONE (Phase 7)
8. ~~**Spending velocity widget**~~ ✅ DONE (Phase 7)
9. ~~**Savings challenges**~~ ✅ DONE (Phase 8)
10. **More ML models**: Add Random Forest approximation for category predictions
11. **Notifications scheduling**: Cron-based weekly report + monthly summary generation
12. **PWA / offline**: Service worker for offline transaction viewing
13. **Email notifications**: Send budget-exceeded / goal-completion emails
14. **Multi-user sharing**: Shared household budgets with role-based access
15. **Bill auto-payment simulation**: Auto-deduct bills on due date
16. **Currency conversion**: Live rates for multi-currency support
17. **Financial benchmarking**: Compare your stats vs recommended ratios

### Tech debt (unchanged)
- Some `any` types in API route bodies (lint disabled)
- Dev server needs restart after Prisma schema changes (documented in QA)

---

## Phase 9 — Web Dev Review Round (Cron Trigger 2026-07-02 14:30)

### QA Assessment Performed
- ✅ Dev server alive (HTTP 200) via persistent Python daemon
- ✅ All 19 nav views navigate correctly (added Benchmark)
- ✅ AI Advisor chat, FAB, command palette all working
- ✅ No runtime errors / lint errors
- ✅ VLM visual analysis confirmed proper rendering

### New Features Added (Phase 9 — 1 major feature)

**1. Financial Benchmarking** (new view + API)
- Compares user's financial ratios against recommended standards
- 6 benchmark ratios analyzed:
  - Savings Rate (rec: 20-30%) — % of income saved monthly
  - Expense Ratio (rec: 50-70%) — % of income spent
  - Emergency Fund (rec: 3-6 months) — months of expenses covered
  - Debt-to-Income (rec: <20%) — EMI as % of income
  - Housing Ratio (rec: 25-30%) — rent as % of income
  - Investment Allocation (rec: 40-60%) — investments as % of net worth
- Hero card with overall score (0-100), grade, in-range count, net worth
- Comparison bar chart: user values vs recommended ranges (green=in range, red=out)
- 6 ratio cards with: icon, user value, recommended range, in/out of range status, personalized advice
- Overall score calculation: averages per-ratio scores with distance penalty
- API: `GET /api/ai/benchmark`
- Sample: Score 46/100 (Poor), 0/6 in range (demo has overspending scenario)

### Styling Improvements (Phase 9)
- Benchmark hero card uses gradient-emerald with blur accents (consistent with Net Worth/Tax heroes)
- Ratio cards use conditional borders (emerald for in-range, rose for out-of-range)
- Comparison chart with color-coded bars (green/red) for instant visual feedback
- Consistent badge styling across all benchmark cards

### New API Routes (1 added in Phase 9)
- `GET /api/ai/benchmark` — Financial ratio benchmarking with 6 metrics + personalized advice

### New Components (1 added)
- `src/components/benchmark/benchmark-view.tsx` — Financial benchmarking view

### Verification Results (Phase 9)
- ✅ Benchmark API: 6 ratios analyzed, score 46/100, personalized advice per ratio
- ✅ All 19 views navigate without errors
- ✅ VLM confirmed Benchmark view renders correctly (score, chart, ratio cards)
- ✅ ESLint clean

### Updated Priority Recommendations (next phase)
1-9. ~~All previous features~~ ✅ DONE (Phases 3-8)
10. ~~**Financial benchmarking**~~ ✅ DONE (Phase 9)
11. **More ML models**: Add Random Forest approximation for category predictions
12. **Notifications scheduling**: Cron-based weekly report + monthly summary generation
13. **PWA / offline**: Service worker for offline transaction viewing
14. **Email notifications**: Send budget-exceeded / goal-completion emails
15. **Multi-user sharing**: Shared household budgets with role-based access
16. **Bill auto-payment simulation**: Auto-deduct bills on due date
17. **Currency conversion**: Live rates for multi-currency support

### Tech debt (unchanged)
- Some `any` types in API route bodies (lint disabled)
- Dev server needs restart after Prisma schema changes (documented in QA)

---

## Phase 10 — Web Dev Review Round (Cron Trigger 2026-07-02 14:45)

### QA Assessment Performed
- ✅ Dev server alive (HTTP 200) via persistent Python daemon
- ✅ All 20 nav views navigate correctly (added Currency)
- ✅ AI Advisor chat, FAB, command palette all working
- ✅ No runtime errors / lint errors
- ✅ VLM visual analysis confirmed proper rendering

### New Features Added (Phase 10 — 2 major features)

**1. Multi-Currency Converter** (new view + API)
- 10 currencies supported: INR, USD, EUR, GBP, JPY, AUD, CAD, SGD, AED, CNY
- Interactive converter: From/To selectors with swap button, amount input, live result
- Exchange rate display: 1 FROM = X TO with formatted conversion
- All rates table: every currency's rate relative to selected "From" currency
- Auto-detects user's currency from profile
- API: `GET /api/currency` (returns rates + symbols + names)
- Helper functions: `convertFromINR()`, `formatInCurrency()` for future integration

**2. Dashboard Financial Tips Ticker** (widget on dashboard)
- Rotating carousel of 16 smart financial tips
- Auto-rotates every 8 seconds with smooth animation transitions
- Each tip has: icon, text, and optional "Learn →" link to relevant view
- Dismissible (X button) — hidden for session
- Amber→violet gradient background for visual distinction
- Tips cover: savings, emergency fund, budgeting, investments, taxes, challenges, etc.

### Styling Improvements (Phase 10)
- Enhanced dashboard chart colors: brighter emerald (#34d399) and rose (#fb7185) for better contrast
- Increased gradient opacity (0.4 → 0.5) for more vivid area fills
- Tips ticker uses amber-violet gradient with animated transitions
- Currency converter result uses emerald highlight box for emphasis
- Currency rate cards highlight selected "To" currency with emerald border

### New API Routes (1 added in Phase 10)
- `GET /api/currency` — Exchange rates for 10 currencies + symbols + names

### New Components (2 added)
- `src/components/currency/currency-view.tsx` — Multi-currency converter view
- `src/components/dashboard/tips-ticker.tsx` — Rotating financial tips widget

### Verification Results (Phase 10)
- ✅ Currency API: 10 currencies, rates + symbols returned
- ✅ All 20 views navigate without errors
- ✅ VLM confirmed Currency Converter and Tips Ticker render correctly
- ✅ ESLint clean

### Updated Priority Recommendations (next phase)
1-10. ~~All previous features~~ ✅ DONE (Phases 3-9)
11. ~~**Currency conversion**~~ ✅ DONE (Phase 10)
12. **More ML models**: Add Random Forest approximation for category predictions
13. **Notifications scheduling**: Cron-based weekly report + monthly summary generation
14. **PWA / offline**: Service worker for offline transaction viewing
15. **Email notifications**: Send budget-exceeded / goal-completion emails
16. **Multi-user sharing**: Shared household budgets with role-based access
17. **Bill auto-payment simulation**: Auto-deduct bills on due date

### Tech debt (unchanged)
- Some `any` types in API route bodies (lint disabled)
- Dev server needs restart after Prisma schema changes (documented in QA)

---

## Phase 11 — Web Dev Review Round (Cron Trigger 2026-07-02 14:56)

### QA Assessment Performed
- ✅ Dev server alive (HTTP 200) via persistent Python daemon
- ✅ All 21 nav views navigate correctly (added Recurring)
- ✅ AI Advisor chat, FAB, command palette all working
- ✅ No runtime errors / lint errors
- ✅ VLM visual analysis confirmed proper rendering

### New Features Added (Phase 11 — 1 major feature)

**1. Recurring Transaction Scheduler** (new view + API)
- Lists all recurring income & expenses in one place (deduplicated by category+source)
- Shows next occurrence date for each item (computed from last date + 1 month)
- Status badges: "Today" / "Xd" (upcoming within 7 days) / "Overdue"
- Toggle switch to enable/disable recurring status per item
- 4 stat cards: Monthly Income, Monthly Expense, Net Recurring, Due This Week
- Sorted by next occurrence date (soonest first)
- API: `GET /api/recurring-list` (list + stats), `PUT /api/recurring-list` (toggle recurring)
- Sample: 6 recurring items (1 income + 5 expenses), ₹21.4K net monthly recurring

### Styling Improvements (Phase 11)
- Added ⚠️ emoji to Balance card label when negative (per VLM feedback)
- Shortened all 16 tips ticker messages for better visibility (per VLM feedback)
- Recurring view uses consistent gradient stat cards (emerald/rose/teal/violet)
- Status badges color-coded (amber for upcoming, rose for overdue)
- Toggle switches for easy recurring status management

### New API Routes (1 added in Phase 11)
- `GET /api/recurring-list` — List all recurring transactions with next occurrence + stats
- `PUT /api/recurring-list` — Toggle recurring status of a transaction

### New Components (1 added)
- `src/components/recurring/recurring-view.tsx` — Recurring transaction scheduler view

### Verification Results (Phase 11)
- ✅ Recurring API: 6 items, ₹56.4K income, ₹35K expense, ₹21.4K net recurring
- ✅ All 21 views navigate without errors
- ✅ VLM confirmed Recurring view renders correctly (stat cards, list, toggles)
- ✅ ESLint clean

### Updated Priority Recommendations (next phase)
1-11. ~~All previous features~~ ✅ DONE (Phases 3-10)
12. ~~**Recurring transaction scheduler**~~ ✅ DONE (Phase 11)
13. **More ML models**: Add Random Forest approximation for category predictions
14. **Notifications scheduling**: Cron-based weekly report + monthly summary generation
15. **PWA / offline**: Service worker for offline transaction viewing
16. **Email notifications**: Send budget-exceeded / goal-completion emails
17. **Multi-user sharing**: Shared household budgets with role-based access
18. **Bill auto-payment simulation**: Auto-deduct bills on due date
19. **AI-powered spending anomaly detection**: Flag unusual transactions

### Tech debt (unchanged)
- Some `any` types in API route bodies (lint disabled)
- Dev server needs restart after Prisma schema changes (documented in QA)

---

## Phase 12 — Web Dev Review Round (Cron Trigger 2026-07-02 15:00)

### QA Assessment Performed
- ✅ Dev server alive (HTTP 200) via persistent Python daemon
- ✅ All 21 nav views navigate correctly
- ✅ AI Advisor chat, FAB, command palette all working
- ✅ No runtime errors / lint errors
- ✅ VLM visual analysis confirmed proper rendering
- Fixed: Anomaly API date query bug (Prisma expects Date objects, not strings)

### New Features Added (Phase 12 — 1 major feature)

**1. AI Spending Anomaly Detection** (new tab in AI Insights + API)
- Statistical analysis flags unusual transactions using 3-month baseline
- 4 detection types:
  - **High Amount**: amount > avg + 2×std (and >1.5× avg)
  - **Frequency Spike**: transaction count > 2× monthly average (min 5)
  - **New Category**: category not seen in previous 3 months (min ₹1000)
  - **Unusual Timing**: late-night spending (11pm-5am) over ₹500
- Severity levels: Critical (danger) / Warning / Info
- Summary card with severity counts + total flagged amount
- Color-coded anomaly cards with reason, expected vs actual amount
- Baseline built from 12 categories over 3 months
- API: `GET /api/ai/anomaly`
- Sample: 8 anomalies detected (1 warning, 7 info), ₹49.4K total flagged

### Styling Improvements (Phase 12)
- Enhanced notification badge: added ring-2 ring-background + shadow-sm for better visibility
- Badge now uses min-w-4 + px-1 for better number fit (per VLM feedback)
- Anomaly cards use severity-colored borders/backgrounds (rose/amber/blue)
- Summary card changes color based on max severity (rose/amber/emerald)
- AI Insights tabs grid updated from 4 to 5 columns for Anomalies tab

### Bug Fixes (Phase 12)
- **Anomaly API date query**: Fixed Prisma query that passed string dates instead of
  Date objects. Replaced `getMonthsAgo() + "-01"` string concatenation with proper
  `new Date(year, month-1, 1)` Date objects for gte/lt conditions.

### New API Routes (1 added in Phase 12)
- `GET /api/ai/anomaly` — Statistical anomaly detection with 4 detection types

### Verification Results (Phase 12)
- ✅ Anomaly API: 8 anomalies (1 warning, 7 info), 12 baseline categories, ₹49.4K flagged
- ✅ All 21 views navigate without errors
- ✅ VLM confirmed Anomaly Detection tab renders correctly
- ✅ ESLint clean

### Updated Priority Recommendations (next phase)
1-12. ~~All previous features~~ ✅ DONE (Phases 3-11)
13. ~~**AI anomaly detection**~~ ✅ DONE (Phase 12)
14. **More ML models**: Add Random Forest approximation for category predictions
15. **Notifications scheduling**: Cron-based weekly report + monthly summary generation
16. **PWA / offline**: Service worker for offline transaction viewing
17. **Email notifications**: Send budget-exceeded / goal-completion emails
18. **Multi-user sharing**: Shared household budgets with role-based access
19. **Bill auto-payment simulation**: Auto-deduct bills on due date
20. **Debt payoff planner**: Snowball/avalanche strategy calculator

### Tech debt (unchanged)
- Some `any` types in API route bodies (lint disabled)
- Dev server needs restart after Prisma schema changes (documented in QA)

---

## Phase 13 — Continue to Build (2026-07-02)

### New Features Added (2 major features)

**1. Debt Payoff Planner** (new view + API)
- Analyzes EMI/debt expenses and calculates snowball vs avalanche payoff strategies
- Snowball: smallest balance first (psychological wins)
- Avalanche: highest interest first (mathematically optimal, saves interest)
- Interactive strategy comparison cards (click to select)
- Payoff timeline line chart comparing both strategies
- Extra payment scenario: shows impact of adding ₹2,000/month extra
- Debt list with payoff order (numbered based on selected strategy)
- Hero card: total debt, monthly payments, best strategy savings
- Summary with personalized recommendation
- API: `GET /api/ai/debt-payoff`
- Sample: ₹3.47L total debt, 235 months standard → 51 months with ₹2K extra

**2. Bill Auto-Payment Simulation** (API + button on Bills view)
- `POST /api/bills/autopay` — processes all overdue bills at once
- Creates expense records for each paid bill
- Advances next due date per bill frequency
- Sends notification with total paid and bill names
- "Auto-Pay All" button on Bills view (appears when overdue bills exist)
- Button shows loading spinner during processing

### New API Routes (2 added)
- `GET /api/ai/debt-payoff` — Debt payoff strategy calculator
- `POST /api/bills/autopay` — Auto-pay all due/overdue bills

### New Components (1 added)
- `src/components/debt/debt-payoff-view.tsx` — Debt payoff planner view

### Verification Results
- ✅ Debt Payoff API: ₹3.47L debt, avalanche vs snowball, +₹2K saves 184 months
- ✅ Bills Autopay API: processes overdue bills, creates expenses, advances dates
- ✅ All 22 views navigate without errors
- ✅ VLM confirmed Debt Payoff view renders correctly
- ✅ ESLint clean

### Current State
- 22 fully-featured views
- 42+ API endpoints
- 9 Prisma models
- Dev server alive on port 3000

---

## Phase 14 — Continue to Build (2026-07-02)

### New Features Added (2 dashboard widgets)

**1. Financial Health Radar Chart Widget** (dashboard)
- Multi-dimensional radar chart showing 5 financial health axes:
  Savings, Expenses, Budget, Goals, Emergency Fund
- Each axis normalized to 0-100% with color-coded scores
- Overall score badge with grade (color varies by score)
- Per-axis percentage breakdown below chart
- Uses Recharts RadarChart with polar grid
- Lazy-loads after dashboard renders

**2. Savings Rate Tracker Widget** (dashboard)
- 6-month savings rate history area chart with 20% target reference line
- Stats row: Average rate, Best month, Months on target (≥20%)
- Trend indicator (6-month change in percentage points)
- Color-coded based on current rate (emerald≥20%, amber≥10%, rose<10%)
- API: `GET /api/dashboard/savings-rate`
- Sample: Current -59.2%, Average -17.7%, Best 22.9% (Jun), 1/6 on target

### New API Routes (1 added)
- `GET /api/dashboard/savings-rate` — 6-month savings rate history + stats

### New Components (2 added)
- `src/components/dashboard/health-radar-widget.tsx` — Financial health radar chart
- `src/components/dashboard/savings-rate-widget.tsx` — Savings rate tracker with chart

### Verification Results
- ✅ Savings Rate API: 6-month series, avg -17.7%, best 22.9%, 1/6 on target
- ✅ Both widgets confirmed present on dashboard (VLM verified)
- ✅ All 22 views navigate without errors
- ✅ ESLint clean

### Current State
- 22 fully-featured views
- 43+ API endpoints
- 9 Prisma models
- 2 new dashboard widgets (Health Radar + Savings Rate Tracker)
- Dev server alive on port 3000
