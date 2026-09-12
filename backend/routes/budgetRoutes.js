const express = require("express");
const router = express.Router();
const budgetController = require("../controllers/budgetController");
const auth = require("../middleware/auth");

router.use(auth);

router.get("/", budgetController.getBudgets);
router.post("/", budgetController.addOrUpdateBudget);
router.delete("/:id", budgetController.deleteBudget);

module.exports = router;
