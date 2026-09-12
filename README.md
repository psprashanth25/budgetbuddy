# BudgetBuddy

> A modern, full-stack personal finance and pocket-money management web application tailored for hostel and college students.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-success?style=for-the-badge&logo=vercel)](https://budgetbuddy-khaki-nine.vercel.app)
[![Backend API](https://img.shields.io/badge/Backend%20API-Render-informational?style=for-the-badge&logo=render)](https://budgetbuddy-sh3s.onrender.com/)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-green?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/atlas)
[![Automated Tests](https://img.shields.io/badge/Tests-42%20Passing-brightgreen?style=for-the-badge)](backend/verify_budgetbuddy.js)
[![License: ISC](https://img.shields.io/badge/License-ISC-orange?style=for-the-badge)](LICENSE)

BudgetBuddy is a full-stack MERN application engineered to solve the real-world financial challenges faced by students living in hostels and university accommodations. Managing personal finances in a hostel environment requires balancing irregular pocket money transfers from parents, recurring monthly living costs, unexpected campus expenses, and maintaining a reliable bank balance buffer without overdrafting.

Traditional budgeting tools are overly complex, enterprise-focused, or assume fixed monthly corporate salaries. BudgetBuddy introduces a student-centric financial ledger model featuring dual-mode analytics (Pocket Money tracking vs. Total Bank Balance protection), hierarchical expense categorization, date-restricted entry validation, and automated client-side PDF statement generation.

---

## 1. Live Demo & Deployed Services

The application is deployed to production:

| Service | Platform | Link | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | **Vercel** | [https://budgetbuddy-khaki-nine.vercel.app](https://budgetbuddy-khaki-nine.vercel.app) | Live, production React application. Open this URL in any browser to use the full application. |
| **Backend REST API** | **Render** | [https://budgetbuddy-sh3s.onrender.com](https://budgetbuddy-sh3s.onrender.com) | Express.js API powering authentication, ledger math, categories, budgets, and reporting. |
| **API Health Check** | **Render** | [https://budgetbuddy-sh3s.onrender.com/](https://budgetbuddy-sh3s.onrender.com/) | Live service monitor verifying API uptime, MongoDB Atlas connection, and SMTP readiness. |
| **Database Cluster** | **MongoDB Atlas** | Cloud Replica Set | Cloud-hosted MongoDB cluster storing users, categories, expenses, and monthly records. |

> [!NOTE]
> **API Route Behavior**: The root URL `https://budgetbuddy-sh3s.onrender.com/` serves as the official API health check and returns a JSON status report. Opening `/api` directly in a browser will return `{"success":false,"message":"Route /api not found"}`. This is expected because `/api` is an endpoint namespace prefix, not a standalone route. Individual REST resources reside under subpaths such as `/api/auth`, `/api/expenses`, `/api/categories`, `/api/reports`, and `/api/dashboard`.

---

## 2. Project Preview

```text
docs/screenshots/
├── login.png                 # Sign In & 6-Digit Email OTP Verification
├── dashboard.png             # Live Financial Ledger Cards & Analytics Mode
├── expenses.png              # Expense Ledger with search, sorting & category filtering
├── categories.png            # Multi-level category hierarchy & management
├── reports.png               # Monthly statements, audit trail & Recharts visualizations
└── financial-statement.png   # Printable A4 PDF statement generated client-side
```

### Preview Gallery

| Authentication & Verification | Dashboard Overview |
| :---: | :---: |
| ![Login & OTP Verification](docs/screenshots/login.png) | ![Dashboard Overview](docs/screenshots/dashboard.png) |
| *Secure authentication with 6-digit email OTP* | *Authoritative bank balance & pocket money tracking* |

| Expense Ledger & Filtering | Category Hierarchy |
| :---: | :---: |
| ![Expense Management](docs/screenshots/expenses.png) | ![Category Management](docs/screenshots/categories.png) |
| *Real-time search, date controls & overspending guard* | *Protected default categories with custom subcategories* |

| Financial Reports & Analytics | PDF Financial Statement |
| :---: | :---: |
| ![Reports & Audit Trail](docs/screenshots/reports.png) | ![Generated PDF Statement](docs/screenshots/financial-statement.png) |
| *Interactive category distribution & monthly audit trail* | *Executive-grade A4 printable financial statement* |

---

## 3. How to Use the Live Project

1. **Open the Live Web Application**:
   Navigate to [https://budgetbuddy-khaki-nine.vercel.app](https://budgetbuddy-khaki-nine.vercel.app).
2. **Access Your Account**:
   - **Demo Access**: On the Sign In page, click **"Use Demo Account (aman@hostel.edu)"** to immediately prefill demo credentials (`password123`) and explore pre-seeded hostel expenses.
   - **New Registration**: Click **"Register now"**, enter your name, email, and password. A 6-digit OTP code will be sent to your email for account activation.
3. **Set Up Opening Balances**:
   On your first visit, set your initial **Current Bank Balance** (representing your actual funds across savings and cash).
4. **Allocate Monthly Pocket Money**:
   When a new month starts, enter that month's pocket money allowance. The entered funds credit dynamically to your total bank balance.
5. **Manage Daily Expenses**:
   Record hostel expenses (Mess food, Tea, College supplies, Wi-Fi, Travel) with date validation (future dates are strictly blocked) and note descriptions.
6. **Analyze & Export Reports**:
   Visit the **Reports** section to view interactive Recharts breakdowns, verify the historical audit trail, or click **"Download PDF"** to generate an official printable A4 statement.

The live application is fully connected to the deployed Render backend and live MongoDB Atlas cluster.

---

## 4. Deployment Architecture

BudgetBuddy utilizes a modern, decoupled cloud architecture designed for high availability, zero server maintenance, and fast global delivery:

```mermaid
flowchart LR
    subgraph Client["Client Browser"]
        SPA["React 19 SPA (Vite)<br/>Tailwind CSS & Recharts"]
    end

    subgraph Hosting["Global CDN Hosting"]
        Vercel["Vercel Edge Network<br/>budgetbuddy-khaki-nine.vercel.app"]
    end

    subgraph Backend["Cloud Web Service"]
        Render["Render Web Service<br/>Node.js 20+ & Express.js 5<br/>budgetbuddy-sh3s.onrender.com"]
    end

    subgraph Database["Database Cluster"]
        Atlas[("MongoDB Atlas Cloud<br/>Replica Set Cluster")]
    end

    subgraph Email["Outbound SMTP"]
        SMTP["Gmail SMTP / Nodemailer<br/>TLS Port 587 (OTP Delivery)"]
    end

    SPA -->|HTTPS / Static Assets| Vercel
    SPA -->|REST API Requests with Bearer JWT| Render
    Render -->|Mongoose Queries| Atlas
    Render -->|Dispatches 6-Digit OTPs| SMTP
```

- **Frontend (Vercel)**: React 19 single-page application built with Vite and hosted on Vercel's global edge network for sub-second page delivery and instant routing. Communicates with the backend exclusively via HTTPS REST API calls configured via `VITE_API_URL`.
- **Backend (Render)**: Express 5 API running in a containerized Linux environment on Render. Handles business logic, JWT authentication, ledger calculations, and CORS validation.
- **Database (MongoDB Atlas)**: Managed MongoDB cloud database with automated backups, replica sets, connection pooling, and SSL/TLS encryption in transit.
- **Email Delivery (Nodemailer)**: SMTP transporter connecting via TLS on port 587 to send account activation OTPs and single-use password reset links.

---

## 5. Deployment Details & Configuration

### Platform Specifications

| Component | Platform | Configuration / Setting | Value |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vercel | Framework Preset | `Vite` |
| | | Build Command | `npm run build` |
| | | Output Directory | `dist` |
| | | Install Command | `npm install` |
| | | Production Domain | `https://budgetbuddy-khaki-nine.vercel.app` |
| **Backend** | Render | Environment | `Node` |
| | | Build Command | `npm install` |
| | | Start Command | `npm start` (`node server.js`) |
| | | Entrypoint File | `server.js` |
| | | Port Binding | Listens dynamically on `process.env.PORT || 5000` bound to `0.0.0.0` |
| | | Production Domain | `https://budgetbuddy-sh3s.onrender.com` |
| **Database** | MongoDB Atlas | Cluster Tier | Shared Cloud Cluster (`M0 / Replica Set`) |
| | | Driver / Protocol | `mongodb+srv://` with TLS 1.2+ encryption |

---

## 6. Environment Variables Reference

To protect sensitive credentials, **never commit real `.env` files to GitHub**. Configure actual values securely in the Vercel and Render management dashboards.

### Frontend Environment Variables (Vercel)

Set in **Vercel Project Settings &rarr; Environment Variables**:

```env
# URL pointing to the deployed backend REST API
VITE_API_URL=<deployed-backend-api-url>
```

*Example for production:*
```env
VITE_API_URL=https://budgetbuddy-sh3s.onrender.com/api
```

### Backend Environment Variables (Render)

Set in **Render Web Service &rarr; Environment**:

```env
# Server Port (assigned automatically by Render, defaults to 5000)
PORT=5000

# MongoDB Atlas Connection String
MONGO_URI=<mongodb-atlas-connection-string>

# JWT Secret Key for signing authentication tokens
JWT_SECRET=<your-jwt-secret>

# Allowed Frontend Origin for CORS (must match your Vercel URL without trailing slash)
CLIENT_URL=<deployed-frontend-url>

# Nodemailer Outbound SMTP Settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=<your-email>
EMAIL_PASS=<your-gmail-app-password>
EMAIL_FROM=<your-email>
```

> [!IMPORTANT]
> **Production Secrets Policy**:
> - Never expose real passwords, Google App Passwords, MongoDB connection URIs, or JWT secrets in public repositories.
> - In development, store local secrets in `backend/.env` and `frontend/.env`, both of which are strictly excluded from version control via `.gitignore`.
> - In production, manage environment variables exclusively through Vercel and Render dashboards.

---

## 7. API Health Check & Diagnostics

The deployed backend exposes an authoritative health monitor at its root endpoint:

```http
GET https://budgetbuddy-sh3s.onrender.com/
```

### Example JSON Response

```json
{
  "status": "online",
  "message": "BudgetBuddy API Running",
  "database": {
    "mongooseReadyState": 1,
    "isMongoConnected": true,
    "mode": "MongoDB",
    "host": "ac-av5q73l-shard-00-01.4am622d.mongodb.net",
    "database": "budgetbuddy"
  },
  "emailConfigured": true,
  "timestamp": "2026-09-12T19:12:47.177Z"
}
```

### Field Definitions
- **`status`**: `"online"` when the Express web application is running and responding.
- **`message`**: Confirmation banner (`"BudgetBuddy API Running"`).
- **`database`**: Real-time Mongoose connection telemetry confirming `readyState: 1` (`connected`), connection mode (`MongoDB`), cluster hostname, and active database name.
- **`emailConfigured`**: `true` when SMTP transporter credentials are valid and verified.
- **`timestamp`**: ISO-8601 UTC server timestamp.

---

## 8. Troubleshooting & Production Notes

### 1. Frontend Cannot Connect to Server
- **Symptom**: Network errors, login timeouts, or "Unable to connect to server" alerts.
- **Resolution**:
  1. Verify that `VITE_API_URL` in Vercel project settings is set to `https://budgetbuddy-sh3s.onrender.com/api` (including the `/api` subpath).
  2. Redeploy the frontend in Vercel if you recently modified the variable, as Vite bakes environment variables into the static bundle at build time.

### 2. CORS Errors in Browser Console
- **Symptom**: `Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource...`
- **Resolution**:
  1. Inspect the `CLIENT_URL` environment variable on Render.
  2. Ensure it exactly matches your deployed Vercel domain: `https://budgetbuddy-khaki-nine.vercel.app` (without trailing slashes or subpaths).
  3. Restart the Render web service to apply environment variable updates.

### 3. Render Cold Starts (Free Tier Spin-Down)
- **Symptom**: The first API request after a period of inactivity takes 15–30 seconds.
- **Resolution**: Render's free tier spins down idle instances after 15 minutes. When a new request arrives, Render automatically spins up the instance. Subsequent requests respond in milliseconds. If loading persists on your first visit, wait a few moments for the service to wake up.

### 4. Avoiding Localhost URLs in Production
- **Symptom**: Frontend attempts to call `http://localhost:5000` from the public internet.
- **Resolution**: Ensure all production configurations use the deployed HTTPS domain names. Never set `VITE_API_URL` or `CLIENT_URL` to `localhost` in production deployment settings.

---

## 9. Key Features

- **Robust Authentication & Account Security**:
  - Secure registration requiring full name, valid email, and password confirmation.
  - Mandatory 6-digit email OTP verification via Nodemailer SMTP with 60-second resend cooldowns and attempt rate-limiting.
  - Secure JWT session management (30-day expiry) with token validation on protected client routes.
  - Cryptographically secure single-use password reset links sent via email with expiration handling and account enumeration protection.

- **Student-Centric Dual-Mode Financial Accounting**:
  - **Current Bank Balance**: Authoritative live balance representing actual funds across bank accounts and savings.
  - **This Month's Pocket Money**: Discretionary funds allocated for the current calendar month that dynamically credit to your balance upon entry.
  - **Dynamic Analytics Mode Switching**:
    - **Pocket Money Mode**: When pocket money is available, spending is analyzed against your monthly allowance.
    - **Total Bank Balance Mode**: When pocket money is exhausted (or pending), the system automatically displays an exhaustion notification and shifts analytics to your total bank balance.
    - **Overspending Prevention**: Strictly blocks expenses that exceed your total available bank balance, preventing negative funds.

- **Intelligent Calendar & Transaction Controls**:
  - Automatically syncs with the active calendar month.
  - Strict validation preventing future-dated expense entries.
  - Carried-forward opening balances across month boundaries so unspent funds are never lost.

- **Hierarchical Category Management**:
  - Seeded default categories (`Food`, `Travel`, `Shopping`, `Bills`, `Entertainment`, `Other`) protected against deletion.
  - Support for custom multi-level nested categories (e.g., `Trip` &rarr; `Transport` &rarr; `Flight`).
  - Safe category deletion that prevents deleting categories or parent categories that contain active transactions.

- **Searchable Expense Ledger**:
  - Real-time search across expense notes, categories, and amounts.
  - Filter by category, year, and month.
  - Sorting by newest, oldest, highest amount, and lowest amount.
  - Full edit and delete capabilities with automatic balance recalculation.

- **Audit Trails & Visual Reporting**:
  - Visual category distribution donut charts and 12-month spending trend bar charts powered by Recharts.
  - "Monthly Ledger Summary & Audit Trail" table tracking opening balances, pocket money status, monthly spendings, and closing balances.
  - One-click navigation to dedicated monthly statements (`/reports/:year/:month`).

- **Official Financial Statement PDF Generation**:
  - Built-in, high-fidelity printable A4 PDF statement generator using `jsPDF` and `jspdf-autotable`.
  - Includes institutional branding, reference numbers, active analysis mode badges, category breakdowns, and verified line-item transaction tables.

---

## 10. Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 7](https://vite.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/) (BrowserRouter, Protected Routes, Dynamic Parameters)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts & Visualizations**: [Recharts v3](https://recharts.org/)
- **Client-Side PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF) & [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- **Deployment Platform**: [Vercel](https://vercel.com/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (v20+ / v24 compatible)
- **Web Framework**: [Express.js 5](https://expressjs.com/)
- **Database ORM**: [Mongoose 9](https://mongoosejs.com/)
- **Authentication**: [jsonwebtoken (JWT)](https://github.com/auth0/node-jsonwebtoken) & [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **Email Delivery**: [Nodemailer](https://nodemailer.com/) (Configured for Gmail SMTP / TLS)
- **Security & Utilities**: CORS, Dotenv, Node.js Crypto
- **Deployment Platform**: [Render](https://render.com/)

### Database
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) (Cloud cluster with replica sets)
- **Local Fallback**: Built-in document storage engine (`local_db.json`) for seamless offline local development

---

## 11. Application Screens

1. **Authentication (`/login`, `/register`, `/forgot-password`, `/reset-password`)**:
   - Clean dark-mode login form with password visibility toggle.
   - Quick one-click demo credentials button for instant testing.
   - Registration flow with instant email OTP delivery and single-use activation.
   - Secure forgot password workflow with email-delivered reset tokens.

2. **Dashboard (`/`)**:
   - The primary command center. Displays 4 key metric cards: Current Bank Balance, This Month's Pocket Money, Total Spent This Month, and Remaining Pocket Money.
   - Live analytics status banner indicating whether analysis is currently based on Pocket Money Available or Total Bank Balance.
   - Quick expense recording modal and recent transactions overview (capped at 10 items).

3. **Expenses (`/expenses`)**:
   - Comprehensive transaction ledger. Features instant keyword search, category dropdown filtering, month/year selectors, and column sorting.
   - Modal to add new expenses with amount, date, category, and optional notes.
   - Real-time balance adjustment upon adding, editing, or deleting entries.

4. **Categories (`/categories`)**:
   - Management page for default and custom spending categories.
   - Color picker, icon selector, and parent category selection for hierarchical subcategories.
   - Transaction count badges and deletion protections for categories in use.

5. **Reports (`/reports`)**:
   - Comprehensive overview containing interactive spending trend charts, category distribution pies, and a historical audit trail table.
   - "View" buttons route directly to dedicated monthly statements.

6. **Dedicated Month Report & PDF (`/reports/:year/:month`)**:
   - Detailed ledger statement for any selected historical or current calendar month.
   - Reconciled against live bank balance and verified transactions.
   - One-click "Download PDF" button that generates a formatted A4 document ready for printing or sharing.

---

## 12. Project Structure

```text
Budgetbuddy/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DashboardCard.jsx       # Reusable financial metric cards
│   │   │   ├── ExpenseModal.jsx        # Modal for adding/editing expenses
│   │   │   ├── InitialBalanceModal.jsx # First-time onboarding balance modal
│   │   │   ├── PasswordInput.jsx       # Secure password input with eye toggle
│   │   │   ├── PocketMoneyModal.jsx    # Monthly pocket money entry modal
│   │   │   ├── ProtectedRoute.jsx      # Authentication route guard
│   │   │   ├── SalaryModal.jsx         # Base income/salary configuration modal
│   │   │   └── Sidebar.jsx             # Main navigation sidebar & user badge
│   │   ├── context/
│   │   │   ├── AuthContext.jsx         # User authentication & session provider
│   │   │   ├── authContextDefinition.js# React context definition
│   │   │   └── useAuth.js              # Custom hook for consuming auth state
│   │   ├── pages/
│   │   │   ├── Categories.jsx          # Category management & hierarchy page
│   │   │   ├── Dashboard.jsx           # Live financial command center
│   │   │   ├── Expenses.jsx            # Itemized expense ledger with filters
│   │   │   ├── ForgotPassword.jsx      # Password reset request page
│   │   │   ├── Login.jsx               # Sign In page with demo account fill
│   │   │   ├── MonthReport.jsx         # Detailed monthly financial statement
│   │   │   ├── Register.jsx            # Account registration & OTP activation
│   │   │   ├── Reports.jsx             # Reports overview & audit trail
│   │   │   └── ResetPassword.jsx       # Token-verified password reset page
│   │   ├── services/
│   │   │   └── api.js                  # Centralized fetch API client with timeout
│   │   ├── utils/
│   │   │   └── reportPdfGenerator.js   # Client-side jsPDF A4 statement engine
│   │   ├── App.jsx                     # Route declarations
│   │   ├── main.jsx                    # React DOM entrypoint
│   │   └── index.css                   # Tailwind CSS configuration & styling
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── backend/
│   ├── config/
│   │   ├── db.js                       # Mongoose connection manager with DNS resolver
│   │   └── store.js                    # Storage layer coordinator & offline fallback
│   ├── controllers/
│   │   ├── authController.js           # Auth, OTP, tokens & onboarding
│   │   ├── budgetController.js         # Category budget limit handlers
│   │   ├── categoryController.js       # Hierarchical category management
│   │   ├── dashboardController.js      # Authoritative financial summary logic
│   │   ├── expenseController.js        # Transaction CRUD & balance validation
│   │   ├── monthlyRecordController.js  # Monthly pocket money & carried balance
│   │   └── reportController.js         # Historical statements & audit trail
│   ├── data/
│   │   └── .gitkeep                    # Directory anchor (data files git-ignored)
│   ├── middleware/
│   │   └── auth.js                     # JWT authorization bearer middleware
│   ├── models/
│   │   ├── Budget.js                   # Category budget schema
│   │   ├── Category.js                 # Hierarchical category schema
│   │   ├── Expense.js                  # Expense transaction schema
│   │   ├── MonthlyRecord.js            # Monthly pocket money & ledger schema
│   │   └── User.js                     # User profile, credentials & balance schema
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── budgetRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── expenseRoutes.js
│   │   ├── monthlyRecordRoutes.js
│   │   └── reportRoutes.js
│   ├── services/
│   │   ├── emailService.js             # Nodemailer SMTP transporter & templates
│   │   └── storageService.js           # High-level database abstraction service
│   ├── test_email.js                   # SMTP connection diagnostics script
│   ├── verify_budgetbuddy.js           # 42-assertion automated end-to-end test suite
│   ├── .env.example
│   ├── package.json
│   └── server.js                       # Express app bootstrap & error handlers
│
├── docs/
│   └── screenshots/                    # Application preview images
├── .gitignore
├── LICENSE
└── README.md
```

---

## 13. Local Development & Setup

If you wish to clone and run BudgetBuddy on your local machine:

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [npm](https://www.npmjs.com/)
- [MongoDB Atlas](https://www.mongodb.com/atlas) cluster URI (or local MongoDB on `mongodb://127.0.0.1:27017`)
- Gmail account with an [App Password](https://myaccount.google.com/apppasswords) (optional, for testing real email OTP dispatch)

### 1. Clone the Repository
```bash
git clone https://github.com/psprashanth25/budgetbuddy.git
cd budgetbuddy
```

### 2. Configure Backend Environment
```bash
cd backend
cp .env.example .env
```
Fill in your local configuration in `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/budgetbuddy
JWT_SECRET=your_development_jwt_secret_key
CLIENT_URL=http://localhost:5173

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_digit_app_password
EMAIL_FROM="BudgetBuddy" <your_email@gmail.com>
```

### 3. Start Backend Server
```bash
npm install
npm run dev
```
The server will bind to `http://localhost:5000`.

### 4. Configure Frontend Environment
In a separate terminal:
```bash
cd ../frontend
cp .env.example .env
```
Point `VITE_API_URL` to the local backend:
```env
VITE_API_URL=http://localhost:5000/api
```

### 5. Start Frontend Dev Server
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your web browser.

---

## 14. Security Implementation

- **Password Hashing**: Passwords are encrypted using `bcryptjs` with auto-generated salt rounds before database persistence.
- **Cryptographic OTPs & Tokens**: Verification codes and password reset tokens use Node.js `crypto` with SHA-256 hashing. Cleartext tokens are never stored in the database.
- **Token Invalidation & Expiry**: Password reset tokens and OTP codes have strict expiration windows and are invalidated immediately upon first use to prevent replay attacks.
- **Rate-Limiting & Cooldowns**: Resend OTP endpoints enforce a 60-second cooldown period, and verification attempts are capped at 5 tries.
- **JWT Authorization**: Sensitive REST API routes require an `Authorization: Bearer <token>` header verified via Express middleware.
- **Strict Data Isolation**: Every database query is keyed by `userId`, ensuring complete privacy and isolation between student accounts.
- **CORS Protection**: Access is restricted to trusted origins defined in `CLIENT_URL`.

---

## 15. Verification & Automated Testing

BudgetBuddy includes a comprehensive 42-point automated verification suite testing all core functionality end-to-end:

```bash
cd backend
node verify_budgetbuddy.js
```

### Verified Scenarios
- Genuine MongoDB Atlas connectivity.
- Registration field validation and password matching.
- Real-time OTP generation, email dispatch, attempt limits, and activation.
- Password reset link generation, secure single-use token consumption, and invalid token rejection.
- Initial bank balance onboarding and overspending protection.
- Date restrictions blocking future-dated transactions.
- Hierarchical categories (top-level, nested subcategories, and active expense deletion locks).
- Dual analytics mode switching (Pocket Money Mode &rarr; Bank Balance Mode on exhaustion &rarr; Reversion on replenishment).
- Dynamic balance adjustment upon editing or deleting expenses.
- 10-item cap on dashboard recent expenses while retaining full history in the dedicated expense ledger.

---

## 16. Application Preview Reference

The GitHub README preview gallery showcases 6 high-resolution production views captured directly from the live application:
- `login.png`: Dual-panel showcase featuring dark-theme credential sign-in and 6-digit email OTP verification.
- `dashboard.png`: Full financial command center displaying real-time bank balance, pocket money metrics, spending forecasts, Recharts visualizations, and recent transactions.
- `expenses.png`: Searchable student expense ledger with instant category filtering, sorting controls, and inline actions.
- `categories.png`: Hierarchical category management displaying default protected taxonomies and custom subcategory trees.
- `reports.png`: Comprehensive monthly report view with category donut distributions, 12-month spending trends, statement line items, and the historical monthly audit trail.
- `financial-statement.png`: Executive-grade A4 financial statement document reconciled against live bank balance and verified transactions, ready for printing.

---

## 17. Future Improvements

- **SMS / WhatsApp Alerts**: Optional low-balance notifications when pocket money reaches < 15%.
- **Receipt Image Attachment**: Ability to upload photo receipts for hostel mess and canteen bills.
- **Splitwise-Style Roommate Splitting**: Shared hostel room bill splitting for electricity, Wi-Fi, and groceries.
- **Multi-Currency Support**: Extended localization for international students studying abroad.

---

## 18. Author

**P. S. Prashanth**  
- **GitHub**: [github.com/psprashanth25](https://github.com/psprashanth25)  
- **Project Repository**: [BudgetBuddy](https://github.com/psprashanth25/budgetbuddy)

---

## 19. License

This project is licensed under the [ISC License](LICENSE).