import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import styles from "./CustomDatePicker.module.scss";

const CustomDatePicker = ({
  label = "Date",
  selectedDate = null,
  onDateSelect = () => {},
  minDate = null,
  maxDate = null,
  required = false,
  disabled = false,
  mode = "date", // "date", "year", "month", "time"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentDecade, setCurrentDecade] = useState(
    Math.floor(new Date().getFullYear() / 10) * 10
  );
  const [selectedTime, setSelectedTime] = useState({
    hours: 12,
    minutes: 0,
    period: "AM",
  });
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const pickerRef = useRef(null);

  useEffect(() => {
    if (selectedDate && mode === "time") {
      const date = new Date(selectedDate);
      let hours = date.getHours();
      const period = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      setSelectedTime({
        hours,
        minutes: date.getMinutes(),
        period,
      });
    }
  }, [selectedDate, mode]);

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

      const popupHeight = mode === "time" ? 300 : 400;

      if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
        setPopupPosition({
          top: rect.top - popupHeight - 8,
          left: rect.left,
        });
      } else {
        setPopupPosition({
          top: rect.bottom + 8,
          left: rect.left,
        });
      }
    }
  }, [isOpen, mode]);

  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);

    switch (mode) {
      case "year":
        return d.getFullYear().toString();
      case "month":
        return d.toLocaleString("en-US", { month: "long", year: "numeric" });
      case "time":
        const hours = d.getHours();
        const minutes = d.getMinutes();
        const period = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes
          .toString()
          .padStart(2, "0")} ${period}`;
      default:
        const day = d.getDate();
        const month = d.toLocaleString("en-US", { month: "long" });
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
    }
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

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const handlePrevYear = () => {
    setCurrentYear(currentYear - 1);
  };

  const handleNextYear = () => {
    setCurrentYear(currentYear + 1);
  };

  const handlePrevDecade = () => {
    setCurrentDecade(currentDecade - 10);
  };

  const handleNextDecade = () => {
    setCurrentDecade(currentDecade + 10);
  };

  const handleDateClick = (day) => {
    const { year, month } = getDaysInMonth(currentMonth);
    const selected = new Date(year, month, day);
    onDateSelect(selected);
    setIsOpen(false);
  };

  const handleMonthClick = (monthIndex) => {
    const selected = new Date(currentYear, monthIndex, 1);
    onDateSelect(selected);
    setIsOpen(false);
  };

  const handleYearClick = (year) => {
    const selected = new Date(year, 0, 1);
    onDateSelect(selected);
    setIsOpen(false);
  };

  const handleTimeChange = (type, value) => {
    const newTime = { ...selectedTime, [type]: value };
    setSelectedTime(newTime);

    let hours = newTime.hours;
    if (newTime.period === "PM" && hours !== 12) hours += 12;
    if (newTime.period === "AM" && hours === 12) hours = 0;

    const date = new Date();
    date.setHours(hours, newTime.minutes, 0, 0);
    onDateSelect(date);
  };

  const isDateSelected = (day) => {
    if (!selectedDate) return false;
    const selected = new Date(selectedDate);
    const { year, month } = getDaysInMonth(currentMonth);
    return (
      selected.getDate() === day &&
      selected.getMonth() === month &&
      selected.getFullYear() === year
    );
  };

  const isMonthSelected = (monthIndex) => {
    if (!selectedDate) return false;
    const selected = new Date(selectedDate);
    return (
      selected.getMonth() === monthIndex &&
      selected.getFullYear() === currentYear
    );
  };

  const isYearSelected = (year) => {
    if (!selectedDate) return false;
    const selected = new Date(selectedDate);
    return selected.getFullYear() === year;
  };

  const isToday = (day) => {
    const today = new Date();
    const { year, month } = getDaysInMonth(currentMonth);
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const renderDatePicker = () => {
    const { daysInMonth, startingDayOfWeek, year, month } =
      getDaysInMonth(currentMonth);
    const calendarDays = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(
        <div
          key={`empty-${i}`}
          className={`${styles.calendarDay} ${styles.empty}`}
        />
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
      <>
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
      </>
    );
  };

  const renderMonthPicker = () => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return (
      <>
        <div className={styles.calendarHeader}>
          <span className={styles.calendarMonth}>{currentYear}</span>
          <div className={styles.calendarNav}>
            <button
              type="button"
              className={styles.navButton}
              onClick={handlePrevYear}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className={styles.navButton}
              onClick={handleNextYear}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className={styles.monthGrid}>
          {months.map((month, index) => (
            <button
              key={month}
              type="button"
              className={`${styles.monthItem} ${
                isMonthSelected(index) ? styles.selected : ""
              }`}
              onClick={() => handleMonthClick(index)}
            >
              {month.slice(0, 3)}
            </button>
          ))}
        </div>
      </>
    );
  };

  const renderYearPicker = () => {
    const years = [];
    for (let i = 0; i < 12; i++) {
      years.push(currentDecade + i);
    }

    return (
      <>
        <div className={styles.calendarHeader}>
          <span className={styles.calendarMonth}>
            {currentDecade} - {currentDecade + 11}
          </span>
          <div className={styles.calendarNav}>
            <button
              type="button"
              className={styles.navButton}
              onClick={handlePrevDecade}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className={styles.navButton}
              onClick={handleNextDecade}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className={styles.yearGrid}>
          {years.map((year) => (
            <button
              key={year}
              type="button"
              className={`${styles.yearItem} ${
                isYearSelected(year) ? styles.selected : ""
              }`}
              onClick={() => handleYearClick(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </>
    );
  };

  const renderTimePicker = () => {
    return (
      <>
        <div className={styles.calendarHeader}>
          <span className={styles.calendarMonth}>Select Time</span>
        </div>
        <div className={styles.timePicker}>
          <div className={styles.timeSection}>
            <label className={styles.timeLabel}>Hours</label>
            <div className={styles.timeScroll}>
              {[...Array(12)].map((_, i) => {
                const hour = i + 1;
                return (
                  <button
                    key={hour}
                    type="button"
                    className={`${styles.timeItem} ${
                      selectedTime.hours === hour ? styles.selected : ""
                    }`}
                    onClick={() => handleTimeChange("hours", hour)}
                  >
                    {hour.toString().padStart(2, "0")}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles.timeSection}>
            <label className={styles.timeLabel}>Minutes</label>
            <div className={styles.timeScroll}>
              {[...Array(60)].map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`${styles.timeItem} ${
                    selectedTime.minutes === i ? styles.selected : ""
                  }`}
                  onClick={() => handleTimeChange("minutes", i)}
                >
                  {i.toString().padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.timeSection}>
            <label className={styles.timeLabel}>Period</label>
            <div className={styles.timeScroll}>
              {["AM", "PM"].map((period) => (
                <button
                  key={period}
                  type="button"
                  className={`${styles.timeItem} ${
                    selectedTime.period === period ? styles.selected : ""
                  }`}
                  onClick={() => handleTimeChange("period", period)}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  };

  const getPlaceholder = () => {
    switch (mode) {
      case "year":
        return "Select year";
      case "month":
        return "Select month";
      case "time":
        return "Select time";
      default:
        return "Select Date";
    }
  };

  return (
    <div className={styles.datePickerContainer} ref={pickerRef}>
      <button
        type="button"
        className={`${styles.dateInput} ${disabled ? styles.disabled : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className={styles.dateIcon}>
          {mode === "time" ? <Clock size={20} /> : <Calendar size={20} />}
        </div>
        <div className={styles.dateContent}>
          <span
            className={`${styles.dateValue} ${
              !selectedDate ? styles.placeholder : ""
            }`}
          >
            <p
              style={{
                color: "grey",
                fontSize: "11px",
              }}
            >
              {label}
            </p>
            <p
              style={{
                fontSize: "11px",
              }}
            >
              {selectedDate ? formatDate(selectedDate) : getPlaceholder()}
            </p>
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
          {mode === "date" && renderDatePicker()}
          {mode === "month" && renderMonthPicker()}
          {mode === "year" && renderYearPicker()}
          {mode === "time" && renderTimePicker()}
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
