import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { authApi } from "../services/api";
import PasswordInput from "../components/PasswordInput";
import { Wallet, UserPlus, KeyRound, AlertCircle, CheckCircle2, RotateCw, Mail, ArrowLeft } from "lucide-react";

function maskEmail(email) {
  if (!email || !email.includes("@")) return email;
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }
  const masked = `${localPart[0]}${"*".repeat(Math.min(localPart.length - 2, 5))}${localPart[localPart.length - 1]}`;
  return `${masked}@${domain}`;
}

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, verifyOtp } = useAuth();

  const verifyParam = searchParams.get("verify") || "";

  // Step state: "register" or "otp"
  const [step, setStep] = useState(verifyParam ? "otp" : "register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(verifyParam);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(verifyParam ? 60 : 0);

  // Timer for resend OTP cooldown
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      const res = await register(name.trim(), email.trim(), password, confirmPassword);
      setSuccessMsg(res.message || "We sent a verification code to your email address.");
      setStep("otp");
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await verifyOtp(email.trim(), otp.trim());
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to verify code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    try {
      setError("");
      setSuccessMsg("");
      const res = await authApi.resendOtp({ email: email.trim() });
      setSuccessMsg(res.message || "A new 6-digit verification code has been sent to your email.");
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || "Failed to resend code.");
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-3 border border-orange-500/30">
            <Wallet className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-orange-500 tracking-tight">BudgetBuddy</h1>
          <p className="text-gray-400 text-sm mt-1 text-center">
            {step === "otp"
              ? "Verify your email to activate account"
              : "Create your student financial account"}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-xl flex items-start gap-3 text-emerald-400 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {step === "register" ? (
          /* ================= STEP 1: REGISTRATION ================= */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
              <input
                id="register-name"
                name="name"
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
              <input
                id="register-email"
                name="email"
                type="email"
                placeholder="e.g. rahul@hostel.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Password (min 6 characters)
              </label>
              <PasswordInput
                id="register-password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Confirm Password
              </label>
              <PasswordInput
                id="register-confirm-password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
              />
            </div>

            <button
              id="register-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Sending verification code...
                </span>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Continue &amp; Verify Email
                </>
              )}
            </button>
          </form>
        ) : (
          /* ================= STEP 2: OTP VERIFICATION ================= */
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div className="p-4 bg-gray-800/80 border border-gray-700/80 rounded-xl text-xs text-gray-300 leading-relaxed flex items-start gap-3">
              <Mail className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white text-sm mb-0.5">
                  We sent a verification code to your email
                </p>
                <p className="text-gray-400">
                  Please enter the 6-digit code sent to{" "}
                  <strong className="text-orange-400 font-medium">{email}</strong>{" "}
                  <span className="text-gray-500">({maskEmail(email)})</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Enter 6-Digit Verification Code
              </label>
              <div className="relative">
                <input
                  id="otp-input"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ""));
                    if (error) setError("");
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-center text-3xl font-bold tracking-widest text-orange-400 placeholder-gray-600 focus:outline-none focus:border-orange-500 transition font-mono"
                  required
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                This verification code will expire in 10 minutes.
              </p>
            </div>

            <button
              id="verify-otp-btn"
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Activating Account...
                </span>
              ) : (
                <>
                  <KeyRound className="w-5 h-5" />
                  Activate Account
                </>
              )}
            </button>

            {/* Resend OTP and Change Email Options */}
            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep("register");
                  setError("");
                  setSuccessMsg("");
                }}
                className="text-gray-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change email
              </button>

              <button
                id="resend-otp-btn"
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                className="text-orange-400 hover:text-orange-300 transition flex items-center gap-1 disabled:opacity-40 disabled:hover:text-orange-400 cursor-pointer font-medium"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
              </button>
            </div>
          </form>
        )}

        {/* Link to Login */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-orange-500 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
