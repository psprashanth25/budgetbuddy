import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../services/api";
import { Wallet, Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      const res = await authApi.forgotPassword({ email: email.trim() });
      setMessage(res.message || "If an account exists for this email, a password reset link has been sent.");
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to process password reset request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-3 border border-orange-500/30">
            <Wallet className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Forgot Password</h1>
          <p className="text-gray-400 text-sm mt-1 text-center">
            Enter your registered email and we'll send you a password reset link
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Confirmation Screen */}
        {submitted ? (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl flex items-start gap-3 text-emerald-400 text-sm leading-relaxed">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Didn't receive an email? Check your spam folder or ensure the email address you entered is registered.
            </p>

            <Link
              to="/login"
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-gray-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  placeholder="e.g. rahul@hostel.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              id="forgot-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Sending reset link...
                </span>
              ) : (
                "Send Reset Link"
              )}
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition">
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
