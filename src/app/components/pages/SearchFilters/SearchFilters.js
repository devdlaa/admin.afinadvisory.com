"use client";

import React, { useState } from "react";
import { Calendar, Search, X } from "lucide-react";
import styles from "./SearchFilters.module.scss";

export default function SearchFilters({ onDateRangeSearch }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleDateRangeSearch = (e) => {
    e.preventDefault();
    if (startDate && endDate) {
      onDateRangeSearch(startDate, endDate);
    }
  };

  const clearDates = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className={styles.searchFilters}>
      <div className={styles.filterSection}>
        <h4 className={styles.sectionTitle}>Date Range Filter</h4>
        <form onSubmit={handleDateRangeSearch} className={styles.dateRangeForm}>
          <div className={styles.dateInputs}>
            <div className={styles.dateInputWrapper}>
              <label className={styles.label}>Start Date</label>
              <div className={styles.inputWithIcon}>
                <Calendar size={16} className={styles.dateIcon} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={styles.dateInput}
                />
              </div>
            </div>

            <div className={styles.dateInputWrapper}>
              <label className={styles.label}>End Date</label>
              <div className={styles.inputWithIcon}>
                <Calendar size={16} className={styles.dateIcon} />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={styles.dateInput}
                  min={startDate}
                />
              </div>
            </div>
          </div>

          <div className={styles.dateActions}>
            <button
              type="button"
              onClick={clearDates}
              className={styles.clearBtn}
              disabled={!startDate && !endDate}
            >
              <X size={16} />
              <span>Clear</span>
            </button>
            <button
              type="submit"
              className={styles.searchBtn}
              disabled={!startDate || !endDate}
            >
              <Search size={16} />
              <span>Search</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}