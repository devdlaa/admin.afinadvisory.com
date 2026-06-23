import React from "react";
import { CircleCheckBig, Users2Icon, Plus } from "lucide-react";
import Avatar from "@/app/components/shared/newui/Avatar/Avatar";
import { getProfileUrl } from "@/utils/shared/shared_util";

const AssignmentInfoCard = ({ task, onOpenAssignmentDialog }) => {
  const assignments = task.assignments || [];

  return (
    <div className="task-drawer__assignment-card">
      <div className="task-drawer__assignment-header">
        <h4 className="task-drawer__info-title">Assigned To & When</h4>

        {task.assigned_to_all ? (
          <span className="task-drawer__assignment-pill all">
            <CircleCheckBig size={14} /> Assigned to Everyone
          </span>
        ) : assignments.length > 0 ? (
          <span className="task-drawer__assignment-pill">
            <Users2Icon size={14} /> {assignments.length} Member
            {assignments.length !== 1 ? "s" : ""}
          </span>
        ) : (
          <span className="task-drawer__assignment-pill unassigned">
            <Users2Icon size={14} /> Not Assigned
          </span>
        )}
      </div>

      {/* Compact avatar stack row */}
      <div className="task-drawer__avatar-row" style={{ marginTop: 14 }}>
        {!task.assigned_to_all &&
          assignments.map((assignment) => (
            <div
              key={assignment.id}
              title={`${assignment.assignee.name}\n${assignment.assignee.email}`}
            >
              <Avatar
                src={getProfileUrl(assignment.assignee.id)}
                alt={assignment.assignee.name}
                size={44}
                fallbackText={assignment.assignee.name}
              />
            </div>
          ))}

        {/* + button */}
        <button
          className="task-drawer__add-avatar"
          onClick={onOpenAssignmentDialog}
          title={assignments.length > 0 ? "Manage assignees" : "Assign someone"}
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
};

export default AssignmentInfoCard;
