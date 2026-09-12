import { useState, useEffect } from "react";
import { X, Coins } from "lucide-react";

function PocketMoneyModal({ isOpen, onClose, currentPocketMoney, monthName, year, onSave }) {
  const [pocketMoney, setPocketMoney] = useState(currentPocketMoney || "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setPocketMoney(currentPocketMoney !== undefined ? currentPocketMoney : "");
    setError("");
  }, [currentPocketMoney, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pocketMoney === "" || isNaN(pocketMoney) || Number(pocketMoney) < 0) {
      setError("Please enter a valid non-negative amount.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await onSave(Number(pocketMoney));
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update pocket money.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2 text-orange-500 font-bold">
            <Coins className="w-5 h-5" />
            <span>Set Pocket Money ({monthName} {year})</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Pocket Money for {monthName} (₹)
            </label>
            <input
              type="number"
              value={pocketMoney}
              onChange={(e) => setPocketMoney(e.target.value)}
              min="0"
              placeholder="e.g. 1000"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Recorded specifically for {monthName} {year}. Does not overwrite other months.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Pocket Money"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PocketMoneyModal;
