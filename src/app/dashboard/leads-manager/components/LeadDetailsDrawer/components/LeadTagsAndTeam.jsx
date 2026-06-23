import React from "react";
import { Tags, Network, Plus } from "lucide-react";
import styles from "../LeadDetailsDrawer.module.scss";
import Avatar from "@/app/components/shared/newui/Avatar/Avatar";
import { getProfileUrl } from "@/utils/shared/shared_util";


export default function LeadTagsAndTeam({
  tags = [],
  assignedUsers = [],
  onManageTags,
  onOpenAssignmentDialog,
}) {
  return (
    <section className={styles.lead_tags_n_team}>
      {/* ── TAGS ── */}
      <div className={styles.metaRow}>
        <div className={styles.metaRowLabel}>
          <Tags size={27} strokeWidth={1.8} />
          <span>TAGS</span>
        </div>

        <div className={styles.tagsRow}>
          {tags.map((tag) => (
            <button
              key={tag.id}
              className={styles.tagChip}
              style={{
                "--tag-color": tag.color_code,
                "--tag-color-10": `${tag.color_code}1A`,
                "--tag-color-30": `${tag.color_code}4D`,
              }}
              onClick={onManageTags}
              title={tag.name}
            >
              #{tag.name}
            </button>
          ))}

          {tags.length < 5 && (
            <button
              className={styles.addChip}
              onClick={onManageTags}
              title="Manage tags"
            >
              <Plus size={24} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      {/* ── TEAM ── */}
      <div className={styles.metaRow}>
        <div className={styles.metaRowLabel}>
          <Network size={27} strokeWidth={1.8} />
          <span>TEAM</span>
        </div>

        <div className={styles.teamRow}>
          {/* Avatar stack */}
          <div className={styles.avatarStack}>
            {assignedUsers.slice(0, 5).map((user) => (
              <div
                key={user.id}
                className={styles.avatarItem}
                title={user.name}
              >
                <Avatar
                  src={getProfileUrl(user.id)}
                  alt={user.name}
                  size={44}
                  fallbackText={user.name}
                />
              </div>
            ))}

            {/* Add button */}
            <button
              className={styles.avatarAddBtn}
              onClick={onOpenAssignmentDialog}
              title={
                assignedUsers.length > 0 ? "Manage team" : "Assign team members"
              }
            >
              <Plus size={15} strokeWidth={2.2} />
            </button>
          </div>

          {/* Count badge */}
          {assignedUsers.length > 0 && (
            <div className={styles.assignedBadge}>
              {assignedUsers.length} USER
              {assignedUsers.length !== 1 ? "S" : ""} ASSIGNED
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
