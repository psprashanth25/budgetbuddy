import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import PasswordInput from "../components/PasswordInput";
import { Wallet, LogIn, AlertCircle } from "lucide-react";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail("aman@hostel.edu");
    setPassword("password123");
    setError("");
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-3 border border-orange-500/30">
            <Wallet className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-orange-500 tracking-tight">BudgetBuddy</h1>
          <p className="text-gray-400 text-sm mt-1">Hostel Student Expense &amp; Pocket Money Tracker</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>{error}</p>
              {error.includes("verify your email") && (
                <Link
                  to={`/register?verify=${encodeURIComponent(email)}`}
                  className="text-orange-400 underline block text-xs mt-1"
                >
                  Click here to verify your email &rarr;
                </Link>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <input
              id="login-email"
              name="email"
              type="email"
              placeholder="e.g. rahul@hostel.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">Password</label>
              <Link
                to="/forgot-password"
                className="text-xs text-orange-400 hover:text-orange-300 transition"
              >
                Forgot Password?
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Logging in...
              </span>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Fill */}
        <div className="mt-6 pt-6 border-t border-gray-800 flex justify-center">
          <button
            type="button"
            onClick={fillDemoAccount}
            className="text-xs text-orange-400 hover:text-orange-300 transition underline underline-offset-4 cursor-pointer"
          >
            Use Demo Account (aman@hostel.edu)
          </button>
        </div>

        {/* Link to Register */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-orange-500 font-semibold hover:underline">
            Register now
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
