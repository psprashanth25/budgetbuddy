const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const recordSimulatedEmail = (data) => {
  try {
    const outboxDir = path.join(__dirname, "../data");
    if (!fs.existsSync(outboxDir)) {
      fs.mkdirSync(outboxDir, { recursive: true });
    }
    const outboxPath = path.join(outboxDir, ".email_outbox.json");
    let outbox = [];
    if (fs.existsSync(outboxPath)) {
      try {
        outbox = JSON.parse(fs.readFileSync(outboxPath, "utf-8"));
      } catch (e) {
        outbox = [];
      }
    }
    outbox.unshift({ ...data, createdAt: new Date().toISOString() });
    if (outbox.length > 50) outbox = outbox.slice(0, 50);
    fs.writeFileSync(outboxPath, JSON.stringify(outbox, null, 2), "utf-8");
  } catch (err) {
    // Non-critical diagnostic write
  }
};

let cachedTransporter = null;
let cachedConfigKey = null;

/**
 * Creates and returns a reusable nodemailer SMTP transporter based on environment configuration.
 */
const getTransporter = () => {
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || "").trim();
  const rawPass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || "").trim();
  const host = (process.env.EMAIL_HOST || process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587;
  const secureEnv = (process.env.EMAIL_SECURE || process.env.SMTP_SECURE || "").toLowerCase().trim();
  const isSecure = secureEnv === "true" || port === 465;

  if (!user || !rawPass) {
    cachedTransporter = null;
    return null;
  }

  // Google App Passwords are 16 characters often formatted with spaces (e.g. "abcd efgh ijkl mnop")
  const isGmail =
    user.toLowerCase().endsWith("@gmail.com") ||
    host.toLowerCase().includes("gmail");

  const pass = isGmail ? rawPass.replace(/\s+/g, "") : rawPass;
  const smtpHost = host || (isGmail ? "smtp.gmail.com" : "");

  const configKey = `${smtpHost}:${port}:${isSecure}:${user}:${pass}`;
  if (cachedTransporter && cachedConfigKey === configKey) {
    return cachedTransporter;
  }

  if (!smtpHost) {
    return null;
  }

  const transportOptions = {
    host: smtpHost,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  };

  cachedTransporter = nodemailer.createTransport(transportOptions);
  cachedConfigKey = configKey;

  return cachedTransporter;
};

const getSenderAddress = () => {
  const configuredFrom = (process.env.EMAIL_FROM || "").trim();
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || "").trim();

  // If user configured a custom sender that isn't the generic default, use it
  if (configuredFrom && !configuredFrom.includes("noreply@budgetbuddy.app")) {
    return configuredFrom;
  }
  // For Gmail SMTP, sending as "BudgetBuddy" <user@gmail.com> is most reliable
  if (user) {
    return `"BudgetBuddy" <${user}>`;
  }
  return configuredFrom || '"BudgetBuddy" <no-reply@budgetbuddy.app>';
};

/**
 * Checks whether SMTP credentials are fully provided in environment.
 */
exports.isEmailConfigured = () => {
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || "").trim();
  const pass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || "").trim();
  return Boolean(user && pass);
};

/**
 * Tests live connection to configured SMTP provider.
 */
exports.verifyEmailTransporter = async () => {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error("SMTP credentials are not configured in backend/.env.");
  }
  return await transporter.verify();
};

/**
 * Send OTP Verification Email
 * @param {string} email - Recipient address
 * @param {string} name - User's full name
 * @param {string} otp - 6-digit OTP code
 */
exports.sendVerificationOtp = async (email, name, otp) => {
  const transporter = getTransporter();
  const from = getSenderAddress();

  console.log(`[EmailService] Sending verification OTP to ${email} (From: ${from})...`);

  const subject = "Verify your BudgetBuddy account";
  const text = `Hello ${name},\n\nYour BudgetBuddy verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not create this account, you can safely ignore this email.\n\n- BudgetBuddy Team`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030712; color: #f8fafc; padding: 40px 20px; margin: 0;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
        <div style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #1e293b;">
          <div style="display: inline-block; background-color: rgba(249, 115, 22, 0.12); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 12px; padding: 10px 14px; margin-bottom: 12px;">
            <span style="font-size: 24px;">💰</span>
          </div>
          <h1 style="color: #f97316; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">BudgetBuddy</h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0;">Hostel Student Expense & Pocket Money Tracker</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; font-weight: 700;">Account Verification Code</h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            Hello <strong>${name}</strong>,<br/>
            Thank you for signing up for BudgetBuddy. Please use the following 6-digit verification code to activate your account:
          </p>
          <div style="background-color: #030712; border: 2px dashed #f97316; border-radius: 12px; text-align: center; padding: 20px 16px; margin: 24px 0;">
            <div style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #f97316; font-family: monospace;">${otp}</div>
            <span style="display: inline-block; margin-top: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #fb923c; background-color: rgba(249, 115, 22, 0.1); padding: 2px 10px; border-radius: 9999px;">Valid for 10 minutes</span>
          </div>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 20px 0 0;">
            Never share this verification code with anyone. If you did not create a BudgetBuddy account, you can safely ignore this email.
          </p>
        </div>
        <div style="padding: 20px 32px; background-color: #090d16; border-top: 1px solid #1e293b; text-align: center;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} BudgetBuddy. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  recordSimulatedEmail({ type: "otp", email, name, otp });

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to: email,
        subject,
        text,
        html,
      });
      console.log(`[EmailService] Verification OTP sent successfully to ${email} (Message ID: ${info.messageId})`);
      return { success: true, simulated: false };
    } catch (err) {
      console.error(`[EmailService Error] Failed to send email to ${email}:`, err.message);
      if (
        err.message &&
        (err.message.includes("BadCredentials") ||
          err.message.includes("Username and Password not accepted") ||
          err.code === "EAUTH")
      ) {
        throw new Error(
          "Gmail SMTP Authentication failed. Google requires a 16-character App Password (not your normal password). Generate one at https://myaccount.google.com/apppasswords and set EMAIL_PASS in backend/.env."
        );
      }
      throw new Error(`Failed to deliver verification email: ${err.message}`);
    }
  }

  // If SMTP is not configured, check if local test suite simulation is explicitly enabled
  const allowSimulated =
    process.env.ALLOW_SIMULATED_EMAIL === "true" ||
    process.env.NODE_ENV === "test";

  if (allowSimulated) {
    return { success: true, simulated: true };
  }

  throw new Error("Outbound email service is not configured. Please set EMAIL_USER and EMAIL_PASS in backend/.env.");
};

/**
 * Send Password Reset Link Email
 * @param {string} email - Recipient address
 * @param {string} name - User's full name
 * @param {string} resetUrl - Full URL with secure token
 */
exports.sendPasswordResetEmail = async (email, name, resetUrl) => {
  const transporter = getTransporter();
  const from = getSenderAddress();

  console.log(`[EmailService] Sending password reset link to ${email} (From: ${from})...`);

  const subject = "Reset your BudgetBuddy password";
  const text = `Hello ${name},\n\nYou requested to reset your password. Click the link below to choose a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.\n\n- BudgetBuddy Team`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030712; color: #f8fafc; padding: 40px 20px; margin: 0;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
        <div style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #1e293b;">
          <div style="display: inline-block; background-color: rgba(249, 115, 22, 0.12); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 12px; padding: 10px 14px; margin-bottom: 12px;">
            <span style="font-size: 24px;">🔒</span>
          </div>
          <h1 style="color: #f97316; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">BudgetBuddy</h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0;">Hostel Student Expense & Pocket Money Tracker</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; font-weight: 700;">Password Reset Request</h2>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Hello <strong>${name}</strong>,<br/>
            We received a request to reset your BudgetBuddy account password. Click the button below to choose a new password:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="background-color: #f97316; color: #ffffff; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 10px; display: inline-block; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.3);">Reset My Password</a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 24px 0 0;">
            Or copy and paste this link into your browser:<br/>
            <a href="${resetUrl}" style="color: #f97316; word-break: break-all; text-decoration: underline;">${resetUrl}</a>
          </p>
          <p style="color: #64748b; font-size: 12px; margin-top: 16px;">
            This link will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.
          </p>
        </div>
        <div style="padding: 20px 32px; background-color: #090d16; border-top: 1px solid #1e293b; text-align: center;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} BudgetBuddy. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  recordSimulatedEmail({ type: "reset", email, name, resetUrl });

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to: email,
        subject,
        text,
        html,
      });
      console.log(`[EmailService] Password reset email sent successfully to ${email} (Message ID: ${info.messageId})`);
      return { success: true, simulated: false };
    } catch (err) {
      console.error(`[EmailService Error] Failed to send password reset email to ${email}:`, err.message);
      if (
        err.message &&
        (err.message.includes("BadCredentials") ||
          err.message.includes("Username and Password not accepted") ||
          err.code === "EAUTH")
      ) {
        throw new Error(
          "Gmail SMTP Authentication failed. Google requires a 16-character App Password (not your normal password). Generate one at https://myaccount.google.com/apppasswords and set EMAIL_PASS in backend/.env."
        );
      }
      throw new Error(`Failed to deliver password reset email: ${err.message}`);
    }
  }

  const allowSimulated =
    process.env.ALLOW_SIMULATED_EMAIL === "true" ||
    process.env.NODE_ENV === "test";

  if (allowSimulated) {
    return { success: true, simulated: true };
  }

  throw new Error("Outbound email service is not configured. Please set EMAIL_USER and EMAIL_PASS in backend/.env.");
};
