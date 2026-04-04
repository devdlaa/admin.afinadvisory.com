import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";
import {
  updateLead,
  fetchAiSummary,
  updateLeadStage,
} from "./leadDetails.slice";

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
THUNK: FETCH PIPELINE LEADS
======================================== */
export const fetchPipelineLeads = createAsyncThunk(
  "leads/fetchPipelineLeads",
  async ({ pipelineId, stageIds, cursor }, { rejectWithValue }) => {
    try {
      const qs = new URLSearchParams({
        pipeline_id: pipelineId,
        ...(stageIds?.length && { stage_ids: stageIds.join(",") }),
        ...(cursor && { cursor }),
      }).toString();

      const res = await apiFetch(`/api/admin_ops/leads-manager/leads?${qs}`);

      return {
        pipelineId,
        data: res,
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const createLead = createAsyncThunk(
  "leads/createLead",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await apiFetch(`/api/admin_ops/leads-manager/leads`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      return res;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const updateLeadStageThunk = createAsyncThunk(
  "leads/updateLeadStage",
  async ({ leadId, stageId }, { rejectWithValue }) => {
    try {
      const res = await apiFetch(
        `/api/admin_ops/leads-manager/leads/${leadId}/update-stage`,
        {
          method: "PATCH",
          body: JSON.stringify({ stage_id: stageId }),
        },
      );

      return res;
    } catch (err) {
      return rejectWithValue({
        message: err.message,
        leadId,
        stageId,
      });
    }
  },
);

/* ========================================
INITIAL STATE
======================================== */
const initialState = {
  byPipeline: {},
  optimisticMoves: {},
  creating: false,
};

/* ========================================
SLICE
======================================== */
const leadsSlice = createSlice({
  name: "leads",
  initialState,
  reducers: {
    /* -------- ENV SETUP / SYNC -------- */
    syncPipelineStages: (state, action) => {
      const { pipelineId, stages } = action.payload;

      if (!state.byPipeline[pipelineId]) {
        state.byPipeline[pipelineId] = { stages: {} };
      }

      const existingStages = state.byPipeline[pipelineId].stages;

      stages.forEach((s) => {
        if (!existingStages[s.id]) {
          existingStages[s.id] = {
            items: [],
            nextCursor: null,
            hasMore: false,
            loading: false,
            initialLoaded: false,
          };
        }
      });

      // remove deleted stages
      Object.keys(existingStages).forEach((stageId) => {
        if (!stages.find((s) => s.id === stageId)) {
          delete existingStages[stageId];
        }
      });
    },

    /* -------- OPTIONAL: RESET STAGE (invalidate) -------- */
    resetStage: (state, action) => {
      const { pipelineId, stageId } = action.payload;

      const stage = state.byPipeline?.[pipelineId]?.stages?.[stageId];
      if (!stage) return;

      stage.items = [];
      stage.nextCursor = null;
      stage.hasMore = false;
      stage.loading = false;
      stage.initialLoaded = false;
    },

    moveLeadOptimistic: (state, action) => {
      const { pipelineId, leadId, fromStageId, toStageId } = action.payload;

      const pipeline = state.byPipeline[pipelineId];
      if (!pipeline) return;

      const fromStage = pipeline.stages[fromStageId];
      const toStage = pipeline.stages[toStageId];
      if (!fromStage || !toStage) return;

      const index = fromStage.items.findIndex((l) => l.id === leadId);
      if (index === -1) return;

      const [lead] = fromStage.items.splice(index, 1);

      // store rollback info (O(1))
      state.optimisticMoves[leadId] = {
        pipelineId,
        fromStageId,
        fromIndex: index,
      };

      lead.stage_id = toStageId;

      // always insert at top
      toStage.items.unshift(lead);
    },

    rollbackLeadMove: (state, action) => {
      const { leadId } = action.payload;

      const move = state.optimisticMoves[leadId];
      if (!move) return;

      const { pipelineId, fromStageId, fromIndex } = move;
      const pipeline = state.byPipeline[pipelineId];
      if (!pipeline) return;

      let currentStage = null;
      let lead = null;

      for (const stage of Object.values(pipeline.stages)) {
        const idx = stage.items.findIndex((l) => l.id === leadId);
        if (idx !== -1) {
          lead = stage.items[idx];
          stage.items.splice(idx, 1);
          break;
        }
      }

      if (!lead) return;

      const originalStage = pipeline.stages[fromStageId];
      if (!originalStage) return;

      originalStage.items.splice(fromIndex, 0, lead);

      delete state.optimisticMoves[leadId];
    },
  },

  extraReducers: (builder) => {
    builder

      /* ================= FETCH LEADS ================= */
      .addCase(fetchPipelineLeads.pending, (state, action) => {
        const { pipelineId, stageIds } = action.meta.arg;

        const pipeline = state.byPipeline[pipelineId];
        if (!pipeline) return;

        stageIds?.forEach((stageId) => {
          if (pipeline.stages[stageId]) {
            pipeline.stages[stageId].loading = true;
          }
        });
      })

      .addCase(fetchPipelineLeads.fulfilled, (state, action) => {
        const { pipelineId, data } = action.payload;

        const pipeline = state.byPipeline[pipelineId];
        if (!pipeline) return;

        // store the global base64 cursor at pipeline level

        data.stages.forEach((stageBlock) => {
          const stageId = stageBlock.stage.id;
          const stageState = pipeline.stages[stageId];
          if (!stageState) return;

          if (!stageState.initialLoaded) {
            stageState.items = stageBlock.items;
            stageState.initialLoaded = true;
          } else {
            const existingIds = new Set(stageState.items.map((l) => l.id));
            const fresh = stageBlock.items.filter(
              (l) => !existingIds.has(l.id),
            );
            stageState.items.push(...fresh);
          }

          stageState.nextCursor = stageBlock.next_cursor ?? null;
          stageState.hasMore = stageBlock.has_more;
          stageState.loading = false;
        });
      })

      .addCase(fetchPipelineLeads.rejected, (state, action) => {
        const { pipelineId, stageIds } = action.meta.arg;

        const pipeline = state.byPipeline[pipelineId];
        if (!pipeline) return;

        stageIds?.forEach((stageId) => {
          if (pipeline.stages[stageId]) {
            pipeline.stages[stageId].loading = false;
          }
        });
      })
      .addCase(createLead.pending, (state) => {
        state.creating = true;
      })
      .addCase(createLead.fulfilled, (state, action) => {
        const lead = action.payload;
        state.creating = false;

        const pipeline = state.byPipeline[lead.pipeline_id];
        if (!pipeline) return;

        const stage = pipeline.stages[lead.stage_id];
        if (!stage) return;

        if (!stage.items.find((l) => l.id === lead.id)) {
          stage.items.unshift(lead);
        }
      })
      .addCase(createLead.rejected, (state) => {
        state.creating = false;
      })

      // UPDATE STAGE DRAG AND DROP (OPTISTIMIC)
      .addCase(updateLeadStageThunk.fulfilled, (state, action) => {
        const { lead_id, to_stage_id, stage_updated_at, is_won, is_lost } =
          action.payload;

        delete state.optimisticMoves[lead_id];

        const pipeline = state.byPipeline[action.meta.arg.pipelineId];
        if (!pipeline) return;

        const stage = pipeline.stages[to_stage_id];
        if (!stage) return;

        const lead = stage.items.find((l) => l.id === lead_id);
        if (!lead) return;

        lead.stage_updated_at = stage_updated_at;
        lead.is_won = is_won;
        lead.is_lost = is_lost;
      });

    builder.addCase(updateLead.fulfilled, (state, action) => {
      const updated = action.payload;
      const leadId = updated.id;

      // loop pipelines
      Object.values(state.byPipeline).forEach((pipeline) => {
        if (!pipeline?.stages) return;

        // loop stages
        Object.values(pipeline.stages).forEach((stage) => {
          const lead = stage.items.find((l) => l.id === leadId);
          if (!lead) return;

          if (updated.title !== undefined) lead.title = updated.title;
          if (updated.description !== undefined)
            lead.description = updated.description;
          if (updated.priority !== undefined) lead.priority = updated.priority;
          if (updated.expected_close_date !== undefined)
            lead.expected_close_date = updated.expected_close_date;

          if (updated.latest_activity !== undefined)
            lead.latest_activity = updated.latest_activity;

          if (updated.active_activities_count !== undefined)
            lead.active_activities_count = updated.active_activities_count;

          if (updated.assigned_users_count !== undefined)
            lead.assigned_users_count = updated.assigned_users_count;

          if (updated.created_by !== undefined)
            lead.created_by = updated.created_by;
        });
      });
    });

    builder.addCase(fetchAiSummary.fulfilled, (state, action) => {
      const leadId = action.meta.arg;
      const { ai_summary, ai_summary_generated_at } = action.payload;

      Object.values(state.byPipeline).forEach((pipeline) => {
        if (!pipeline?.stages) return;

        Object.values(pipeline.stages).forEach((stage) => {
          if (!stage?.items?.length) return;

          const lead = stage.items.find((l) => l && l.id === leadId);
          if (!lead) return;

          lead.ai_summary = ai_summary;
          lead.ai_summary_generated_at = ai_summary_generated_at;
        });
      });
    });
    builder.addCase(updateLeadStage.fulfilled, (state, action) => {
      const leadId = action.meta.arg.leadId;
      const newStageId = action.payload.stage.id;

      Object.values(state.byPipeline).forEach((pipeline) => {
        if (!pipeline?.stages) return;

        let foundLead = null;
        let fromStageId = null;

        Object.entries(pipeline.stages).forEach(([stageId, stage]) => {
          const idx = stage.items.findIndex((l) => l?.id === leadId);
          if (idx !== -1) {
            foundLead = stage.items[idx];
            fromStageId = stageId;
            stage.items.splice(idx, 1);
          }
        });

        if (!foundLead) return;

        foundLead.stage_id = newStageId;

        const targetStage = pipeline.stages[newStageId];
        if (targetStage) {
          targetStage.items.unshift(foundLead);
        }
      });
    });
  },
});

/* ========================================
SELECTORS
======================================== */

// base
export const selectLeadsState = (state) => state.leads;

/* -------- get pipeline -------- */
export const selectPipelineLeads = (pipelineId) =>
  createSelector(selectLeadsState, (leads) => {
    return leads.byPipeline[pipelineId] || { stages: {} };
  });

/* -------- get stage -------- */
export const selectStageLeads = (pipelineId, stageId) =>
  createSelector(selectLeadsState, (leads) => {
    return (
      leads.byPipeline?.[pipelineId]?.stages?.[stageId] || {
        items: [],
        nextCursor: null,
        loading: false,
        hasMore: false,
        initialLoaded: false,
      }
    );
  });

/* -------- get stage items only -------- */
export const selectStageItems = (pipelineId, stageId) =>
  createSelector(selectStageLeads(pipelineId, stageId), (stage) => stage.items);

export const selectCreateLeadLoading = (state) => state.leads.creating;

/* -------- get stage loading -------- */
export const selectStageLoading = (pipelineId, stageId) =>
  createSelector(
    selectStageLeads(pipelineId, stageId),
    (stage) => stage.loading,
  );

/* -------- get stage cursor -------- */
export const selectStageCursor = (pipelineId, stageId) =>
  createSelector(
    selectStageLeads(pipelineId, stageId),
    (stage) => stage.nextCursor,
  );
export const selectStageHasMore = (pipelineId, stageId) =>
  createSelector(
    selectStageLeads(pipelineId, stageId),
    (stage) => stage.hasMore,
  );

/* ========================================
EXPORTS
======================================== */
export const {
  syncPipelineStages,
  resetStage,
  moveLeadOptimistic,
  rollbackLeadMove,
} = leadsSlice.actions;

export default leadsSlice.reducer;
