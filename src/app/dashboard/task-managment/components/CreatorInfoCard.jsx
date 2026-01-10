import React from "react";
import { Calendar } from "lucide-react";
import Avatar from "@/app/components/newui/Avatar/Avatar";
import { getProfileUrl } from "@/utils/shared/shared_util";

const CreatorInfoCard = ({ task }) => {
  return (
    <div className="task-drawer__creator-card">
      <h4 className="task-drawer__info-title">Created By & when</h4>

      <div className="task-drawer__creator-row">
        <Avatar
          src={getProfileUrl(task.creator?.id)}
          alt={task.creator?.name}
          size={44}
          fallbackText={task.creator?.name}
        />

        <div className="task-drawer__creator-meta">
          <div className="task-drawer__creator-top">
            <span className="task-drawer__creator-name">
              {task.creator?.name || "Unknown"}
            </span>

            <span className="task-drawer__creator-date">
              <Calendar size={14} />
              {new Date(task.created_at).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          <span className="task-drawer__creator-role-pill">
            {task.creator?.admin_role}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CreatorInfoCard;