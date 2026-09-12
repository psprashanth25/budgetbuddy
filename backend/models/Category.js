const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
    color: {
      type: String,
      default: "#f97316",
    },
    icon: {
      type: String,
      default: "Tag",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    path: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness of category name per parent per user
categorySchema.index({ userId: 1, parentId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Category", categorySchema);
