import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import ExpenseModal from "../components/ExpenseModal";
import { expenseApi, categoryApi } from "../services/api";
import { Plus, Search, Filter, ArrowUpDown, Edit2, Trash2, Calendar, Tag, DollarSign } from "lucide-react";

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters and Sort State
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [order, setOrder] = useState("desc");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const loadCategories = useCallback(async () => {
    try {
      const res = await categoryApi.getCategories();
      if (res.success && res.data) {
        setCategories(res.data.map((c) => c.name));
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        category: selectedCategory !== "All" ? selectedCategory : undefined,
        search: search.trim() || undefined,
        year: selectedYear || undefined,
        month: selectedMonth || undefined,
        sortBy,
        order,
      };
      const res = await expenseApi.getExpenses(params);
      if (res.success && res.data) {
        setExpenses(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, search, selectedYear, selectedMonth, sortBy, order]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadExpenses();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadExpenses]);

  const handleSaveExpense = async (expenseData) => {
    if (editingExpense) {
      await expenseApi.updateExpense(editingExpense._id || editingExpense.id, expenseData);
    } else {
      await expenseApi.addExpense(expenseData);
    }
    await loadExpenses();
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await expenseApi.deleteExpense(id);
      await loadExpenses();
    } catch (err) {
      alert(err.message || "Failed to delete expense.");
    }
  };

  const totalAmount = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="flex bg-black text-white min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-orange-500 tracking-tight">
              Expense Management
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Search, filter, and track all your student expenses
            </p>
          </div>

          <button
            onClick={() => {
              setEditingExpense(null);
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-orange-500/20 transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Add Expense</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Summary Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-medium text-gray-400 tracking-wider">Filtered Total Spending</p>
              <p className="text-3xl font-extrabold text-orange-500 mt-1">₹{totalAmount.toLocaleString("en-IN")}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-medium text-gray-400 tracking-wider">Total Records</p>
              <p className="text-3xl font-extrabold text-white mt-1">{expenses.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400">
              <Tag className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search note or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500 appearance-none"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Filter className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Year Filter */}
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500 appearance-none"
              >
                <option value="">All Years</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Month Filter */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500 appearance-none"
              >
                <option value="">All Months</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Filter */}
            <div className="relative">
              <select
                value={`${sortBy}-${order}`}
                onChange={(e) => {
                  const [s, o] = e.target.value.split("-");
                  setSortBy(s);
                  setOrder(o);
                }}
                className="w-full bg-gray-800 border border-gray-700 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500 appearance-none"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
              <ArrowUpDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 text-sm">Loading expenses...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-800/80 mx-auto flex items-center justify-center text-gray-500 mb-3">
                <Tag className="w-6 h-6" />
              </div>
              <p className="text-lg font-semibold text-gray-300">No expenses found</p>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1 mb-6">
                Try adjusting your search or filters, or add a new expense using the button above.
              </p>
              <button
                onClick={() => {
                  setEditingExpense(null);
                  setShowModal(true);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer"
              >
                + Add First Expense
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 uppercase text-xs tracking-wider bg-gray-800/40">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">Note</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {expenses.map((exp) => (
                    <tr key={exp._id || exp.id} className="hover:bg-gray-800/40 transition">
                      <td className="py-4 px-6 text-gray-300">
                        {new Date(exp.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-300 max-w-md truncate">{exp.note || "-"}</td>
                      <td className="py-4 px-6 font-bold text-white text-base">₹{exp.amount}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingExpense(exp);
                              setShowModal(true);
                            }}
                            className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp._id || exp.id)}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Expense Modal */}
      <ExpenseModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        categories={categories}
        initialData={editingExpense}
      />
    </div>
  );
}

export default Expenses;
