import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

const BASE = "/api/admin_ops/reminders";

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

export const fetchReminderTags = createAsyncThunk(
  "reminderMeta/fetchTags",
  async (_, { rejectWithValue }) => {
    try {
      return await apiFetch(`${BASE}/tags`);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const createReminderTag = createAsyncThunk(
  "reminderMeta/createTag",
  async (payload, { rejectWithValue }) => {
    // payload: { name, color }
    try {
      return await apiFetch(`${BASE}/tags`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const updateReminderTag = createAsyncThunk(
  "reminderMeta/updateTag",
  async ({ tagId, ...payload }, { rejectWithValue }) => {
    // payload: { name?, color? }
    try {
      return await apiFetch(`${BASE}/tags/${tagId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const deleteReminderTag = createAsyncThunk(
  "reminderMeta/deleteTag",
  async (tagId, { rejectWithValue }) => {
    try {
      const data = await apiFetch(`${BASE}/tags/${tagId}`, {
        method: "DELETE",
      });
      return { ...data, tagId };
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

/* ─────────────────────────────────────────────
   THUNKS — LISTS (BUCKETS)
───────────────────────────────────────────── */

export const fetchReminderLists = createAsyncThunk(
  "reminderMeta/fetchLists",
  async ({ all = false } = {}, { rejectWithValue }) => {
    try {
      const qs = all ? "?all=true" : "";
      return await apiFetch(`${BASE}/buckets${qs}`);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const createReminderList = createAsyncThunk(
  "reminderMeta/createList",
  async (payload, { rejectWithValue }) => {
    // payload: { name, icon? }
    try {
      return await apiFetch(`${BASE}/buckets`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const updateReminderList = createAsyncThunk(
  "reminderMeta/updateList",
  async ({ listId, ...payload }, { rejectWithValue }) => {
    // payload: { name?, icon? }
    try {
      return await apiFetch(`${BASE}/buckets/${listId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

export const deleteReminderList = createAsyncThunk(
  "reminderMeta/deleteList",
  async (listId, { rejectWithValue }) => {
    try {
      const data = await apiFetch(`${BASE}/buckets/${listId}`, {
        method: "DELETE",
      });
      return { ...data, listId };
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);

/* ─────────────────────────────────────────────
   INITIAL STATE
───────────────────────────────────────────── */

const initialState = {
  // ── Tags ──────────────────────────────────
  tags: {
    items: [], // Tag[]
    loading: false,
    submitting: false, // create / update / delete in-flight
    error: null,
    // Search
    search: {
      query: "",
      results: [], // local-filtered or server results
      active: false, // true while user is in search mode
      loading: false,
    },
  },

  // ── Lists (buckets) ───────────────────────
  lists: {
    items: [], // List[]
    allItems: [], // flat list fetched with ?all=true (for pickers)
    loading: false,
    submitting: false,
    error: null,
    // Search
    search: {
      query: "",
      results: [],
      active: false,
      loading: false,
    },
  },
};

/* ─────────────────────────────────────────────
   SLICE
───────────────────────────────────────────── */

const reminderMetaSlice = createSlice({
  name: "reminderMeta",
  initialState,

  reducers: {
    /* ── Tag search ── */
    setTagSearchQuery(state, action) {
      const query = action.payload ?? "";
      state.tags.search.query = query;
      state.tags.search.active = query.trim().length > 0;

      if (!query.trim()) {
        state.tags.search.results = [];
        return;
      }

      // Local-first search
      const q = query.trim().toLowerCase();
      state.tags.search.results = state.tags.items.filter((t) =>
        t.name.toLowerCase().includes(q),
      );
    },

    clearTagSearch(state) {
      state.tags.search = initialState.tags.search;
    },

    /* ── List search ── */
    setListSearchQuery(state, action) {
      const query = action.payload ?? "";
      state.lists.search.query = query;
      state.lists.search.active = query.trim().length > 0;

      if (!query.trim()) {
        state.lists.search.results = [];
        return;
      }

      const q = query.trim().toLowerCase();
      const pool =
        state.lists.allItems.length > 0
          ? state.lists.allItems
          : state.lists.items;
      state.lists.search.results = pool.filter((l) =>
        l.name.toLowerCase().includes(q),
      );
    },

    clearListSearch(state) {
      state.lists.search = initialState.lists.search;
    },

    /* ── General error resets ── */
    clearTagError(state) {
      state.tags.error = null;
    },
    clearListError(state) {
      state.lists.error = null;
    },
  },

  extraReducers: (builder) => {
    /* ════════════════════════════════════════
       TAGS
    ════════════════════════════════════════ */

    // FETCH
    builder
      .addCase(fetchReminderTags.pending, (state) => {
        state.tags.loading = true;
        state.tags.error = null;
      })
      .addCase(fetchReminderTags.fulfilled, (state, { payload }) => {
        state.tags.loading = false;
        state.tags.items = payload.tags ?? [];
      })
      .addCase(fetchReminderTags.rejected, (state, { payload }) => {
        state.tags.loading = false;
        state.tags.error = payload;
      });

    // CREATE
    builder
      .addCase(createReminderTag.pending, (state) => {
        state.tags.submitting = true;
        state.tags.error = null;
      })
      .addCase(createReminderTag.fulfilled, (state, { payload }) => {
        state.tags.submitting = false;
        state.tags.items.push(payload.tag);
        // Keep sorted a→z
        state.tags.items.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(createReminderTag.rejected, (state, { payload }) => {
        state.tags.submitting = false;
        state.tags.error = payload;
      });

    // UPDATE
    builder
      .addCase(updateReminderTag.pending, (state) => {
        state.tags.submitting = true;
        state.tags.error = null;
      })
      .addCase(updateReminderTag.fulfilled, (state, { payload }) => {
        state.tags.submitting = false;
        const idx = state.tags.items.findIndex((t) => t.id === payload.tag.id);
        if (idx !== -1) state.tags.items[idx] = payload.tag;
        state.tags.items.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(updateReminderTag.rejected, (state, { payload }) => {
        state.tags.submitting = false;
        state.tags.error = payload;
      });

    // DELETE
    builder
      .addCase(deleteReminderTag.pending, (state) => {
        state.tags.submitting = true;
        state.tags.error = null;
      })
      .addCase(deleteReminderTag.fulfilled, (state, { payload }) => {
        state.tags.submitting = false;
        state.tags.items = state.tags.items.filter(
          (t) => t.id !== payload.tagId,
        );
      })
      .addCase(deleteReminderTag.rejected, (state, { payload }) => {
        state.tags.submitting = false;
        state.tags.error = payload;
      });

    /* ════════════════════════════════════════
       LISTS (BUCKETS)
    ════════════════════════════════════════ */

    // FETCH
    builder
      .addCase(fetchReminderLists.pending, (state) => {
        state.lists.loading = true;
        state.lists.error = null;
      })
      .addCase(fetchReminderLists.fulfilled, (state, { payload, meta }) => {
        state.lists.loading = false;
        const lists = payload.lists ?? [];
        // If called with all=true store in allItems (used by pickers / create reminder)
        if (meta.arg?.all) {
          state.lists.allItems = lists;
        } else {
          state.lists.items = lists;
        }
      })
      .addCase(fetchReminderLists.rejected, (state, { payload }) => {
        state.lists.loading = false;
        state.lists.error = payload;
      });

    // CREATE
    builder
      .addCase(createReminderList.pending, (state) => {
        state.lists.submitting = true;
        state.lists.error = null;
      })
      .addCase(createReminderList.fulfilled, (state, { payload }) => {
        state.lists.submitting = false;
        const list = payload.list;
        // Push into both item sets so pickers stay in sync
        state.lists.items.push(list);
        state.lists.allItems.push(list);
      })
      .addCase(createReminderList.rejected, (state, { payload }) => {
        state.lists.submitting = false;
        state.lists.error = payload;
      });

    // UPDATE
    builder
      .addCase(updateReminderList.pending, (state) => {
        state.lists.submitting = true;
        state.lists.error = null;
      })
      .addCase(updateReminderList.fulfilled, (state, { payload }) => {
        state.lists.submitting = false;
        const list = payload.list;
        const update = (arr) => {
          const idx = arr.findIndex((l) => l.id === list.id);
          if (idx !== -1) arr[idx] = list;
        };
        update(state.lists.items);
        update(state.lists.allItems);
      })
      .addCase(updateReminderList.rejected, (state, { payload }) => {
        state.lists.submitting = false;
        state.lists.error = payload;
      });

    // DELETE
    builder
      .addCase(deleteReminderList.pending, (state) => {
        state.lists.submitting = true;
        state.lists.error = null;
      })
      .addCase(deleteReminderList.fulfilled, (state, { payload }) => {
        state.lists.submitting = false;
        const filter = (arr) => arr.filter((l) => l.id !== payload.listId);
        state.lists.items = filter(state.lists.items);
        state.lists.allItems = filter(state.lists.allItems);
      })
      .addCase(deleteReminderList.rejected, (state, { payload }) => {
        state.lists.submitting = false;
        state.lists.error = payload;
      });
  },
});

/* ─────────────────────────────────────────────
   ACTIONS
───────────────────────────────────────────── */

export const {
  setTagSearchQuery,
  clearTagSearch,
  setListSearchQuery,
  clearListSearch,
  clearTagError,
  clearListError,
} = reminderMetaSlice.actions;

/* ─────────────────────────────────────────────
   BASE SELECTOR
───────────────────────────────────────────── */

const selectMeta = (state) => state.reminderMeta;

/* ─────────────────────────────────────────────
   TAG SELECTORS
───────────────────────────────────────────── */

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

export const selectTagSearch = createSelector(selectTagsSlice, (t) => t.search);

export const selectTagSearchActive = createSelector(
  selectTagSearch,
  (s) => s.active,
);

export const selectTagSearchQuery = createSelector(
  selectTagSearch,
  (s) => s.query,
);

/** Returns search results when active, otherwise the full list */
export const selectVisibleTags = createSelector(
  selectAllTags,
  selectTagSearch,
  (items, search) => (search.active ? search.results : items),
);

/** Map of id → tag — useful for fast lookups in reminder dialogs */
export const selectTagsById = createSelector(selectAllTags, (tags) =>
  Object.fromEntries(tags.map((t) => [t.id, t])),
);

/* ─────────────────────────────────────────────
   LIST SELECTORS
───────────────────────────────────────────── */

export const selectListsSlice = createSelector(selectMeta, (m) => m.lists);

export const selectAllLists = createSelector(selectListsSlice, (l) => l.items);

export const selectAllListsFlat = createSelector(
  selectListsSlice,
  (l) => l.allItems,
);

export const selectListsLoading = createSelector(
  selectListsSlice,
  (l) => l.loading,
);

export const selectListsSubmitting = createSelector(
  selectListsSlice,
  (l) => l.submitting,
);

export const selectListsError = createSelector(
  selectListsSlice,
  (l) => l.error,
);

export const selectListSearch = createSelector(
  selectListsSlice,
  (l) => l.search,
);

export const selectListSearchActive = createSelector(
  selectListSearch,
  (s) => s.active,
);

export const selectListSearchQuery = createSelector(
  selectListSearch,
  (s) => s.query,
);

/** Returns search results when active, otherwise the full list */
export const selectVisibleLists = createSelector(
  selectAllListsFlat,
  selectAllLists,
  selectListSearch,
  (allFlat, items, search) => {
    if (!search.active) return items;
    return search.results;
  },
);

/** Map of id → list — useful for fast lookups in reminder dialogs */
export const selectListsById = createSelector(
  selectAllListsFlat,
  selectAllLists,
  (allFlat, items) => {
    const pool = allFlat.length > 0 ? allFlat : items;
    return Object.fromEntries(pool.map((l) => [l.id, l]));
  },
);

/* ─────────────────────────────────────────────
   COMBINED / CONVENIENCE SELECTORS
───────────────────────────────────────────── */

/** True while any meta operation is in flight */
export const selectMetaAnyLoading = createSelector(
  selectTagsLoading,
  selectListsLoading,
  selectTagsSubmitting,
  selectListsSubmitting,
  (tl, ll, ts, ls) => tl || ll || ts || ls,
);

export default reminderMetaSlice.reducer;
