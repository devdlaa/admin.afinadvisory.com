import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./CustomDatePicker.module.scss";

const CustomDatePicker = ({
  label = "Date",
  selectedDate = null,
  onDateSelect = () => {},
  minDate = null,
  maxDate = null,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && pickerRef.current) {
      const rect = pickerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If not enough space below, position above
      if (spaceBelow < 400 && spaceAbove > spaceBelow) {
        setPopupPosition({
          top: rect.top - 380, // Calendar height + gap
          left: rect.left,
        });
      } else {
        setPopupPosition({
          top: rect.bottom + 8,
          left: rect.left,
        });
      }
    }
  }, [isOpen]);

  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleString("en-US", { month: "long" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } =
    getDaysInMonth(currentMonth);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day) => {
    const selected = new Date(year, month, day);
    onDateSelect(selected);
    setIsOpen(false);
  };

  const isDateSelected = (day) => {
    if (!selectedDate) return false;
    const selected = new Date(selectedDate);
    return (
      selected.getDate() === day &&
      selected.getMonth() === month &&
      selected.getFullYear() === year
    );
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(
      <div key={`empty-${i}`} className={`${styles.calendarDay} ${styles.empty}`} />
    );
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayClasses = [
      styles.calendarDay,
      isDateSelected(day) ? styles.selected : "",
      isToday(day) ? styles.today : "",
    ]
      .filter(Boolean)
      .join(" ");

    calendarDays.push(
      <button
        key={day}
        type="button"
        className={dayClasses}
        onClick={() => handleDateClick(day)}
      >
        {day}
      </button>
    );
  }

  const monthYear = currentMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className={styles.datePickerContainer} ref={pickerRef}>
      <button
        type="button"
        className={`${styles.dateInput} ${disabled ? styles.disabled : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className={styles.dateIcon}>
          <Calendar size={20} />
        </div>
        <div className={styles.dateContent}>
          <span className={styles.dateLabel}>{label}</span>
          <span
            className={`${styles.dateValue} ${
              !selectedDate ? styles.placeholder : ""
            }`}
          >
            {selectedDate ? formatDate(selectedDate) : "Select date"}
          </span>
        </div>
      </button>

      {isOpen && (
        <div 
          className={styles.calendarPopup}
          style={{
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
          }}
        >
          <div className={styles.calendarHeader}>
            <span className={styles.calendarMonth}>{monthYear}</span>
            <div className={styles.calendarNav}>
              <button
                type="button"
                className={styles.navButton}
                onClick={handlePrevMonth}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className={styles.navButton}
                onClick={handleNextMonth}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className={styles.calendarWeekdays}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div key={day} className={styles.weekday}>
                {day}
              </div>
            ))}
          </div>

          <div className={styles.calendarDays}>{calendarDays}</div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;