const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const emailService = require("./services/emailService");
const crypto = require("crypto");

async function test() {
  console.log("==================================================");
  console.log("       BudgetBuddy Email Delivery Test Tool       ");
  console.log("==================================================");

  const isConfigured = emailService.isEmailConfigured();
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || "").trim();
  const hasPass = Boolean(process.env.EMAIL_PASS || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD);
  const host = (process.env.EMAIL_HOST || process.env.SMTP_HOST || "").trim();
  const port = process.env.EMAIL_PORT || process.env.SMTP_PORT || "587";
  const secure = process.env.EMAIL_SECURE || (port === "465" ? "true" : "false");
  const from = process.env.EMAIL_FROM || (user ? `BudgetBuddy <${user}>` : "(Default)");

  console.log(`Email Configured: ${isConfigured ? "YES" : "NO"}`);
  console.log(`SMTP Host:        ${host || (user.toLowerCase().endsWith("@gmail.com") ? "smtp.gmail.com (Gmail)" : "(Not set)")}`);
  console.log(`SMTP Port:        ${port} (Secure: ${secure})`);
  console.log(`Sender Address:   ${from}`);
  console.log(`User / Account:   ${user || "(Not set)"}`);
  console.log(`Password / Token: ${hasPass ? "[CONFIGURED (Protected)]" : "(Not set)"}`);
  console.log("--------------------------------------------------");

  if (!isConfigured) {
    console.log("[STATUS] Outbound email service is NOT configured in backend/.env.");
    console.log("");
    console.log("To receive real OTP emails in your inbox, add these variables to backend/.env:");
    console.log("");
    console.log("  EMAIL_HOST=smtp.gmail.com");
    console.log("  EMAIL_PORT=587");
    console.log("  EMAIL_SECURE=false");
    console.log("  EMAIL_USER=your_email@gmail.com");
    console.log("  EMAIL_PASS=your_16_digit_app_password");
    console.log("  EMAIL_FROM=\"BudgetBuddy\" <your_email@gmail.com>");
    console.log("");
    console.log("Note for Gmail: Generate a 16-character App Password at:");
    console.log("https://myaccount.google.com/apppasswords");
    console.log("==================================================");
    process.exit(0);
  }

  console.log("Verifying SMTP connection...");
  try {
    await emailService.verifyEmailTransporter();
    console.log("[PASS] SMTP server connection verified successfully!");
  } catch (verifyErr) {
    console.error("[FAIL] SMTP connection test failed:", verifyErr.message);
    process.exit(1);
  }

  const targetEmail = process.argv[2] || user;
  console.log(`Testing real email dispatch to: ${targetEmail}...`);

  try {
    const testOtp = crypto.randomInt(100000, 1000000).toString();
    const result = await emailService.sendVerificationOtp(targetEmail, "BudgetBuddy Tester", testOtp);
    if (result.simulated) {
      console.log("Email dispatch completed in SIMULATED mode. Check backend/data/.email_outbox.json.");
    } else {
      console.log(`[PASS] SUCCESS! Live test email containing verification OTP was delivered to ${targetEmail}.`);
    }
  } catch (err) {
    console.error("[FAIL] Failed to send test email:", err.message);
  }
}

test();
