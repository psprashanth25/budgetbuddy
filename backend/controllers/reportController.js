const storage = require("../services/storageService");

// @desc    Get summary of all months for Reports overview
// @route   GET /api/reports/summary
// @access  Private
exports.getReportsSummary = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await storage.findUserById(userId);
    const expenses = await storage.getExpenses(userId, { sortBy: "date", order: "desc" });
    const monthlyRecords = await storage.getAllMonthlyRecords(userId);

    const monthlyMap = {};

    // 1. Prepopulate from user's monthly records
    if (Array.isArray(monthlyRecords)) {
      monthlyRecords.forEach((r) => {
        const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
        const d = new Date(r.year, r.month - 1, 1);
        const isPending = r.isPocketMoneyPending !== false;
        monthlyMap[key] = {
          key,
          year: Number(r.year),
          month: Number(r.month),
          label: `${d.toLocaleString("default", { month: "long" })} ${r.year}`,
          openingBalance: Number(r.openingBalance || 0),
          pocketMoney: isPending ? 0 : Number(r.pocketMoney || 0),
          isPocketMoneyPending: isPending,
          pocketMoneyEnteredAt: r.pocketMoneyEnteredAt || null,
          entryStatus: r.entryStatus || (isPending ? "pending" : "on_time"),
          total: 0,
          count: 0,
          closingBalance: Number(r.closingBalance || 0),
        };
      });
    }

    // 2. Aggregate actual expenses
    if (Array.isArray(expenses)) {
      expenses.forEach((expense) => {
        const d = new Date(expense.date);
        if (isNaN(d.getTime())) return;
        const year = d.getFullYear();
        const month = d.getMonth() + 1; // 1-12
        const key = `${year}-${String(month).padStart(2, "0")}`;
        const monthLabel = `${d.toLocaleString("default", { month: "long" })} ${year}`;

        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            key,
            year,
            month,
            label: monthLabel,
            openingBalance: 0,
            pocketMoney: 0,
            isPocketMoneyPending: true,
            pocketMoneyEnteredAt: null,
            entryStatus: "pending",
            total: 0,
            count: 0,
            closingBalance: 0,
          };
        }
        monthlyMap[key].total += Number(expense.amount) || 0;
        monthlyMap[key].count += 1;
      });
    }

    // Chronological reconciliation for consistent opening/closing balances
    const sortedAscKeys = Object.keys(monthlyMap).sort();
    let carriedBalance = user && user.initialBankBalance !== null && user.initialBankBalance !== undefined
      ? Number(user.initialBankBalance)
      : Number(user ? user.currentBankBalance : 0);

    sortedAscKeys.forEach((key, index) => {
      const item = monthlyMap[key];
      if (item.openingBalance === 0 && index > 0) {
        item.openingBalance = carriedBalance;
      }
      const pocketMoney = item.isPocketMoneyPending ? 0 : Number(item.pocketMoney || 0);
      const closing = item.openingBalance + pocketMoney - item.total;
      item.closingBalance = closing;
      carriedBalance = closing;
    });

    const currentBankBalance = user ? Number(user.currentBankBalance || 0) : 0;

    const monthsList = Object.values(monthlyMap)
      .map((m) => {
        const pocketMoney = m.pocketMoney;
        const totalSpent = m.total;
        const isPocketMoneyExhausted = pocketMoney > 0 ? totalSpent >= pocketMoney : true;
        const remainingPocketMoney = Math.max(0, pocketMoney - totalSpent);
        return {
          ...m,
          pocketMoney,
          totalSpent,
          remainingPocketMoney,
          isPocketMoneyExhausted,
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

    // Yearly spending trend for chart
    const currentYear = new Date().getFullYear();
    const yearlyTrend = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let m = 1; m <= 12; m++) {
      const key = `${currentYear}-${String(m).padStart(2, "0")}`;
      yearlyTrend.push({
        month: monthNames[m - 1],
        amount: monthlyMap[key] ? monthlyMap[key].total : 0,
      });
    }

    const grandTotal = Array.isArray(expenses)
      ? expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      : 0;

    return res.json({
      success: true,
      data: {
        monthsList,
        yearlyTrend,
        grandTotal,
        totalExpensesCount: Array.isArray(expenses) ? expenses.length : 0,
        currentBankBalance,
        currency: (user && user.currency) || "₹",
        userName: user ? user.name : "Hostel Student",
        userEmail: user ? user.email : "",
      },
    });
  } catch (error) {
    console.error("Reports summary error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch reports summary." });
  }
};

// @desc    Get comprehensive month report details following Dashboard financial logic
// @route   GET /api/reports/month-detail/:year/:month
// @access  Private
exports.getMonthDetail = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await storage.findUserById(userId);
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: "Invalid year or month specified." });
    }

    const monthName = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" });

    // Financial Records (ensures month boundary transition & carried-forward balance)
    const monthlyRecord = await storage.ensureMonthlyRecord(userId, year, month);
    const isPocketMoneyPending = monthlyRecord ? monthlyRecord.isPocketMoneyPending !== false : true;
    const pocketMoney = isPocketMoneyPending ? 0 : (monthlyRecord ? Number(monthlyRecord.pocketMoney || 0) : 0);
    const openingBalance = monthlyRecord ? Number(monthlyRecord.openingBalance || 0) : 0;
    const currentBankBalance = user ? Number(user.currentBankBalance || 0) : 0;
    const salary = user ? Number(user.monthlySalary || 0) : 0;
    const pocketMoneyEnteredAt = monthlyRecord ? monthlyRecord.pocketMoneyEnteredAt : null;
    const entryStatus = monthlyRecord ? (monthlyRecord.entryStatus || "pending") : "pending";
    const pendingPocketMoneyNotice = isPocketMoneyPending ? "This month's pocket money is not yet entered" : null;

    // Verified expenses for this month
    const expenses = await storage.getExpenses(userId, { year, month, sortBy: "date", order: "desc" });
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const totalSpent = safeExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const closingBalance = monthlyRecord ? Number(monthlyRecord.closingBalance || 0) : Math.max(0, openingBalance + pocketMoney - totalSpent);

    // Pocket Money Exhaustion & Analytics Mode Logic (identical to Dashboard logic)
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

    // Category breakdown
    const categoryTotals = {};
    safeExpenses.forEach((e) => {
      const cat = (e.category || "Uncategorized").trim();
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(e.amount) || 0);
    });

    const chartData = Object.keys(categoryTotals)
      .map((cat) => ({
        name: cat,
        value: categoryTotals[cat],
        percentage: totalSpent > 0 ? Math.round((categoryTotals[cat] / totalSpent) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // Highest spending category based on actual data
    let highestCategory = null;
    let highestAmount = 0;
    if (chartData.length > 0 && chartData[0].value > 0) {
      highestCategory = chartData[0].name;
      highestAmount = chartData[0].value;
    }

    // Previous month comparison
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevExpenses = await storage.getExpenses(userId, { year: prevYear, month: prevMonth });
    const safePrevExpenses = Array.isArray(prevExpenses) ? prevExpenses : [];
    const hasPreviousData = safePrevExpenses.length > 0;
    const prevTotalSpent = safePrevExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const spendDifference = totalSpent - prevTotalSpent;
    let spendChangePercent = null;
    if (hasPreviousData && prevTotalSpent > 0) {
      spendChangePercent = Number(((spendDifference / prevTotalSpent) * 100).toFixed(1));
    }

    // Category budgets
    const budgets = await storage.getBudgets(userId);
    const dynamicBudgets = {};
    if (Array.isArray(budgets)) {
      budgets.forEach((b) => {
        if (b && b.category) {
          dynamicBudgets[b.category] = Number(b.limit || 0);
        }
      });
    }

    // Available categories list
    const categories = await storage.getCategories(userId);
    const categoryNames = Array.isArray(categories) ? categories.map((c) => c.name) : [];

    // All available months (for switcher/dropdown)
    const allExpenses = await storage.getExpenses(userId, {});
    const allMonthlyRecords = await storage.getAllMonthlyRecords(userId);
    const monthKeysSet = new Set();
    const now = new Date();
    monthKeysSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    monthKeysSet.add(`${year}-${String(month).padStart(2, "0")}`);

    if (Array.isArray(allExpenses)) {
      allExpenses.forEach((e) => {
        if (e && e.date) {
          const d = new Date(e.date);
          if (!isNaN(d.getTime())) {
            monthKeysSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
          }
        }
      });
    }

    if (Array.isArray(allMonthlyRecords)) {
      allMonthlyRecords.forEach((r) => {
        if (r && r.year && r.month) {
          monthKeysSet.add(`${r.year}-${String(r.month).padStart(2, "0")}`);
        }
      });
    }

    const availableMonths = Array.from(monthKeysSet)
      .sort()
      .reverse()
      .map((key) => {
        const [y, m] = key.split("-").map(Number);
        const d = new Date(y, m - 1, 1);
        return {
          key,
          year: y,
          month: m,
          label: `${d.toLocaleString("default", { month: "long" })} ${y}`,
        };
      });

    // 12-month trend for the selected year
    const yearlyTrend = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let m = 1; m <= 12; m++) {
      const mExpenses = Array.isArray(allExpenses)
        ? allExpenses.filter((e) => {
            const d = new Date(e.date);
            return d.getFullYear() === year && d.getMonth() + 1 === m;
          })
        : [];
      yearlyTrend.push({
        month: monthNames[m - 1],
        amount: mExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
      });
    }

    return res.json({
      success: true,
      data: {
        year,
        month,
        monthName,
        label: `${monthName} ${year}`,
        userName: user ? user.name : "Hostel Student",
        userEmail: user ? user.email : "",
        currency: (user && user.currency) || "₹",
        financials: {
          currentBankBalance,
          pocketMoney,
          openingBalance,
          closingBalance,
          isPocketMoneyPending,
          pocketMoneyEnteredAt,
          entryStatus,
          pendingPocketMoneyNotice,
          totalSpent,
          remainingPocketMoney,
          isPocketMoneyExhausted,
          analyticsMode,
          analyticsLabel,
          exhaustionNotification,
          modeShiftNotification,
          budgetPool,
          budgetUsedPercent: Math.min(100, Math.round(budgetUsedPercent)),
          monthlySalary: salary,
        },
        // Direct field accessors following Dashboard
        currentBankBalance,
        pocketMoney,
        openingBalance,
        closingBalance,
        isPocketMoneyPending,
        pocketMoneyEnteredAt,
        entryStatus,
        pendingPocketMoneyNotice,
        totalSpent,
        remainingPocketMoney,
        isPocketMoneyExhausted,
        analyticsMode,
        analyticsLabel,
        exhaustionNotification,
        modeShiftNotification,
        budgetPool,
        budgetUsedPercent: Math.min(100, Math.round(budgetUsedPercent)),
        salary,
        highestCategory,
        highestAmount,
        comparison: {
          hasPreviousData,
          prevMonthLabel: `${new Date(prevYear, prevMonth - 1, 1).toLocaleString("default", { month: "short" })} ${prevYear}`,
          prevTotalSpent,
          difference: spendDifference,
          percentChange: spendChangePercent,
          isHigher: spendDifference > 0,
        },
        chartData,
        budgets: dynamicBudgets,
        categories: categoryNames,
        expenses: safeExpenses,
        availableMonths,
        yearlyTrend,
      },
    });
  } catch (error) {
    console.error("Month detail error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch month report." });
  }
};
