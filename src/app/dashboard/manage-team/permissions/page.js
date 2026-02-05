"use client";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus, Search, Edit2, Trash2, X, Save } from "lucide-react";

import {
  fetchPermissions,
  createPermissions,
  updatePermission,
  deletePermission,
  selectAllPermissions,
  selectPermissionLoading,
  selectPermissionError,
  clearPermissionError,
} from "@/store/slices/permissionSlice";

import styles from "./PermissionsPage.module.scss";

export default function page() {
  const dispatch = useDispatch();
  const permissions = useSelector(selectAllPermissions);
  const loading = useSelector(selectPermissionLoading);
  const error = useSelector(selectPermissionError);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    label: "",
    category: "",
  });

  useEffect(() => {
    dispatch(fetchPermissions());
  }, [dispatch]);

  const categories = [
    ...new Set(permissions.map((p) => p.category).filter(Boolean)),
  ];

  const filteredPermissions = permissions.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.label?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const openCreateModal = () => {
    setFormData({ code: "", label: "", category: "" });
    setEditMode(null);
    setShowModal(true);
  };

  const openEditModal = (permission) => {
    setFormData({
      code: permission.code,
      label: permission.label || "",
      category: permission.category || "",
    });
    setEditMode(permission.id);
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      code: formData.code.trim(),
      ...(formData.label.trim() && { label: formData.label.trim() }),
      ...(formData.category.trim() && { category: formData.category.trim() }),
    };

    if (editMode) {
      dispatch(updatePermission({ id: editMode, data: payload })).then(
        (res) => {
          if (!res.error) {
            setShowModal(false);
            dispatch(fetchPermissions());
          }
        },
      );
    } else {
      dispatch(createPermissions({ permissions: [payload] })).then((res) => {
        if (!res.error) {
          setShowModal(false);
          dispatch(fetchPermissions());
        }
      });
    }
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this permission?")) {
      dispatch(deletePermission(id)).then((res) => {
        if (!res.error) dispatch(fetchPermissions());
      });
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Permissions</h1>
          <p>Manage system permissions</p>
        </div>
        <button className={styles.btnPrimary} onClick={openCreateModal}>
          <Plus size={18} />
          New Permission
        </button>
      </div>

      {error && (
        <div className={styles.alert}>
          {error.message}
          <button onClick={() => dispatch(clearPermissionError())}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className={styles.filter}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Label</th>
              <th>Category</th>
              <th width="100">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading.fetch ? (
              <tr>
                <td colSpan="4" className={styles.loading}>
                  Loading...
                </td>
              </tr>
            ) : filteredPermissions.length === 0 ? (
              <tr>
                <td colSpan="4" className={styles.empty}>
                  No permissions found
                </td>
              </tr>
            ) : (
              filteredPermissions.map((p) => (
                <tr key={p.id}>
                  <td>
                    <code>{p.code}</code>
                  </td>
                  <td>{p.label || "—"}</td>
                  <td>
                    {p.category ? (
                      <span className={styles.badge}>{p.category}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.iconBtn}
                        onClick={() => openEditModal(p)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className={styles.iconBtnDanger}
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editMode ? "Edit Permission" : "New Permission"}</h2>
              <button onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.field}>
                  <label>
                    Code <span>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="e.g., users.create"
                    required
                    minLength={3}
                    maxLength={100}
                  />
                </div>
                <div className={styles.field}>
                  <label>Label</label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) =>
                      setFormData({ ...formData, label: e.target.value })
                    }
                    placeholder="e.g., Create Users"
                    maxLength={200}
                  />
                </div>
                <div className={styles.field}>
                  <label>Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="e.g., User Management"
                    maxLength={100}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={loading.create || loading.update}
                >
                  <Save size={16} />
                  {editMode ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
