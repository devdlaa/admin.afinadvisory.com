import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

/* =========================================================
   BASE URL
========================================================= */

const BASE_URL = "/api/admin_ops/leads-manager/analytics";

/* =========================================================
   HELPERS
========================================================= */

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      query.append(key, value);
    }
  });

  return query.toString();
};

const apiFetch = async (endpoint, params) => {
  const url = `${BASE_URL}/${endpoint}?${buildQuery(params)}`;

  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message || "Something went wrong");
  }

  return json.data;
};

/* =========================================================
   THUNKS (NOW ACCEPT FILTERS DIRECTLY)
========================================================= */

export const fetchOverview = createAsyncThunk(
  "leadAnalytics/overview",
  async (filters) => apiFetch("overview", filters),
);

export const fetchFunnel = createAsyncThunk(
  "leadAnalytics/funnel",
  async (filters) => apiFetch("funnel", filters),
);

export const fetchScoreboard = createAsyncThunk(
  "leadAnalytics/scoreboard",
  async (filters) => apiFetch("scoreboard", filters),
);

export const fetchTimeseries = createAsyncThunk(
  "leadAnalytics/timeseries",
  async (filters) => apiFetch("timeseries", filters),
);

export const fetchUsersAnalytics = createAsyncThunk(
  "leadAnalytics/users",
  async (filters) => apiFetch("users", filters),
);

export const fetchActivitiesAnalytics = createAsyncThunk(
  "leadAnalytics/activities",
  async (filters) => apiFetch("activities", filters),
);

export const fetchStageDuration = createAsyncThunk(
  "leadAnalytics/stageDuration",
  async (filters) => apiFetch("stage-duration", filters),
);

/* =========================================================
   INITIAL STATE
========================================================= */

const initialState = {
  data: {
    overview: null,
    funnel: null,
    scoreboard: null,
    timeseries: null,
    users: null,
    activities: null,
    stageDuration: null,
  },

  loading: {
    overview: false,
    funnel: false,
    scoreboard: false,
    timeseries: false,
    users: false,
    activities: false,
    stageDuration: false,
  },

  error: {
    overview: null,
    funnel: null,
    scoreboard: null,
    timeseries: null,
    users: null,
    activities: null,
    stageDuration: null,
  },
};

/* =========================================================
   SLICE
========================================================= */

const leadAnalyticsSlice = createSlice({
  name: "leadAnalytics",
  initialState,
  reducers: {
    resetAnalytics: () => initialState,
  },

  extraReducers: (builder) => {
    const attach = (key, thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.loading[key] = true;
          state.error[key] = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.loading[key] = false;
          state.data[key] = action.payload;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading[key] = false;
          state.error[key] = action.error.message;
        });
    };

    attach("overview", fetchOverview);
    attach("funnel", fetchFunnel);
    attach("scoreboard", fetchScoreboard);
    attach("timeseries", fetchTimeseries);
    attach("users", fetchUsersAnalytics);
    attach("activities", fetchActivitiesAnalytics);
    attach("stageDuration", fetchStageDuration);
  },
});

export const { resetAnalytics } = leadAnalyticsSlice.actions;

export default leadAnalyticsSlice.reducer;

/* =========================================================
   BASE SELECTORS
========================================================= */

const selectRoot = (state) => state.leadAnalytics;

export const selectOverview = createSelector(
  selectRoot,
  (s) => s.data.overview,
);

export const selectFunnel = createSelector(selectRoot, (s) => s.data.funnel);

export const selectScoreboard = createSelector(
  selectRoot,
  (s) => s.data.scoreboard,
);

export const selectTimeseries = createSelector(
  selectRoot,
  (s) => s.data.timeseries,
);

export const selectUsers = createSelector(selectRoot, (s) => s.data.users);

export const selectActivities = createSelector(
  selectRoot,
  (s) => s.data.activities,
);

export const selectStageDuration = createSelector(
  selectRoot,
  (s) => s.data.stageDuration,
);

/* =========================================================
   DERIVED SELECTORS
========================================================= */

export const selectOverviewSummary = createSelector(
  selectOverview,
  (o) => o?.summary || {},
);

export const selectConversionRate = createSelector(
  selectOverviewSummary,
  (s) => s.conversion_rate || 0,
);

export const selectTopPerformers = createSelector(
  selectScoreboard,
  (d) => d?.leaderboard?.slice(0, 3) || [],
);

export const selectTimeseriesData = createSelector(
  selectTimeseries,
  (d) => d?.series || [],
);

export const selectFunnelStages = createSelector(
  selectFunnel,
  (d) => d?.funnel?.slice().sort((a, b) => a.order - b.order) || [],
);

export const selectActivityCompletionRate = createSelector(
  selectOverview,
  (o) => o?.activities?.completion_rate || 0,
);
