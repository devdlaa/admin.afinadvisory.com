"use client";
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers } from "@/store/slices/userSlice";
import styles from "./UserMentionsDropdown.module.scss";
import { User } from "lucide-react";
import { CircularProgress } from "@mui/material";

const UserMentionsDropdown = ({
  inputRef,
  query = "",
  onSelect,
  onClose,
  taskId,
  task,
}) => {
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { users, loading } = useSelector((state) => state.user);

  // Fetch users on mount if not loaded
  useEffect(() => {
    if (users.length === 0 && !loading) {
      dispatch(fetchUsers({ limit: 100 }));
    }
  }, [dispatch, users.length, loading]);

  // Filter users based on task assignment
  const getEligibleUsers = () => {
    if (!users || users.length === 0) return [];

    if (!task) return users;

    if (task.assigned_to_all === true) {
      return users;
    }

    const assignedUserIds = Array.isArray(task.assignments)
      ? task.assignments.map((a) => a.admin_user_id).filter(Boolean)
      : [];

    const eligibleUserIds = new Set(assignedUserIds);

    if (task.created_by) {
      eligibleUserIds.add(task.created_by);
    }

    const eligibleUsers = users.filter((user) => {
      if (user.admin_role === "SUPER_ADMIN") return true;
      return eligibleUserIds.has(user.id);
    });

    if (eligibleUsers.length === 0) {
      console.warn("No eligible users found, showing all users");
      return users;
    }

    return eligibleUsers;
  };

  // Filter users by query
  const filteredUsers = getEligibleUsers()
    .filter((user) => {
      if (!query.trim()) return true;

      const q = query.toLowerCase();
      const name = (user.name || "").toLowerCase();
      const email = (user.email || "").toLowerCase();

      return name.includes(q) || email.includes(q);
    })
    .slice(0, 8);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (filteredUsers.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredUsers.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredUsers.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredUsers[selectedIndex]) {
            onSelect(filteredUsers[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredUsers, selectedIndex, onSelect, onClose]);

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef?.current &&
        !inputRef.current.contains(e.target)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, inputRef]);

  // Auto-scroll selected item
  useEffect(() => {
    const selected = dropdownRef.current?.querySelectorAll(
      `.${styles.userItem}`,
    )[selectedIndex];
    selected?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div ref={dropdownRef} className={styles.dropdown}>
        <div className={styles.loadingState}>
          <CircularProgress color="grey" size={16} />
          <span>Loading Users...</span>
        </div>
      </div>
    );
  }

  if (filteredUsers.length === 0) {
    return (
      <div ref={dropdownRef} className={styles.dropdown}>
        <div className={styles.emptyState}>
          <User size={24} />
          <p>No users available to mention</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={styles.dropdown}>
      {filteredUsers.map((user, index) => (
        <div
          key={user.id}
          className={`${styles.userItem} ${
            index === selectedIndex ? styles.selected : ""
          }`}
          onClick={() => onSelect(user)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className={styles.avatar}>
            {user.profile_image_url ? (
              <img src={user.profile_image_url} alt={user.name} />
            ) : (
              <span className={styles.initials}>{getInitials(user.name)}</span>
            )}
          </div>

          <div className={styles.userInfo}>
            <div className={styles.userName}>{user.name}</div>
            <div className={styles.userEmail}>{user.email}</div>
          </div>

          {user.status === "ACTIVE" && <div className={styles.activeDot} />}
        </div>
      ))}
    </div>
  );
};

export default UserMentionsDropdown;
