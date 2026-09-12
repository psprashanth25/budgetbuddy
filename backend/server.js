const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

process.on("uncaughtException", (err) => {
  console.error("[CRITICAL uncaughtException]:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[CRITICAL unhandledRejection]:", reason);
});

const express = require("express");
const cors = require("cors");
const { connectDB, getDatabaseStatus } = require("./config/db");
const emailService = require("./services/emailService");

// Import route modules
const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const monthlyRecordRoutes = require("./routes/monthlyRecordRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

// Middleware
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
app.use(
  cors({
    origin: [clientUrl, "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/monthly-records", monthlyRecordRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);

// Health check route with live database status
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "BudgetBuddy API Running",
    database: getDatabaseStatus(),
    emailConfigured: emailService.isEmailConfigured(),
    timestamp: new Date().toISOString(),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error occurred.",
  });
});

const PORT = process.env.PORT || 5000;

// Start server immediately on all interfaces, then connect to DB in background
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[BudgetBuddy] Server running on port ${PORT}`);
  connectDB();

  // Safe email configuration diagnostics
  const isEmailConfigured = emailService.isEmailConfigured();
  console.log(`[Email Diagnostics] SMTP Configured: ${isEmailConfigured ? "YES" : "NO"}`);
  console.log(`[Email Diagnostics] EMAIL_USER loaded: ${Boolean(process.env.EMAIL_USER)} (${process.env.EMAIL_USER ? process.env.EMAIL_USER : "none"})`);
  console.log(`[Email Diagnostics] EMAIL_PASS loaded: ${Boolean(process.env.EMAIL_PASS)}`);
  console.log(`[Email Diagnostics] SMTP Host: ${process.env.EMAIL_HOST || "smtp.gmail.com"}:${process.env.EMAIL_PORT || 587}`);

  if (isEmailConfigured) {
    emailService
      .verifyEmailTransporter()
      .then(() => {
        console.log(`[Email Diagnostics] Real SMTP connection verified successfully!`);
      })
      .catch((err) => {
        console.error(`[Email Diagnostics] SMTP verify error:`, err.message);
      });
  }
});