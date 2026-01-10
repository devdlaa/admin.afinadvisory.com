"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  FileText,
  Building2,
  Tag,
  Flag,
  Calendar,
  AlertCircle,
} from "lucide-react";

import Button from "@/app/components/Button/Button";
import FilterDropdown from "@/app/components/FilterDropdown/FilterDropdown";

import {
  createTask,
  closeCreateDialog,
  selectCreateDialogOpen,
} from "@/store/slices/taskSlice";

import { quickSearchEntities } from "@/store/slices/entitySlice";
import {
  fetchCategories,
  selectAllCategories,
} from "@/store/slices/taskCategorySlice";

import "./TaskCreateDialog.scss";

const TaskCreateDialog = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector(selectCreateDialogOpen);
  const categories = useSelector(selectAllCategories);
  const isCreating = useSelector((state) => state.task.loading.create);
  const createError = useSelector((state) => state.task.error.create);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    entity_id: null,
    task_category_id: null,
    priority: "NORMAL",
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  // Entity search - persist entity after selection
  const [entitySearchResults, setEntitySearchResults] = useState([]);
  const [isSearchingEntities, setIsSearchingEntities] = useState(false);
  const [selectedEntityData, setSelectedEntityData] = useState(null);

  // Load categories on mount
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchCategories({ page: 1, page_size: 100 }));
    }
  }, [isOpen, dispatch]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: "",
        description: "",
        entity_id: null,
        task_category_id: null,
        priority: "NORMAL",
      });
      setErrors({});
      setEntitySearchResults([]);
      setSelectedEntityData(null);
    }
  }, [isOpen]);

  // Handle entity search
  const handleEntitySearch = useCallback(
    async (query) => {
      if (!query || !query.trim()) {
        setEntitySearchResults([]);
        return;
      }

      setIsSearchingEntities(true);
      try {
        const result = await dispatch(
          quickSearchEntities({ search: query, limit: 20 })
        ).unwrap();
        setEntitySearchResults(result.data || []);
      } catch (error) {
        console.error("Entity search failed:", error);
        setEntitySearchResults([]);
      } finally {
        setIsSearchingEntities(false);
      }
    },
    [dispatch]
  );

  // Priority options
  const priorityOptions = [
    { value: "LOW", label: "Low", color: "#10b981" },
    { value: "NORMAL", label: "Normal", color: "#3b82f6" },
    { value: "HIGH", label: "High", color: "#f59e0b" },
  ];

  // Get entity options - include selected entity
  const getEntityOptions = () => {
    if (selectedEntityData) {
      const exists = entitySearchResults.some(
        (e) => e.id === selectedEntityData.id
      );
      if (!exists) {
        return [selectedEntityData, ...entitySearchResults];
      }
    }
    return entitySearchResults;
  };

  // Handle input change
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle entity selection
  const handleEntitySelect = (option) => {
    if (option.value) {
      const entity = entitySearchResults.find((e) => e.id === option.value);
      if (entity) {
        setSelectedEntityData(entity);
      }
    } else {
      setSelectedEntityData(null);
    }
    handleChange("entity_id", option.value);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title || formData.title.trim().length === 0) {
      newErrors.title = "Task title is required";
    } else if (formData.title.length > 255) {
      newErrors.title = "Title must be less than 255 characters";
    }

    if (formData.description && formData.description.length > 2000) {
      newErrors.description = "Description must be less than 2000 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        entity_id: formData.entity_id || null,
        task_category_id: formData.task_category_id || null,
        priority: formData.priority,
      };

      await dispatch(createTask(taskData)).unwrap();
      // Dialog will auto-close via Redux on success
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  // Handle close
  const handleClose = () => {
    dispatch(closeCreateDialog());
  };

  if (!isOpen) return null;

  return (
    <div className="task-create-dialog-overlay" onClick={handleClose}>
      <div className="task-create-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="task-create-dialog__header">
          <div className="task-create-dialog__header-content">
            <div className="task-create-dialog__icon">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="task-create-dialog__title">Create New Task</h2>
              <p className="task-create-dialog__subtitle">
                Fill in the basic information to create a new task
              </p>
            </div>
          </div>
          <button
            className="task-create-dialog__close"
            onClick={handleClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Message */}
        {createError && (
          <div className="task-create-dialog__error-banner">
            <AlertCircle size={20} />
            <span>{createError}</span>
          </div>
        )}

        {/* Form */}
        <form className="task-create-dialog__form" onSubmit={handleSubmit}>

          <div className="task-create-dialog__field">
            <input
              type="text"
              className={`task-create-dialog__input ${
                errors.title ? "task-create-dialog__input--error" : ""
              }`}
              placeholder="Enter task title..."
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              disabled={isCreating}
              autoFocus
            />
            {errors.title && (
              <span className="task-create-dialog__error-text">
                {errors.title}
              </span>
            )}
          </div>

       
          <div className="task-create-dialog__field">
            <textarea
              className={`task-create-dialog__textarea ${
                errors.description ? "task-create-dialog__input--error" : ""
              }`}
              placeholder="Enter task description..."
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              disabled={isCreating}
            />
            {errors.description && (
              <span className="task-create-dialog__error-text">
                {errors.description}
              </span>
            )}
          </div>

          {/* Client & Category Row */}
          <div className="task-create-dialog__row">
            {/* Client */}
            <div className="task-create-dialog__field">
              <FilterDropdown
                placeholder="Select Client"
                icon={Building2}
                options={getEntityOptions().map((entity) => ({
                  value: entity.id,
                  label: entity.name,
                  subtitle: entity.pan || entity.email,
                }))}
                selectedValue={formData.entity_id}
                onSelect={handleEntitySelect}
                onSearchChange={handleEntitySearch}
                isSearching={isSearchingEntities}
                emptyStateMessage="No clients found"
                hintMessage="Start typing to search clients..."
                enableLocalSearch={false}
                className="task-create-dialog__dropdown"
              />
            </div>

            {/* Category */}
            <div className="task-create-dialog__field">
              <FilterDropdown
                placeholder="Select Category"
                icon={Tag}
                options={categories.map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                }))}
                selectedValue={formData.task_category_id}
                onSelect={(option) =>
                  handleChange("task_category_id", option.value)
                }
                enableLocalSearch={true}
                className="task-create-dialog__dropdown"
              />
            </div>
          </div>

          {/* Priority */}
          <div className="task-create-dialog__field">
            <FilterDropdown
              placeholder="Select Priority"
              icon={Flag}
              options={priorityOptions.map((opt) => ({
                ...opt,
                icon: (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: opt.color,
                    }}
                  />
                ),
              }))}
              selectedValue={formData.priority}
              onSelect={(option) => handleChange("priority", option.value)}
              enableLocalSearch={false}
              className="task-create-dialog__dropdown"
            />
          </div>

          {/* Actions */}
          <div className="task-create-dialog__actions">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isCreating}
              disabled={isCreating}
            >
              Create Task
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskCreateDialog;
