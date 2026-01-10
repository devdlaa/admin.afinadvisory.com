import React from "react";
import { CircleCheckBig, Users2Icon, Plus } from "lucide-react";
import Avatar from "@/app/components/newui/Avatar/Avatar";
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

      {/* Avatar Row */}
      <div className="task-drawer__avatar-row">
        {!task.assigned_to_all && task.assignments?.length > 0 && (
          <>
            {task.assignments.slice(0, 5).map((assignment) => (
              <Avatar
                key={assignment.id}
                src={getProfileUrl(assignment.assignee.id)}
                alt={assignment.assignee.name}
                size={44}
                fallbackText={assignment.assignee.name}
              />
            ))}

            {task.assignments.length > 5 && (
              <div className="task-drawer__avatar-overflow">
                +{task.assignments.length - 5}
              </div>
            )}
          </>
        )}

        {/* Always show the plus button */}
        <button
          className="task-drawer__add-avatar"
          onClick={onOpenAssignmentDialog}
          title="Manage assignments"
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
};

export default AssignmentInfoCard;
