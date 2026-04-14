"use client";

import React, { useRef, useEffect, useState } from "react";
import { Inbox, Tag, ChevronDown, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { getGreeting, getDateInfo } from "./reminderUtils.js";
import styles from "../reminderPage.module.scss";

function UserGreeting({ greeting, icon: Icon, color }) {
  const { data: session, status } = useSession();
  const firstName =
    session?.user?.name?.split(" ")[0] ||
    session?.user?.email?.split("@")[0] ||
    "there";
  const isLoading = status === "loading";

  return (
    <div className={styles.greetingRow}>
      <span
        className={styles.greetingIcon}
        style={{ background: `${color}1A` }}
      >
        <Icon size={16} strokeWidth={2} color={color} />
      </span>
      <span className={styles.greetingText}>
        <span className={styles.greetingWord}>{greeting}</span>
        {", "}
        {isLoading ? (
          <span className={styles.userNameSkeleton} />
        ) : (
          <span className={styles.userName}>{firstName}</span>
        )}
      </span>
    </div>
  );
}

function FilterDropdown({
  icon: Icon,
  label,
  options,
  selected,
  onChange,
  multiSelect = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(id) {
    if (multiSelect) {
      onChange(
        selected.includes(id)
          ? selected.filter((s) => s !== id)
          : [...selected, id],
      );
    } else {
      onChange(selected.includes(id) ? [] : [id]);
      setOpen(false);
    }
  }

  return (
    <div className={styles.dropdownWrapper} ref={ref}>
      <button
        className={`${styles.filterBtn} ${selected.length > 0 ? styles.active : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon />
        {label}
        {selected.length > 0 && (
          <span className={styles.filterBtnCount}>{selected.length}</span>
        )}
        <ChevronDown
          className={`${styles.dropdownChevron} ${open ? styles.open : ""}`}
        />
      </button>

      {open && (
        <div className={styles.dropdownPanel}>
          <div className={styles.dropdownSearch}>
            <input
              autoFocus
              placeholder={`Search ${label.toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.dropdownList}>
            {filtered.length === 0 ? (
              <div className={styles.dropdownEmpty}>No results</div>
            ) : (
              filtered.map((opt) => {
                const isSelected = selected.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    className={`${styles.dropdownItem} ${isSelected ? styles.selected : ""}`}
                    onClick={() => toggle(opt.id)}
                  >
                    <div
                      className={`${styles.dropdownCheckbox} ${isSelected ? styles.checked : ""}`}
                    >
                      {isSelected && <Check />}
                    </div>
                    {opt.label}
                  </div>
                );
              })
            )}
          </div>
          {selected.length > 0 && (
            <div className={styles.dropdownFooter}>
              <button
                onClick={() => {
                  onChange([]);
                  setOpen(false);
                }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const ReminderHeader = ({
  sentinelRef,
  headerRef,
  isStuck,
  bucketOptions,
  tagOptions,
  selectedBuckets,
  selectedTags,
  onBucketChange,
  onTagChange,
}) => {
  const greetingData = getGreeting();
  const { day, dayOfWeek, month } = getDateInfo();

  return (
    <>
      <div className={styles.hero}>
        <UserGreeting
          greeting={greetingData.greeting}
          icon={greetingData.icon}
          color={greetingData.color}
        />
        <p className={styles.subHeader}>
          Here are your reminders for today and some overdue.
        </p>
      </div>

      <div ref={sentinelRef} style={{ height: 1, marginTop: -1 }} />

      <div
        ref={headerRef}
        className={`${styles.headerBar} ${isStuck ? styles.stuck : ""}`}
      >
        <div className={styles.datePill}>
          <span className={styles.dateDay}>{day}</span>
          <span className={styles.dateMeta}>
            {dayOfWeek}, {month}
          </span>
        </div>
        <div className={styles.filterSection}>
          <span className={styles.filterLabel}>Filters</span>
          <div className={styles.filterGroup}>
            <FilterDropdown
              icon={Inbox}
              label="Bucket"
              options={bucketOptions}
              selected={selectedBuckets}
              onChange={onBucketChange}
              multiSelect={false}
            />
            <FilterDropdown
              icon={Tag}
              label="Tags"
              options={tagOptions}
              selected={selectedTags}
              onChange={onTagChange}
              multiSelect={true}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ReminderHeader;
