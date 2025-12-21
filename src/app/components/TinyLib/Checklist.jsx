import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import ActionButton from "./ActionButton";
import styles from "./Checklist.module.scss";

const Checklist = ({ initialItems = [] }) => {
  const [items, setItems] = useState(initialItems);
  const [newItemText, setNewItemText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const completedCount = items.filter((item) => item.isCompleted).length;
  const totalCount = items.length;

  const handleAddItem = () => {
    if (newItemText.trim()) {
      const newItem = {
        id: Date.now().toString(),
        text: newItemText.trim(),
        isCompleted: false,
        timestamp: Date.now(),
      };
      setItems([...items, newItem]);
      setNewItemText("");
      setIsAdding(false);
    }
  };

  const handleToggleComplete = (id) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
      )
    );
  };

  const handleDeleteItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleKeyPressNew = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddItem();
    } else if (e.key === "Escape") {
      setNewItemText("");
      setIsAdding(false);
    }
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const handleUpdateItem = (id) => {
    if (editText.trim()) {
      setItems(
        items.map((item) =>
          item.id === id ? { ...item, text: editText.trim() } : item
        )
      );
    }
    setEditingId(null);
    setEditText("");
  };

  const autoResizeTextarea = (element) => {
    if (!element) return;
    element.style.height = "auto";
    element.style.height = element.scrollHeight + "px";
  };

  const handleKeyPressEdit = (e, id) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleUpdateItem(id);
    } else if (e.key === "Escape") {
      setEditingId(null);
      setEditText("");
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === dropIndex) {
      setDraggedItem(null);
      setDragOverIndex(null);
      return;
    }

    const newItems = [...items];
    const draggedItemData = newItems[draggedItem];
    newItems.splice(draggedItem, 1);
    newItems.splice(dropIndex, 0, draggedItemData);

    setItems(newItems);
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  return (
    <div className={styles.checklistContainer}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.counter}>
            <div className={styles.progressCircle}>
              <svg className={styles.circleSvg} viewBox="0 0 36 36">
                <path
                  className={styles.circleBg}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={styles.circleProgress}
                  strokeDasharray={`${
                    totalCount > 0 ? (completedCount / totalCount) * 100 : 0
                  }, 100`}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className={styles.counterText}>
                {completedCount}/{totalCount}
              </span>
            </div>
          </div>
          <h3 className={styles.title}>Checklist / Sub Tasks</h3>
        </div>
        <ActionButton
          text="Add More"
          icon={Plus}
          onClick={() => setIsAdding(true)}
          variant="light"
          size="small"
        />
      </div>

      {items?.length <= 0 && !isAdding ? (
        <div className={styles.empty_state}>
          No Checkist Items, Add to continue
        </div>
      ) : (
        <div className={styles.itemsList}>
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`${styles.checklistItem} ${
                item.isCompleted ? styles.completed : ""
              } ${dragOverIndex === index ? styles.dragOver : ""} ${
                draggedItem === index ? styles.dragging : ""
              }`}
              draggable={editingId !== item.id}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className={styles.dragHandle}>
                <GripVertical size={18} />
              </div>

              <div className={styles.itemContent}>
                <button
                  type="button"
                  className={styles.checkbox}
                  onClick={() => handleToggleComplete(item.id)}
                  aria-label={
                    item.isCompleted ? "Mark as incomplete" : "Mark as complete"
                  }
                >
                  <div className={styles.checkboxIcon}>
                    {item.isCompleted && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </button>

                {editingId === item.id ? (
                  <textarea
                    className={styles.editItemInput}
                    value={editText}
                    onChange={(e) => {
                      setEditText(e.target.value);
                      autoResizeTextarea(e.target);
                    }}
                    onKeyDown={(e) => handleKeyPressEdit(e, item.id)}
                    onBlur={() => handleUpdateItem(item.id)}
                    ref={(el) => {
                      if (el) {
                        autoResizeTextarea(el);
                      }
                    }}
                    autoFocus
                    rows={1}
                  />
                ) : (
                  <div
                    className={styles.itemText}
                    onClick={() => startEditing(item)}
                  >
                    {item.text}
                  </div>
                )}
              </div>

              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => handleDeleteItem(item.id)}
                aria-label="Delete item"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {isAdding && (
            <div className={styles.checklistItem}>
              <div className={styles.dragHandlePlaceholder} />
              <div className={styles.itemContent}>
                <div className={styles.checkboxPlaceholder} />
                <textarea
                  className={styles.newItemInput}
                  value={newItemText}
                  onChange={(e) => {
                    setNewItemText(e.target.value);
                    autoResizeTextarea(e.target);
                  }}
                  onKeyDown={handleKeyPressNew}
                  onBlur={() => {
                    if (newItemText.trim()) {
                      handleAddItem();
                    } else {
                      setIsAdding(false);
                    }
                  }}
                  ref={(el) => {
                    if (el) {
                      autoResizeTextarea(el);
                    }
                  }}
                  placeholder="Enter checklist item..."
                  autoFocus
                  rows={1}
                />
              </div>
            </div>
          )}
          {items?.length >= 6 && (
            <ActionButton
              text="Add More"
              icon={Plus}
              onClick={() => setIsAdding(true)}
              variant="light"
              size="small"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Checklist;
