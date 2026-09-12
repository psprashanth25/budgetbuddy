const mongoose = require("mongoose");

const monthlyRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    pocketMoney: {
      type: Number,
      default: 0,
      min: [0, "Pocket money cannot be negative"],
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    isPocketMoneyPending: {
      type: Boolean,
      default: true,
    },
    pocketMoneyEnteredAt: {
      type: Date,
      default: null,
    },
    entryStatus: {
      type: String,
      enum: ["pending", "on_time", "late"],
      default: "pending",
    },
    closingBalance: {
      type: Number,
      default: 0,
    },
    salaryOverride: {
      type: Number,
      min: [0, "Salary override cannot be negative"],
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// One monthly record per user per month/year
monthlyRecordSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("MonthlyRecord", monthlyRecordSchema);
