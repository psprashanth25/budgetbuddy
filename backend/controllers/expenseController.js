const storage = require("../services/storageService");

// Helper for granular validation messages matching user requirements
const validateExpenseFields = ({ date, amount, category }) => {
  const missing = [];
  if (!date || !date.toString().trim()) missing.push("date");
  if (amount === undefined || amount === null || amount === "" || isNaN(amount)) missing.push("amount");
  if (!category || !category.trim()) missing.push("category");

  if (missing.length === 3) {
    return "Please select a date, enter an amount, and choose a category.";
  }
  if (missing.length === 2) {
    if (missing.includes("date") && missing.includes("amount")) {
      return "Please select a date and enter an amount.";
    }
    if (missing.includes("date") && missing.includes("category")) {
      return "Please select a date and choose a category.";
    }
    if (missing.includes("amount") && missing.includes("category")) {
      return "Please enter an amount and choose a category.";
    }
  }
  if (missing.length === 1) {
    if (missing[0] === "date") return "Please select a date.";
    if (missing[0] === "amount") return "Please enter an amount.";
    if (missing[0] === "category") return "Please select a category.";
  }

  if (Number(amount) <= 0) {
    return "Expense amount must be greater than zero.";
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return "Please provide a valid calendar date.";
  }

  return null;
};

// Timezone-safe check preventing future dates
const isFutureDate = (dateVal) => {
  const now = new Date();
  const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
  const dateStr = typeof dateVal === "string" ? dateVal.split("T")[0] : new Date(dateVal).toISOString().split("T")[0];
  return dateStr > todayStr;
};

// @desc    Get user expenses with filtering, search, sorting
// @route   GET /api/expenses
// @access  Private
exports.getExpenses = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { year, month, category, search, sortBy = "date", order = "desc" } = req.query;

    const expenses = await storage.getExpenses(userId, { year, month, category, search, sortBy, order });

    return res.json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch expenses." });
  }
};

// @desc    Add an expense
// @route   POST /api/expenses
// @access  Private
exports.addExpense = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { date, amount, category, note } = req.body;

    const validationError = validateExpenseFields({ date, amount, category });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    // Strict Future Date Validation
    if (isFutureDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Future dates are not allowed. Please select today or an earlier date.",
      });
    }

    const numAmount = Number(amount);

    // Balance check: prevent spending greater than available balance if balance onboarding was completed
    const user = await storage.findUserById(userId);
    if (user && user.hasCompletedBalanceSetup) {
      const availableBalance = user.currentBankBalance !== undefined ? user.currentBankBalance : 0;
      if (numAmount > availableBalance) {
        return res.status(400).json({
          success: false,
          message: `Insufficient bank balance: Expense amount (₹${numAmount}) exceeds your available bank balance (₹${availableBalance}).`,
        });
      }
    }

    let expenseDate;
    if (typeof date === "string" && date.includes("-")) {
      const [yearStr, monthStr, dayStr] = date.split("T")[0].split("-");
      expenseDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10), 12, 0, 0);
    } else {
      expenseDate = new Date(date);
    }

    const expense = await storage.createExpense({
      userId,
      date: expenseDate,
      amount: numAmount,
      category: category.trim(),
      note: note ? note.trim() : "",
    });

    return res.status(201).json({
      success: true,
      message: "Expense recorded successfully!",
      data: expense,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to create expense." });
  }
};

// @desc    Update an expense
// @route   PUT /api/expenses/:id
// @access  Private
exports.updateExpense = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { date, amount, category, note } = req.body;

    const validationError = validateExpenseFields({ date, amount, category });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    // Strict Future Date Validation
    if (isFutureDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Future dates are not allowed. Please select today or an earlier date.",
      });
    }

    const numAmount = Number(amount);

    // Balance check for update
    const existingExpense = await storage.getExpenseById(userId, req.params.id);
    if (!existingExpense) {
      return res.status(404).json({ success: false, message: "Expense not found." });
    }

    const diff = numAmount - existingExpense.amount;
    const user = await storage.findUserById(userId);
    if (user && user.hasCompletedBalanceSetup && diff > 0) {
      const availableBalance = user.currentBankBalance !== undefined ? user.currentBankBalance : 0;
      if (diff > availableBalance) {
        return res.status(400).json({
          success: false,
          message: `Insufficient bank balance: Expense increase of ₹${diff} exceeds your available bank balance (₹${availableBalance}).`,
        });
      }
    }

    let expenseDate;
    if (typeof date === "string" && date.includes("-")) {
      const [yearStr, monthStr, dayStr] = date.split("T")[0].split("-");
      expenseDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10), 12, 0, 0);
    } else {
      expenseDate = new Date(date);
    }

    const expense = await storage.updateExpense(userId, req.params.id, {
      date: expenseDate,
      amount: numAmount,
      category: category.trim(),
      note: note ? note.trim() : "",
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found." });
    }

    return res.json({
      success: true,
      message: "Expense updated successfully!",
      data: expense,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update expense." });
  }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private
exports.deleteExpense = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const expense = await storage.deleteExpense(userId, req.params.id);

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found." });
    }

    return res.json({
      success: true,
      message: "Expense deleted successfully!",
      id: req.params.id,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete expense." });
  }
};
