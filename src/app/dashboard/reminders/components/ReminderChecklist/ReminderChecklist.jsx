"use client";
import React, { useRef, useState } from "react";
import { GripVertical, Check, Trash2, ListChecks } from "lucide-react";

import { makeChecklistItem } from "../Reminderdialog/ReminderDialog.utils";

export default function ReminderChecklist({ checklist, onChange, styles }) {
  /* ── drag state ── */
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const dragNode = useRef(null);

 

  /* ── derived ── */
  const doneCount = checklist.filter((c) => c.is_done).length;
  const lastFilled =
    checklist.length === 0 ||
    checklist[checklist?.length - 1].text?.trim() !== "";

  /* ── ops ── */
  const toggle = (id) =>
    onChange(
      checklist.map((c) => (c.id === id ? { ...c, is_done: !c.is_done } : c)),
    );

  const rename = (id, val) =>
    onChange(checklist.map((c) => (c.id === id ? { ...c, title: val } : c)));

  const remove = (id) => onChange(checklist.filter((c) => c.id !== id));

  /* ── add on Enter ── */
  const addInputRef = useRef(null);
  const handleAddKey = (e) => {
    if (e.key !== "Enter") return;
    const val = e.target.value.trim();
    if (!val) return;
    onChange([...checklist, makeChecklistItem(val, checklist.length)]);
    e.target.value = "";
  };

  /* ── drag handlers ── */
  const makeDrag = (id) => ({
    draggable: true,
    onDragStart: (e) => {
      dragNode.current = id;
      setDragId(id);
      e.dataTransfer.effectAllowed = "move";
    },
    onDragEnter: (e) => {
      e.preventDefault();
      setOverId(id);
    },
    onDragOver: (e) => {
      e.preventDefault();
    },
    onDragLeave: () => {
      setOverId(null);
    },
    onDrop: (e) => {
      e.preventDefault();
      const from = dragNode.current;
      if (!from || from === id) {
        setDragId(null);
        setOverId(null);
        return;
      }
      const a = [...checklist];
      const fi = a.findIndex((c) => c.id === from);
      const ti = a.findIndex((c) => c.id === id);
      const [mv] = a.splice(fi, 1);
      a.splice(ti, 0, mv);
      onChange(a);
      setDragId(null);
      setOverId(null);
    },
    onDragEnd: () => {
      setDragId(null);
      setOverId(null);
    },
  });

  return (
    <>
      {/* ── Header ── */}
      <div className={styles.checklistHeader}>
        <div className={styles.checklistLabel}>
          <ListChecks size={20} className={styles.checklistLabelIcon} />
          <span>Notes / Checklist</span>
        </div>
        {checklist.length > 0 && (
          <span className={styles.checklistBadge}>
            {doneCount}/{checklist.length}
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div className={styles.checklistBody}>
        {checklist.map((item) => (
          <div
            key={item.id}
            className={`${styles.checkItem} ${overId === item.id && dragId !== item.id ? styles.checkItemOver : ""}`}
            {...makeDrag(item.id)}
          >
            <span className={styles.checkGrip}>
              <GripVertical size={15} />
            </span>

            <button
              className={`${styles.checkCircle} ${item.is_done ? styles.checkCircleDone : ""}`}
              onClick={() => toggle(item.id)}
              type="button"
            >
              {item.is_done && <Check size={11} strokeWidth={3.5} />}
            </button>

            <input
              className={`${styles.checkInput} ${item.is_done ? styles.checkInputDone : ""}`}
              value={item.title}
              onChange={(e) => rename(item.id, e.target.value)}
              placeholder="Checklist item…"
            />

            <button
              className={styles.checkDelete}
              onClick={(e) => {
                e.stopPropagation();
                remove(item.id);
              }}
              type="button"
              title="Remove item"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}

        {/* Add row */}
        <div
          className={`${styles.checkAddRow} ${!lastFilled ? styles.checkAddRowDisabled : ""}`}
        >
          <span className={styles.checkAddCircle} />
          <input
            ref={addInputRef}
            className={styles.checkAddInput}
            placeholder="Add a note for your reminder..."
            disabled={!lastFilled}
            onKeyDown={handleAddKey}
          />
        </div>
      </div>
    </>
  );
}
