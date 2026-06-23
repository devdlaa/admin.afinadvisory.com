import {
  onStageChanged,
  onLeadWon,
  onLeadLost,
  onLeadReopened,
  onStageDurationTracked,
} from "./aggregator";

import { assignLeadPoints } from "./scoring";

/* ----------------------------------------
  MAIN ENTRY: Stage Change
---------------------------------------- */

export async function handleLeadStageChange(tx, params) {
  const { lead, oldStage, newStage, ownerId, closedBy } = params;

  const analyticsLead = {
    id: lead.id,
    ownerId,
    pipelineId: lead.pipeline_id,
    stageId: newStage.id,
    source: lead.source || null,
    companyProfileId: lead.company_profile_id,
  };

  // stage time tracking
  const now = new Date();

  if (lead.stage_updated_at) {
    const timeSpent = (now - new Date(lead.stage_updated_at)) / 1000;

    await onStageDurationTracked(tx, analyticsLead, oldStage.id, timeSpent);
  }

  // 1. movement
  await onStageChanged(tx, analyticsLead, oldStage.id, newStage.id);

  const wasClosed = oldStage.is_closed;
  const isNowClosed = newStage.is_closed;

  /* ----------------------------------------
    REOPEN
  ---------------------------------------- */

  if (wasClosed && !isNowClosed) {
    await onLeadReopened(tx, analyticsLead, oldStage);

    await tx.leadUserScore.deleteMany({
      where: { lead_id: lead.id },
    });

    return;
  }

  /* ----------------------------------------
    CLOSE
  ---------------------------------------- */

  if (!wasClosed && isNowClosed) {
    if (newStage.is_won) {
      await onLeadWon(tx, analyticsLead, closedBy);
    } else {
      await onLeadLost(tx, analyticsLead, closedBy);
    }

    await assignLeadPoints(tx, lead.id, ownerId, closedBy);
  }

  /* ----------------------------------------
    CLOSED → CLOSED SWITCH (IMPORTANT FIX)
  ---------------------------------------- */

  if (wasClosed && isNowClosed && oldStage.is_won !== newStage.is_won) {
    // reverse old
    await onLeadReopened(tx, analyticsLead, oldStage);

    // apply new
    if (newStage.is_won) {
      await onLeadWon(tx, analyticsLead, closedBy);
    } else {
      await onLeadLost(tx, analyticsLead, closedBy);
    }

    await assignLeadPoints(tx, lead.id, ownerId, closedBy);
  }
}
