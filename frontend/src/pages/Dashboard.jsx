import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import DashboardCard from "../components/DashboardCard";
import ExpenseModal from "../components/ExpenseModal";
import PocketMoneyModal from "../components/PocketMoneyModal";
import InitialBalanceModal from "../components/InitialBalanceModal";
import { dashboardApi, expenseApi, budgetApi, monthlyRecordApi } from "../services/api";
import { useAuth } from "../context/useAuth";
import {
  Plus,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Clock,
  PieChart as PieIcon,
  BarChart3,
  Search,
  Edit2,
  Trash2,
  HelpCircle,
  Coins,
  Wallet,
  Landmark,
  ChevronDown,
  ExternalLink,
  CheckCircle2,
  Layers,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const CHART_COLORS = [
  "#f97316", // orange
  "#3b82f6", // blue
  "#10b981", // green
  "#eab308", // yellow
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f43f5e", // rose
];

function Dashboard() {
  const { user, setInitialBalance } = useAuth();

  // Dashboard Data State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reversionNotice, setReversionNotice] = useState("");

  // Modals state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showPocketMoneyModal, setShowPocketMoneyModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);

  // Collapsible panels state (default expanded, persisted in localStorage)
  const [isRecentExpensesOpen, setIsRecentExpensesOpen] = useState(() => {
    return localStorage.getItem("bb_recent_expenses_open") !== "false";
  });
  const [isBudgetPlannerOpen, setIsBudgetPlannerOpen] = useState(() => {
    return localStorage.getItem("bb_budget_planner_open") !== "false";
  });

  const toggleRecentExpenses = () => {
    setIsRecentExpensesOpen((prev) => {
      const next = !prev;
      localStorage.setItem("bb_recent_expenses_open", next ? "true" : "false");
      return next;
    });
  };

  const toggleBudgetPlanner = () => {
    setIsBudgetPlannerOpen((prev) => {
      const next = !prev;
      localStorage.setItem("bb_budget_planner_open", next ? "true" : "false");
      return next;
    });
  };

  // Category budget form
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);

  // Local table filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  const loadDashboardData = useCallback(async () => {
    try {
      setError("");
      const res = await dashboardApi.getSummary();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      setError(err.message || "Failed to load dashboard summary.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Save Expense (Add or Edit)
  const handleSaveExpense = async (expenseData) => {
    if (editingExpense) {
      await expenseApi.updateExpense(editingExpense._id || editingExpense.id, expenseData);
    } else {
      await expenseApi.addExpense(expenseData);
    }
    await loadDashboardData();
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await expenseApi.deleteExpense(id);
      await loadDashboardData();
    } catch (err) {
      alert(err.message || "Failed to delete expense.");
    }
  };

  // Handle Save Initial Balance Onboarding / Adjustment
  const handleSaveInitialBalance = async (amount) => {
    await setInitialBalance(amount);
    setShowBalanceModal(false);
    await loadDashboardData();
  };

  // Handle Save Pocket Money
  const handleSavePocketMoney = async (pocketMoney) => {
    if (!data?.calendar) return;
    const res = await monthlyRecordApi.setMonthlyRecord(data.calendar.year, data.calendar.month, {
      pocketMoney,
    });
    if (res.reversionNotification) {
      setReversionNotice(res.reversionNotification);
      setTimeout(() => setReversionNotice(""), 6000);
    }
    await loadDashboardData();
  };

  // Handle Add/Update Budget
  const handleAddBudget = async (e) => {
    e.preventDefault();
    if (!budgetCategory || !budgetLimit) return;
    try {
      setBudgetSubmitting(true);
      await budgetApi.addOrUpdateBudget({
        category: budgetCategory,
        limit: Number(budgetLimit),
      });
      setBudgetCategory("");
      setBudgetLimit("");
      await loadDashboardData();
    } catch (err) {
      alert(err.message || "Failed to save category budget.");
    } finally {
      setBudgetSubmitting(false);
    }
  };

  // Handle Delete Budget
  const handleDeleteBudget = async (id) => {
    try {
      await budgetApi.deleteBudget(id);
      await loadDashboardData();
    } catch (err) {
      alert(err.message || "Failed to delete budget.");
    }
  };

  if (loading && !data) {
    return (
      <div className="flex bg-black text-white min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400">Loading your finances...</p>
          </div>
        </div>
      </div>
    );
  }

  const calendar = data?.calendar || {};
  const financials = data?.financials || {};
  const timeStats = data?.timeStats || {};
  const forecast = data?.forecast || {};
  const budgetWarnings = data?.budgetWarnings || [];
  const budgets = data?.budgets || [];
  const categories = data?.categories || [];
  const categoryObjects = data?.categoryObjects || [];
  const pieChartData = data?.pieChartData || [];
  const monthlyTrendData = data?.monthlyTrendData || [];
  const recentExpenses = data?.recentExpenses || [];

  // Filter recent expenses locally for the dashboard table (max 10 records)
  const filteredRecentExpenses = recentExpenses.filter((exp) => {
    const matchesCat = filterCategory === "All" || exp.category.toLowerCase() === filterCategory.toLowerCase();
    const s = search.toLowerCase().trim();
    const matchesSearch =
      !s ||
      (exp.note && exp.note.toLowerCase().includes(s)) ||
      exp.category.toLowerCase().includes(s) ||
      exp.amount.toString().includes(s);
    return matchesCat && matchesSearch;
  });

  // Calculate budget progress color
  const budgetUsed = financials.budgetUsedPercent || 0;
  let progressColor = "bg-emerald-500";
  if (budgetUsed > 80) progressColor = "bg-red-500";
  else if (budgetUsed > 50) progressColor = "bg-orange-500";

  // Check if first-time onboarding should trigger
  const needsInitialOnboarding = user && user.hasCompletedBalanceSetup === false && !showBalanceModal;

  return (
    <div className="flex bg-black text-white min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl mx-auto">
        {/* Reversion Notice Alert */}
        {reversionNotice && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-emerald-400 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{reversionNotice}</span>
            </div>
            <button
              onClick={() => setReversionNotice("")}
              className="text-xs text-emerald-300 underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Pending Pocket Money Status Banner */}
        {financials.isPocketMoneyPending && (
          <div className="mb-6 p-4 md:p-5 rounded-2xl bg-orange-500/10 border border-orange-500/40 text-orange-400 text-sm shadow-lg backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center flex-shrink-0 text-orange-400">
                <Coins className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <p className="font-bold text-base text-white">
                  This month's pocket money is not yet entered
                </p>
                <p className="text-xs text-orange-300/80 mt-1">
                  Balance carried forward: ₹{(financials.openingBalance || financials.currentBankBalance || 0).toLocaleString("en-IN")}. Deductions & calculations continue against this balance until pocket money is entered.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPocketMoneyModal(true)}
              className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-semibold text-xs md:text-sm shadow-md transition cursor-pointer flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Enter Pocket Money Now</span>
            </button>
          </div>
        )}

        {/* Pocket Money Exhaustion Notification Banner */}
        {financials.isPocketMoneyExhausted && financials.pocketMoney > 0 && !financials.isPocketMoneyPending && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-400 text-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-bold">
                  Your pocket money for this month is exhausted. Further spendings are now being deducted from your bank account/savings.
                </p>
                <p className="text-xs text-amber-300/80 mt-1">
                  From now on, your analysis is shifting to be based on your total balance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-xl text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={loadDashboardData}
              className="text-xs bg-red-500/20 px-3 py-1 rounded-lg cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Dashboard Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-orange-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>{calendar.monthName} {calendar.year}</span>
              </div>

              {/* Active Analytics Mode Badge */}
              {financials.isPocketMoneyPending ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                  Pocket Money Pending
                </span>
              ) : financials.analyticsMode === "pocketMoney" ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Analysis basis: Pocket Money Available
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  Analysis basis: Total Bank Balance
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-orange-500 tracking-tight">
              Financial Dashboard
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Hostel student personal finance, bank savings &amp; pocket money manager
            </p>
          </div>

          <button
            onClick={() => {
              setEditingExpense(null);
              setShowExpenseModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-orange-500/20 transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Add Expense</span>
          </button>
        </header>

        {/* Primary Ledger Cards: 4 Column Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Card 1: Current Bank Balance */}
          <DashboardCard
            title="Current Bank Balance"
            amount={financials.currentBankBalance || 0}
            subtitle={
              financials.openingBalance !== undefined
                ? `Carried forward: ₹${Number(financials.openingBalance).toLocaleString("en-IN")}`
                : "Total available across bank account & savings"
            }
            icon={Landmark}
            accentColor="text-blue-400"
            onAction={() => setShowBalanceModal(true)}
            actionText="Adjust Balance"
          />

          {/* Card 2: This Month's Pocket Money */}
          <DashboardCard
            title={`This Month's Pocket Money`}
            amount={financials.isPocketMoneyPending ? 0 : (financials.pocketMoney || 0)}
            subtitle={
              financials.isPocketMoneyPending
                ? "Status: Pending user entry"
                : financials.isPocketMoneyExhausted && financials.pocketMoney > 0
                ? "Pocket money exhausted"
                : `Allocated for ${calendar.monthName} ${calendar.year}`
            }
            icon={Coins}
            accentColor={financials.isPocketMoneyPending ? "text-amber-400" : "text-yellow-400"}
            onAction={() => setShowPocketMoneyModal(true)}
            actionText={financials.isPocketMoneyPending ? "Enter Pocket Money" : "Set Pocket Money"}
          />

          {/* Card 3: Total Spent This Month */}
          <DashboardCard
            title="Total Spent This Month"
            amount={financials.totalSpent || 0}
            subtitle={`${calendar.monthName} total verified expenses`}
            icon={TrendingUp}
            accentColor="text-red-400"
          />

          {/* Card 4: Remaining Pocket Money / Available Fund Status */}
          <DashboardCard
            title={financials.analyticsMode === "pocketMoney" ? "Remaining Pocket Money" : "Available Bank Balance"}
            amount={
              financials.analyticsMode === "pocketMoney"
                ? (financials.remainingPocketMoney || 0)
                : (financials.currentBankBalance || 0)
            }
            subtitle={
              financials.analyticsMode === "pocketMoney"
                ? `₹${(financials.remainingPocketMoney || 0).toLocaleString()} pocket money left`
                : "Spending is now deducted from bank savings"
            }
            icon={HelpCircle}
            accentColor={
              financials.analyticsMode === "pocketMoney"
                ? (financials.remainingPocketMoney > 0 ? "text-emerald-400" : "text-amber-400")
                : (financials.currentBankBalance > 0 ? "text-blue-400" : "text-red-500")
            }
          />
        </section>

        {/* Time Based Spending Grid */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4 text-gray-300 font-semibold text-lg">
            <Clock className="w-5 h-5 text-orange-500" />
            <h2>Time-Based Spending</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-900/90 border border-gray-800 p-4 rounded-xl">
              <p className="text-gray-400 text-xs uppercase font-medium tracking-wider">Today</p>
              <p className="text-xl font-bold text-orange-400 mt-1">₹{timeStats.todayTotal || 0}</p>
            </div>

            <div className="bg-gray-900/90 border border-gray-800 p-4 rounded-xl">
              <p className="text-gray-400 text-xs uppercase font-medium tracking-wider">This Week (Mon - Sun)</p>
              <p className="text-xl font-bold text-orange-400 mt-1">₹{timeStats.weekTotal || 0}</p>
            </div>

            <div className="bg-gray-900/90 border border-gray-800 p-4 rounded-xl">
              <p className="text-gray-400 text-xs uppercase font-medium tracking-wider">This Month</p>
              <p className="text-xl font-bold text-orange-400 mt-1">₹{timeStats.monthTotal || 0}</p>
            </div>

            <div className="bg-gray-900/90 border border-gray-800 p-4 rounded-xl">
              <p className="text-gray-400 text-xs uppercase font-medium tracking-wider">This Year ({calendar.year})</p>
              <p className="text-xl font-bold text-orange-400 mt-1">₹{timeStats.yearTotal || 0}</p>
            </div>
          </div>
        </section>

        {/* Budget Usage Progress & Alerts */}
        <section className="mb-8 bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-lg font-bold text-orange-500">
                {financials.analyticsMode === "pocketMoney"
                  ? "Pocket Money Budget Usage"
                  : "Bank Balance Spending Usage"}
              </h2>
              <span className="text-xs text-gray-400">
                {financials.analyticsLabel}
              </span>
            </div>
            <span className="text-sm font-semibold text-gray-300">
              {budgetUsed}% utilized
            </span>
          </div>

          <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden p-0.5">
            <div
              className={`${progressColor} h-3 rounded-full transition-all duration-700`}
              style={{ width: `${Math.min(budgetUsed, 100)}%` }}
            ></div>
          </div>

          <div className="flex justify-between text-xs text-gray-400 mt-2.5">
            <span>Spent: ₹{financials.totalSpent || 0}</span>
            <span>
              Available Analytical Pool: ₹{(financials.budgetPool || 0).toLocaleString()}
            </span>
          </div>

          {/* Budget Warnings */}
          {budgetWarnings.length > 0 && (
            <div className="mt-5 space-y-2.5 pt-4 border-t border-gray-800">
              {budgetWarnings.map((warning, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl flex items-center gap-3 text-sm font-medium border ${
                    warning.type === "exceeded"
                      ? "bg-red-500/10 border-red-500/40 text-red-400"
                      : "bg-yellow-500/10 border-yellow-500/40 text-yellow-400"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {warning.type === "exceeded"
                      ? `Alert: "${warning.category}" budget exceeded by ₹${warning.extra} (Limit: ₹${warning.limit}, Spent: ₹${warning.spent})`
                      : `Warning: "${warning.category}" budget is ${warning.percent}% utilized (₹${warning.spent} of ₹${warning.limit})`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Spending Forecast Card */}
        <section className="mb-8 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-orange-400">Spending Forecast ({calendar.monthName})</h2>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed">
            At your current spending rate of{" "}
            <span className="text-orange-400 font-semibold">₹{forecast.avgDailySpend || 0}/day</span>, you are
            projected to spend{" "}
            <span className="text-orange-400 font-semibold">₹{forecast.predictedMonthlySpend || 0}</span> by the end
            of {calendar.monthName}.
          </p>

          <div className="mt-3">
            {forecast.isOverspending ? (
              <p className="text-red-400 text-sm font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                This projected spending exceeds your available funds by ₹{forecast.forecastDifference}.
              </p>
            ) : (
              <p className="text-emerald-400 text-sm font-medium flex items-center gap-1.5">
                ✓ You are on track to save approximately ₹{Math.abs(forecast.forecastDifference || 0)} this month.
              </p>
            )}
          </div>
        </section>

        {/* Analytics Charts Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Category Breakdown Donut Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-bold text-white">Category Breakdown</h2>
              </div>
              <span className="text-xs text-gray-400">
                {financials.analyticsLabel}
              </span>
            </div>

            {pieChartData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center min-h-[260px] text-gray-500 text-sm">
                No expense data recorded for this month yet.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={55}
                      paddingAngle={3}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`₹${val}`, "Spent"]}
                      contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: "0.75rem" }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Monthly Trend Bar Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-bold text-white">{calendar.year} Monthly Spending Trend</h2>
            </div>

            {monthlyTrendData.every((m) => m.amount === 0) ? (
              <div className="flex-1 flex items-center justify-center min-h-[260px] text-gray-500 text-sm">
                No spending data recorded for {calendar.year} yet.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                    <Tooltip
                      formatter={(val) => [`₹${val}`, "Total Spent"]}
                      contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: "0.75rem" }}
                    />
                    <Bar dataKey="amount" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        {/* Collapsible Section 1: Category Budget Planner */}
        <section className="mb-8 bg-gray-900 border border-gray-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
          <div
            onClick={toggleBudgetPlanner}
            className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-800/40 transition select-none"
          >
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-bold text-white">Category Budget Planner</h2>
              <span className="text-xs text-gray-400 bg-gray-800 px-2.5 py-0.5 rounded-full border border-gray-700">
                {budgets.length} Targets
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xs hidden sm:inline">
                {isBudgetPlannerOpen ? "Collapse" : "Expand"}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-orange-400 transition-transform duration-300 ${
                  isBudgetPlannerOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>

          {isBudgetPlannerOpen && (
            <div className="p-6 pt-0 border-t border-gray-800/60">
              {/* Add / Update Limit Form */}
              <form onSubmit={handleAddBudget} className="flex flex-wrap gap-3 my-6 bg-gray-800/60 p-4 rounded-xl border border-gray-700/60">
                <select
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                  className="bg-gray-800 border border-gray-700 px-4 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                  required
                >
                  <option value="">Select Category</option>
                  {categoryObjects.map((cat) => (
                    <option key={cat._id || cat.id || cat.name} value={cat.name}>
                      {cat.path || cat.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Budget Limit (₹)"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  className="bg-gray-800 border border-gray-700 px-4 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                  min="1"
                  required
                />

                <button
                  type="submit"
                  disabled={budgetSubmitting}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {budgetSubmitting ? "Saving..." : "Set Budget Limit"}
                </button>
              </form>

              {/* Budget Limits Grid */}
              {budgets.length === 0 ? (
                <p className="text-gray-500 text-sm bg-gray-900/50 p-6 rounded-xl text-center border border-gray-800/60">
                  No category budgets set yet. Choose a category and budget limit above to track spending limits.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {budgets.map((b) => {
                    const spent = pieChartData.find((p) => p.name.toLowerCase() === b.category.toLowerCase())?.value || 0;
                    const percent = Math.min((spent / b.limit) * 100, 100);
                    let barColor = "bg-emerald-500";
                    if (percent > 80) barColor = "bg-red-500";
                    else if (percent > 50) barColor = "bg-orange-500";

                    return (
                      <div key={b._id || b.id} className="bg-gray-800/50 border border-gray-700/60 p-5 rounded-xl flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="font-semibold text-white text-sm">{b.category}</span>
                            <span className="text-xs text-gray-400">
                              ₹{spent} / ₹{b.limit}
                            </span>
                          </div>

                          <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                            <div className={`${barColor} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700/40 text-xs">
                          <span className={percent >= 100 ? "text-red-400 font-medium" : "text-gray-400"}>
                            {percent >= 100 ? "Limit Exceeded!" : `${Math.round(percent)}% used`}
                          </span>
                          <button
                            onClick={() => handleDeleteBudget(b._id || b.id)}
                            className="text-red-400 hover:text-red-300 transition cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Collapsible Section 2: Recent Expenses (Max 10 with 'View All Expenses' Link) */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
          <div
            onClick={toggleRecentExpenses}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 cursor-pointer hover:bg-gray-800/40 transition select-none"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-orange-500">Recent Expenses</h2>
              <span className="text-xs text-gray-400 bg-gray-800 px-2.5 py-0.5 rounded-full border border-gray-700">
                Showing max {Math.min(recentExpenses.length, 10)}
              </span>
            </div>

            <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
              <Link
                to="/expenses"
                className="flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 transition px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30"
              >
                <span>View All Expenses</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={toggleRecentExpenses}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
                title={isRecentExpensesOpen ? "Collapse" : "Expand"}
              >
                <ChevronDown
                  className={`w-5 h-5 text-orange-400 transition-transform duration-300 ${
                    isRecentExpensesOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {isRecentExpensesOpen && (
            <div className="p-6 pt-0 border-t border-gray-800/60">
              {/* Filter and Search Bar */}
              <div className="flex flex-wrap items-center gap-3 my-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search note, category, amount..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-gray-800 border border-gray-700 pl-9 pr-4 py-2 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 w-52 md:w-64"
                  />
                </div>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-gray-800 border border-gray-700 px-3 py-2 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="All">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {filteredRecentExpenses.length === 0 ? (
                <p className="text-gray-500 text-center py-10 text-sm">
                  No recent expenses matching your criteria.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 uppercase text-xs tracking-wider">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Note</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {filteredRecentExpenses.map((exp) => (
                        <tr key={exp._id || exp.id} className="hover:bg-gray-800/30 transition">
                          <td className="py-3.5 px-4 text-gray-300">
                            {new Date(exp.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-300 max-w-xs truncate">{exp.note || "-"}</td>
                          <td className="py-3.5 px-4 font-semibold text-white">₹{exp.amount}</td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingExpense(exp);
                                  setShowExpenseModal(true);
                                }}
                                className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition cursor-pointer"
                                title="Edit expense"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(exp._id || exp.id)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                title="Delete expense"
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
          )}
        </section>
      </main>

      {/* Add / Edit Expense Modal */}
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => {
          setShowExpenseModal(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        categories={categoryObjects.length > 0 ? categoryObjects : categories}
        initialData={editingExpense}
      />

      {/* Pocket Money Modal */}
      <PocketMoneyModal
        isOpen={showPocketMoneyModal}
        onClose={() => setShowPocketMoneyModal(false)}
        currentPocketMoney={financials.pocketMoney}
        monthName={calendar.monthName}
        year={calendar.year}
        onSave={handleSavePocketMoney}
      />

      {/* First-Time Onboarding & Balance Adjustment Modal */}
      <InitialBalanceModal
        isOpen={showBalanceModal || needsInitialOnboarding}
        onSave={handleSaveInitialBalance}
      />
    </div>
  );
}

export default Dashboard;