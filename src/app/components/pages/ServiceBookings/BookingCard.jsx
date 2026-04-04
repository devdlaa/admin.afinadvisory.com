import React from "react";
import {
  Phone,
  Mail,
  Calendar,
  UserPlus,
  AlertOctagon,
  CircleCheck,
} from "lucide-react";
;
import { formatDate } from "@/utils/shared/shared_util";
import { truncateText } from "@/utils/client/cutils";
import { statusConfig }   from "@/constants/bookings";
import "./BookingCard.scss";

const StatusBadge = React.memo(({ status }) => {
  const config = statusConfig[status];
  if (!config) return null;

  return (
    <div className={`status-badge ${config.color}`}>
      <span>
        {config.icon}
        {config.label}
      </span>
    </div>
  );
});

const TeamSection = React.memo(({ booking, onAssignTeam }) => {
  if (booking.progress_steps.isFulfilled) {
    return (
      <div className="team-section">
        <button className="assign-btn" disabled>
          <UserPlus size={16} />
          <span>Completed Already</span>
        </button>
      </div>
    );
  }

  const { assignmentManagement } = booking;

  if (!assignmentManagement) {
    return (
      <div className="team-section">
        <button className="assign-btn" onClick={() => onAssignTeam?.(booking)}>
          <UserPlus size={16} />
          <span>Assign Booking</span>
        </button>
      </div>
    );
  }

  if (assignmentManagement.assignToAll) {
    return (
      <div className="team-section">
        <button
          className="assign-all assign-btn"
          onClick={() => onAssignTeam?.(booking)}
        >
          <CircleCheck size={16} />
          <span>Assigned to All</span>
        </button>
      </div>
    );
  }

  if (assignmentManagement.members?.length > 0) {
    return (
      <div className="team-section">
        <div className="team-avatars" onClick={() => onAssignTeam?.(booking)}>
          {assignmentManagement.members.slice(0, 3).map((member, idx) => {
            const initials = member.name
              ? member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "?";

            return (
              <div
                key={idx}
                className="avatar initials"
                title={member.name}
                style={{ zIndex: 10 - idx }}
              >
                {initials}
              </div>
            );
          })}

          {assignmentManagement.members.length > 3 && (
            <div className="avatar avatar-more">
              +{assignmentManagement.members.length - 3}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="team-section">
      <button className="assign-btn" onClick={() => onAssignTeam?.(booking)}>
        <UserPlus size={16} />
        <span>Assign Booking</span>
      </button>
    </div>
  );
});

const BookingCard = React.memo(
  ({ booking, actions, onAssignTeam }) => {
    const hasNotification =
      booking?.assignmentManagement?.members?.length <= 0 &&
      !booking?.assignmentManagement?.assignToAll &&
      booking.master_status !== "completed";

    return (
      <div
        className={`booking-card ${hasNotification ? "has-notification" : ""} status-${
          booking.master_status
        }`}
      >
        {hasNotification && (
          <div className="notification-banner">
            <AlertOctagon size={16} />
            <span>No Team Member is Assigned to this Booking Yet!</span>
          </div>
        )}

        <div className="card-content">
          {/* Company Info */}
          <div className="company-section">
            <h3 className="company-name">
              {truncateText(booking.service_details.service_name, 40)}
            </h3>
            <span className="booking-id">
              {booking.service_booking_id.toUpperCase()}
            </span>
          </div>

          {/* Customer Info */}
          <div className="customer-section">
            <h4 className="customer-name">
              {booking.user_details.firstName} {booking.user_details.lastName}
            </h4>
            <div className="customer-contact">
              <Phone size={14} />
              <span>{booking.user_details.phone}</span>
            </div>
            <div className="customer-contact">
              <Mail size={14} />
              <span>{booking.user_details.email}</span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="status-section">
            <StatusBadge status={booking.master_status} />
          </div>

          {/* Plan Badge */}
          <div className="plan-section">
            <span className="plan-badge">{booking.plan_details.plan_name}</span>
            <div className="date-section">
              <Calendar size={14} />
              <span>{formatDate(booking.created_at)}</span>
            </div>
          </div>

          {/* Team Section */}
          <TeamSection booking={booking} onAssignTeam={onAssignTeam} />

          {/* Actions */}
          <div className="actions-section">
            {actions.map((action, idx) => (
              <button
                key={idx}
                className="action-btn"
                onClick={() => action.onClick(booking)}
              >
                <action.icon size={16} />
                <span>{action.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.booking.id === nextProps.booking.id &&
      prevProps.booking.master_status === nextProps.booking.master_status &&
      prevProps.booking.assignmentManagement ===
        nextProps.booking.assignmentManagement &&
      prevProps.actions.length === nextProps.actions.length
    );
  }
);

export default BookingCard;