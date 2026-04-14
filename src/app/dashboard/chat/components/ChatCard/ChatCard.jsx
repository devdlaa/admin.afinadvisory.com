"use client";

import { ChevronDown, Trash2, CheckCheck, LogOut, User } from "lucide-react";

import Dropdown from "../Dropdown/Dropdown";
import styles from "./ChatCard.module.scss";

const ChatCard = ({
  chat,
  isActive,
  isSelectionMode,
  isSelected,
  onSelect,
  onAction,
  onClick,
}) => {
  const handleCardClick = (e) => {
    // Don't trigger if clicking on checkbox or dropdown
    if (
      e.target.closest('input[type="checkbox"]') ||
      e.target.closest('[class*="dropdown"]') ||
      e.target.closest('button[class*="chevron"]')
    ) {
      return;
    }
    onClick(chat.id);
  };

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    onSelect(chat.id);
  };

  const handleDropdownSelect = (action) => {
    onAction(action, chat.id);
  };

  const chatOptions = [
    { id: "markAsRead", label: "Mark as read", icon: "CheckCheck" },
    { id: "deleteChat", label: "Delete chat", icon: "Trash2" },
  ];

  const groupOptions = [
    { id: "markAsRead", label: "Mark as read", icon: "CheckCheck" },
    { id: "exitGroup", label: "Exit group", icon: "LogOut" },
  ];

  const options = chat.type === "group" ? groupOptions : chatOptions;

  return (
    <div
      className={`${styles.chatCard} ${isActive ? styles.active : ""} ${
        isSelected ? styles.selected : ""
      }`}
      onClick={handleCardClick}
    >
      {/* Checkbox */}
      {isSelectionMode && (
        <div className={styles.checkbox}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Avatar */}
      {!isSelectionMode && (
        <div className={styles.avatar}>
          {chat.avatar ? (
            <img src={chat.avatar} alt={chat.name} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              <User color="grey" />
            </div>
          )}
          {chat.isOnline && <div className={styles.onlineIndicator} />}
        </div>
      )}

      {/* Chat Info */}
      <div className={styles.chatInfo}>
        <div className={styles.chatHeader}>
          <h3 className={styles.chatName}>{chat.name}</h3>
          <span className={styles.timestamp}>{chat.timestamp}</span>
        </div>
        <div className={styles.chatFooter}>
          <div className={styles.messageArea}>
            <p className={styles.lastMessage}>{chat.message}</p>
          </div>
          <div className={styles.chat_meta_outer}>
            {chat.unreadCount > 0 && (
              <span className={styles.unreadBadge}>{chat.unreadCount}</span>
            )}
            {!isSelectionMode && (
              <div
                className={styles.hoverActions}
                onClick={(e) => e.stopPropagation()}
              >
                <Dropdown
                  options={options}
                  onSelect={handleDropdownSelect}
                  align="right"
                  trigger={
                    <button className={styles.chevronButton}>
                      <ChevronDown size={22} />
                    </button>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatCard;