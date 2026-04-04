import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

const BASE = "/api/admin_ops/leads-manager/lead-tags";

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const json = await res.json();

  if (!json.success) {
    const err = new Error(json.error?.message || "Request failed");
    err.code = json.error?.code;
    err.details = json.error?.details;
    throw err;
  }

  return json.data;
}

/* ─────────────────────────────────────────────
   THUNKS — TAGS
───────────────────────────────────────────── */

export const fetchLeadTags = createAsyncThunk(
  "leadsMeta/fetchTags",
  async (params = {}, { rejectWithValue }) => {
    try {
      const qs = new URLSearchParams();

      if (params.cursor) qs.append("cursor", params.cursor);
      if (params.limit) qs.append("limit", params.limit);
      if (params.search) qs.append("search", params.search);

      const query = qs.toString() ? `?${qs.toString()}` : "";

      return await apiFetch(`${BASE}${query}`);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const createLeadTag = createAsyncThunk(
  "leadsMeta/createTag",
  async (payload, { rejectWithValue }) => {
    try {
      return await apiFetch(`${BASE}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const updateLeadTag = createAsyncThunk(
  "leadsMeta/updateTag",
  async ({ tagId, ...payload }, { rejectWithValue }) => {
    try {
      return await apiFetch(`${BASE}/${tagId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const deleteLeadTag = createAsyncThunk(
  "leadsMeta/deleteTag",
  async (tagId, { rejectWithValue }) => {
    try {
      const data = await apiFetch(`${BASE}/${tagId}`, {
        method: "DELETE",
      });
      return { ...data, tagId };
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

/* ─────────────────────────────────────────────
   INITIAL STATE
───────────────────────────────────────────── */

const initialState = {
  tags: {
    items: [],
    // IDs of tags that were pre-injected (selected tags pinned to top).
    // Kept as an ordered array so we can always re-pin them after merges.
    pinnedIds: [],
    loading: false,
    submitting: false,
    error: null,

    cursor: null,
    hasMore: true,

    search: {
      query: "",
      active: false,
    },
  },
};

/* ─────────────────────────────────────────────
   HELPERS (slice-internal)
───────────────────────────────────────────── */

/**
 * Merge `incoming` tags into `existing`, keeping pinned IDs at the front
 * in their original order, followed by the rest — no duplicates.
 */
function mergeKeepPinned(existing, incoming, pinnedIds) {
  // Build a map of everything we have so far
  const map = new Map(existing.map((t) => [t.id, t]));

  // Overlay incoming (newer data wins)
  incoming.forEach((t) => map.set(t.id, t));

  const pinnedSet = new Set(pinnedIds);

  // Pinned items first (in pinned order), then the rest
  const pinned = pinnedIds.filter((id) => map.has(id)).map((id) => map.get(id));
  const rest = Array.from(map.values()).filter((t) => !pinnedSet.has(t.id));

  return [...pinned, ...rest];
}

/* ─────────────────────────────────────────────
   SLICE
───────────────────────────────────────────── */

const leadsMetaSlice = createSlice({
  name: "leadsMeta",
  initialState,

  reducers: {
    setTagSearchQuery(state, action) {
      const query = action.payload ?? "";
      state.tags.search.query = query;
      state.tags.search.active = query.trim().length > 0;

      // Reset pagination so next fetch starts from page 1 of search results.
      // Do NOT wipe items — the dialog triggers a fetch which will replace them.
      state.tags.cursor = null;
      state.tags.hasMore = true;
    },

    clearTagSearch(state) {
      state.tags.search = initialState.tags.search;
      // Do NOT wipe items here — the dialog will refetch the first page and
      // mergeKeepPinned will reconcile everything. Wiping caused the "stuck
      // on search results" bug where clearing showed nothing until load more.
    },

    // BUG FIX 2: New action — resets only the search query string, leaving
    // items completely untouched. Used when the dialog re-opens so cached
    // data is preserved and no refetch is needed.
    resetSearchQueryOnly(state) {
      state.tags.search = initialState.tags.search;
    },

    clearTagError(state) {
      state.tags.error = null;
    },

    // BUG FIX 3: injectTags now accepts { tags, pinSelected } so selected tags
    // are pinned to the top of the list and deduplication is handled here.
    injectTags(state, action) {
      // Support both legacy array payload and new { tags, pinSelected } shape
      const { tags: incoming, pinSelected = false } = Array.isArray(
        action.payload,
      )
        ? { tags: action.payload, pinSelected: false }
        : action.payload;

      if (pinSelected) {
        // Record pinned IDs (preserves original order, no duplicates)
        const existingPinnedSet = new Set(state.tags.pinnedIds);
        incoming.forEach((t) => {
          if (!existingPinnedSet.has(t.id)) {
            state.tags.pinnedIds.push(t.id);
          }
        });
      }

      state.tags.items = mergeKeepPinned(
        state.tags.items,
        incoming,
        state.tags.pinnedIds,
      );
    },
  },

  extraReducers: (builder) => {
    // FETCH
    builder
      .addCase(fetchLeadTags.pending, (state) => {
        state.tags.loading = true;
        state.tags.error = null;
      })
      .addCase(fetchLeadTags.fulfilled, (state, { payload, meta }) => {
        state.tags.loading = false;

        const incoming = payload.tags ?? [];
        // If this is a fresh first-page fetch (no cursor was sent), replace
        // non-pinned items entirely so stale search results don't bleed through.
        const isFirstPage = !meta.arg?.cursor;

        if (isFirstPage) {
          // Keep pinned items, replace everything else with fresh results
          const pinnedSet = new Set(state.tags.pinnedIds);
          const pinnedItems = state.tags.items.filter((t) =>
            pinnedSet.has(t.id),
          );
          const freshNonPinned = incoming.filter((t) => !pinnedSet.has(t.id));
          state.tags.items = [...pinnedItems, ...freshNonPinned];
        } else {
          // Load-more: merge/append without replacing
          state.tags.items = mergeKeepPinned(
            state.tags.items,
            incoming,
            state.tags.pinnedIds,
          );
        }

        state.tags.cursor = payload.next_cursor;
        state.tags.hasMore = !!payload.next_cursor;
      })
      .addCase(fetchLeadTags.rejected, (state, { payload }) => {
        state.tags.loading = false;
        state.tags.error = payload;
      });

    // CREATE
    builder
      .addCase(createLeadTag.pending, (state) => {
        state.tags.submitting = true;
        state.tags.error = null;
      })
      .addCase(createLeadTag.fulfilled, (state, { payload }) => {
        state.tags.submitting = false;
        // New tag goes to top but after pinned items
        const pinnedSet = new Set(state.tags.pinnedIds);
        const pinnedItems = state.tags.items.filter((t) => pinnedSet.has(t.id));
        const rest = state.tags.items.filter((t) => !pinnedSet.has(t.id));
        state.tags.items = [...pinnedItems, payload.tag, ...rest];
      })
      .addCase(createLeadTag.rejected, (state, { payload }) => {
        state.tags.submitting = false;
        state.tags.error = payload;
      });

    // UPDATE
    builder
      .addCase(updateLeadTag.pending, (state) => {
        state.tags.submitting = true;
        state.tags.error = null;
      })
      .addCase(updateLeadTag.fulfilled, (state, { payload }) => {
        state.tags.submitting = false;
        const idx = state.tags.items.findIndex((t) => t.id === payload.tag.id);
        if (idx !== -1) state.tags.items[idx] = payload.tag;
      })
      .addCase(updateLeadTag.rejected, (state, { payload }) => {
        state.tags.submitting = false;
        state.tags.error = payload;
      });

    // DELETE
    builder
      .addCase(deleteLeadTag.pending, (state) => {
        state.tags.submitting = true;
        state.tags.error = null;
      })
      .addCase(deleteLeadTag.fulfilled, (state, { payload }) => {
        state.tags.submitting = false;
        state.tags.items = state.tags.items.filter(
          (t) => t.id !== payload.tagId,
        );
        // Also remove from pinned list if it was pinned
        state.tags.pinnedIds = state.tags.pinnedIds.filter(
          (id) => id !== payload.tagId,
        );
      })
      .addCase(deleteLeadTag.rejected, (state, { payload }) => {
        state.tags.submitting = false;
        state.tags.error = payload;
      });
  },
});

/* ─────────────────────────────────────────────
   ACTIONS
───────────────────────────────────────────── */

export const {
  setTagSearchQuery,
  clearTagSearch,
  clearTagError,
  injectTags,
  resetSearchQueryOnly,
} = leadsMetaSlice.actions;

/* ─────────────────────────────────────────────
   SELECTORS
───────────────────────────────────────────── */

const selectMeta = (state) => state.leadsMeta;

export const selectTagsSlice = createSelector(selectMeta, (m) => m.tags);

export const selectAllTags = createSelector(selectTagsSlice, (t) => t.items);

export const selectTagsLoading = createSelector(
  selectTagsSlice,
  (t) => t.loading,
);

export const selectTagsSubmitting = createSelector(
  selectTagsSlice,
  (t) => t.submitting,
);

export const selectTagsError = createSelector(selectTagsSlice, (t) => t.error);

export const selectTagsHasMore = createSelector(
  selectTagsSlice,
  (t) => t.hasMore,
);

export const selectTagsCursor = createSelector(
  selectTagsSlice,
  (t) => t.cursor,
);

export const selectTagSearchQuery = createSelector(
  selectTagsSlice,
  (t) => t.search.query,
);

/* ───────────────────────────────────────────── */

export default leadsMetaSlice.reducer;
