"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Search,
  Users,
  UserPlus,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Clock,
  Wifi,
} from "lucide-react";
import style from "./AssignmentDialog.module.scss";
import { CircularProgress } from "@mui/material";


const AssignmentDialog = ({ 
  isOpen, 
  onClose, 
  config = {},
  hasPermission = false 
}) => {
  const {
    selectedItem,
    apiEndpoint,
    buildPayload,
    onSuccessDispatch,
    title = "Assign Team Members",
    subtitle = "Drag and drop users to manage team assignments",
    validateItem = (item) => item?.id ? null : "No item selected"
  } = config;

  // Local state
  const [availableUsers, setAvailableUsers] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [isAssignToAll, setIsAssignToAll] = useState(false);

  // Store original/initial state for comparison
  const [originalAssignedUsers, setOriginalAssignedUsers] = useState([]);
  const [originalIsAssignToAll, setOriginalIsAssignToAll] = useState(false);

  const [availableSearch, setAvailableSearch] = useState("");
  const [assignedSearch, setAssignedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [draggedUser, setDraggedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Cache-related state
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState(null);
  const [refreshingUsers, setRefreshingUsers] = useState(false);

  const MAX_ASSIGNED_USERS = 10;
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
  const CACHE_KEY = "available_users_cache";

  // Helper function to check if cache is valid
  const isCacheValid = (timestamp) => {
    return Date.now() - timestamp < CACHE_DURATION;
  };

  // Helper function to get cached users
  const getCachedUsers = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { users, timestamp } = JSON.parse(cached);
        if (isCacheValid(timestamp)) {
          return { users, timestamp };
        } else {
          // Cache expired, remove it
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      console.error("Error reading cache:", error);
      localStorage.removeItem(CACHE_KEY);
    }
    return null;
  };

  // Helper function to cache users
  const cacheUsers = (users) => {
    try {
      const timestamp = Date.now();
      localStorage.setItem(CACHE_KEY, JSON.stringify({ users, timestamp }));
      setCacheTimestamp(timestamp);
    } catch (error) {
      console.error("Error caching users:", error);
    }
  };

  // Helper function to format cache age
  const formatCacheAge = (timestamp) => {
    if (!timestamp) return "";

    const ageInMinutes = Math.floor((Date.now() - timestamp) / (1000 * 60));
    if (ageInMinutes < 1) {
      return "Just now";
    } else if (ageInMinutes < 60) {
      return `${ageInMinutes} min ago`;
    } else {
      const ageInHours = Math.floor(ageInMinutes / 60);
      return `${ageInHours}h ${ageInMinutes % 60}m ago`;
    }
  };

  // Helper function to check if there are actual changes
  const checkForChanges = (currentAssigned, currentToggle) => {
    // Check if toggle state changed
    const toggleChanged = currentToggle !== originalIsAssignToAll;

    // Check if assigned users array changed
    const usersChanged =
      currentAssigned.length !== originalAssignedUsers.length ||
      !currentAssigned.every((user) =>
        originalAssignedUsers.some(
          (originalUser) => originalUser.userCode === user.userCode
        )
      );

    return toggleChanged || usersChanged;
  };

  // Computed value for hasChanges
  const hasChanges = checkForChanges(assignedUsers, isAssignToAll);

  // Fetch users from API
  const fetchUsersFromAPI = async () => {
    const response = await fetch("/api/admin/users/get_users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pageSize: 100, // Get more users for assignment dialog
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to fetch available users");
    }

    return data?.data?.users || [];
  };

  // Fetch data when dialog opens
  useEffect(() => {
    if (isOpen && selectedItem) {
      fetchData();
    }
  }, [isOpen, selectedItem?.id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      let users = [];
      let fromCache = false;
      let timestamp = null;

      // Try to get from cache first
      const cached = getCachedUsers();
      if (cached) {
        users = cached.users;
        timestamp = cached.timestamp;
        fromCache = true;
        setIsFromCache(true);
        setCacheTimestamp(timestamp);
      } else {
        // Fetch from API if no valid cache
        users = await fetchUsersFromAPI();
        cacheUsers(users);
        fromCache = false;
        setIsFromCache(false);
      }

      setAvailableUsers(users);

      // Get current assignment from selectedItem
      const currentAssignment = selectedItem?.assignmentManagement || {
        assignToAll: false,
        members: [],
      };

      // Set initial state from current item
      const currentAssignedUsers = currentAssignment.members || [];
      const currentAssignToAll = currentAssignment.assignToAll || false;

      setAssignedUsers(currentAssignedUsers);
      setIsAssignToAll(currentAssignToAll);

      // Store original state for comparison
      setOriginalAssignedUsers([...currentAssignedUsers]);
      setOriginalIsAssignToAll(currentAssignToAll);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh users from API
  const refreshUsers = async () => {
    setRefreshingUsers(true);
    setError(null);

    try {
      const users = await fetchUsersFromAPI();
      cacheUsers(users);
      setAvailableUsers(users);
      setIsFromCache(false);
    } catch (err) {
      console.error("Error refreshing users:", err);
      setError(err.message);
    } finally {
      setRefreshingUsers(false);
    }
  };

  const filteredAvailableUsers = availableUsers.filter(
    (user) =>
      !assignedUsers.some((assigned) => assigned.userCode === user.userCode) &&
      (user.name.toLowerCase().includes(availableSearch.toLowerCase()) ||
        user.email.toLowerCase().includes(availableSearch.toLowerCase()))
  );

  const filteredAssignedUsers = assignedUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(assignedSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(assignedSearch.toLowerCase())
  );

  const handleDragStart = (e, user, source) => {
    if (isAssignToAll) {
      e.preventDefault();
      return;
    }

    setDraggedUser({ ...user, source });
    e.dataTransfer.effectAllowed = "move";

    // Create a custom drag image
    const dragImage = document.createElement("div");
    dragImage.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: #ffffff;
        border: 1px solid #3b82f6;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        font-family: inherit;
        min-width: 200px;
        pointer-events: none;
      ">
        <div style="
          width: 32px;
          height: 32px;
          background: #3b82f6;
          color: #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
        ">${
          user.avatar || user.name?.substring(0, 2).toUpperCase() || "?"
        }</div>
        <div>
          <div style="font-size: 13px; font-weight: 500; color: #0f172a; margin-bottom: 2px;">
            ${user.name}
          </div>
          <div style="font-size: 11px; color: #64748b;">
            ${user.email}
          </div>
        </div>
      </div>
    `;

    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    dragImage.style.pointerEvents = "none";
    document.body.appendChild(dragImage);

    e.dataTransfer.setDragImage(dragImage, 110, 25);

    // Clean up the drag image after a short delay
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  };

  const handleDragOver = (e) => {
    if (isAssignToAll) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetList) => {
    if (isAssignToAll) return;
    e.preventDefault();

    if (!draggedUser) return;

    const { source } = draggedUser;

    if (source === "available" && targetList === "assigned") {
      // Check if we've reached the limit
      if (assignedUsers.length >= MAX_ASSIGNED_USERS) {
        setDraggedUser(null);
        return;
      }

      // Add to assigned users
      setAssignedUsers((prev) => [...prev, draggedUser]);
    } else if (source === "assigned" && targetList === "available") {
      // Remove from assigned users
      setAssignedUsers((prev) =>
        prev.filter((u) => u.userCode !== draggedUser.userCode)
      );
    }

    setDraggedUser(null);
  };

  const handleAssignToAllToggle = () => {
    setIsAssignToAll(!isAssignToAll);
  };

  const handleAssignUsers = async () => {
    // Validate selected item
    const validationError = validateItem(selectedItem);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check if required config is provided
    if (!apiEndpoint || !buildPayload) {
      setError("Missing required configuration");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Build assignment data
      const assignmentData = {
        assignToAll: isAssignToAll,
        members: isAssignToAll
          ? []
          : assignedUsers.map((u) => ({
              userCode: u.userCode,
              name: u.name,
              email: u.email,
              sendEmail: false,
            })),
      };

      // Build payload using config function
      const payload = buildPayload(selectedItem.id, assignmentData);

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to update assignment");
      }

      // Dispatch Redux action if provided
      if (onSuccessDispatch) {
        onSuccessDispatch(data);
      }

      // Update original state after successful save
      setOriginalAssignedUsers([...assignedUsers]);
      setOriginalIsAssignToAll(isAssignToAll);

      onClose();
    } catch (err) {
      console.error("Error updating assignment:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setAvailableSearch("");
    setAssignedSearch("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const isAtLimit = assignedUsers.length >= MAX_ASSIGNED_USERS;
  const isDisabled = isAssignToAll;

  return (
    <div className={style.assignmentDialogBackdrop}>
      <div className={`${style.assignmentDialog} ${!hasPermission ? style.noAble : ''}`}>
        <div className={style.dialogHeader}>
          <div className={style.headerContent}>
            <h2>{title}</h2>
            {hasPermission && (
              <p className={style.subtitle}>
                {isAssignToAll
                  ? "All users are assigned to this task"
                  : subtitle}
              </p>
            )}
          </div>
          <button className={style.closeBtn} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className={style.dialogBody}>
          {error && (
            <div className={style.errorBanner}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className={style.loadingState}>
              <Loader2 className={style.loader} />
              <p>Loading team members...</p>
            </div>
          ) : (
            <div className={style.assignmentContainer}>
              {/* Available Users - Left Side */}
              <div className={`${style.userSection} ${style.availableSection}`}>
                <div className={style.sectionHeader}>
                  <div className={style.headerInner}>
                    <div className={style.sectionTitle}>
                      <Users size={16} />
                      <h3>Available Members</h3>
                      <span className={style.count}>
                        ({filteredAvailableUsers.length})
                      </span>
                    </div>

                    <div className={style.assignAllToggle}>
                      <button
                        disabled={saving}
                        className={`${style.toggleBtn} ${!saving ? style.active : ''}`}
                        onClick={handleAssignToAllToggle}
                      >
                        {isAssignToAll ? (
                          <ToggleRight size={16} />
                        ) : (
                          <ToggleLeft size={16} />
                        )}
                        <span>Assign to All</span>
                      </button>
                    </div>
                  </div>

                  {/* Cache Status and Refresh */}
                  <div className={style.cacheControls}>
                    <div className={style.cacheStatus}>
                      {isFromCache ? (
                        <div className={style.cacheInfo}>
                          <Clock size={12} />
                          <span>Cached {formatCacheAge(cacheTimestamp)}</span>
                        </div>
                      ) : (
                        <div className={`${style.cacheInfo} ${style.fresh}`}>
                          <Wifi size={12} />
                          <span>Fresh data</span>
                        </div>
                      )}
                    </div>
                    <button
                      className={style.refreshBtn}
                      onClick={refreshUsers}
                      disabled={refreshingUsers || saving}
                      title="Refresh user list"
                    >
                      <RefreshCw
                        size={14}
                        className={refreshingUsers ? style.spinning : ''}
                      />
                    </button>
                  </div>

                  <div className={style.searchWrapper}>
                    <Search size={14} className={style.searchIcon} />
                    <input
                      type="text"
                      placeholder="Search available..."
                      value={availableSearch}
                      onChange={(e) => setAvailableSearch(e.target.value)}
                      className={style.searchInput}
                      disabled={isDisabled}
                    />
                  </div>
                </div>

                <div
                  className={`${style.usersList} ${isDisabled ? style.disabled : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, "available")}
                >
                  {filteredAvailableUsers.map((user) => (
                    <div
                      style={{
                        cursor: "grab",
                      }}
                      key={user.userCode}
                      className={`${style.userCard} ${style.available} ${
                        isDisabled ? style.disabled : ''
                      }`}
                      draggable={!isDisabled}
                      onDragStart={(e) => handleDragStart(e, user, "available")}
                    >
                      <div className={style.userAvatar}>
                        {user.avatar ||
                          user.name?.substring(0, 2).toUpperCase() ||
                          "?"}
                      </div>
                      <div className={style.userInfo}>
                        <div className={style.userName}>{user.name}</div>
                        <div className={style.userEmail}>{user.email}</div>
                      </div>
                    </div>
                  ))}

                  {filteredAvailableUsers.length === 0 && (
                    <div className={style.emptyState}>
                      <Users size={24} />
                      <p>No available members found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Vertical Divider */}
              <div className={style.divider}></div>

              {/* Assigned Users - Right Side */}
              <div
                className={`${style.userSection} ${style.assignedSection} ${
                  isDisabled ? style.disabled : ''
                }`}
              >
                <div className={style.sectionHeader}>
                  <div className={style.sectionTitle}>
                    <UserPlus size={16} />
                    <h3>Assigned Members</h3>
                    <span className={style.count}>
                      {isAssignToAll
                        ? "(All)"
                        : `(${assignedUsers.length}/${MAX_ASSIGNED_USERS})`}
                    </span>
                  </div>

                  {!isAssignToAll && (
                    <div className={style.searchWrapper}>
                      <Search size={14} className={style.searchIcon} />
                      <input
                        type="text"
                        placeholder="Search assigned..."
                        value={assignedSearch}
                        onChange={(e) => setAssignedSearch(e.target.value)}
                        className={style.searchInput}
                        disabled={isDisabled}
                      />
                    </div>
                  )}
                </div>

                {isAtLimit && !isAssignToAll && (
                  <div className={style.limitWarning}>
                    <AlertCircle size={14} />
                    <span>Maximum 10 members can be assigned</span>
                  </div>
                )}

                {isAssignToAll ? (
                  <div className={style.allUsersState}>
                    <Users size={48} />
                    <h4>All Users Assigned</h4>
                    <p>Every team member is assigned to this task</p>
                  </div>
                ) : (
                  <div
                    className={style.usersList}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, "assigned")}
                  >
                    {filteredAssignedUsers.map((user) => (
                      <div
                        style={{
                          cursor: "grab",
                        }}
                        key={user.userCode}
                        className={`${style.userCard} ${style.assigned} ${
                          isDisabled ? style.disabled : ''
                        }`}
                        draggable={!isDisabled}
                        onDragStart={(e) =>
                          handleDragStart(e, user, "assigned")
                        }
                      >
                        <div className={`${style.userAvatar} ${style.assigned}`}>
                          {user.avatar ||
                            user.name?.substring(0, 2).toUpperCase() ||
                            "?"}
                        </div>
                        <div className={style.userInfo}>
                          <div className={style.userName}>{user.name}</div>
                          <div className={style.userEmail}>{user.email}</div>
                        </div>
                      </div>
                    ))}

                    {filteredAssignedUsers.length === 0 && (
                      <div className={style.emptyState}>
                        <UserPlus size={24} />
                        <p>No members assigned yet</p>
                        <span>Drag users from the left to assign them</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={style.dialogFooter}>
          <div className={style.footerInfo}>
            {hasChanges && (
              <span>
                {isAssignToAll
                  ? "All members will be assigned"
                  : `${assignedUsers.length} member(s) will be assigned`}
              </span>
            )}
          </div>
          <div className={style.footerActions}>
            <button className={style.cancelBtn} onClick={handleClose}>
              Cancel
            </button>
            <button
              className={style.submitBtn}
              onClick={handleAssignUsers}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <>
                  <CircularProgress size={18} />
                  <span>Assigning...</span>
                </>
              ) : (
                <span>Assign Members</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentDialog;