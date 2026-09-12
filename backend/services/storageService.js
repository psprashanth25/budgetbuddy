const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { isMongoConnected, loadData, saveData } = require("../config/store");
const User = require("../models/User");
const Category = require("../models/Category");
const Expense = require("../models/Expense");
const MonthlyRecord = require("../models/MonthlyRecord");
const Budget = require("../models/Budget");

const generateId = () => new crypto.randomBytes(12).toString("hex");

// ==================== USER ====================

exports.findUserByEmail = async (email) => {
  const cleanEmail = email.toLowerCase().trim();
  if (isMongoConnected()) {
    try {
      const user = await User.findOne({ email: cleanEmail });
      if (user) return user;
    } catch (err) {
      console.warn("[Storage] Mongo findUserByEmail error:", err.message);
    }
  }
  const data = loadData();
  const found = data.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!found) return null;
  return {
    ...found,
    comparePassword: async (pass) => bcrypt.compare(pass, found.password),
  };
};

exports.findUserById = async (id) => {
  if (isMongoConnected()) {
    try {
      const user = await User.findById(id).select("-password");
      if (user) return user;
    } catch (err) {
      console.warn("[Storage] Mongo findUserById error:", err.message);
    }
  }
  const data = loadData();
  const found = data.users.find((u) => (u._id || u.id).toString() === id.toString());
  if (!found) return null;
  const { password, ...rest } = found;
  return rest;
};

exports.createUser = async ({
  name,
  email,
  password,
  monthlySalary = 3000,
  isEmailVerified = false,
  otpHash = null,
  otpExpiresAt = null,
  otpAttempts = 0,
  otpCooldownUntil = null,
}) => {
  const cleanEmail = email.toLowerCase().trim();
  if (isMongoConnected()) {
    return await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      monthlySalary: Math.max(0, monthlySalary),
      isEmailVerified,
      otpHash,
      otpExpiresAt,
      otpAttempts,
      otpCooldownUntil,
      initialBankBalance: null,
      currentBankBalance: 0,
      hasCompletedBalanceSetup: false,
    });
  }
  const data = loadData();
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const newUser = {
    _id: generateId(),
    name: name.trim(),
    email: cleanEmail,
    password: hashedPassword,
    monthlySalary: Math.max(0, monthlySalary),
    currency: "₹",
    isEmailVerified,
    otpHash,
    otpExpiresAt: otpExpiresAt ? (otpExpiresAt instanceof Date ? otpExpiresAt.toISOString() : otpExpiresAt) : null,
    otpAttempts,
    otpCooldownUntil: otpCooldownUntil ? (otpCooldownUntil instanceof Date ? otpCooldownUntil.toISOString() : otpCooldownUntil) : null,
    initialBankBalance: null,
    currentBankBalance: 0,
    hasCompletedBalanceSetup: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.users.push(newUser);
  saveData(data);
  const { password: _, ...rest } = newUser;
  return rest;
};

exports.updateUserOtp = async (userId, { otpHash, otpExpiresAt, otpAttempts = 0, otpCooldownUntil = null }) => {
  if (isMongoConnected()) {
    return await User.findByIdAndUpdate(
      userId,
      {
        otpHash,
        otpExpiresAt,
        otpAttempts,
        otpCooldownUntil,
      },
      { returnDocument: "after" }
    );
  }
  const data = loadData();
  const user = data.users.find((u) => (u._id || u.id).toString() === userId.toString());
  if (user) {
    user.otpHash = otpHash;
    user.otpExpiresAt = otpExpiresAt ? (otpExpiresAt instanceof Date ? otpExpiresAt.toISOString() : otpExpiresAt) : null;
    user.otpAttempts = otpAttempts;
    user.otpCooldownUntil = otpCooldownUntil ? (otpCooldownUntil instanceof Date ? otpCooldownUntil.toISOString() : otpCooldownUntil) : null;
    user.updatedAt = new Date().toISOString();
    saveData(data);
  }
  return user;
};

exports.verifyUserEmail = async (userId) => {
  if (isMongoConnected()) {
    return await User.findByIdAndUpdate(
      userId,
      {
        isEmailVerified: true,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        otpCooldownUntil: null,
      },
      { returnDocument: "after" }
    );
  }
  const data = loadData();
  const user = data.users.find((u) => (u._id || u.id).toString() === userId.toString());
  if (user) {
    user.isEmailVerified = true;
    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    user.otpCooldownUntil = null;
    user.updatedAt = new Date().toISOString();
    saveData(data);
  }
  return user;
};

exports.setPasswordResetToken = async (userId, { tokenHash, expiresAt }) => {
  if (isMongoConnected()) {
    return await User.findByIdAndUpdate(
      userId,
      {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
      { returnDocument: "after" }
    );
  }
  const data = loadData();
  const user = data.users.find((u) => (u._id || u.id).toString() === userId.toString());
  if (user) {
    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt;
    user.updatedAt = new Date().toISOString();
    saveData(data);
  }
  return user;
};

exports.findUserByResetToken = async (tokenHash) => {
  if (isMongoConnected()) {
    return await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    });
  }
  const data = loadData();
  const now = new Date().toISOString();
  const user = data.users.find(
    (u) =>
      u.passwordResetTokenHash === tokenHash &&
      u.passwordResetExpiresAt &&
      u.passwordResetExpiresAt > now
  );
  return user || null;
};

exports.resetUserPassword = async (userId, newPassword) => {
  if (isMongoConnected()) {
    const user = await User.findById(userId);
    if (!user) return null;
    user.password = newPassword; // triggers pre-save bcrypt hook
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();
    return user;
  }
  const data = loadData();
  const user = data.users.find((u) => (u._id || u.id).toString() === userId.toString());
  if (user) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.updatedAt = new Date().toISOString();
    saveData(data);
  }
  return user;
};

exports.setInitialBankBalance = async (userId, initialBalance) => {
  const amount = Math.max(0, Number(initialBalance));
  let updatedUser;
  if (isMongoConnected()) {
    updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        initialBankBalance: amount,
        currentBankBalance: amount,
        hasCompletedBalanceSetup: true,
      },
      { returnDocument: "after" }
    );
  } else {
    const data = loadData();
    const user = data.users.find((u) => (u._id || u.id).toString() === userId.toString());
    if (user) {
      user.initialBankBalance = amount;
      user.currentBankBalance = amount;
      user.hasCompletedBalanceSetup = true;
      user.updatedAt = new Date().toISOString();
      saveData(data);
      updatedUser = user;
    }
  }

  // Ensure current month's record has this openingBalance if currently zero/pending
  try {
    const now = new Date();
    const currentRecord = await exports.ensureMonthlyRecord(userId, now.getFullYear(), now.getMonth() + 1);
    if (currentRecord && (Number(currentRecord.openingBalance) === 0 || currentRecord.openingBalance === null)) {
      await exports.setMonthlyRecord(userId, now.getFullYear(), now.getMonth() + 1, {
        openingBalance: amount,
      });
    }
  } catch (err) {
    console.error("Failed to seed opening balance in setInitialBankBalance:", err);
  }

  return updatedUser;
};

exports.updateUserCurrentBankBalance = async (userId, delta) => {
  const numDelta = Number(delta);
  if (isMongoConnected()) {
    return await User.findByIdAndUpdate(
      userId,
      { $inc: { currentBankBalance: numDelta } },
      { returnDocument: "after" }
    );
  }
  const data = loadData();
  const user = data.users.find((u) => (u._id || u.id).toString() === userId.toString());
  if (user) {
    user.currentBankBalance = Math.max(0, (user.currentBankBalance || 0) + numDelta);
    user.updatedAt = new Date().toISOString();
    saveData(data);
  }
  return user;
};

exports.updateUserSalary = async (userId, monthlySalary) => {
  if (isMongoConnected()) {
    return await User.findByIdAndUpdate(
      userId,
      { monthlySalary: Number(monthlySalary) },
      { returnDocument: "after" }
    );
  }
  const data = loadData();
  const user = data.users.find((u) => (u._id || u.id).toString() === userId.toString());
  if (user) {
    user.monthlySalary = Number(monthlySalary);
    user.updatedAt = new Date().toISOString();
    saveData(data);
  }
  return user;
};

// ==================== CATEGORY ====================

exports.getCategories = async (userId) => {
  if (isMongoConnected()) {
    return await Category.find({ userId }).sort({ isDefault: -1, path: 1, createdAt: 1 });
  }
  const data = loadData();
  return data.categories
    .filter((c) => c.userId === userId.toString())
    .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
};

exports.getCategoryById = async (userId, categoryId) => {
  if (isMongoConnected()) {
    return await Category.findOne({ _id: categoryId, userId });
  }
  const data = loadData();
  return (
    data.categories.find(
      (c) =>
        (c._id || c.id).toString() === categoryId.toString() &&
        c.userId === userId.toString()
    ) || null
  );
};

exports.findCategoryByNameAndParent = async (userId, name, parentId = null) => {
  const cleanName = name.trim();
  const pid = parentId ? parentId.toString() : null;
  if (isMongoConnected()) {
    const query = {
      userId,
      name: { $regex: new RegExp(`^${cleanName}$`, "i") },
    };
    if (pid) {
      query.parentId = pid;
    } else {
      query.parentId = null;
    }
    return await Category.findOne(query);
  }
  const data = loadData();
  return data.categories.find(
    (c) =>
      c.userId === userId.toString() &&
      (pid ? (c.parentId && c.parentId.toString() === pid) : !c.parentId) &&
      c.name.toLowerCase() === cleanName.toLowerCase()
  );
};

exports.findCategoryByName = async (userId, name) => {
  const cleanName = name.trim().toLowerCase();
  if (isMongoConnected()) {
    return await Category.findOne({
      userId,
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });
  }
  const data = loadData();
  return data.categories.find(
    (c) => c.userId === userId.toString() && c.name.toLowerCase() === cleanName
  );
};

exports.createCategory = async ({
  userId,
  name,
  color,
  icon,
  isDefault = false,
  parentId = null,
  path = "",
}) => {
  const cleanName = name.trim();
  if (isMongoConnected()) {
    return await Category.create({
      userId,
      name: cleanName,
      color: color || "#f97316",
      icon: icon || "Tag",
      isDefault,
      parentId: parentId || null,
      path: path || cleanName,
    });
  }
  const data = loadData();
  const newCat = {
    _id: generateId(),
    userId: userId.toString(),
    name: cleanName,
    color: color || "#f97316",
    icon: icon || "Tag",
    isDefault,
    parentId: parentId ? parentId.toString() : null,
    path: path || cleanName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.categories.push(newCat);
  saveData(data);
  return newCat;
};

exports.seedDefaultCategories = async (userId, defaultCategories) => {
  if (isMongoConnected()) {
    const userCategories = defaultCategories.map((cat) => ({
      ...cat,
      userId,
      parentId: null,
      path: cat.name,
    }));
    return await Category.insertMany(userCategories);
  }
  const data = loadData();
  defaultCategories.forEach((cat) => {
    data.categories.push({
      _id: generateId(),
      userId: userId.toString(),
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      isDefault: true,
      parentId: null,
      path: cat.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });
  saveData(data);
};

exports.getAllDescendants = async (userId, categoryId) => {
  const allCategories = await exports.getCategories(userId);
  const descendants = [];

  const collect = (pid) => {
    const children = allCategories.filter(
      (c) => c.parentId && c.parentId.toString() === pid.toString()
    );
    for (const child of children) {
      descendants.push(child);
      collect((child._id || child.id).toString());
    }
  };

  collect(categoryId.toString());
  return descendants;
};

exports.countCategoryExpenses = async (userId, categoryName) => {
  if (isMongoConnected()) {
    return await Expense.countDocuments({ userId, category: categoryName });
  }
  const data = loadData();
  return data.expenses.filter(
    (e) => e.userId === userId.toString() && e.category.toLowerCase() === categoryName.toLowerCase()
  ).length;
};

exports.countCategoryAndDescendantsExpenses = async (userId, category) => {
  const descendants = await exports.getAllDescendants(userId, category._id || category.id);
  const allNamesAndPaths = [
    category.name,
    category.path,
    ...descendants.map((d) => d.name),
    ...descendants.map((d) => d.path),
  ].filter(Boolean);
  const uniqueNames = [...new Set(allNamesAndPaths)];

  if (isMongoConnected()) {
    return await Expense.countDocuments({
      userId,
      category: { $in: uniqueNames },
    });
  }
  const data = loadData();
  const lowerNames = uniqueNames.map((n) => n.toLowerCase());
  return data.expenses.filter(
    (e) => e.userId === userId.toString() && lowerNames.includes(e.category.toLowerCase())
  ).length;
};

exports.deleteCategoryAndDescendants = async (userId, categoryId) => {
  const descendants = await exports.getAllDescendants(userId, categoryId);
  const idsToDelete = [categoryId.toString(), ...descendants.map((d) => (d._id || d.id).toString())];

  if (isMongoConnected()) {
    return await Category.deleteMany({
      _id: { $in: idsToDelete },
      userId,
    });
  }
  const data = loadData();
  data.categories = data.categories.filter(
    (c) => !(idsToDelete.includes((c._id || c.id).toString()) && c.userId === userId.toString())
  );
  saveData(data);
  return { deletedCount: idsToDelete.length };
};

// ==================== EXPENSE ====================

exports.getExpenses = async (userId, { year, month, category, search, sortBy = "date", order = "desc" }) => {
  if (isMongoConnected()) {
    const filter = { userId };
    if (year && month) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      filter.date = {
        $gte: new Date(y, m - 1, 1, 0, 0, 0, 0),
        $lte: new Date(y, m, 0, 23, 59, 59, 999),
      };
    } else if (year) {
      const y = parseInt(year, 10);
      filter.date = {
        $gte: new Date(y, 0, 1, 0, 0, 0, 0),
        $lte: new Date(y, 11, 31, 23, 59, 59, 999),
      };
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    if (search && search.trim()) {
      filter.$or = [
        { note: { $regex: search.trim(), $options: "i" } },
        { category: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === "asc" ? 1 : -1;
    if (sortBy !== "_id") sortOptions._id = -1;

    return await Expense.find(filter).sort(sortOptions);
  }

  const data = loadData();
  let list = data.expenses.filter((e) => e.userId === userId.toString());

  if (year && month) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    list = list.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
  } else if (year) {
    const y = parseInt(year, 10);
    list = list.filter((e) => new Date(e.date).getFullYear() === y);
  }

  if (category && category !== "All") {
    list = list.filter((e) => e.category.toLowerCase() === category.toLowerCase());
  }

  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    list = list.filter(
      (e) =>
        (e.note && e.note.toLowerCase().includes(s)) ||
        (e.category && e.category.toLowerCase().includes(s)) ||
        e.amount.toString().includes(s)
    );
  }

  list.sort((a, b) => {
    if (sortBy === "amount") {
      return order === "asc" ? a.amount - b.amount : b.amount - a.amount;
    }
    const tA = new Date(a.date).getTime();
    const tB = new Date(b.date).getTime();
    return order === "asc" ? tA - tB : tB - tA;
  });

  return list;
};

exports.getExpenseById = async (userId, expenseId) => {
  if (isMongoConnected()) {
    return await Expense.findOne({ _id: expenseId, userId });
  }
  const data = loadData();
  return (
    data.expenses.find(
      (e) =>
        (e._id === expenseId.toString() || e.id === expenseId.toString()) &&
        e.userId === userId.toString()
    ) || null
  );
};

exports.createExpense = async ({ userId, date, amount, category, note }) => {
  const expenseAmount = Number(amount);
  let createdExpense;
  if (isMongoConnected()) {
    createdExpense = await Expense.create({
      userId,
      date,
      amount: expenseAmount,
      category: category.trim(),
      note: note ? note.trim() : "",
    });
  } else {
    const data = loadData();
    const newExp = {
      _id: generateId(),
      userId: userId.toString(),
      date: date instanceof Date ? date.toISOString() : new Date(date).toISOString(),
      amount: expenseAmount,
      category: category.trim(),
      note: note ? note.trim() : "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.expenses.push(newExp);
    saveData(data);
    createdExpense = newExp;
  }

  // Deduct from current bank balance
  await exports.updateUserCurrentBankBalance(userId, -expenseAmount);

  // Sync closing balance of the expense's month
  try {
    const expDate = new Date(date);
    if (!isNaN(expDate.getTime())) {
      await exports.syncMonthlyClosingBalance(userId, expDate.getFullYear(), expDate.getMonth() + 1);
    }
  } catch (err) {
    console.error("Error syncing monthly closing balance on expense create:", err);
  }

  return createdExpense;
};

exports.updateExpense = async (userId, expenseId, { date, amount, category, note }) => {
  const newAmount = Number(amount);
  let oldExpense;
  let updated;
  if (isMongoConnected()) {
    oldExpense = await Expense.findOne({ _id: expenseId, userId });
    if (!oldExpense) return null;
    const oldAmount = oldExpense.amount;
    updated = await Expense.findOneAndUpdate(
      { _id: expenseId, userId },
      {
        date,
        amount: newAmount,
        category: category.trim(),
        note: note ? note.trim() : "",
      },
      { returnDocument: "after", runValidators: true }
    );
    const diff = oldAmount - newAmount;
    if (diff !== 0) {
      await exports.updateUserCurrentBankBalance(userId, diff);
    }
  } else {
    const data = loadData();
    const exp = data.expenses.find(
      (e) => (e._id === expenseId.toString() || e.id === expenseId.toString()) && e.userId === userId.toString()
    );
    if (exp) {
      oldExpense = { ...exp };
      const oldAmount = exp.amount;
      exp.date = date instanceof Date ? date.toISOString() : new Date(date).toISOString();
      exp.amount = newAmount;
      exp.category = category.trim();
      exp.note = note ? note.trim() : "";
      exp.updatedAt = new Date().toISOString();
      saveData(data);
      const diff = oldAmount - newAmount;
      if (diff !== 0) {
        await exports.updateUserCurrentBankBalance(userId, diff);
      }
      updated = exp;
    }
  }

  if (updated && oldExpense) {
    try {
      const oldD = new Date(oldExpense.date);
      const newD = new Date(date);
      if (!isNaN(oldD.getTime())) {
        await exports.syncMonthlyClosingBalance(userId, oldD.getFullYear(), oldD.getMonth() + 1);
      }
      if (!isNaN(newD.getTime()) && (newD.getFullYear() !== oldD.getFullYear() || newD.getMonth() !== oldD.getMonth())) {
        await exports.syncMonthlyClosingBalance(userId, newD.getFullYear(), newD.getMonth() + 1);
      }
    } catch (err) {
      console.error("Error syncing monthly closing balance on expense update:", err);
    }
  }

  return updated;
};

exports.deleteExpense = async (userId, expenseId) => {
  let deleted;
  if (isMongoConnected()) {
    deleted = await Expense.findOneAndDelete({ _id: expenseId, userId });
  } else {
    const data = loadData();
    const index = data.expenses.findIndex(
      (e) => (e._id === expenseId.toString() || e.id === expenseId.toString()) && e.userId === userId.toString()
    );
    if (index !== -1) {
      deleted = data.expenses.splice(index, 1)[0];
      saveData(data);
    }
  }

  if (deleted) {
    // Restore deleted expense amount to current bank balance
    await exports.updateUserCurrentBankBalance(userId, Number(deleted.amount));
    try {
      const delDate = new Date(deleted.date);
      if (!isNaN(delDate.getTime())) {
        await exports.syncMonthlyClosingBalance(userId, delDate.getFullYear(), delDate.getMonth() + 1);
      }
    } catch (err) {
      console.error("Error syncing monthly closing balance on expense delete:", err);
    }
  }
  return deleted;
};

// ==================== MONTHLY RECORD ====================

exports.getMonthlyRecord = async (userId, year, month) => {
  if (isMongoConnected()) {
    return await MonthlyRecord.findOne({ userId, year: Number(year), month: Number(month) });
  }
  const data = loadData();
  return data.monthlyRecords.find(
    (r) => r.userId === userId.toString() && r.year === Number(year) && r.month === Number(month)
  );
};

exports.ensureMonthlyRecord = async (userId, year, month) => {
  const y = Number(year);
  const m = Number(month);
  let record = await exports.getMonthlyRecord(userId, y, m);
  if (record) {
    return record;
  }

  // Month boundary change detected: auto-create monthly record
  // Calculate expenses incurred in this month so far
  const monthExpenses = await exports.getExpenses(userId, { year: y, month: m });
  const totalSpent = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Find previous month record to carry forward closing balance
  let prevClosingBalance = null;
  if (isMongoConnected()) {
    const prev = await MonthlyRecord.findOne({
      userId,
      $or: [
        { year: { $lt: y } },
        { year: y, month: { $lt: m } },
      ],
    }).sort({ year: -1, month: -1 });

    if (prev) {
      prevClosingBalance = prev.closingBalance !== undefined && prev.closingBalance !== null
        ? Number(prev.closingBalance)
        : Number(prev.openingBalance || 0) + (prev.isPocketMoneyPending ? 0 : Number(prev.pocketMoney || 0));
    }
  } else {
    const data = loadData();
    const prevList = data.monthlyRecords
      .filter((r) => r.userId === userId.toString() && (r.year < y || (r.year === y && r.month < m)))
      .sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));
    if (prevList.length > 0) {
      const prev = prevList[0];
      prevClosingBalance = prev.closingBalance !== undefined && prev.closingBalance !== null
        ? Number(prev.closingBalance)
        : Number(prev.openingBalance || 0) + (prev.isPocketMoneyPending ? 0 : Number(prev.pocketMoney || 0));
    }
  }

  const user = await exports.findUserById(userId);
  let openingBalance = 0;
  if (prevClosingBalance !== null) {
    openingBalance = prevClosingBalance;
  } else if (user && user.initialBankBalance !== null && user.initialBankBalance !== undefined) {
    openingBalance = Number(user.initialBankBalance);
  } else if (user) {
    openingBalance = (user.currentBankBalance || 0) + totalSpent;
  }

  const newRecordData = {
    userId,
    year: y,
    month: m,
    pocketMoney: 0,
    openingBalance,
    isPocketMoneyPending: true,
    pocketMoneyEnteredAt: null,
    entryStatus: "pending",
    closingBalance: openingBalance - totalSpent,
    salaryOverride: null,
    notes: "",
  };

  if (isMongoConnected()) {
    try {
      record = await MonthlyRecord.create(newRecordData);
    } catch (err) {
      record = await MonthlyRecord.findOne({ userId, year: y, month: m });
    }
  } else {
    const data = loadData();
    record = {
      _id: generateId(),
      ...newRecordData,
      userId: userId.toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.monthlyRecords.push(record);
    saveData(data);
  }

  return record;
};

exports.syncMonthlyClosingBalance = async (userId, year, month) => {
  const y = Number(year);
  const m = Number(month);
  if (!y || !m) return null;
  const record = await exports.ensureMonthlyRecord(userId, y, m);
  if (!record) return null;

  const expenses = await exports.getExpenses(userId, { year: y, month: m });
  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const opening = Number(record.openingBalance || 0);
  const pocketMoney = record.isPocketMoneyPending ? 0 : Number(record.pocketMoney || 0);
  const closingBalance = opening + pocketMoney - totalSpent;

  if (isMongoConnected()) {
    return await MonthlyRecord.findOneAndUpdate(
      { userId, year: y, month: m },
      { closingBalance },
      { returnDocument: "after" }
    );
  }
  const data = loadData();
  const rec = data.monthlyRecords.find(
    (r) => r.userId === userId.toString() && r.year === y && r.month === m
  );
  if (rec) {
    rec.closingBalance = closingBalance;
    rec.updatedAt = new Date().toISOString();
    saveData(data);
    return rec;
  }
  return record;
};

exports.setMonthlyRecord = async (userId, year, month, updateData) => {
  const y = Number(year);
  const m = Number(month);
  const existingRecord = await exports.ensureMonthlyRecord(userId, y, m);

  const now = new Date();
  let diff = 0;
  const isPocketMoneyBeingSet = updateData.pocketMoney !== undefined;

  if (isPocketMoneyBeingSet) {
    const newPocketMoney = Math.max(0, Number(updateData.pocketMoney));
    updateData.pocketMoney = newPocketMoney;

    const wasPending = existingRecord ? (existingRecord.isPocketMoneyPending !== false) : true;
    const oldPocketMoney = existingRecord && !wasPending ? Number(existingRecord.pocketMoney || 0) : 0;

    if (wasPending) {
      // First pocket money entry for this month! Added directly to available funds.
      diff = newPocketMoney;
      updateData.isPocketMoneyPending = false;
      updateData.pocketMoneyEnteredAt = now;

      // On-time vs late audit status (cutoff: 7th of the month)
      const currentSysYear = now.getFullYear();
      const currentSysMonth = now.getMonth() + 1;
      if (currentSysYear === y && currentSysMonth === m) {
        updateData.entryStatus = now.getDate() <= 7 ? "on_time" : "late";
      } else if (currentSysYear > y || (currentSysYear === y && currentSysMonth > m)) {
        updateData.entryStatus = "late";
      } else {
        updateData.entryStatus = "on_time";
      }
    } else {
      diff = newPocketMoney - oldPocketMoney;
    }
  }

  let updatedRecord;
  if (isMongoConnected()) {
    updatedRecord = await MonthlyRecord.findOneAndUpdate(
      { userId, year: y, month: m },
      updateData,
      { returnDocument: "after", upsert: true, runValidators: true }
    );
  } else {
    const data = loadData();
    let record = data.monthlyRecords.find(
      (r) => r.userId === userId.toString() && r.year === y && r.month === m
    );
    if (!record) {
      record = {
        _id: generateId(),
        userId: userId.toString(),
        year: y,
        month: m,
        createdAt: new Date().toISOString(),
      };
      data.monthlyRecords.push(record);
    }
    Object.assign(record, updateData);
    record.updatedAt = new Date().toISOString();
    saveData(data);
    updatedRecord = record;
  }

  if (diff !== 0) {
    await exports.updateUserCurrentBankBalance(userId, diff);
  }

  // Synchronize closing balance
  await exports.syncMonthlyClosingBalance(userId, y, m);
  return await exports.getMonthlyRecord(userId, y, m);
};

exports.getAllMonthlyRecords = async (userId) => {
  if (isMongoConnected()) {
    return await MonthlyRecord.find({ userId }).sort({ year: -1, month: -1 });
  }
  const data = loadData();
  return data.monthlyRecords
    .filter((r) => r.userId === userId.toString())
    .sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));
};

// ==================== BUDGET ====================

exports.getBudgets = async (userId) => {
  if (isMongoConnected()) {
    return await Budget.find({ userId });
  }
  const data = loadData();
  return data.budgets.filter((b) => b.userId === userId.toString());
};

exports.addOrUpdateBudget = async (userId, category, limit) => {
  if (isMongoConnected()) {
    return await Budget.findOneAndUpdate(
      { userId, category: category.trim() },
      { limit: Number(limit) },
      { returnDocument: "after", upsert: true, runValidators: true }
    );
  }
  const data = loadData();
  let budget = data.budgets.find(
    (b) => b.userId === userId.toString() && b.category.toLowerCase() === category.trim().toLowerCase()
  );
  if (!budget) {
    budget = {
      _id: generateId(),
      userId: userId.toString(),
      category: category.trim(),
      limit: Number(limit),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.budgets.push(budget);
  } else {
    budget.limit = Number(limit);
    budget.updatedAt = new Date().toISOString();
  }
  saveData(data);
  return budget;
};

exports.deleteBudget = async (userId, budgetId) => {
  if (isMongoConnected()) {
    return await Budget.findOneAndDelete({ _id: budgetId, userId });
  }
  const data = loadData();
  const index = data.budgets.findIndex(
    (b) => (b._id === budgetId.toString() || b.id === budgetId.toString()) && b.userId === userId.toString()
  );
  if (index !== -1) {
    const deleted = data.budgets.splice(index, 1)[0];
    saveData(data);
    return deleted;
  }
  return null;
};
