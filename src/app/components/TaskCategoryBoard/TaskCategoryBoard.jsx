"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  FolderKanban,
  CheckCircle,
  Save,
} from "lucide-react";
import { CircularProgress } from "@mui/material";
import style from "./TaskCategoryBoard.module.scss";

import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  selectAllCategories,
  selectIsLoading,
  selectError,
  selectIsCached,
  clearErrors,
} from "@/store/slices/taskCategorySlice";
import ConfirmationDialog from "../ConfirmationDialog/ConfirmationDialog";
import { truncateText } from "@/utils/server/utils";

const TaskCategoryBoard = ({
  isOpen,
  onClose,
  onSelect = null,
  mode = "list",
  initialCategory = null,
}) => {
  const dispatch = useDispatch();

  // Redux state
  const categories = useSelector(selectAllCategories);
  const isLoading = useSelector((state) => selectIsLoading(state, "list"));
  const createLoading = useSelector((state) =>
    selectIsLoading(state, "create")
  );
  const updateLoading = useSelector((state) =>
    selectIsLoading(state, "update")
  );

  const error = useSelector((state) => selectError(state, "list"));
  const createError = useSelector((state) => selectError(state, "create"));
  const updateError = useSelector((state) => selectError(state, "update"));
  const deleteError = useSelector((state) => selectError(state, "delete"));
  const isCached = useSelector(selectIsCached);

  // Local state
  const [viewMode, setViewMode] = useState(mode); // 'list' | 'create' | 'edit'
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCategory, setEditingCategory] = useState(initialCategory);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Fetch categories on mount (only if not cached)
  useEffect(() => {
    if (isOpen && !isCached) {
      dispatch(fetchCategories({ page: 1, page_size: 100 }));
    }
  }, [isOpen, isCached, dispatch]);

  // Reset form when switching modes
  useEffect(() => {
    if (viewMode === "create") {
      setFormData({ name: "", description: "" });
      setEditingCategory(null);
    } else if (viewMode === "edit" && editingCategory) {
      setFormData({
        name: editingCategory.name || "",
        description: editingCategory.description || "",
      });
    }
  }, [viewMode, editingCategory]);

  // Clear errors when dialog opens
  useEffect(() => {
    if (isOpen) {
      dispatch(clearErrors());
    }
  }, [isOpen, dispatch]);

  // Local search (cache-based)
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;

    const term = searchTerm.toLowerCase();
    return categories.filter(
      (cat) =>
        cat.name?.toLowerCase().includes(term) ||
        cat.code?.toLowerCase().includes(term) ||
        cat.description?.toLowerCase().includes(term)
    );
  }, [categories, searchTerm]);

  // Handlers
  const handleClose = () => {
    setViewMode(mode);
    setSearchTerm("");
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
    setDeleteConfirm(null);
    dispatch(clearErrors());
    onClose();
  };

  const handleSelect = (category) => {
    if (onSelect) {
      onSelect({
        id: category.id,
        name: category.name,
        code: category.code,
        description: category.description,
        _count: category._count,
      });
      handleClose();
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    const result = await dispatch(createCategory(formData));

    if (!result.error) {
      setViewMode("list");
      setFormData({ name: "", description: "" });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    const result = await dispatch(
      updateCategory({ id: editingCategory.id, data: formData })
    );

    if (!result.error) {
      setViewMode("list");
      setEditingCategory(null);
      setFormData({ name: "", description: "" });
    }
  };

  const handleDelete = async (categoryId) => {
    const result = await dispatch(deleteCategory(categoryId));

    if (!result.error) {
      setDeleteConfirm(null);
    }
  };

  const handleEditClick = (category) => {
    setEditingCategory(category);
    setViewMode("edit");
  };

  const handleCancelEdit = () => {
    setViewMode("list");
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
  };

  if (!isOpen) return null;

  const isSelectMode = mode === "select";
  const isFormMode = viewMode === "create" || viewMode === "edit";
  const currentError = createError || updateError || deleteError || error;

  return (
    <div className={style.backdrop} onClick={handleClose}>
      <div className={style.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={style.header}>
          <div className={style.headerContent}>
            <FolderKanban size={20} />
            <div>
              <h2>
                {isFormMode
                  ? viewMode === "create"
                    ? "Create Category"
                    : "Edit Category"
                  : isSelectMode
                  ? "Select Category"
                  : "Manage Categories"}
              </h2>
              <p className={style.subtitle}>
                {isFormMode
                  ? "Fill in the details below"
                  : isSelectMode
                  ? "Choose a category for your task"
                  : "Create and manage task categories"}
              </p>
            </div>
          </div>
          <button className={style.closeBtn} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* Error Banner */}
        {currentError && (
          <div className={style.errorBanner}>
            <AlertCircle size={16} />
            <span>{currentError}</span>
            <button onClick={() => dispatch(clearErrors())}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className={style.body}>
          {/* Loading State */}
          {isLoading && !isCached ? (
            <div className={style.loadingState}>
              <Loader2 className={style.spinner} />
              <p>Loading categories...</p>
            </div>
          ) : isFormMode ? (
            /* Form View (Create/Edit) */
            <form
              className={style.form}
              onSubmit={viewMode === "create" ? handleCreate : handleUpdate}
            >
              <div className={style.formGroup}>
                <label htmlFor="name">
                  Category Name <span className={style.required}>*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="e.g., Tax Compliance"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  maxLength={100}
                />
                <small>Code will be auto-generated from the name</small>
              </div>

              <div className={style.formGroup}>
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  placeholder="Brief description of this category..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className={style.formActions}>
                <button
                  type="button"
                  className={style.cancelBtn}
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={style.submitBtn}
                  disabled={createLoading || updateLoading}
                >
                  {createLoading || updateLoading ? (
                    <>
                      <CircularProgress size={16} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>{viewMode === "create" ? "Create" : "Update"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* List View */
            <>
              {/* Search & Actions */}
              <div className={style.toolbar}>
                <div className={style.searchWrapper}>
                  <Search size={16} className={style.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={style.searchInput}
                  />
                </div>
                {!isSelectMode && (
                  <button
                    className={style.createBtn}
                    onClick={() => setViewMode("create")}
                  >
                    <Plus size={16} />
                    <span>New Category</span>
                  </button>
                )}
              </div>

              {/* Categories List */}
              <div className={style.categoriesList}>
                {filteredCategories.length === 0 ? (
                  <div className={style.emptyState}>
                    <FolderKanban size={48} />
                    <h3>
                      {searchTerm ? "No categories found" : "No categories yet"}
                    </h3>
                    <p>
                      {searchTerm
                        ? "Try a different search term"
                        : "Create your first category to get started"}
                    </p>
                    {!searchTerm && !isSelectMode && (
                      <button
                        className={style.emptyCreateBtn}
                        onClick={() => setViewMode("create")}
                      >
                        <Plus size={16} />
                        Create Category
                      </button>
                    )}
                  </div>
                ) : (
                  filteredCategories.map((category) => (
                    <div
                      key={category.id}
                      className={`${style.categoryCard} ${style.selectable}`}
                      onClick={() => handleSelect(category)}
                    >
                      <div className={style.categoryIcon}>
                        <FolderKanban size={20} />
                      </div>

                      <div className={style.categoryInfo}>
                        <div className={style.categoryHeader}>
                          <h4>{category.name}</h4>
                          <span className={style.categoryCode}>
                            {category.code}
                          </span>
                        </div>

                        {category.description && (
                          <p className={style.categoryDescription}>
                            {truncateText(category.description, 50)}
                          </p>
                        )}

                        <div className={style.categoryMeta}>
                          <span className={style.taskCount}>
                            {category._count?.tasks || 0} task
                            {category._count?.tasks !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {!isSelectMode && (
                        <div className={style.categoryActions}>
                          <button
                            className={style.editBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(category);
                            }}
                            title="Edit category"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className={style.deleteBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(category);
                            }}
                            title="Delete category"
                            disabled={category._count?.tasks > 0}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}

                      {isSelectMode && (
                        <div className={style.selectIndicator}>
                          <CheckCircle size={20} />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer (only in list/select mode) */}
        {!isFormMode && (
          <div className={style.footer}>
            <div className={style.footerInfo}>
              <span>
                {filteredCategories.length} categor
                {filteredCategories.length !== 1 ? "ies" : "y"}
                {searchTerm && " found"}
              </span>
            </div>
            <button className={style.doneBtn} onClick={handleClose}>
              {isSelectMode ? "Cancel" : "Done"}
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <ConfirmationDialog
            isOpen={!!deleteConfirm}
            onClose={() => setDeleteConfirm(null)}
            variant="danger"
            actionName={`Delete category "${deleteConfirm?.name}"?`}
            actionInfo="This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            onCancel={() => setDeleteConfirm(null)}
            onConfirm={async () => {
              await handleDelete(deleteConfirm.id);
              setDeleteConfirm(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default TaskCategoryBoard;
