"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  MoreVertical,
  X,
  MessagesSquare,
  Mail,
  Users,
  SearchX,
  MailCheck,
} from "lucide-react";

import ChatCard from "../ChatCard/ChatCard";
import Dropdown from "../Dropdown/Dropdown";
import styles from "./ChatSidebar.module.scss";

const DUMMY_CHATS = [
  {
    id: "1",
    name: "Sahil Joshi",
    message: "What happens when it falls? and did you even look wit...",
    timestamp: "Today",
    unreadCount: 10,
    avatar: null,
    type: "chat",
    isOnline: false,
  },
  {
    id: "2",
    name: "Afinthrive Advisory Accounts",
    message: "Nilesh Varma: I have Processed All the Pending Pay...",
    timestamp: "Today",
    unreadCount: 0,
    avatar: null,
    type: "group",
    isActive: true,
    isOnline: false,
  },
  {
    id: "3",
    name: "Afinthrive website development",
    message: "Dinesh Sir: Working 👍",
    timestamp: "Yesterday",
    unreadCount: 0,
    avatar: null,
    type: "group",
    isOnline: false,
  },
  {
    id: "4",
    name: "Task manager issues",
    message: "~Afinthrive Advisory Private Limited reacted 👍 to: add...",
    timestamp: "Yesterday",
    unreadCount: 0,
    avatar: null,
    type: "group",
    isOnline: false,
  },
  {
    id: "5",
    name: "Bank of Baroda",
    message: "Skip the branch visit! 🏦 Experience the ease of bob World -...",
    timestamp: "Tuesday",
    unreadCount: 0,
    avatar: null,
    type: "chat",
    isOnline: false,
  },
  {
    id: "6",
    name: "WorkIndia",
    message: "Subject: Account Update Hi Sahil Josahi, There is an update...",
    timestamp: "Monday",
    unreadCount: 0,
    avatar: null,
    type: "chat",
    isOnline: false,
  },
  {
    id: "7",
    name: "Papa",
    message: "Papa uses a default timer for disappearing messages in ne...",
    timestamp: "Monday",
    unreadCount: 0,
    avatar: null,
    type: "chat",
    isOnline: false,
  },
];

const ChatSidebar = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState([]);
  const [activeChat, setActiveChat] = useState("2");

  const filteredChats = DUMMY_CHATS.filter((chat) => {
    const matchesSearch =
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.message.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    if (activeTab === "unread") return matchesSearch && chat.unreadCount > 0;
    if (activeTab === "groups") return matchesSearch && chat.type === "group";

    return matchesSearch;
  });

  const handleSelectChat = (chatId) => {
    if (!isSelectionMode) return;

    setSelectedChats((prev) =>
      prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId],
    );
  };

  const handleChatAction = (action, chatId) => {
    console.log(`Action: ${action} on chat: ${chatId}`);
  };

  const handleMainDropdownAction = (action) => {
    if (action === "selectChats") {
      setIsSelectionMode(true);
    } else if (action === "markAllRead") {
      console.log("Mark all as read");
    } else if (action === "lockApp") {
      console.log("Lock app");
    }
  };

  const handleBulkAction = (action) => {
    console.log(`Bulk action: ${action} on chats:`, selectedChats);
    
    // Clear selection after bulk action if needed
    if (action === "clearSelectedChats") {
      setSelectedChats([]);
      setIsSelectionMode(false);
    }
  };

  const mainDropdownOptions = [
    { id: "selectChats", label: "Select chats", icon: "CheckSquare" },
    { id: "markAllRead", label: "Mark all as read", icon: "CheckCheck" },
    { id: "lockApp", label: "Lock app", icon: "Lock" },
  ];

  const bulkActionOptions = [
    { id: "markAsUnread", label: "Mark as unread", icon: "Mail" },
    { id: "muteNotifications", label: "Mute notifications", icon: "BellOff" },
    { id: "clearSelectedChats", label: "Clear selected chats", icon: "Trash2" },
  ];

  const handleChatClick = (chatId) => {
    if (isSelectionMode) {
      handleSelectChat(chatId);
    } else {
      setActiveChat(chatId);
      console.log("Open chat:", chatId);
    }
  };

  return (
    <div className={styles.sidebar}>
      {/* Header */}
      <div className={styles.header}>
        {isSelectionMode ? (
          <div className={styles.selectionHeader}>
            <button
              className={styles.closeButton}
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedChats([]);
              }}
            >
              <X size={24} />
            </button>
            <span className={styles.selectionCount}>
              {selectedChats.length} selected
            </span>
            {selectedChats.length > 0 && (
              <div className={styles.bulkActionsWrapper}>
                <Dropdown
                  options={bulkActionOptions}
                  onSelect={handleBulkAction}
                  align="right"
                  trigger={
                    <button className={styles.moreButton}>
                      <MoreVertical size={20} />
                    </button>
                  }
                />
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={styles.logo}>
              <span className={styles.logoText}>Afin</span>
              <span className={styles.logoTextAccent}>Chat</span>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.addGroupButton}>
                <Plus size={18} />
                <span>Add Group</span>
              </button>
              <Dropdown
                options={mainDropdownOptions}
                onSelect={handleMainDropdownAction}
                align="right"
                trigger={
                  <button className={styles.moreButton}>
                    <MoreVertical size={20} />
                  </button>
                }
              />
            </div>
          </>
        )}
      </div>

      {/* Search and Tabs */}
      {!isSelectionMode && (
        <div className={styles.searchSection}>
          <div className={styles.searchBox}>
            <Search size={20} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search Chats or Groups"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === "all" ? styles.active : ""}`}
              onClick={() => setActiveTab("all")}
            >
              <MessagesSquare size={16} />
              <span>All</span>
            </button>

            <button
              className={`${styles.tab} ${activeTab === "unread" ? styles.active : ""}`}
              onClick={() => setActiveTab("unread")}
            >
              <Mail size={16} />
              <span>Unread</span>
            </button>

            <button
              className={`${styles.tab} ${activeTab === "groups" ? styles.active : ""}`}
              onClick={() => setActiveTab("groups")}
            >
              <Users size={16} />
              <span>Groups</span>
            </button>
          </div>
        </div>
      )}

      {/* Chat List */}
      <div className={styles.chatList}>
        {filteredChats.length === 0 ? (
          <div className={styles.emptyState}>
            {searchQuery ? (
              <>
                <SearchX size={28} />
                <p className={styles.emptyStateText}>No chats found</p>
              </>
            ) : activeTab === "unread" ? (
              <>
                <MailCheck size={28} />
                <p className={styles.emptyStateText}>No unread chats</p>
              </>
            ) : (
              <>
                <MessagesSquare size={28} />
                <p className={styles.emptyStateText}>No chats yet</p>
              </>
            )}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <ChatCard
              key={chat.id}
              chat={chat}
              isActive={chat.id === activeChat}
              isSelectionMode={isSelectionMode}
              isSelected={selectedChats.includes(chat.id)}
              onSelect={handleSelectChat}
              onAction={handleChatAction}
              onClick={handleChatClick}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;