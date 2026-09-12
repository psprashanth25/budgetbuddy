import { useState, useEffect } from "react";
import { X, Calendar, DollarSign, Tag, FileText } from "lucide-react";

function ExpenseModal({ isOpen, onClose, onSave, categories = [], initialData = null }) {
  const getTodayStr = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
  };

  const todayStr = getTodayStr();

  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      const dateStr = initialData.date ? new Date(initialData.date).toISOString().split("T")[0] : "";
      setDate(dateStr);
      setAmount(initialData.amount || "");
      setCategory(initialData.category || "");
      setNote(initialData.note || "");
    } else {
      setDate(todayStr);
      setAmount("");
      const defaultCat = categories.length > 0 ? (typeof categories[0] === "string" ? categories[0] : categories[0].name) : "";
      setCategory(defaultCat);
      setNote("");
    }
    setErrors({});
  }, [initialData, isOpen, categories, todayStr]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    const missing = [];

    if (!date) {
      errs.date = "Please select a date.";
      missing.push("date");
    } else if (date > todayStr) {
      errs.date = "Future dates are not allowed. Please select today or an earlier date.";
    }

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      errs.amount = !amount ? "Please enter an amount." : "Amount must be greater than zero.";
      missing.push("amount");
    }

    if (!category) {
      errs.category = "Please select a category.";
      missing.push("category");
    }

    if (missing.length === 2 && missing.includes("date") && missing.includes("amount")) {
      errs.general = "Please select a date and enter an amount.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await onSave({
        date,
        amount: Number(amount),
        category,
        note: note.trim(),
      });
      onClose();
    } catch (err) {
      setErrors({ general: err.message || "Failed to save expense." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-orange-500">
            {initialData ? "Edit Expense" : "Add New Expense"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* General Error Banner */}
        {errors.general && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {errors.general}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Date Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-400" />
              Date (Past or Today Only)
            </label>
            <input
              type="date"
              value={date}
              max={todayStr}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors({ ...errors, date: "" });
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
            />
            {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-orange-400" />
              Amount (₹)
            </label>
            <input
              type="number"
              placeholder="e.g. 150"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors({ ...errors, amount: "" });
              }}
              step="any"
              min="0.01"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
            />
            {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-orange-400" />
              Category / Subcategory
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                if (errors.category) setErrors({ ...errors, category: "" });
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => {
                const isObj = typeof cat === "object" && cat !== null;
                const value = isObj ? cat.name : cat;
                const label = isObj ? (cat.path || cat.name) : cat;
                return (
                  <option key={isObj ? (cat._id || cat.id || value) : value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
            {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-orange-400" />
              Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Samosas and tea at hostel canteen"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2 rounded-xl text-sm transition shadow-lg shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Saving..." : initialData ? "Update Expense" : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ExpenseModal;
