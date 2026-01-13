"use client";

import React, { useState, useEffect, useRef } from "react";
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
import Avatar from "@/app/components/newui/Avatar/Avatar";
import { getProfileUrl } from "@/utils/shared/shared_util";

const AssignmentDialog = ({
  isOpen,
  onClose,
  config = {},
  isSaving = false,
  hasPermission = true,
}) => {
  const {
    assignedUsers: initialAssignedUsers = [],
    assignedToAll: initialAssignedToAll = false,
    creatorId,
    onSave,
    title = "Assign Team Members",
    subtitle = "Drag and drop users to manage team assignments",
    maxAssignedUsers = 10,
    usersApiEndpoint = "/api/admin_ops/staff-managment/admin-users",
  } = config;

  // Available users state (fetched internally)
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);

  // Cache state
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState(null);
  const [refreshingUsers, setRefreshingUsers] = useState(false);

  // Assignment state
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [isAssignToAll, setIsAssignToAll] = useState(false);
  const [originalAssignedUsers, setOriginalAssignedUsers] = useState([]);
  const [originalIsAssignToAll, setOriginalIsAssignToAll] = useState(false);

  // UI state
  const [availableSearch, setAvailableSearch] = useState("");
  const [assignedSearch, setAssignedSearch] = useState("");
  const [draggedUser, setDraggedUser] = useState(null);

  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  const CACHE_KEY = "available_users_cache";

  // Cache helpers
  const isCacheValid = (timestamp) => {
    return Date.now() - timestamp < CACHE_DURATION;
  };

  const getCachedUsers = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { users, timestamp } = JSON.parse(cached);
        if (isCacheValid(timestamp)) {
          return { users, timestamp };
        }
        localStorage.removeItem(CACHE_KEY);
      }
    } catch (error) {
      console.error("Error reading cache:", error);
      localStorage.removeItem(CACHE_KEY);
    }
    return null;
  };

  const cacheUsers = (users) => {
    try {
      const timestamp = Date.now();
      localStorage.setItem(CACHE_KEY, JSON.stringify({ users, timestamp }));
      setCacheTimestamp(timestamp);
    } catch (error) {
      console.error("Error caching users:", error);
    }
  };

  const formatCacheAge = (timestamp) => {
    if (!timestamp) return "";
    const ageInMinutes = Math.floor((Date.now() - timestamp) / (1000 * 60));
    if (ageInMinutes < 1) return "Just now";
    if (ageInMinutes < 60) return `${ageInMinutes} min ago`;
    const ageInHours = Math.floor(ageInMinutes / 60);
    return `${ageInHours}h ${ageInMinutes % 60}m ago`;
  };

  // Fetch available users from API
  const fetchUsersFromAPI = async () => {
    const response = await fetch(usersApiEndpoint, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to fetch available users");
    }

    return data?.data?.data || data?.data?.users || [];
  };

  // Load users on dialog open
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    setUsersError(null);

    try {
      let users = [];

      // Try cache first
      const cached = getCachedUsers();
      if (cached) {
        users = cached.users;
        setCacheTimestamp(cached.timestamp);
        setIsFromCache(true);
      } else {
        // Fetch from API
        users = await fetchUsersFromAPI();
        cacheUsers(users);
        setIsFromCache(false);
      }

      setAvailableUsers(users);
    } catch (err) {
      console.error("Error loading users:", err);
      setUsersError(err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Refresh users manually
  const refreshUsers = async () => {
    setRefreshingUsers(true);
    setUsersError(null);

    try {
      const users = await fetchUsersFromAPI();
      cacheUsers(users);
      setAvailableUsers(users);
      setIsFromCache(false);
    } catch (err) {
      console.error("Error refreshing users:", err);
      setUsersError(err.message);
    } finally {
      setRefreshingUsers(false);
    }
  };

  // Initialize assignment state when dialog opens
  // Use a ref to track if we've already initialized for this dialog session
  const dialogSessionRef = useRef(false);

  useEffect(() => {
    if (isOpen && !dialogSessionRef.current) {
      // Dialog just opened - initialize state
      setAssignedUsers([...initialAssignedUsers]);
      setIsAssignToAll(initialAssignedToAll);
      setOriginalAssignedUsers([...initialAssignedUsers]);
      setOriginalIsAssignToAll(initialAssignedToAll);
      setAvailableSearch("");
      setAssignedSearch("");
      dialogSessionRef.current = true;
    } else if (!isOpen) {
      // Dialog closed - reset the session flag
      dialogSessionRef.current = false;
    }
  }, [isOpen, initialAssignedUsers, initialAssignedToAll]);

  // Check if user is creator
  const isCreator = (user) => creatorId && user.id === creatorId;

  // Check if there are changes
  const hasChanges = () => {
    const toggleChanged = isAssignToAll !== originalIsAssignToAll;
    const usersChanged =
      assignedUsers.length !== originalAssignedUsers.length ||
      !assignedUsers.every((user) =>
        originalAssignedUsers.some((original) => original.id === user.id)
      );
    return toggleChanged || usersChanged;
  };

  // Filter users
  const filteredAvailableUsers = availableUsers.filter(
    (user) =>
      !assignedUsers.some((assigned) => assigned.id === user.id) &&
      (user.name?.toLowerCase().includes(availableSearch.toLowerCase()) ||
        user.email?.toLowerCase().includes(availableSearch.toLowerCase()))
  );

  const filteredAssignedUsers = assignedUsers.filter(
    (user) =>
      user.name?.toLowerCase().includes(assignedSearch.toLowerCase()) ||
      user.email?.toLowerCase().includes(assignedSearch.toLowerCase())
  );

  // Drag and drop handlers
  const handleDragStart = (e, user, source) => {
    if (isAssignToAll || !hasPermission) {
      e.preventDefault();
      return;
    }

    setDraggedUser({ ...user, source });
    e.dataTransfer.effectAllowed = "move";

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
        ">${user.name?.substring(0, 2).toUpperCase() || "?"}</div>
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
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 110, 25);

    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  };

  const handleDragOver = (e) => {
    if (isAssignToAll || !hasPermission) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetList) => {
    if (isAssignToAll || !hasPermission) return;
    e.preventDefault();

    if (!draggedUser) return;
    const { source } = draggedUser;

    if (source === "available" && targetList === "assigned") {
      if (assignedUsers.length >= maxAssignedUsers) {
        setDraggedUser(null);
        return;
      }
      setAssignedUsers((prev) => [...prev, draggedUser]);
    } else if (source === "assigned" && targetList === "available") {
      setAssignedUsers((prev) => prev.filter((u) => u.id !== draggedUser.id));
    }

    setDraggedUser(null);
  };

  const handleAssignToAllToggle = () => {
    if (!hasPermission || isSaving) return;
    setIsAssignToAll(!isAssignToAll);
  };

  // Save handler - calls parent's onSave with the data
  const handleSave = () => {
    if (!onSave || !hasChanges()) return;

    const assignmentData = {
      assigned_to_all: isAssignToAll,
      user_ids: isAssignToAll ? [] : assignedUsers.map((u) => u.id),
      members: isAssignToAll ? [] : assignedUsers,
    };

    onSave(assignmentData);
  };

  const handleClose = () => {
    setAvailableSearch("");
    setAssignedSearch("");
    onClose();
  };

  if (!isOpen) return null;

  const isAtLimit = assignedUsers.length >= maxAssignedUsers;
  const isDisabled = isAssignToAll || !hasPermission;

  return (
    <div className={style.assignmentDialogBackdrop}>
      <div
        className={`${style.assignmentDialog} ${
          !hasPermission ? style.noAble : ""
        }`}
      >
        {/* Header */}
        <div className={style.dialogHeader}>
          <div className={style.headerContent}>
            <h2>{title}</h2>
            {hasPermission && (
              <p className={style.subtitle}>
                {isAssignToAll ? "All users are assigned" : subtitle}
              </p>
            )}
          </div>
          <button className={style.closeBtn} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={style.dialogBody}>
          {usersError && (
            <div className={style.errorBanner}>
              <AlertCircle size={16} />
              <span>{usersError}</span>
            </div>
          )}

          {loadingUsers ? (
            <div className={style.loadingState}>
              <Loader2 className={style.loader} />
              <p>Loading team members...</p>
            </div>
          ) : (
            <div className={style.assignmentContainer}>
              {/* Available Users - Left */}
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
                        disabled={isSaving}
                        className={`${style.toggleBtn} ${
                          isAssignToAll ? style.active : ""
                        }`}
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

                  {/* Cache Status */}
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
                      disabled={refreshingUsers || isSaving}
                      title="Refresh user list"
                    >
                      <RefreshCw
                        size={14}
                        className={refreshingUsers ? style.spinning : ""}
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
                  className={`${style.usersList} ${
                    isDisabled ? style.disabled : ""
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, "available")}
                >
                  {filteredAvailableUsers.map((user) => (
                    <div
                      key={user.id}
                      style={{ cursor: isDisabled ? "default" : "grab" }}
                      className={`${style.userCard} ${style.available} ${
                        isDisabled ? style.disabled : ""
                      }`}
                      draggable={!isDisabled}
                      onDragStart={(e) => handleDragStart(e, user, "available")}
                    >
                      <Avatar
                        src={getProfileUrl(user.id)}
                        alt={user.name}
                        size={32}
                        fallbackText={user.name}
                      />
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

              {/* Divider */}
              <div className={style.divider}></div>

              {/* Assigned Users - Right */}
              <div
                className={`${style.userSection} ${style.assignedSection} ${
                  isDisabled ? style.disabled : ""
                }`}
              >
                <div className={style.sectionHeader}>
                  <div className={style.sectionTitle}>
                    <UserPlus size={16} />
                    <h3>Assigned Members</h3>
                    <span className={style.count}>
                      {isAssignToAll
                        ? "(All)"
                        : `(${assignedUsers.length}/${maxAssignedUsers})`}
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
                    <span>
                      Maximum {maxAssignedUsers} members can be assigned
                    </span>
                  </div>
                )}

                {isAssignToAll ? (
                  <div className={style.allUsersState}>
                    <Users size={48} />
                    <h4>All Users Assigned</h4>
                    <p>Every team member is assigned</p>
                  </div>
                ) : (
                  <div
                    className={style.usersList}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, "assigned")}
                  >
                    {filteredAssignedUsers.map((user) => {
                      const isUserCreator = isCreator(user);

                      return (
                        <div
                          key={user.id}
                          style={{
                            cursor: isDisabled ? "default" : "grab",
                          }}
                          className={`${style.userCard} ${style.assigned} ${
                            isDisabled ? style.disabled : ""
                          }`}
                          draggable={!isDisabled}
                          onDragStart={(e) =>
                            handleDragStart(e, user, "assigned")
                          }
                        >
                          <Avatar
                            src={getProfileUrl(user.id)}
                            alt={user.name}
                            size={32}
                            fallbackText={user.name}
                          />
                          <div className={style.userInfo}>
                            <div className={style.userName}>
                              {user.name}
                              {isUserCreator && (
                                <span className={style.creatorBadge}>
                                  Creator
                                </span>
                              )}
                            </div>
                            <div className={style.userEmail}>{user.email}</div>
                          </div>
                        </div>
                      );
                    })}

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

        {/* Footer */}
        <div className={style.dialogFooter}>
          <div className={style.footerInfo}>
            {hasChanges() && hasPermission && (
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
            {hasPermission && (
              <button
                className={style.submitBtn}
                onClick={handleSave}
                disabled={!hasChanges() || isSaving}
              >
                {isSaving ? (
                  <>
                    <CircularProgress  color="grey" size={16} />
                    <span>Assigning...</span>
                  </>
                ) : (
                  <span>Assign Members</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentDialog;
