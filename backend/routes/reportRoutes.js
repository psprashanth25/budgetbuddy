const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const auth = require("../middleware/auth");

router.use(auth);

router.get("/summary", reportController.getReportsSummary);
router.get("/month-detail/:year/:month", reportController.getMonthDetail);

module.exports = router;
