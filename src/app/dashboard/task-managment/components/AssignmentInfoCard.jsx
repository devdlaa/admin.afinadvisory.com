import React from "react";
import { CircleCheckBig, Users2Icon, Plus } from "lucide-react";
import Avatar from "@/app/components/shared/newui/Avatar/Avatar";
import { getProfileUrl } from "@/utils/shared/shared_util";

const AssignmentInfoCard = ({ task, onOpenAssignmentDialog }) => {
  return (
    <div className="task-drawer__assignment-card">
      <div className="task-drawer__assignment-header">
        <h4 className="task-drawer__info-title">Assigned To & When</h4>

        {task.assigned_to_all ? (
          <span className="task-drawer__assignment-pill all">
            <CircleCheckBig size={14} /> Assigned to Everyone
          </span>
        ) : task.assignments?.length > 0 ? (
          <span className="task-drawer__assignment-pill">
            <Users2Icon size={14} /> {task.assignments.length} Member
            {task.assignments.length !== 1 ? "s" : ""}
          </span>
        ) : (
          <span className="task-drawer__assignment-pill unassigned">
            <Users2Icon size={14} /> Not Assigned
          </span>
        )}
      </div>

      {/* Assignee List */}
      <div className="task-drawer__assignee-list">
        {!task.assigned_to_all &&
          task.assignments?.map((assignment) => (
            <div key={assignment.id} className="task-drawer__assignee-row">
              <Avatar
                src={getProfileUrl(assignment.assignee.id)}
                alt={assignment.assignee.name}
                size={36}
                fallbackText={assignment.assignee.name}
              />
              <div className="task-drawer__assignee-info">
                <span className="task-drawer__assignee-name">
                  {assignment.assignee.name}
                </span>
                <span className="task-drawer__assignee-email">
                  {assignment.assignee.email}
                </span>
              </div>
            </div>
          ))}

        {/* Add / Manage button */}
        <button
          className="task-drawer__assignee-add"
          onClick={onOpenAssignmentDialog}
          title="Manage assignments"
        >
          <span className="task-drawer__assignee-add-icon">
            <Plus size={16} />
          </span>
          <span className="task-drawer__assignee-add-label">
            {task.assignments?.length > 0 ? "Manage assignees" : "Assign someone"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default AssignmentInfoCard;