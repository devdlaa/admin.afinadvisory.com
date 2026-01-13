"use client";

import React, { useState } from "react";
import { Calendar, Search } from "lucide-react";
import "./SearchFilters.scss";

export default function SearchFilters ({ onDateRangeSearch }) {
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
    <div className="search-filters">
      <div className="filter-section">
        <h4>Date Range Filter</h4>
        <form onSubmit={handleDateRangeSearch} className="date-range-form">
          <div className="date-inputs">
            <div className="date-input-wrapper">
              <label>Start Date</label>
              <div className="input-with-icon">
                <Calendar size={16} className="date-icon" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                />
              </div>
            </div>

            <div className="date-input-wrapper">
              <label>End Date</label>
              <div className="input-with-icon">
                <Calendar size={16} className="date-icon" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                  min={startDate}
                />
              </div>
            </div>
          </div>

          <div className="date-actions">
            <button
              type="button"
              onClick={clearDates}
              className="clear-btn"
              disabled={!startDate && !endDate}
            >
              Clear
            </button>
            <button
              type="submit"
              className="search-btn"
              disabled={!startDate || !endDate}
            >
              <Search size={16} />
              Search
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
