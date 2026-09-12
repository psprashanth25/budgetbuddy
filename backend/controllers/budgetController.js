const storage = require("../services/storageService");

// @desc    Get all category budgets for the user
// @route   GET /api/budgets
// @access  Private
exports.getBudgets = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const budgets = await storage.getBudgets(userId);
    return res.json({ success: true, data: budgets });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch category budgets." });
  }
};

// @desc    Add or update a category budget limit
// @route   POST /api/budgets
// @access  Private
exports.addOrUpdateBudget = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { category, limit } = req.body;

    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: "Please select a category." });
    }
    if (limit === undefined || isNaN(limit) || Number(limit) <= 0) {
      return res.status(400).json({ success: false, message: "Please enter a valid budget limit greater than zero." });
    }

    const budget = await storage.addOrUpdateBudget(userId, category.trim(), Number(limit));

    return res.json({
      success: true,
      message: `Budget limit for ${category} saved!`,
      data: budget,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to save budget." });
  }
};

// @desc    Delete a category budget limit
// @route   DELETE /api/budgets/:id
// @access  Private
exports.deleteBudget = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const budget = await storage.deleteBudget(userId, req.params.id);

    if (!budget) {
      return res.status(404).json({ success: false, message: "Budget limit not found." });
    }

    return res.json({
      success: true,
      message: "Budget limit removed.",
      id: req.params.id,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete budget." });
  }
};
