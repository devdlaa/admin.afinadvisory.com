"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./CategoryDialog.module.scss";
import CustomInput from "./CustomInput";
import {
  Search,
  X,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Tag,
  FolderOpen,
} from "lucide-react";

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function CategoryDialog({
  open = true,
  onClose,
  onSelect,
  categories = [], 
  onCreateCategory, 
  onUpdateCategory, 
  onDeleteCategory, 
}) {
  const dialogRef = useRef(null);

  // Search state
  const [query, setQuery] = useState("");
  const [filteredCategories, setFilteredCategories] = useState(categories);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  // Form state
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [categoryName, setCategoryName] = useState("");

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Message state
  const [message, setMessage] = useState({ type: "", text: "" });

  // ============================================================================
  // EFFECTS
  // ============================================================================
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      resetDialog();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClick = (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;

      if (!isInDialog) onClose();
    };

    dialog.addEventListener("click", handleClick);
    return () => dialog.removeEventListener("click", handleClick);
  }, [onClose]);

  // Update filtered categories when query or categories change
  useEffect(() => {
    if (!query.trim()) {
      setFilteredCategories(categories);
      return;
    }

    const filtered = categories.filter((cat) =>
      cat.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredCategories(filtered);
  }, [query, categories]);

  // Auto-clear message after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const resetDialog = () => {
    setQuery("");
    setFilteredCategories(categories);
    setSelectedCategoryId(null);
    setIsCreating(false);
    setEditingId(null);
    setCategoryName("");
    setMessage({ type: "", text: "" });
  };

  const handleClearSearch = () => {
    setQuery("");
  };

  const handleSelectCategory = (category) => {
    setSelectedCategoryId(category.id);
    if (onSelect) onSelect(category);
    onClose();
  };

  const handleCreateClick = () => {
    setIsCreating(true);
    setEditingId(null);
    setCategoryName("");
    setMessage({ type: "", text: "" });
  };

  const handleEditClick = (e, category) => {
    e.stopPropagation();
    setEditingId(category.id);
    setCategoryName(category.name);
    setIsCreating(false);
    setMessage({ type: "", text: "" });
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setCategoryName("");
    setMessage({ type: "", text: "" });
  };

  const handleSubmit = async () => {
    if (!categoryName.trim()) {
      setMessage({ type: "error", text: "Category name cannot be empty" });
      return;
    }

    // Check for duplicate names
    const isDuplicate = categories.some(
      (cat) =>
        cat.name.toLowerCase() === categoryName.trim().toLowerCase() &&
        cat.id !== editingId
    );

    if (isDuplicate) {
      setMessage({ type: "error", text: "Category name already exists" });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      if (editingId) {
        // Update existing category
        await onUpdateCategory(editingId, categoryName.trim());
        setMessage({ type: "success", text: "Category updated successfully" });
      } else {
        // Create new category
        await onCreateCategory(categoryName.trim());
        setMessage({ type: "success", text: "Category created successfully" });
      }

      // Reset form after success
      setTimeout(() => {
        setIsCreating(false);
        setEditingId(null);
        setCategoryName("");
      }, 1000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Something went wrong",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e, categoryId) => {
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this category?")) {
      return;
    }

    setDeletingId(categoryId);
    setMessage({ type: "", text: "" });

    try {
      await onDeleteCategory(categoryId);
      setMessage({ type: "success", text: "Category deleted successfully" });

      // If we were editing this category, cancel the form
      if (editingId === categoryId) {
        handleCancelForm();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to delete category",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <div className={styles.dialogContent}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <Tag size={24} />
            <h2>Manage Categories</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className={styles.searchBar}>
          <input
            placeholder="Search categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className={styles.searchIcon}>
            {query ? (
              <button className={styles.clearBtn} onClick={handleClearSearch}>
                <X size={20} />
              </button>
            ) : (
              <Search size={20} />
            )}
          </span>
        </div>

        {/* Create New Button */}
        {!isCreating && !editingId && (
          <button className={styles.createBtn} onClick={handleCreateClick}>
            <Plus size={18} />
            Create New Category
          </button>
        )}

        {/* Create/Edit Form */}
        {(isCreating || editingId) && (
          <div className={styles.formSection}>
            <CustomInput
              label={editingId ? "Edit Category" : "New Category"}
              placeholder="Enter category name"
              required={true}
              icon={<Tag />}
              type="text"
              value={categoryName}
              onChange={setCategoryName}
            />

            {/* Message */}
            {message.text && (
              <div
                className={`${styles.message} ${
                  message.type === "error" ? styles.error : styles.success
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Form Actions */}
            <div className={styles.formActions}>
              <button
                className={styles.cancelBtn}
                onClick={handleCancelForm}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={isSubmitting || !categoryName.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className={styles.spin} size={18} />
                    {editingId ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    {editingId ? <Pencil size={18} /> : <Plus size={18} />}
                    {editingId ? "Update" : "Create"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Categories List */}
        <div className={styles.categoriesList}>
          {filteredCategories.length === 0 ? (
            <div className={styles.emptyState}>
              <FolderOpen size={48} strokeWidth={1.5} />
              <p>
                {query
                  ? "No categories found"
                  : "No categories yet. Create one to get started!"}
              </p>
            </div>
          ) : (
            filteredCategories.map((category) => {
              const isSelected = selectedCategoryId === category.id;
              const isDeleting = deletingId === category.id;
              const isEditing = editingId === category.id;

              return (
                <div
                  key={category.id}
                  className={`${styles.categoryCard} ${
                    isSelected ? styles.selected : ""
                  } ${isEditing ? styles.editing : ""}`}
                  onClick={() => handleSelectCategory(category)}
                >
                  <div className={styles.categoryInfo}>
                    <Tag size={18} />
                    <span className={styles.categoryName}>{category.name}</span>
                  </div>

                  <div className={styles.actions}>
                    <button
                      className={styles.editBtn}
                      onClick={(e) => handleEditClick(e, category)}
                      disabled={isDeleting}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => handleDelete(e, category.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className={styles.spin} size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Message (if not in form) */}
        {!isCreating && !editingId && message.text && (
          <div
            className={`${styles.bottomMessage} ${
              message.type === "error" ? styles.error : styles.success
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </dialog>
  );
}
