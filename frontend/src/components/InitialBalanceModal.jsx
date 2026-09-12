import { useState } from "react";
import { Wallet, CheckCircle2, AlertCircle, Info } from "lucide-react";

function InitialBalanceModal({ isOpen, onSave }) {
  const [balance, setBalance] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (balance === "" || isNaN(balance)) {
      setError("Please enter your current total bank balance (or 0).");
      return;
    }

    const num = Number(balance);
    if (num < 0) {
      setError("Balance cannot be negative.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await onSave(num);
    } catch (err) {
      setError(err.message || "Failed to configure initial balance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-orange-500/40 rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-3 border border-orange-500/30">
            <Wallet className="w-9 h-9 text-orange-500" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 mb-2">
            First-Time Financial Setup
          </span>
          <h2 className="text-2xl font-extrabold text-white">
            What is your current total bank balance?
          </h2>
          <p className="text-gray-400 text-sm mt-2 max-w-sm">
            Enter your total available balance, including the pocket money you currently have.
          </p>
        </div>

        {/* Informative Callout */}
        <div className="mb-6 p-4 bg-gray-800/80 border border-gray-700 rounded-2xl flex items-start gap-3 text-sm text-gray-300">
          <Info className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed text-xs">
            This balance represents your starting total available funds across your bank account, savings, and cash in hand. All future expenses will deduct from this balance.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Total Bank Balance (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400 font-bold text-lg">
                ₹
              </span>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={balance}
                onChange={(e) => {
                  setBalance(e.target.value);
                  if (error) setError("");
                }}
                min="0"
                step="any"
                className="w-full bg-gray-800 border border-gray-700 pl-10 pr-4 py-3.5 rounded-2xl text-white text-lg font-bold placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
                required
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Saving balance...
              </span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Confirm &amp; Launch Dashboard
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default InitialBalanceModal;
