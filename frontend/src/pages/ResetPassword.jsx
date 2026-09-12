import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { authApi } from "../services/api";
import PasswordInput from "../components/PasswordInput";
import { Wallet, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError("Missing or invalid password reset token. Please request a new link.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await authApi.resetPassword({
        token,
        newPassword,
        confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(err.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-3 border border-orange-500/30">
            <Wallet className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Set New Password</h1>
          <p className="text-gray-400 text-sm mt-1 text-center">
            {email ? `Resetting password for ${email}` : "Choose a secure password for your account"}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>{error}</p>
              {error.includes("expired") && (
                <Link to="/forgot-password" className="text-orange-400 underline block text-xs mt-1">
                  Request a new password reset link &rarr;
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Success Confirmation */}
        {success ? (
          <div className="space-y-6 text-center">
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl flex flex-col items-center gap-3 text-emerald-400 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <p className="font-bold text-base">Password Reset Successfully!</p>
              <p className="text-xs text-emerald-300/80">
                You will be automatically redirected to the login page in 3 seconds...
              </p>
            </div>

            <Link
              to="/login"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
            >
              Sign In Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                New Password (min 6 characters)
              </label>
              <PasswordInput
                id="reset-new-password"
                name="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Confirm New Password
              </label>
              <PasswordInput
                id="reset-confirm-password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>

            <button
              id="reset-submit-btn"
              type="submit"
              disabled={loading || !token}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Updating password...
                </span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Save New Password
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-sm text-gray-400 hover:text-white transition">
                Cancel and back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
