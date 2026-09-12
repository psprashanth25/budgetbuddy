import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import { categoryApi } from "../services/api";
import {
  Tags,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  CornerDownRight,
  FolderTree,
  ChevronRight,
} from "lucide-react";

function CategoryNode({ category, level = 0, onAddSubcategory, onDelete }) {
  const isDefault = category.isDefault;
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div className="space-y-2">
      <div
        className={`flex items-center justify-between p-4 rounded-xl border transition ${
          isDefault
            ? "bg-gray-900/60 border-gray-800"
            : "bg-gray-900 border-gray-800 hover:border-gray-700"
        }`}
        style={{ marginLeft: `${level * 24}px` }}
      >
        <div className="flex items-center gap-3">
          {level > 0 ? (
            <CornerDownRight className="w-4 h-4 text-orange-400 flex-shrink-0" />
          ) : (
            <div
              className="w-3.5 h-3.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: category.color || "#f97316" }}
            />
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">{category.name}</span>
              {isDefault && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  System Default
                </span>
              )}
            </div>
            {category.path && category.path !== category.name && (
              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                <span>Path:</span>
                <span className="text-gray-400 font-mono">{category.path}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Subcategory Button */}
          <button
            type="button"
            onClick={() => onAddSubcategory(category)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-orange-400 border border-gray-700 transition cursor-pointer"
            title={`Add subcategory under ${category.name}`}
          >
            <Plus className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Add Subcategory</span>
          </button>

          {/* Delete Button */}
          {!isDefault ? (
            <button
              onClick={() => onDelete(category)}
              className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
              title={`Delete category "${category.name}"`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <span
              className="p-1.5 text-gray-600 cursor-not-allowed"
              title="System categories cannot be deleted"
            >
              <Trash2 className="w-4 h-4 opacity-30" />
            </span>
          )}
        </div>
      </div>

      {/* Render Children Recursively */}
      {hasChildren && (
        <div className="space-y-2 border-l border-gray-800/80 ml-3 pl-1">
          {category.children.map((child) => (
            <CategoryNode
              key={child._id || child.id}
              category={child}
              level={level + 1}
              onAddSubcategory={onAddSubcategory}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Categories() {
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await categoryApi.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
        setCategoryTree(res.tree || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setError("Category name cannot be empty.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      const payload = {
        name: trimmed,
        parentId: selectedParentId || null,
      };

      const res = await categoryApi.addCategory(payload);
      if (res.success) {
        setSuccessMsg(res.message || `Category "${trimmed}" added successfully!`);
        setNewCategoryName("");
        setSelectedParentId("");
        setTimeout(() => setSuccessMsg(""), 4000);
        await loadCategories();
      }
    } catch (err) {
      setError(err.message || "Failed to add category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectParentShortcut = (cat) => {
    setSelectedParentId(cat._id || cat.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteCategory = async (cat) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the category "${cat.name}"?`
    );
    if (!confirmDelete) return;

    try {
      setError("");
      setSuccessMsg("");
      const res = await categoryApi.deleteCategory(cat._id || cat.id);
      if (res.success) {
        setSuccessMsg(res.message || `Category "${cat.name}" deleted successfully.`);
        setTimeout(() => setSuccessMsg(""), 4000);
        await loadCategories();
      }
    } catch (err) {
      setError(err.message || `Cannot delete category "${cat.name}".`);
    }
  };

  const selectedParentCategory = categories.find(
    (c) => (c._id || c.id).toString() === selectedParentId.toString()
  );

  return (
    <div className="flex bg-black text-white min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl mx-auto">
        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400 mb-1">
            <Tags className="w-4 h-4" />
            <span>Hierarchical Spending Taxonomies</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-orange-500 tracking-tight">
            Manage Categories &amp; Subcategories
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Organize your spending into unlimited nested hierarchies (e.g. Trip &rarr; Transport &rarr; Bus). Categories synchronize with the Add Expense modal.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-xl text-red-400 flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-emerald-400 flex items-start gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Create Category / Subcategory Card */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl mb-8">
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Plus className="w-5 h-5 text-orange-500" />
            {selectedParentCategory
              ? `Add Subcategory under "${selectedParentCategory.name}"`
              : "Add New Category"}
          </h2>
          <p className="text-gray-400 text-xs mb-5">
            Select a parent category to create a nested subcategory, or choose "Top-Level" to create a main category.
          </p>

          <form onSubmit={handleAddCategory} className="flex flex-col md:flex-row gap-3">
            {/* Parent Category Selector */}
            <div className="md:w-1/3">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Parent Category
              </label>
              <select
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 transition"
              >
                <option value="">None (Top-Level Category)</option>
                {categories.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.path || c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Name Input */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Category Name
              </label>
              <input
                type="text"
                placeholder={
                  selectedParentCategory
                    ? `e.g. Transport, Meals, etc.`
                    : `e.g. Laundry, Gym, College Projects...`
                }
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  if (error) setError("");
                }}
                maxLength={50}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
                required
              />
            </div>

            <div className="flex items-end gap-2">
              {selectedParentId && (
                <button
                  type="button"
                  onClick={() => setSelectedParentId("")}
                  className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl text-sm transition"
                >
                  Clear Parent
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting || !newCategoryName.trim()}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-orange-500/20 disabled:opacity-50 cursor-pointer w-full md:w-auto"
              >
                {isSubmitting ? (
                  "Creating..."
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Categories Hierarchy Display */}
        <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-bold text-white">Active Category Tree</h2>
            </div>
            <span className="text-xs text-gray-400">
              Total Categories: <strong className="text-orange-400">{categories.length}</strong>
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-16">
              <span className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
            </div>
          ) : categoryTree.length === 0 ? (
            <p className="text-gray-500 text-center py-12 text-sm">
              No categories found.
            </p>
          ) : (
            <div className="space-y-3">
              {categoryTree.map((cat) => (
                <CategoryNode
                  key={cat._id || cat.id}
                  category={cat}
                  level={0}
                  onAddSubcategory={handleSelectParentShortcut}
                  onDelete={handleDeleteCategory}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Categories;