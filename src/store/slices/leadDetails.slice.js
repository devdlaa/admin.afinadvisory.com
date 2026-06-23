import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

import { updateLeadContact } from "./leadContactSlice";
import { updateComment, deleteComment } from "@/store/slices/leadTimelineSlice";

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("Invalid server response");
  }

  if (!res.ok || !json.success) {
    const err = new Error(json?.error?.message || "Request failed");
    err.code = json?.error?.code;
    err.details = json?.error?.details;
    err.status = res.status;
    throw err;
  }

  return json.data;
}

/* ========================================
THUNKS
======================================== */

/* -------- Get Lead Details -------- */
export const fetchLeadDetails = createAsyncThunk(
  "leadDetails/fetchLeadDetails",
  async (leadId, { rejectWithValue }) => {
    try {
      const res = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}`,
      );
      return res;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

/* -------- Update Lead (core + tags + contact + reference) -------- */
export const updateLead = createAsyncThunk(
  "leadDetails/updateLead",
  async ({ leadId, payload }, { rejectWithValue }) => {
    try {
      const res = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      return res;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

/* -------- Update Stage -------- */
export const updateLeadStage = createAsyncThunk(
  "leadDetails/updateLeadStage",
  async ({ leadId, stage_id, lost_reason }, { rejectWithValue }) => {
    try {
      const res = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/update-stage`,
        {
          method: "PATCH",
          body: JSON.stringify({ stage_id, lost_reason }),
        },
      );
      return res;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

/* -------- Update Assignments -------- */
export const updateLeadAssignments = createAsyncThunk(
  "leadDetails/updateLeadAssignments",
  async ({ leadId, users }, { rejectWithValue }) => {
    try {
      const res = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/assignments`,
        {
          method: "POST",
          body: JSON.stringify({ users }),
        },
      );
      return res;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const deleteLead = createAsyncThunk(
  "leadDetails/deleteLead",
  async ({ leadId, stageId, pipelineId }, { rejectWithValue }) => {
    try {
      await apiFetch(`/api/admin_ops/leads-manager/leads/${leadId}`, {
        method: "DELETE",
      });

      return { leadId, stageId, pipelineId };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

/* -------- AI Summary -------- */
export const fetchAiSummary = createAsyncThunk(
  "leadDetails/fetchAiSummary",
  async (leadId, { rejectWithValue }) => {
    try {
      const res = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/get-ai-summary`,
      );
      return res;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

/* -------- Team Effort -------- */
export const fetchTeamEffort = createAsyncThunk(
  "leadDetails/fetchTeamEffort",
  async (leadId, { rejectWithValue }) => {
    try {
      const res = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/get-team-effort`,
      );
      return res;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const fetchLeadActivities = createAsyncThunk(
  "leadDetails/fetchLeadActivities",
  async ({ leadId, filters = {} }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const activities = state.leadDetails.leadActivitiesHistory;

      const nextPage =
        activities.items.length === 0
          ? 1
          : (activities.pagination?.page || 1) + 1;

      const qs = new URLSearchParams({
        page: nextPage,
        ...filters,
      }).toString();

      const res = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/activities?${qs}`,
      );

      return res;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);
export const createLeadActivity = createAsyncThunk(
  "leadDetails/createLeadActivity",
  async ({ leadId, payload }, { rejectWithValue }) => {
    try {
      const res = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/activities`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      return res;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);
export const updateLeadActivity = createAsyncThunk(
  "leadDetails/updateLeadActivity",
  async ({ leadId, activityId, payload }, { rejectWithValue }) => {
    try {
      const res = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/activities/${activityId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      return res;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const updateActivityLifecycle = createAsyncThunk(
  "leadDetails/updateActivityLifecycle",
  async ({ leadId, activityId, payload }, { rejectWithValue }) => {
    try {
      const res = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/activities/${activityId}/lifecycle`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
      return res;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const deleteActivity = createAsyncThunk(
  "leadDetails/deleteActivity",
  async ({ leadId, activityId }, { rejectWithValue }) => {
    try {
      await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/activities/${activityId}`,
        { method: "DELETE" },
      );
      return { activityId };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const fetchActivityEmail = createAsyncThunk(
  "leadDetails/fetchActivityEmail",
  async ({ lead_id, activityId }, { rejectWithValue }) => {
    try {
      const res = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${lead_id}/activities/${activityId}/email`,
      );
      return res;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const updateActivityEmail = createAsyncThunk(
  "leadDetails/updateActivityEmail",
  async ({ lead_id, activityId, payload }, { rejectWithValue }) => {
    try {
      const res = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${lead_id}/activities/${activityId}/email`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
      return res;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

/* ========================================
INITIAL STATE
======================================== */

const initialState = {
  currentLead: null,
  leadActivitiesHistory: {
    items: [],
    pagination: null,
  },
  activityDetails: {
    email: null,
  },
  teamEffort: null,

  loading: {
    fetch: false,
    update: false,
    stage: false,
    assignments: false,
    ai: false,
    team: false,

    activities: false,
    createActivity: false,
    updateActivity: false,
    updateActivityLifecycle: false,
    deleteActivity: false,
    delete: false,
    email: false,
    updateEmail: false,
  },

  error: {
    fetch: null,
    update: null,
    stage: null,
    assignments: null,
    ai: null,
    team: null,
    delete: null,
    activities: null,
    createActivity: null,
    updateActivity: null,
    updateActivityLifecycle: null,
    deleteActivity: null,

    email: null,
    updateEmail: null,
  },
};

/* ========================================
SLICE
======================================== */

const leadDetailsSlice = createSlice({
  name: "leadDetails",
  initialState,
  reducers: {
    clearLeadDetails: () => initialState,
    resetLeadActivitiesHistory: (state) => {
      state.leadActivitiesHistory.items = [];
      state.leadActivitiesHistory.pagination = null;
    },
    resetActivityDetails: (state) => {
      state.activityDetails.email = null;
    },
  },

  extraReducers: (builder) => {
    /* ================= FETCH ================= */
    builder
      .addCase(fetchLeadDetails.pending, (state) => {
        state.loading.fetch = true;
        state.error.fetch = null;
      })
      .addCase(fetchLeadDetails.fulfilled, (state, action) => {
        state.loading.fetch = false;
        state.currentLead = action.payload;
      })
      .addCase(fetchLeadDetails.rejected, (state, action) => {
        state.loading.fetch = false;
        state.error.fetch = action.payload;
      });

    /* ================= UPDATE LEAD ================= */
    builder
      .addCase(updateLead.pending, (state) => {
        state.loading.update = true;
      })
      .addCase(updateLead.fulfilled, (state, action) => {
        state.loading.update = false;

        if (!state.currentLead) return;

        Object.assign(state.currentLead, action.payload);
      })
      .addCase(updateLead.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update = action.payload;
      });

    /* ================= UPDATE STAGE ================= */
    builder
      .addCase(updateLeadStage.pending, (state) => {
        state.loading.stage = true;
      })
      .addCase(updateLeadStage.fulfilled, (state, action) => {
        state.loading.stage = false;

        if (!state.currentLead) return;

        const payload = action.payload;

        const stages = state.currentLead.timeline.pipeline_stages;

        stages.forEach((stage) => {
          stage.is_current = stage.stage_id === payload.stage.id;
        });

        state.currentLead.timeline.summary.current_stage = payload.stage;

        state.currentLead.timeline.summary.time_in_current_stage_ms = 0;

        state.currentLead.timeline.summary.current_stage_metrics = {
          entries: 0,
          total_duration_ms: 0,
          last_entered_at: payload.stage_updated_at,
        };

        state.currentLead.is_won = payload.is_won;
        state.currentLead.is_lost = payload.is_lost;
        state.currentLead.closure_status = payload.closure_status;
      })
      .addCase(updateLeadStage.rejected, (state, action) => {
        state.loading.stage = false;
        state.error.stage = action.payload;
      });

    /* ================= ASSIGNMENTS ================= */
    builder
      .addCase(updateLeadAssignments.pending, (state) => {
        state.loading.assignments = true;
      })
      .addCase(updateLeadAssignments.fulfilled, (state, action) => {
        state.loading.assignments = false;

        if (!state.currentLead) return;

        state.currentLead.assignments = action.payload.assignments;
      })
      .addCase(updateLeadAssignments.rejected, (state, action) => {
        state.loading.assignments = false;
        state.error.assignments = action.payload;
      });

    /* ================= AI SUMMARY ================= */
    builder
      .addCase(fetchAiSummary.pending, (state) => {
        state.loading.ai = true;
      })
      .addCase(fetchAiSummary.fulfilled, (state, action) => {
        state.loading.ai = false;

        if (!state.currentLead) return;

        state.currentLead.ai_summary = action.payload.ai_summary;
        state.currentLead.ai_summary_generated_at =
          action.payload.ai_summary_generated_at;
      })
      .addCase(fetchAiSummary.rejected, (state, action) => {
        state.loading.ai = false;
        state.error.ai = action.payload;
      });

    /* ================= TEAM EFFORT ================= */
    builder
      .addCase(fetchTeamEffort.pending, (state) => {
        state.loading.team = true;
      })
      .addCase(fetchTeamEffort.fulfilled, (state, action) => {
        state.loading.team = false;
        state.teamEffort = action.payload;
      })
      .addCase(fetchTeamEffort.rejected, (state, action) => {
        state.loading.team = false;
        state.error.team = action.payload;
      })

      // LOAD MORE ACTIVITES WITHE PAGINATION + FILTERS
      .addCase(fetchLeadActivities.pending, (state) => {
        state.loading.activities = true;
        state.error.activities = null;
      })
      .addCase(fetchLeadActivities.fulfilled, (state, action) => {
        const { items, pagination } = action.payload;
        state.loading.activities = false;

        if (!state.currentLead) return;

        if (pagination.page === 1) {
          state.leadActivitiesHistory.items = items;
        } else {
          state.leadActivitiesHistory.items.push(...items);
        }

        state.leadActivitiesHistory.pagination = pagination;
      })
      .addCase(fetchLeadActivities.rejected, (state, action) => {
        state.loading.activities = false;
        state.error.activities = action.payload;
      })

      // create activity
      .addCase(createLeadActivity.pending, (state) => {
        state.loading.createActivity = true;
        state.error.createActivity = null;
      })
      .addCase(createLeadActivity.fulfilled, (state, action) => {
        state.loading.createActivity = false;

        const activity = action.payload;
        const focus = state.currentLead?.focus_now || [];
        const history = state.leadActivitiesHistory.items || [];

        state.currentLead.focus_now = focus.filter((a) => a.id !== activity.id);
        state.leadActivitiesHistory.items = history.filter(
          (a) => a.id !== activity.id,
        );

        if (activity.status === "ACTIVE") {
          state.currentLead.focus_now.unshift(activity);
        } else {
          state.leadActivitiesHistory.items.unshift(activity);
        }
      })
      .addCase(createLeadActivity.rejected, (state, action) => {
        state.loading.createActivity = false;
        state.error.createActivity = action.payload;
      })
      // update activity
      .addCase(updateLeadActivity.pending, (state) => {
        state.loading.updateActivity = true;
        state.error.updateActivity = null;
      })
      .addCase(updateLeadActivity.fulfilled, (state, action) => {
        state.loading.updateActivity = false;

        const updated = action.payload;

        const focus = state.currentLead?.focus_now || [];
        const history = state.leadActivitiesHistory.items || [];

        state.currentLead.focus_now = focus.filter((a) => a.id !== updated.id);
        state.leadActivitiesHistory.items = history.filter(
          (a) => a.id !== updated.id,
        );

        if (updated.status === "ACTIVE") {
          state.currentLead.focus_now.unshift(updated);
        } else {
          state.leadActivitiesHistory.items.unshift(updated);
        }
      })

      // update lifecycle
      .addCase(updateActivityLifecycle.pending, (state) => {
        state.loading.updateActivityLifecycle = true;
        state.error.updateActivityLifecycle = null;
      })

      .addCase(updateActivityLifecycle.fulfilled, (state, action) => {
        state.loading.updateActivityLifecycle = false;

        const updated = action.payload;

        const focus = state.currentLead?.focus_now || [];
        const history = state.leadActivitiesHistory.items || [];

        state.currentLead.focus_now = focus.filter((a) => a.id !== updated.id);
        state.leadActivitiesHistory.items = history.filter(
          (a) => a.id !== updated.id,
        );

        if (updated.status === "ACTIVE") {
          state.currentLead.focus_now.unshift(updated);
        } else {
          state.leadActivitiesHistory.items.unshift(updated);
        }
      })

      .addCase(updateActivityLifecycle.rejected, (state, action) => {
        state.loading.updateActivityLifecycle = false;
        state.error.updateActivityLifecycle = action.payload;
      })

      .addCase(deleteActivity.pending, (state) => {
        state.loading.deleteActivity = true;
        state.error.deleteActivity = null;
      })

      .addCase(deleteActivity.fulfilled, (state, action) => {
        state.loading.deleteActivity = false;

        const { activityId } = action.payload;

        state.currentLead.focus_now =
          state.currentLead?.focus_now?.filter((a) => a.id !== activityId) ||
          [];

        state.leadActivitiesHistory.items =
          state.leadActivitiesHistory.items.filter((a) => a.id !== activityId);
      })

      .addCase(deleteActivity.rejected, (state, action) => {
        state.loading.deleteActivity = false;
        state.error.deleteActivity = action.payload;
      })

      // linked email get
      .addCase(fetchActivityEmail.pending, (state) => {
        state.loading.email = true;
        state.error.email = null;
      })
      .addCase(fetchActivityEmail.fulfilled, (state, action) => {
        state.loading.email = false;
        state.activityDetails.email = action.payload;
      })
      .addCase(fetchActivityEmail.rejected, (state, action) => {
        state.loading.email = false;
        state.error.email = action.payload;
      })
      // update linked email
      .addCase(updateActivityEmail.pending, (state) => {
        state.loading.updateEmail = true;
        state.error.updateEmail = null;
      })
      .addCase(updateActivityEmail.fulfilled, (state, action) => {
        state.loading.updateEmail = false;

        state.activityDetails.email = action.payload;
      })
      .addCase(updateActivityEmail.rejected, (state, action) => {
        state.loading.updateEmail = false;
        state.error.updateEmail = action.payload;
      })

      .addCase(updateLeadContact.fulfilled, (state, action) => {
        if (!state.currentLead) return;
        state.currentLead.contact = action.payload;
      })

      .addCase(updateComment.fulfilled, (state, action) => {
        const updated = action.payload.updatedComment;
        if (!state.currentLead?.pinned_comments?.items) return;

        const items = state.currentLead.pinned_comments.items;
        const idx = items.findIndex((c) => c.id === updated.id);

        if (updated.is_pinned) {
          if (idx !== -1) {
            items[idx] = updated;
          } else {
            items.push(updated);
          }
        } else {
          if (idx !== -1) items.splice(idx, 1);
        }
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { commentId } = action.payload;
        if (!state.currentLead?.pinned_comments?.items) return;

        state.currentLead.pinned_comments.items =
          state.currentLead.pinned_comments.items.filter(
            (c) => c.id !== commentId,
          );
      })
      .addCase(deleteLead.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
      })

      .addCase(deleteLead.fulfilled, (state, action) => {
        state.loading.delete = false;

        const deletedId = action.payload?.leadId;

        if (state.currentLead?.id === deletedId) {
          state.currentLead = null;
        }
      })

      .addCase(deleteLead.rejected, (state, action) => {
        state.loading.delete = false;
        state.error.delete = action.payload;
      });
  },
});

/* ========================================
SELECTORS
======================================== */

export const selectLeadDetails = (state) => state.leadDetails.currentLead;

export const selectLeadLoading = (state) => state.leadDetails.loading;

export const selectTeamEffort = (state) => state.leadDetails.teamEffort;
export const selectLeadAcitiesPagination = (state) =>
  state.leadDetails.leadActivitiesHistory.pagination;
export const selectLeadActivitiesHistory = (state) =>
  state.leadDetails.leadActivitiesHistory.items;

/* memo example */
export const selectLeadStage = createSelector(
  selectLeadDetails,
  (lead) => lead?.stage,
);

/* ========================================
EXPORTS
======================================== */

export const {
  clearLeadDetails,
  resetLeadActivitiesHistory,
  resetActivityDetails,
} = leadDetailsSlice.actions;
export default leadDetailsSlice.reducer;
