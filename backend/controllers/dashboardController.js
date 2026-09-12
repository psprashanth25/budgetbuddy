const storage = require("../services/storageService");

// Helper for Monday to Sunday week bounds
const getWeekBounds = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const startOfWeek = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday, 0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6, 23, 59, 59, 999);

  return { startOfWeek, endOfWeek };
};

// @desc    Get complete dashboard summary
// @route   GET /api/dashboard/summary
// @access  Private
exports.getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await storage.findUserById(userId);

    const now = new Date();
    const queryYear = req.query.year ? parseInt(req.query.year, 10) : now.getFullYear();
    const queryMonth = req.query.month ? parseInt(req.query.month, 10) : now.getMonth() + 1;

    const isCurrentMonth = queryYear === now.getFullYear() && queryMonth === now.getMonth() + 1;
    const daysInMonth = new Date(queryYear, queryMonth, 0).getDate();

    // Financial Records (Ensures month boundary transition & carried-forward balance)
    const monthlyRecord = await storage.ensureMonthlyRecord(userId, queryYear, queryMonth);
    const isPocketMoneyPending = monthlyRecord ? monthlyRecord.isPocketMoneyPending !== false : true;
    const pocketMoney = isPocketMoneyPending ? 0 : (monthlyRecord ? Number(monthlyRecord.pocketMoney || 0) : 0);
    const openingBalance = monthlyRecord ? Number(monthlyRecord.openingBalance || 0) : 0;
    const closingBalance = monthlyRecord ? Number(monthlyRecord.closingBalance || 0) : 0;
    const pocketMoneyEnteredAt = monthlyRecord ? monthlyRecord.pocketMoneyEnteredAt : null;
    const entryStatus = monthlyRecord ? (monthlyRecord.entryStatus || "pending") : "pending";
    const currentBankBalance = user ? Number(user.currentBankBalance || 0) : 0;
    const initialBankBalance = user ? user.initialBankBalance : null;
    const hasCompletedBalanceSetup = user ? !!user.hasCompletedBalanceSetup : false;

    // Expenses for selected month
    const monthExpenses = await storage.getExpenses(userId, { year: queryYear, month: queryMonth });
    const totalSpent = monthExpenses.reduce((sum, item) => sum + item.amount, 0);

    // Pocket Money Exhaustion & Analytics Mode Logic
    // If pocket money is allocated (> 0) and totalSpent < pocketMoney: Pocket Money Mode
    // If pocket money reaches 0 (or expenses exceed allocation, or pending): Bank Balance Mode
    const isPocketMoneyExhausted = pocketMoney > 0 ? totalSpent >= pocketMoney : true;
    const remainingPocketMoney = Math.max(0, pocketMoney - totalSpent);

    let analyticsMode = "pocketMoney";
    let analyticsLabel = "Analysis basis: Pocket Money Available";
    let exhaustionNotification = null;
    let modeShiftNotification = null;
    let budgetPool = pocketMoney;
    let budgetUsedPercent = 0;

    if (!isPocketMoneyPending && pocketMoney > 0 && totalSpent < pocketMoney) {
      analyticsMode = "pocketMoney";
      analyticsLabel = "Analysis basis: Pocket Money Available";
      budgetPool = pocketMoney;
      budgetUsedPercent = pocketMoney > 0 ? (totalSpent / pocketMoney) * 100 : 0;
    } else {
      analyticsMode = "bankBalance";
      analyticsLabel = "Analysis basis: Total Bank Balance";
      if (!isPocketMoneyPending && pocketMoney > 0 && totalSpent >= pocketMoney) {
        exhaustionNotification = "Your pocket money for this month is exhausted. Further spendings are now being deducted from your bank account/savings.";
        modeShiftNotification = "From now on, your analysis is shifting to be based on your total balance";
      }
      budgetPool = currentBankBalance;
      budgetUsedPercent = currentBankBalance > 0 ? (totalSpent / (currentBankBalance + totalSpent)) * 100 : 100;
    }

    // All expenses for current user to compute Today, Week, Year
    const allExpenses = await storage.getExpenses(userId, {});

    // 1. Today's expenses
    const todayStr = now.toDateString();
    const todayExpenses = allExpenses.filter((e) => new Date(e.date).toDateString() === todayStr);
    const todayTotal = todayExpenses.reduce((sum, item) => sum + item.amount, 0);

    // 2. This Week (Monday to Sunday)
    const { startOfWeek, endOfWeek } = getWeekBounds(now);
    const startMs = startOfWeek.getTime();
    const endMs = endOfWeek.getTime();
    const weekExpenses = allExpenses.filter((e) => {
      const t = new Date(e.date).getTime();
      return t >= startMs && t <= endMs;
    });
    const weekTotal = weekExpenses.reduce((sum, item) => sum + item.amount, 0);

    // 3. This Year
    const yearExpenses = allExpenses.filter((e) => new Date(e.date).getFullYear() === queryYear);
    const yearTotal = yearExpenses.reduce((sum, item) => sum + item.amount, 0);

    // Spending Forecast
    const currentDay = isCurrentMonth ? Math.max(1, now.getDate()) : daysInMonth;
    const avgDailySpend = totalSpent / currentDay;
    const predictedMonthlySpend = Math.round(avgDailySpend * daysInMonth);
    const forecastDifference = predictedMonthlySpend - (pocketMoney > 0 ? pocketMoney : currentBankBalance);

    // Budget Alerts
    const budgets = await storage.getBudgets(userId);
    const categoryTotals = {};
    monthExpenses.forEach((exp) => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    const budgetWarnings = budgets
      .map((b) => {
        const spent = categoryTotals[b.category] || 0;
        const percent = b.limit ? (spent / b.limit) * 100 : 0;
        if (percent >= 100) {
          return {
            type: "exceeded",
            category: b.category,
            extra: spent - b.limit,
            limit: b.limit,
            spent,
          };
        }
        if (percent >= 80) {
          return {
            type: "warning",
            category: b.category,
            percent: Math.round(percent),
            limit: b.limit,
            spent,
          };
        }
        return null;
      })
      .filter(Boolean);

    // Chart Data: Category Breakdown
    const pieChartData = Object.keys(categoryTotals).map((cat) => ({
      name: cat,
      value: categoryTotals[cat],
    }));

    // Chart Data: Monthly Spending Trend (12 months of queryYear)
    const monthlyTrendData = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let m = 1; m <= 12; m++) {
      const mExpenses = yearExpenses.filter((e) => new Date(e.date).getMonth() + 1 === m);
      monthlyTrendData.push({
        monthNumber: m,
        name: monthNames[m - 1],
        amount: mExpenses.reduce((sum, e) => sum + e.amount, 0),
      });
    }

    // Recent Expenses: Strictly limited to a maximum of 10
    const recentExpenses = allExpenses.slice(0, 10);

    // Categories list with paths for selection
    const categories = await storage.getCategories(userId);

    const monthName = new Date(queryYear, queryMonth - 1, 1).toLocaleString("default", { month: "long" });

    return res.json({
      success: true,
      data: {
        calendar: {
          year: queryYear,
          month: queryMonth,
          monthName,
          isCurrentMonth,
        },
        financials: {
          currentBankBalance,
          initialBankBalance,
          hasCompletedBalanceSetup,
          pocketMoney,
          openingBalance,
          closingBalance,
          isPocketMoneyPending,
          pocketMoneyEnteredAt,
          entryStatus,
          pendingPocketMoneyNotice: isPocketMoneyPending ? "This month's pocket money is not yet entered" : null,
          remainingPocketMoney,
          isPocketMoneyExhausted,
          totalSpent,
          analyticsMode,
          analyticsLabel,
          exhaustionNotification,
          modeShiftNotification,
          budgetPool,
          budgetUsedPercent: Math.min(100, Math.round(budgetUsedPercent)),
        },
        analytics: {
          activeMode: analyticsMode,
          analyticsLabel,
          isPocketMoneyExhausted,
          pocketMoneyRemaining: remainingPocketMoney,
          exhaustionNotification,
          modeNotification: modeShiftNotification,
          reversionNotification: "Analysis reverted to pocket money available basis",
        },
        timeStats: {
          todayTotal,
          weekTotal,
          monthTotal: totalSpent,
          yearTotal,
        },
        forecast: {
          avgDailySpend: Math.round(avgDailySpend),
          predictedMonthlySpend,
          forecastDifference,
          isOverspending: forecastDifference > 0,
        },
        budgetWarnings,
        budgets,
        categories: categories.map((c) => c.name),
        categoryObjects: categories,
        pieChartData,
        monthlyTrendData,
        recentExpenses,
      },
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return res.status(500).json({ success: false, message: "Failed to load dashboard data." });
  }
};
