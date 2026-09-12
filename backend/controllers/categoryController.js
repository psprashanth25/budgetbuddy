const storage = require("../services/storageService");

// Helper to assemble recursive category hierarchy tree
const buildTree = (categories, parentId = null) => {
  return categories
    .filter((c) => {
      const cParent = c.parentId ? c.parentId.toString() : null;
      const targetParent = parentId ? parentId.toString() : null;
      return cParent === targetParent;
    })
    .map((c) => {
      const catObj = c.toObject ? c.toObject() : { ...c };
      const children = buildTree(categories, c._id || c.id);
      return {
        ...catObj,
        children,
      };
    });
};

// @desc    Get all categories (flat list and hierarchical tree)
// @route   GET /api/categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const categories = await storage.getCategories(userId);
    const tree = buildTree(categories);

    return res.json({
      success: true,
      data: categories,
      tree,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch categories." });
  }
};

// @desc    Get category hierarchy tree
// @route   GET /api/categories/tree
// @access  Private
exports.getCategoryTree = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const categories = await storage.getCategories(userId);
    const tree = buildTree(categories);

    return res.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    console.error("Get category tree error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch category tree." });
  }
};

// @desc    Add a new category or subcategory
// @route   POST /api/categories
// @access  Private
exports.addCategory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, color, icon, parentId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Category name cannot be empty." });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 50) {
      return res.status(400).json({ success: false, message: "Category name must be 50 characters or less." });
    }

    let parentCategory = null;
    let computedPath = trimmedName;

    if (parentId && parentId.toString().trim() !== "") {
      parentCategory = await storage.getCategoryById(userId, parentId);
      if (!parentCategory) {
        return res.status(400).json({ success: false, message: "Selected parent category does not exist." });
      }
      const parentPath = parentCategory.path || parentCategory.name;
      computedPath = `${parentPath} / ${trimmedName}`;
    }

    // Check duplicate case-insensitively under the same parent
    const existing = await storage.findCategoryByNameAndParent(userId, trimmedName, parentId || null);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: parentCategory
          ? `Subcategory "${trimmedName}" already exists under "${parentCategory.name}".`
          : `Category "${trimmedName}" already exists.`,
      });
    }

    const category = await storage.createCategory({
      userId,
      name: trimmedName,
      color: color || (parentCategory ? parentCategory.color : "#f97316"),
      icon: icon || (parentCategory ? parentCategory.icon : "Tag"),
      isDefault: false,
      parentId: parentId || null,
      path: computedPath,
    });

    return res.status(201).json({
      success: true,
      message: parentCategory
        ? `Subcategory "${category.name}" created under "${parentCategory.name}".`
        : `Category "${category.name}" created successfully.`,
      data: category,
    });
  } catch (error) {
    console.error("Add category error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to create category." });
  }
};

// @desc    Delete a category (with hierarchical protection and default category protection)
// @route   DELETE /api/categories/:id
// @access  Private
exports.deleteCategory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const category = await storage.getCategoryById(userId, req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }

    // 1. Prevent deletion of system default categories
    if (category.isDefault) {
      return res.status(400).json({
        success: false,
        message: "System default categories cannot be deleted.",
      });
    }

    // 2. Prevent deletion if category or ANY descendant has expenses
    const usedCount = await storage.countCategoryAndDescendantsExpenses(userId, category);
    if (usedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `This category cannot be deleted because existing expenses are associated with it. Please reassign or remove those expenses first.`,
        usedCount,
      });
    }

    // 3. Safe to delete category and any empty descendant subcategories
    await storage.deleteCategoryAndDescendants(userId, category._id || category.id);

    return res.json({
      success: true,
      message: `Category "${category.name}" and any subcategories were safely deleted.`,
      id: req.params.id,
    });
  } catch (error) {
    console.error("Delete category error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete category." });
  }
};
