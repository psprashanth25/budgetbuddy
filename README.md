# BudgetBuddy

BudgetBuddy is a work-in-progress personal budgeting application with a React frontend and an Express backend.

## Current Functionality

- Add, edit, delete, search, and filter expenses in the dashboard.
- Track monthly income, spending totals, remaining balance, and spending forecasts.
- Create category budgets with usage indicators and budget alerts.
- Manage categories while preventing deletion of categories used by expenses.
- View monthly spending reports with charts, category breakdowns, and PDF export.

## Project Structure

- `frontend/`: Vite, React, React Router, Tailwind CSS, Recharts, and jsPDF application.
- `backend/`: Express server with CORS and JSON middleware.

## Run Locally

Install dependencies in each package directory, then start the applications separately:

```text
cd frontend
npm install
npm run dev
```

```text
cd backend
npm install
node server.js
```

The frontend currently stores expenses, income, budgets, and categories in browser `localStorage`. The backend currently exposes only a basic root response at port `5000`; database persistence, API integration, authentication, and automated tests are not implemented yet.

## Checks

Run frontend checks from `frontend/`:

```text
npm run lint
npm run build
```

The production build passes. The existing lint configuration currently reports issues in the in-progress page implementations and should be addressed as follow-up cleanup.