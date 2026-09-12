const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const storage = require("../services/storageService");
const emailService = require("../services/emailService");

const DEFAULT_CATEGORIES = [
  { name: "Food", color: "#f97316", icon: "Utensils", isDefault: true, path: "Food" },
  { name: "Travel", color: "#3b82f6", icon: "Car", isDefault: true, path: "Travel" },
  { name: "Shopping", color: "#a855f7", icon: "ShoppingBag", isDefault: true, path: "Shopping" },
  { name: "Bills", color: "#eab308", icon: "Receipt", isDefault: true, path: "Bills" },
  { name: "Entertainment", color: "#ec4899", icon: "Film", isDefault: true, path: "Entertainment" },
  { name: "Other", color: "#64748b", icon: "MoreHorizontal", isDefault: true, path: "Other" },
];

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || "budgetbuddy_super_secret_jwt_key_2026";
  return jwt.sign({ id: userId.toString() }, secret, { expiresIn: "30d" });
};

const hashToken = (token) => {
  if (!token) return "";
  return crypto.createHash("sha256").update(String(token).trim()).digest("hex");
};

const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// @desc    Register a new user & send OTP verification email
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Please provide your full name." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Please provide an email address." });
    }
    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
    }
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    const existingUser = await storage.findUserByEmail(cleanEmail);
    if (existingUser) {
      if (existingUser.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: "An account with this email address already exists. Please log in.",
        });
      }

      // Check cooldown for unverified user re-attempting registration
      if (existingUser.otpCooldownUntil && new Date() < new Date(existingUser.otpCooldownUntil)) {
        const remainingSeconds = Math.ceil((new Date(existingUser.otpCooldownUntil) - new Date()) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remainingSeconds}s before requesting a new verification code.`,
          remainingSeconds,
        });
      }

      // If user exists but is unverified, generate a fresh OTP and send
      const otp = generateOtp();
      const otpHash = hashToken(otp);
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
      const otpCooldownUntil = new Date(Date.now() + 60 * 1000); // 60s cooldown

      try {
        await emailService.sendVerificationOtp(cleanEmail, existingUser.name || name.trim(), otp);
      } catch (emailErr) {
        return res.status(503).json({
          success: false,
          message: emailErr.message.includes("Gmail") || emailErr.message.includes("configured")
            ? emailErr.message
            : "Unable to send verification email. Please check your email configuration or try again later.",
        });
      }

      await storage.updateUserOtp(existingUser._id || existingUser.id, {
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        otpCooldownUntil,
      });

      return res.status(200).json({
        success: true,
        message: "We sent a verification code to your email address.",
        requiresOtp: true,
        email: cleanEmail,
      });
    }

    // Generate new secure OTP
    const otp = generateOtp();
    const otpHash = hashToken(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const otpCooldownUntil = new Date(Date.now() + 60 * 1000); // 60 seconds

    // Dispatch email before or alongside creation
    try {
      await emailService.sendVerificationOtp(cleanEmail, name.trim(), otp);
    } catch (emailErr) {
      return res.status(503).json({
        success: false,
        message: emailErr.message.includes("Gmail") || emailErr.message.includes("configured")
          ? emailErr.message
          : "Unable to send verification email. Please check your email configuration or try again later.",
      });
    }

    await storage.createUser({
      name: name.trim(),
      email: cleanEmail,
      password,
      isEmailVerified: false,
      otpHash,
      otpExpiresAt,
      otpAttempts: 0,
      otpCooldownUntil,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful! We sent a verification code to your email address.",
      requiresOtp: true,
      email: cleanEmail,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error during registration." });
  }
};

// @desc    Verify OTP for account activation
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Please provide an email address." });
    }
    if (!otp || !otp.toString().trim()) {
      return res.status(400).json({ success: false, message: "Please enter the 6-digit verification code." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await storage.findUserByEmail(cleanEmail);

    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found with this email." });
    }

    if (user.isEmailVerified) {
      const token = generateToken(user._id || user.id);
      return res.json({
        success: true,
        message: "Account is already verified. You can log in.",
        token,
        user: {
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          hasCompletedBalanceSetup: user.hasCompletedBalanceSetup || false,
          currentBankBalance: user.currentBankBalance || 0,
          currency: user.currency || "₹",
        },
      });
    }

    // Check attempts limit (max 5)
    if (user.otpAttempts >= 5) {
      return res.status(400).json({
        success: false,
        message: "Too many failed attempts. Please request a new verification code.",
      });
    }

    // Check expiration
    if (!user.otpExpiresAt || new Date() > new Date(user.otpExpiresAt)) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new code.",
      });
    }

    // Check hash
    const submittedHash = hashToken(otp);
    if (submittedHash !== user.otpHash) {
      const attempts = (user.otpAttempts || 0) + 1;
      await storage.updateUserOtp(user._id || user.id, {
        otpHash: user.otpHash,
        otpExpiresAt: user.otpExpiresAt,
        otpAttempts: attempts,
        otpCooldownUntil: user.otpCooldownUntil,
      });

      const remaining = Math.max(0, 5 - attempts);
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remaining} attempt(s) remaining.`,
      });
    }

    // OTP is valid: Activate user
    const updatedUser = await storage.verifyUserEmail(user._id || user.id);

    // Seed default categories if user has none
    const existingCats = await storage.getCategories(user._id || user.id);
    if (existingCats.length === 0) {
      await storage.seedDefaultCategories(user._id || user.id, DEFAULT_CATEGORIES);
    }

    const token = generateToken(user._id || user.id);

    return res.json({
      success: true,
      message: "Email verified successfully! Welcome to BudgetBuddy.",
      token,
      user: {
        id: updatedUser._id || updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        hasCompletedBalanceSetup: updatedUser.hasCompletedBalanceSetup || false,
        currentBankBalance: updatedUser.currentBankBalance || 0,
        currency: updatedUser.currency || "₹",
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ success: false, message: "Server error verifying code." });
  }
};

// @desc    Resend OTP with cooldown
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Please provide an email address." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await storage.findUserByEmail(cleanEmail);

    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found with this email." });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: "Account is already verified. Please log in." });
    }

    // Check cooldown
    if (user.otpCooldownUntil && new Date() < new Date(user.otpCooldownUntil)) {
      const remainingSeconds = Math.ceil((new Date(user.otpCooldownUntil) - new Date()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingSeconds}s before requesting a new code.`,
        remainingSeconds,
      });
    }

    const otp = generateOtp();
    const otpHash = hashToken(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const otpCooldownUntil = new Date(Date.now() + 60 * 1000);

    try {
      await emailService.sendVerificationOtp(cleanEmail, user.name, otp);
    } catch (emailErr) {
      return res.status(503).json({
        success: false,
        message: emailErr.message.includes("Gmail") || emailErr.message.includes("configured")
          ? emailErr.message
          : "Unable to send verification email. Please check your email configuration or try again later.",
      });
    }

    await storage.updateUserOtp(user._id || user.id, {
      otpHash,
      otpExpiresAt,
      otpAttempts: 0,
      otpCooldownUntil,
    });

    return res.json({
      success: true,
      message: "A new 6-digit verification code has been sent to your email.",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({ success: false, message: "Server error resending verification code." });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Please enter your email." });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: "Please enter your password." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await storage.findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email or password." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password." });
    }

    // Enforce email verification (legacy accounts without isEmailVerified default to true)
    if (user.isEmailVerified === false) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email address to activate your BudgetBuddy account.",
        requiresOtp: true,
        email: user.email,
      });
    }

    // Ensure default categories exist if missing
    try {
      const cats = await storage.getCategories(user._id || user.id);
      if (cats.length === 0) {
        await storage.seedDefaultCategories(user._id || user.id, DEFAULT_CATEGORIES);
      }
    } catch (catErr) {
      console.warn("Notice: Failed to seed categories on login:", catErr.message);
    }

    const token = generateToken(user._id || user.id);

    return res.json({
      success: true,
      message: "Logged in successfully!",
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        hasCompletedBalanceSetup: user.hasCompletedBalanceSetup || false,
        currentBankBalance: user.currentBankBalance || 0,
        initialBankBalance: user.initialBankBalance || null,
        monthlySalary: user.monthlySalary || 0,
        currency: user.currency || "₹",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Server error during login." });
  }
};

// @desc    Request password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Please enter your email address." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await storage.findUserByEmail(cleanEmail);

    // Always return safe generic message to prevent account enumeration
    const safeResponse = {
      success: true,
      message: "If an account exists for this email, a password reset link has been sent.",
    };

    if (!user) {
      return res.json(safeResponse);
    }

    // Generate secure 32-byte hex token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await storage.setPasswordResetToken(user._id || user.id, { tokenHash, expiresAt });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    try {
      await emailService.sendPasswordResetEmail(user.email, user.name, resetUrl);
    } catch (err) {
      console.warn("Notice: Failed to send password reset email:", err.message);
      if (err.message && err.message.includes("configured")) {
        return res.status(503).json({
          success: false,
          message: "Outbound email service is not configured. Please set EMAIL_USER and EMAIL_PASS in backend/.env.",
        });
      }
    }

    return res.json(safeResponse);
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ success: false, message: "Server error processing request." });
  }
};

// @desc    Reset password using reset token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !token.trim()) {
      return res.status(400).json({ success: false, message: "Invalid or missing reset token." });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters long." });
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    const tokenHash = hashToken(token);
    const user = await storage.findUserByResetToken(tokenHash);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset link. Please request a new one.",
      });
    }

    await storage.resetUserPassword(user._id || user.id, newPassword);

    return res.json({
      success: true,
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ success: false, message: "Server error resetting password." });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    return res.json({
      success: true,
      user: {
        id: req.user._id || req.user.id,
        name: req.user.name,
        email: req.user.email,
        hasCompletedBalanceSetup: req.user.hasCompletedBalanceSetup || false,
        currentBankBalance: req.user.currentBankBalance || 0,
        initialBankBalance: req.user.initialBankBalance || null,
        monthlySalary: req.user.monthlySalary || 0,
        currency: req.user.currency || "₹",
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error retrieving profile." });
  }
};

// @desc    Configure initial bank balance onboarding
// @route   POST /api/auth/balance-setup
// @access  Private
exports.setInitialBalance = async (req, res) => {
  try {
    const { initialBankBalance } = req.body;

    if (initialBankBalance === undefined || initialBankBalance === null || isNaN(initialBankBalance)) {
      return res.status(400).json({ success: false, message: "Please enter a valid numeric bank balance." });
    }

    const amount = Number(initialBankBalance);
    if (amount < 0) {
      return res.status(400).json({ success: false, message: "Initial bank balance cannot be negative." });
    }

    const updatedUser = await storage.setInitialBankBalance(req.user._id || req.user.id, amount);

    return res.json({
      success: true,
      message: "Current bank balance configured successfully!",
      user: {
        id: updatedUser._id || updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        hasCompletedBalanceSetup: true,
        currentBankBalance: updatedUser.currentBankBalance,
        initialBankBalance: updatedUser.initialBankBalance,
        currency: updatedUser.currency || "₹",
      },
    });
  } catch (error) {
    console.error("Initial balance setup error:", error);
    return res.status(500).json({ success: false, message: "Failed to configure initial balance." });
  }
};

// @desc    Update monthly salary (preserved for backward compatibility)
// @route   PUT /api/auth/salary
// @access  Private
exports.updateSalary = async (req, res) => {
  try {
    const { monthlySalary } = req.body;

    if (monthlySalary === undefined || isNaN(monthlySalary) || Number(monthlySalary) < 0) {
      return res.status(400).json({ success: false, message: "Please provide a valid non-negative salary amount." });
    }

    const user = await storage.updateUserSalary(req.user._id || req.user.id, Number(monthlySalary));

    return res.json({
      success: true,
      message: "Monthly salary updated successfully!",
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        monthlySalary: user.monthlySalary,
        currentBankBalance: user.currentBankBalance || 0,
        currency: user.currency || "₹",
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error updating salary." });
  }
};
