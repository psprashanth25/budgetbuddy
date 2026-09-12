const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const { isMongoConnected, loadData } = require("../config/store");

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided. Access denied.",
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const secret = process.env.JWT_SECRET || "budgetbuddy_super_secret_jwt_key_2026";
    const decoded = jwt.verify(token, secret);

    let user;
    if (isMongoConnected()) {
      user = await User.findById(decoded.id).select("-password");
    } else {
      const data = loadData();
      const found = data.users.find((u) => u._id === decoded.id || u.id === decoded.id);
      if (found) {
        user = {
          _id: found._id,
          id: found._id,
          name: found.name,
          email: found.email,
          monthlySalary: found.monthlySalary,
          currency: found.currency || "₹",
        };
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found or session expired. Please log in again.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }
};

module.exports = auth;
