import { useState } from "react";
import { X, Wallet } from "lucide-react";

function SalaryModal({ isOpen, onClose, currentSalary, onSave }) {
  const [salary, setSalary] = useState(currentSalary || 3000);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isNaN(salary) || Number(salary) < 0) {
      setError("Please enter a valid non-negative amount.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await onSave(Number(salary));
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update monthly salary.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2 text-orange-500 font-bold">
            <Wallet className="w-5 h-5" />
            <span>Set Monthly Salary / Income</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Monthly Salary / Regular Allowance (₹)
            </label>
            <input
              type="number"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              min="0"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Your base monthly income or family stipend.
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
              {isSubmitting ? "Saving..." : "Update Salary"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SalaryModal;
