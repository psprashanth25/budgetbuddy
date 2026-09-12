import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import DashboardCard from "../components/DashboardCard";
import { reportApi } from "../services/api";
import { downloadReportPDF } from "../utils/reportPdfGenerator";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Filter,
  Lightbulb,
  Wallet,
  Coins,
  Receipt,
  Landmark,
  HelpCircle,
  AlertTriangle,
  PieChart as PieIcon,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const CHART_COLORS = [
  "#f97316", // orange
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#ef4444", // red
  "#14b8a6", // teal
  "#6366f1", // indigo
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const now = useMemo(() => new Date(), []);
  const initialYear = parseInt(searchParams.get("year"), 10) || now.getFullYear();
  const initialMonth = parseInt(searchParams.get("month"), 10) || now.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Table filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [summaryData, setSummaryData] = useState(null);

  // Load detailed month report following Dashboard financial logic
  const loadReportData = useCallback(async (year, month) => {
    try {
      setLoading(true);
      setError("");

      const [detailRes, sumRes] = await Promise.allSettled([
        reportApi.getMonthDetail(year, month),
        reportApi.getSummary(),
      ]);

      if (detailRes.status === "fulfilled" && detailRes.value?.success && detailRes.value?.data) {
        setData(detailRes.value.data);
      } else {
        const errMsg = detailRes.status === "fulfilled" ? detailRes.value?.message : detailRes.reason?.message;
        setError(errMsg || "Failed to load report for the selected month.");
      }

      if (sumRes.status === "fulfilled" && sumRes.value?.success && sumRes.value?.data) {
        setSummaryData(sumRes.value.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReportData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, loadReportData]);

  // Keep search params in sync
  const changeMonthYear = (newYear, newMonth) => {
    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
    setSearchParams({ year: String(newYear), month: String(newMonth) });
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    changeMonthYear(prevYear, prevMonth);
  };

  const handleNextMonth = () => {
    const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
    const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
    changeMonthYear(nextYear, nextMonth);
  };

  const handleCurrentMonth = () => {
    changeMonthYear(now.getFullYear(), now.getMonth() + 1);
  };

  // Derived financial state (mirrors Dashboard logic)
  const financials = data?.financials || data || {};
  const expenses = data?.expenses || [];
  const chartData = data?.chartData || [];
  const budgets = data?.budgets || {};
  const categories = data?.categories || [];
  const comparison = data?.comparison || {};
  const yearlyTrend = data?.yearlyTrend || [];
  const availableMonths = data?.availableMonths || [];

  const isPocketMoneyMode = financials.analyticsMode === "pocketMoney";
  const isExhausted = financials.isPocketMoneyExhausted && financials.pocketMoney > 0;

  // Filtered expenses for line items table
  const displayedExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchesCategory =
        categoryFilter === "All" ||
        (exp.category && exp.category.toLowerCase() === categoryFilter.toLowerCase());
      const s = search.toLowerCase().trim();
      const matchesSearch =
        !s ||
        (exp.note && exp.note.toLowerCase().includes(s)) ||
        (exp.category && exp.category.toLowerCase().includes(s)) ||
        exp.amount.toString().includes(s);
      return matchesCategory && matchesSearch;
    });
  }, [expenses, categoryFilter, search]);

  // Category totals for budget cards
  const categoryTotals = useMemo(() => {
    const totals = {};
    expenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + (Number(e.amount) || 0);
    });
    return totals;
  }, [expenses]);

  // Year options for selector: 2024 to currentYear + 1
  const yearOptions = useMemo(() => {
    const years = [];
    const minYear = 2024;
    const maxYear = now.getFullYear() + 1;
    for (let y = maxYear; y >= minYear; y--) {
      years.push(y);
    }
    return years;
  }, [now]);

  // Download PDF Handler
  const handleDownloadPDF = () => {
    if (data) {
      downloadReportPDF(data);
    }
  };

  const isCurrentMonth =
    selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;

  return (
    <div className="flex bg-black text-white min-h-screen">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Top Header & Analytics Mode Badge */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-orange-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>{data?.label || `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}</span>
              </div>

              {/* Active Analytics Mode Badge (Identical to Dashboard) */}
              {isPocketMoneyMode ? (
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

            <h1 className="text-2xl md:text-4xl font-extrabold text-orange-500 tracking-tight">
              Monthly Reports & Statements
            </h1>
            <p className="text-gray-400 text-xs md:text-sm mt-1">
              Authoritative financial statement reconciled with your live bank balance &amp; pocket money
            </p>
          </div>

          {/* Download PDF Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              disabled={loading || !data}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-orange-500/20 transition cursor-pointer"
              title="Download official PDF statement matching current view"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Statement</span>
            </button>
          </div>
        </div>

        {/* Pending Pocket Money Status Banner */}
        {financials.isPocketMoneyPending && (
          <div className="mb-6 p-4 md:p-5 rounded-2xl bg-orange-500/10 border border-orange-500/40 text-orange-400 text-sm flex items-start gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-400" />
            <div>
              <p className="font-bold text-white text-base">This month's pocket money is not yet entered</p>
              <p className="text-xs text-orange-300/80 mt-1">
                Carried forward opening balance: ₹{(financials.openingBalance || financials.currentBankBalance || 0).toLocaleString("en-IN")}. Spending deductions continue progressively from this balance until pocket money is entered.
              </p>
            </div>
          </div>
        )}

        {/* Pocket Money Exhaustion Notification Banner (Identical to Dashboard) */}
        {isExhausted && !financials.isPocketMoneyPending && (
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

        {/* Dynamic Month / Year Filter Toolbar */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-4 md:p-5 mb-8 shadow-xl backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Month & Year Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Select Period:
                </span>
              </div>

              {/* Month Dropdown */}
              <select
                value={selectedMonth}
                onChange={(e) => changeMonthYear(selectedYear, parseInt(e.target.value, 10))}
                className="bg-gray-800 border border-gray-700 hover:border-orange-500/50 text-white text-sm font-semibold rounded-xl px-3.5 py-2 focus:outline-none focus:border-orange-500 transition cursor-pointer"
              >
                {MONTH_NAMES.map((mName, idx) => (
                  <option key={mName} value={idx + 1}>
                    {mName}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={selectedYear}
                onChange={(e) => changeMonthYear(parseInt(e.target.value, 10), selectedMonth)}
                className="bg-gray-800 border border-gray-700 hover:border-orange-500/50 text-white text-sm font-semibold rounded-xl px-3.5 py-2 focus:outline-none focus:border-orange-500 transition cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Navigation Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-2 rounded-xl text-xs md:text-sm font-medium transition cursor-pointer border border-gray-700/60"
                title="View previous month"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev Month</span>
              </button>

              <button
                onClick={handleCurrentMonth}
                className={`px-3 py-2 rounded-xl text-xs md:text-sm font-semibold transition cursor-pointer border ${
                  isCurrentMonth
                    ? "bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-sm"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700/60"
                }`}
                title="Jump to current active month"
              >
                Current Month
              </button>

              <button
                onClick={handleNextMonth}
                className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-2 rounded-xl text-xs md:text-sm font-medium transition cursor-pointer border border-gray-700/60"
                title="View next month"
              >
                <span>Next Month</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-xl text-red-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && !data ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 text-sm">
              Loading financial ledger for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}...
            </p>
          </div>
        ) : (
          <>
            {/* Primary Ledger Cards: 4 Column Grid (Identical to Dashboard) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
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
              />

              {/* Card 2: This Month's Pocket Money */}
              <DashboardCard
                title="This Month's Pocket Money"
                amount={financials.isPocketMoneyPending ? 0 : (financials.pocketMoney || 0)}
                subtitle={
                  financials.isPocketMoneyPending
                    ? "Status: Pending user input"
                    : isExhausted
                    ? "Pocket money exhausted"
                    : `Status: ${financials.entryStatus === "late" ? "Entered Late" : "Entered On-Time"}`
                }
                icon={Coins}
                accentColor={financials.isPocketMoneyPending ? "text-amber-400" : "text-yellow-400"}
              />

              {/* Card 3: Total Spent This Month */}
              <DashboardCard
                title="Total Spent This Month"
                amount={financials.totalSpent || 0}
                subtitle={`${data?.monthName || MONTH_NAMES[selectedMonth - 1]} total verified expenses (${expenses.length} transactions)`}
                icon={TrendingUp}
                accentColor="text-red-400"
              />

              {/* Card 4: Remaining Pocket Money / Available Bank Balance */}
              <DashboardCard
                title={isPocketMoneyMode ? "Remaining Pocket Money" : "Available Bank Balance"}
                amount={
                  isPocketMoneyMode
                    ? (financials.remainingPocketMoney || 0)
                    : (financials.currentBankBalance || 0)
                }
                subtitle={
                  isPocketMoneyMode
                    ? `₹${(financials.remainingPocketMoney || 0).toLocaleString()} pocket money left`
                    : "Spending is now deducted from bank savings"
                }
                icon={HelpCircle}
                accentColor={
                  isPocketMoneyMode
                    ? (financials.remainingPocketMoney > 0 ? "text-emerald-400" : "text-amber-400")
                    : (financials.currentBankBalance > 0 ? "text-blue-400" : "text-red-500")
                }
              />
            </section>

            {/* Monthly Financial Audit & Reconciliation Strip */}
            <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 mb-8 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-orange-400" />
                  <h2 className="text-base font-bold text-white">
                    Monthly Balance Flow &amp; Audit Trail
                  </h2>
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  {data?.monthName || MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Opening Balance */}
                <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-4">
                  <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">
                    1. Opening Balance
                  </span>
                  <p className="text-xl font-extrabold text-blue-400 mt-1">
                    ₹{Number(financials.openingBalance || 0).toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Carried forward from previous month
                  </p>
                </div>

                {/* 2. Pocket Money Added */}
                <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">
                      2. Pocket Money Added
                    </span>
                    {financials.isPocketMoneyPending ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        Pending
                      </span>
                    ) : financials.entryStatus === "late" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/40">
                        Entered Late
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        Entered On-Time
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-extrabold text-yellow-400 mt-1">
                    {financials.isPocketMoneyPending ? "₹0 (Pending)" : `+₹${Number(financials.pocketMoney || 0).toLocaleString("en-IN")}`}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {financials.isPocketMoneyPending ? "Pending user entry for this month" : "Injected into available funds"}
                  </p>
                </div>

                {/* 3. Total Spendings */}
                <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-4">
                  <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">
                    3. Total Spendings
                  </span>
                  <p className="text-xl font-extrabold text-red-400 mt-1">
                    -₹{Number(financials.totalSpent || 0).toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Progressive deductions to date
                  </p>
                </div>

                {/* 4. Closing / Carried Balance */}
                <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-4">
                  <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">
                    4. Closing Balance
                  </span>
                  <p className="text-xl font-extrabold text-emerald-400 mt-1">
                    ₹{(
                      financials.closingBalance !== undefined
                        ? Number(financials.closingBalance)
                        : Math.max(0, (financials.openingBalance || 0) + (financials.isPocketMoneyPending ? 0 : financials.pocketMoney || 0) - (financials.totalSpent || 0))
                    ).toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Balance carried to next month
                  </p>
                </div>
              </div>
            </div>

            {/* Insights Row: Highest Category & Month-over-Month Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Highest Spending Category Insight */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 flex-shrink-0">
                  <Lightbulb className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white mb-1">Highest Spending Category</h2>
                  {data?.highestCategory ? (
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Primary expenditure this month was on{" "}
                      <span className="text-orange-400 font-bold">{data.highestCategory}</span>,
                      totaling{" "}
                      <span className="text-orange-400 font-bold">
                        ₹{Number(data.highestAmount).toLocaleString("en-IN")}
                      </span>{" "}
                      ({Math.round(((data.highestAmount || 0) / (financials.totalSpent || 1)) * 100)}% of total monthly spending).
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No expense expenditures recorded for this month.
                    </p>
                  )}
                </div>
              </div>

              {/* Previous Month Comparison */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white mb-1">Month-over-Month Comparison</h2>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Comparison with{" "}
                    <span className="font-semibold text-white">
                      {comparison.prevMonthLabel || "Previous Month"}
                    </span>{" "}
                    (₹{(comparison.prevTotalSpent || 0).toLocaleString("en-IN")} spent):
                  </p>
                  {comparison.hasPreviousData && comparison.percentChange !== null ? (
                    <p
                      className={`text-sm font-semibold mt-1 ${
                        comparison.isHigher ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {comparison.isHigher
                        ? `↑ Spent ₹${Math.abs(comparison.difference).toLocaleString("en-IN")} (+${comparison.percentChange}%) more than last month.`
                        : `↓ Spent ₹${Math.abs(comparison.difference).toLocaleString("en-IN")} (${comparison.percentChange}%) less than last month.`}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      First recorded month or no prior history available.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Visualizations Section: Category Pie Chart + Yearly Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Category Spending Distribution Pie Chart */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <PieIcon className="w-5 h-5 text-orange-400" />
                  <h2 className="text-lg font-bold text-white">Category Spending Distribution</h2>
                </div>

                {chartData.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                    <PieIcon className="w-10 h-10 mb-2 text-gray-600" />
                    <p className="text-sm">No category spending data for this month.</p>
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={85}
                          innerRadius={35}
                          paddingAngle={2}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Spent"]}
                          contentStyle={{
                            backgroundColor: "#111827",
                            borderColor: "#374151",
                            borderRadius: "0.75rem",
                            color: "#fff",
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Yearly Trend Chart */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                  <h2 className="text-lg font-bold text-white">
                    Yearly Spending Trend ({selectedYear})
                  </h2>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                      <RechartsTooltip
                        formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Spent"]}
                        contentStyle={{
                          backgroundColor: "#111827",
                          borderColor: "#374151",
                          borderRadius: "0.75rem",
                        }}
                      />
                      <Bar dataKey="amount" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Category Budgets Progress Bars (if any configured) */}
            {Object.keys(budgets).length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
                <h2 className="text-base font-bold text-white mb-4">
                  Category Budgets for {data?.monthName || MONTH_NAMES[selectedMonth - 1]}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.keys(budgets).map((category) => {
                    const spent = categoryTotals[category] || 0;
                    const limit = budgets[category];
                    const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;

                    let color = "bg-emerald-500";
                    if (percent > 85) color = "bg-red-500";
                    else if (percent > 60) color = "bg-orange-500";

                    return (
                      <div key={category} className="bg-gray-800/50 border border-gray-800 p-4 rounded-xl">
                        <div className="flex justify-between text-xs mb-1.5 font-medium">
                          <span className="text-white font-semibold">{category}</span>
                          <span className="text-gray-400">
                            ₹{spent.toLocaleString("en-IN")} / ₹{limit.toLocaleString("en-IN")} ({Math.round(percent)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`${color} h-2 rounded-full transition-all duration-300`}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Statement Line Items (Itemized Transactions Table) */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-orange-500">Statement Line Items</h2>
                  <p className="text-xs text-gray-400">
                    Detailed ledger transactions for {data?.label || `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
                  </p>
                </div>

                {/* Search & Category Filter Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search note, category, amount..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="bg-gray-800 border border-gray-700 pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 w-48 sm:w-64 transition"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="bg-gray-800 border border-gray-700 px-3 py-2 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-orange-500 cursor-pointer transition"
                    >
                      <option value="All">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Transactions Table Content */}
              {displayedExpenses.length === 0 ? (
                <div className="bg-gray-950/40 border border-gray-800 rounded-xl p-10 text-center text-gray-500">
                  <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm font-semibold text-gray-300">
                    No expense transactions found for this selection
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {expenses.length === 0
                      ? `No expenses were recorded for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}.`
                      : "No transactions match your current search or category filter criteria."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 uppercase text-[11px] tracking-wider">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Description / Note</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {displayedExpenses.map((exp) => (
                        <tr key={exp._id || exp.id} className="hover:bg-gray-800/30 transition">
                          <td className="py-3 px-4 text-gray-300 whitespace-nowrap text-xs sm:text-sm">
                            {new Date(exp.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 whitespace-nowrap">
                              {exp.category || "Uncategorized"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-300 max-w-sm truncate text-xs sm:text-sm">
                            {exp.note || "-"}
                          </td>
                          <td className="py-3 px-4 font-bold text-white text-right whitespace-nowrap text-xs sm:text-sm">
                            ₹{Number(exp.amount).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-700 text-white font-bold bg-gray-800/30">
                        <td colSpan="3" className="py-3 px-4 text-right uppercase text-xs tracking-wider text-gray-400">
                          Total of Listed Items:
                        </td>
                        <td className="py-3 px-4 text-right text-orange-400 text-base">
                          ₹
                          {displayedExpenses
                            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
                            .toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Historical Monthly Summary & Audit Trail Table */}
            {summaryData?.monthsList && summaryData.monthsList.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-orange-500">
                      Monthly Ledger Summary &amp; Audit Trail
                    </h2>
                    <p className="text-xs text-gray-400">
                      Historical audit breakdown: Opening Balance, Pocket Money Added (On-time vs Late), Total Spendings, and Closing Balance
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">
                    {summaryData.monthsList.length} statements recorded
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 uppercase text-[11px] tracking-wider">
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4 text-right">Opening Balance</th>
                        <th className="py-3 px-4 text-center">Pocket Money Added</th>
                        <th className="py-3 px-4 text-right">Total Spendings</th>
                        <th className="py-3 px-4 text-right">Closing Balance</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {summaryData.monthsList.map((m) => {
                        const isSelected = m.year === selectedYear && m.month === selectedMonth;
                        const isPending = m.isPocketMoneyPending;
                        return (
                          <tr
                            key={m.key}
                            className={`transition ${isSelected ? "bg-orange-500/10 font-semibold" : "hover:bg-gray-800/30"}`}
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="text-white font-bold">{m.label}</span>
                              {isSelected && (
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/40 font-normal">
                                  Current View
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right text-blue-400 font-mono whitespace-nowrap">
                              ₹{Number(m.openingBalance || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="inline-flex flex-col items-center">
                                <span className="text-yellow-400 font-mono">
                                  {isPending ? "₹0" : `₹${Number(m.pocketMoney || 0).toLocaleString("en-IN")}`}
                                </span>
                                {isPending ? (
                                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 mt-0.5">
                                    Pending
                                  </span>
                                ) : m.entryStatus === "late" ? (
                                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/40 mt-0.5">
                                    Entered Late
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mt-0.5">
                                    Entered On-Time
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right text-red-400 font-mono whitespace-nowrap">
                              -₹{Number(m.totalSpent || m.total || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 px-4 text-right text-emerald-400 font-mono font-bold whitespace-nowrap">
                              ₹{Number(
                                m.closingBalance !== undefined
                                  ? m.closingBalance
                                  : Number(m.openingBalance || 0) + (isPending ? 0 : Number(m.pocketMoney || 0)) - Number(m.total || 0)
                              ).toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <button
                                onClick={() => navigate(`/reports/${m.year}/${m.month}`)}
                                className="px-3 py-1 bg-gray-800 hover:bg-orange-500 hover:text-white text-gray-300 text-xs rounded-lg transition border border-gray-700/60 cursor-pointer"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Quick Available Monthly Statements Switcher Cards */}
            {availableMonths.length > 1 && (
              <div className="mt-8 pt-6 border-t border-gray-800">
                <h3 className="text-sm uppercase font-semibold text-gray-400 tracking-wider mb-4">
                  Jump to Other Tracked Statements
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {availableMonths.map((m) => {
                    const isSelected = m.year === selectedYear && m.month === selectedMonth;
                    return (
                      <button
                        key={m.key}
                        onClick={() => changeMonthYear(m.year, m.month)}
                        className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                          isSelected
                            ? "bg-orange-500/20 border-orange-500/60 text-white"
                            : "bg-gray-900 border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white"
                        }`}
                      >
                        <p className="text-xs font-bold truncate">{m.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {isSelected ? "Active View" : "View Statement"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Reports;