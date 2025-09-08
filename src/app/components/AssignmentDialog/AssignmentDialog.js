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
} from "lucide-react";
import "./AssignmentDialog.scss";
import { CircularProgress } from "@mui/material";

// Dummy data for available users
const dummyAvailableUsers = [
  {
    userCode: "U101",
    name: "Alice Johnson",
    email: "alice@example.com",
    avatar: "AJ",
  },
  {
    userCode: "U102",
    name: "Bob Smith",
    email: "bob@example.com",
    avatar: "BS",
  },
  {
    userCode: "U103",
    name: "Charlie Brown",
    email: "charlie@example.com",
    avatar: "CB",
  },
  {
    userCode: "U104",
    name: "Diana Prince",
    email: "diana@example.com",
    avatar: "DP",
  },
  {
    userCode: "U105",
    name: "Edward Norton",
    email: "edward@example.com",
    avatar: "EN",
  },
  {
    userCode: "U106",
    name: "Fiona Green",
    email: "fiona@example.com",
    avatar: "FG",
  },
  {
    userCode: "U107",
    name: "George Wilson",
    email: "george@example.com",
    avatar: "GW",
  },
  {
    userCode: "U108",
    name: "Helen Davis",
    email: "helen@example.com",
    avatar: "HD",
  },
];

// Dummy data for initially assigned users (from Redux)
const dummyAssignedUsers = [
  {
    userCode: "U001",
    name: "John Doe",
    email: "john@example.com",
    avatar: "JD",
  },
  {
    userCode: "U002",
    name: "Jane Smith",
    email: "jane@example.com",
    avatar: "JS",
  },
];

const AssignmentDialog = ({ isOpen, onClose }) => {
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

  const MAX_ASSIGNED_USERS = 10;

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

  // Simulate API calls
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // Simulate server fetch for available users
      setTimeout(() => {
        setAvailableUsers(dummyAvailableUsers);
        setAssignedUsers(dummyAssignedUsers);
        setIsAssignToAll(false);

        // Store original state for comparison
        setOriginalAssignedUsers([...dummyAssignedUsers]);
        setOriginalIsAssignToAll(false);

        setLoading(false);
      }, 800);
    }
  }, [isOpen]);

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
        pointor : 
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
        ">${user.avatar}</div>
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
      // Remove from assigned users - this should always work regardless of limit
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
    setSaving(true);

    const config = {
      assignedUsers: {
        isAssignToAll: isAssignToAll,
        dummyAssignedUsersArray: isAssignToAll ? [] : assignedUsers,
      },
    };

    // Mock API call
    setTimeout(() => {
      console.log("Assignment config updated:", config);

      // Update original state after successful save
      setOriginalAssignedUsers([...assignedUsers]);
      setOriginalIsAssignToAll(isAssignToAll);

      setSaving(false);
      onClose();
    }, 1500);
  };

  const handleClose = () => {
    setAvailableSearch("");
    setAssignedSearch("");
    onClose();
  };

  if (!isOpen) return null;

  const isAtLimit = assignedUsers.length >= MAX_ASSIGNED_USERS;
  const isDisabled = isAssignToAll;

  return (
    <div className="assignment-dialog-backdrop">
      <div className="assignment-dialog">
        <div className="dialog-header">
          <div className="header-content">
            <h2>Assign Team Members</h2>
            <p className="subtitle">
              {isAssignToAll
                ? "All users are assigned to this task"
                : "Drag and drop users to manage team assignments"}
            </p>
          </div>
          <button className="close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className="dialog-body">
          {loading ? (
            <div className="loading-state">
              <Loader2 className="loader" />
              <p>Loading team members...</p>
            </div>
          ) : (
            <div className="assignment-container">
              {/* Available Users - Left Side */}
              <div className={`user-section available-section`}>
                <div className="section-header">
                  <div className="header_inner">
                    <div className="section-title">
                      <Users size={16} />
                      <h3>Available Members</h3>
                      <span className="count">
                        ({filteredAvailableUsers.length})
                      </span>
                    </div>

                    <div className="assign-all-toggle">
                      <button
                        disabled={saving}
                        className={`toggle-btn ${!saving && "active"}`}
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
                  <div className="search-wrapper">
                    <Search size={14} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search available..."
                      value={availableSearch}
                      onChange={(e) => setAvailableSearch(e.target.value)}
                      className="search-input"
                      disabled={isDisabled}
                    />
                  </div>
                </div>

                <div
                  className={`users-list ${isDisabled ? "disabled" : ""}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, "available")}
                >
                  {filteredAvailableUsers.map((user) => (
                    <div
                      style={{
                        cursor: "grab",
                      }}
                      key={user.userCode}
                      className={`user-card available ${
                        isDisabled ? "disabled" : ""
                      }`}
                      draggable={!isDisabled}
                      onDragStart={(e) => handleDragStart(e, user, "available")}
                    >
                      <div className="user-avatar">{user.avatar}</div>
                      <div className="user-info">
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    
                    </div>
                  ))}

                  {filteredAvailableUsers.length === 0 && (
                    <div className="empty-state">
                      <Users size={24} />
                      <p>No available members found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="divider"></div>

              {/* Assigned Users - Right Side */}
              <div
                className={`user-section assigned-section ${
                  isDisabled ? "disabled" : ""
                }`}
              >
                <div className="section-header">
                  <div className="section-title">
                    <UserPlus size={16} />
                    <h3>Assigned Members</h3>
                    <span className="count">
                      {isAssignToAll
                        ? "(All)"
                        : `(${assignedUsers.length}/${MAX_ASSIGNED_USERS})`}
                    </span>
                  </div>

                  {!isAssignToAll && (
                    <div className="search-wrapper">
                      <Search size={14} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search assigned..."
                        value={assignedSearch}
                        onChange={(e) => setAssignedSearch(e.target.value)}
                        className="search-input"
                        disabled={isDisabled}
                      />
                    </div>
                  )}
                </div>

                {isAtLimit && !isAssignToAll && (
                  <div className="limit-warning">
                    <AlertCircle size={14} />
                    <span>Maximum 10 members can be assigned</span>
                  </div>
                )}

                {isAssignToAll ? (
                  <div className="all-users-state">
                    <Users size={48} />
                    <h4>All Users Assigned</h4>
                    <p>Every team member is assigned to this task</p>
                  </div>
                ) : (
                  <div
                    className={`users-list`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, "assigned")}
                  >
                    {filteredAssignedUsers.map((user) => (
                      <div
                        style={{
                          cursor: "grab",
                        }}
                        key={user.userCode}
                        className={`user-card assigned ${
                          isDisabled ? "disabled" : ""
                        }`}
                        draggable={!isDisabled}
                        onDragStart={(e) =>
                          handleDragStart(e, user, "assigned")
                        }
                      >
                        <div className="user-avatar assigned">
                          {user.avatar}
                        </div>
                        <div className="user-info">
                          <div className="user-name">{user.name}</div>
                          <div className="user-email">{user.email}</div>
                        </div>
                    
                      </div>
                    ))}

                    {filteredAssignedUsers.length === 0 && (
                      <div className="empty-state">
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

        <div className="dialog-footer">
          <div className="footer-info">
            {hasChanges && (
              <span>
                {isAssignToAll
                  ? "All members will be assigned"
                  : `${assignedUsers.length} member(s) will be assigned`}
              </span>
            )}
          </div>
          <div className="footer-actions">
            <button className="cancel-btn" onClick={handleClose}>
              Cancel
            </button>
            <button
              className="submit-btn"
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
