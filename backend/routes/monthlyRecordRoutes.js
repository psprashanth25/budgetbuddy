const express = require("express");
const router = express.Router();
const monthlyRecordController = require("../controllers/monthlyRecordController");
const auth = require("../middleware/auth");

router.use(auth);

router.get("/", monthlyRecordController.getAllMonthlyRecords);
router.get("/:year/:month", monthlyRecordController.getMonthlyRecord);
router.post("/:year/:month", monthlyRecordController.setMonthlyRecord);
router.put("/:year/:month", monthlyRecordController.setMonthlyRecord);

module.exports = router;
