const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const auth = require("../middleware/auth");

router.use(auth);

router.get("/", categoryController.getCategories);
router.get("/tree", categoryController.getCategoryTree);
router.post("/", categoryController.addCategory);
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;
