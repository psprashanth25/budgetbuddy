const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const dataDir = path.join(__dirname, "..", "data");
const dbFile = path.join(dataDir, "local_db.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const defaultData = {
  users: [],
  categories: [],
  expenses: [],
  monthlyRecords: [],
  budgets: [],
};

const loadData = () => {
  try {
    if (fs.existsSync(dbFile)) {
      const content = fs.readFileSync(dbFile, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading local db file:", err);
  }
  return { ...defaultData };
};

const saveData = (data) => {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing local db file:", err);
  }
};

const isMongoConnected = () => mongoose.connection.readyState === 1;

module.exports = {
  isMongoConnected,
  loadData,
  saveData,
};
