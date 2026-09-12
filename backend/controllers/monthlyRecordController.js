const storage = require("../services/storageService");

// @desc    Get monthly financial record for a specific year and month
// @route   GET /api/monthly-records/:year/:month
// @access  Private
exports.getMonthlyRecord = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: "Invalid year or month specified." });
    }

    const record = await storage.ensureMonthlyRecord(userId, year, month);

    return res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch monthly record." });
  }
};

// @desc    Set or update pocket money / financial record for a month
// @route   POST /api/monthly-records/:year/:month
// @access  Private
exports.setMonthlyRecord = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const { pocketMoney, openingBalance, salaryOverride, notes } = req.body;

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: "Invalid year or month specified." });
    }

    if (pocketMoney !== undefined && (isNaN(pocketMoney) || Number(pocketMoney) < 0)) {
      return res.status(400).json({ success: false, message: "Pocket money cannot be a negative amount." });
    }

    const updateData = {};
    if (pocketMoney !== undefined) updateData.pocketMoney = Number(pocketMoney);
    if (openingBalance !== undefined) updateData.openingBalance = Number(openingBalance);
    if (salaryOverride !== undefined) updateData.salaryOverride = salaryOverride !== null ? Number(salaryOverride) : null;
    if (notes !== undefined) updateData.notes = notes.trim();

    const record = await storage.setMonthlyRecord(userId, year, month, updateData);
    const updatedUser = await storage.findUserById(userId);

    return res.json({
      success: true,
      message: `Pocket money of ₹${record.pocketMoney} set for ${month}/${year}!`,
      reversionNotification: "Analysis reverted to pocket money available basis",
      currentBankBalance: updatedUser ? updatedUser.currentBankBalance : 0,
      data: record,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to save monthly record." });
  }
};

// @desc    Get all historical monthly records for user
// @route   GET /api/monthly-records
// @access  Private
exports.getAllMonthlyRecords = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const records = await storage.getAllMonthlyRecords(userId);
    return res.json({ success: true, data: records });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch records." });
  }
};
