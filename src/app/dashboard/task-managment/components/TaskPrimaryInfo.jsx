import React from "react";
import { Clock } from "lucide-react";


import CustomDropdown from "@/app/components/shared/TinyLib/CustomDropdown";
import CustomDatePicker from "@/app/components/shared/TinyLib/CustomDatePicker";
import { statusOptions, priorityOptions } from "@/utils/shared/constants";

const TaskPrimaryInfo = ({
  primaryInfo,
  categories,
  overdueDays,
  isActivityTab,
  onPrimaryInfoChange,
}) => {
  return (
    <section
      className={`task_primary_info_section ${
        isActivityTab ? "task_primary_info_section_hidden" : ""
      }`}
    >
      {/* Title Section */}
      <div className="task-drawer__title-section">
        <label className="task-drawer__title-label">Task/Enquiry Title</label>
        <input
          type="text"
          value={primaryInfo.title}
          onChange={(e) => onPrimaryInfoChange("title", e.target.value)}
          placeholder="Enter task title..."
          className="task-title-input"
        />

        {/* Overdue Badge */}
        {overdueDays > 0 && (
          <div className="overdue-badge">
            <Clock size={18} />
            <span>
              Overdue by {overdueDays} day
              {overdueDays !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Description Section */}
      <textarea
        value={primaryInfo.description}
        onChange={(e) => onPrimaryInfoChange("description", e.target.value)}
        placeholder="Add task description..."
        className="task-drawer__desc-textarea"
        rows={4}
      />

      {/* Task Details Grid */}
      <div className="task-drawer__details-grid">
        <div className="task-drawer__detail-item">
          <CustomDropdown
            label="Priority"
            placeholder="Select Priority"
            options={priorityOptions.slice(1)}
            selectedValue={primaryInfo.priority}
            onSelect={(opt) => onPrimaryInfoChange("priority", opt.value)}
          />
        </div>

        <div className="task-drawer__detail-item">
          <CustomDropdown
            label="Category"
            placeholder="Select Category"
            options={categories.map((cat) => ({
              value: cat.id,
              label: cat.name,
            }))}
            selectedValue={primaryInfo.task_category_id}
            onSelect={(opt) =>
              onPrimaryInfoChange("task_category_id", opt.value)
            }
            enableSearch
          />
        </div>

        <div className="task-drawer__detail-item">
          <CustomDropdown
            label="Status"
            placeholder="Select Status"
            options={statusOptions}
            selectedValue={primaryInfo.status}
            onSelect={(opt) => onPrimaryInfoChange("status", opt.value)}
          />
        </div>

        <div className="task-drawer__detail-item">
          <CustomDatePicker
            label="Start Date"
            selectedDate={primaryInfo.start_date}
            onDateSelect={(date) => onPrimaryInfoChange("start_date", date)}
          />
        </div>

        <div className="task-drawer__detail-item">
          <CustomDatePicker
            label="Due Date"
            selectedDate={primaryInfo.due_date}
            onDateSelect={(date) => onPrimaryInfoChange("due_date", date)}
          />
        </div>

        {primaryInfo.end_date && (
          <div className="task-drawer__detail-item">
            <CustomDatePicker
              label="Date Of Completion"
              selectedDate={primaryInfo.end_date}
              disabled
              readonly
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default TaskPrimaryInfo;
