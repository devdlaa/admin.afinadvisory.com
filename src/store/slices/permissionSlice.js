import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

/*
|--------------------------------------------------------------------------
| API Helpers
|--------------------------------------------------------------------------
*/

const API_BASE = "/api/admin_ops/staff-managment/permission";

async function parseApiResponse(res) {
  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.success === false) {
    throw (
      json.error || {
        message: "Unknown error",
        code: "UNKNOWN_ERROR",
      }
    );
  }

  return json.data;
}

/*
|--------------------------------------------------------------------------
| Async Thunks
|--------------------------------------------------------------------------
*/

// ================= LIST =================
export const fetchPermissions = createAsyncThunk(
  "permissions/fetch",
  async (params = {}, { rejectWithValue }) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}${qs ? `?${qs}` : ""}`, {
        credentials: "include",
      });
      return await parseApiResponse(res);
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

// ================= CREATE (BULK) =================
export const createPermissions = createAsyncThunk(
  "permissions/create",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      return await parseApiResponse(res);
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

// ================= UPDATE =================
export const updatePermission = createAsyncThunk(
  "permissions/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return await parseApiResponse(res);
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

// ================= BULK UPDATE =================
export const bulkUpdatePermissions = createAsyncThunk(
  "permissions/bulkUpdate",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE}/bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      await parseApiResponse(res);
      return payload.updates;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

// ================= DELETE =================
export const deletePermission = createAsyncThunk(
  "permissions/delete",
  async (id, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      await parseApiResponse(res);
      return id;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

/*
|--------------------------------------------------------------------------
| Initial State
|--------------------------------------------------------------------------
*/

const initialState = {
  byId: {},
  allIds: [],

  loading: {
    fetch: false,
    create: false,
    update: false,
    bulkUpdate: false,
    delete: false,
  },

  error: null, // { message, code, details }
};

/*
|--------------------------------------------------------------------------
| Slice
|--------------------------------------------------------------------------
*/

const permissionSlice = createSlice({
  name: "permissions",
  initialState,
  reducers: {
    clearPermissionError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder

      // ================= FETCH =================
      .addCase(fetchPermissions.pending, (state) => {
        state.loading.fetch = true;
        state.error = null;
      })
      .addCase(fetchPermissions.fulfilled, (state, action) => {
        state.loading.fetch = false;
        state.byId = {};
        state.allIds = [];

        action.payload.forEach((p) => {
          state.byId[p.id] = p;
          state.allIds.push(p.id);
        });
      })
      .addCase(fetchPermissions.rejected, (state, action) => {
        state.loading.fetch = false;
        state.error = action.payload;
      })

      // ================= CREATE =================
      .addCase(createPermissions.pending, (state) => {
        state.loading.create = true;
        state.error = null;
      })
      .addCase(createPermissions.fulfilled, (state) => {
        state.loading.create = false;
      })
      .addCase(createPermissions.rejected, (state, action) => {
        state.loading.create = false;
        state.error = action.payload;
      })

      // ================= UPDATE =================
      .addCase(updatePermission.pending, (state) => {
        state.loading.update = true;
        state.error = null;
      })
      .addCase(updatePermission.fulfilled, (state, action) => {
        state.loading.update = false;
        state.byId[action.payload.id] = action.payload;
      })
      .addCase(updatePermission.rejected, (state, action) => {
        state.loading.update = false;
        state.error = action.payload;
      })

      // ================= BULK UPDATE =================
      .addCase(bulkUpdatePermissions.pending, (state) => {
        state.loading.bulkUpdate = true;
        state.error = null;
      })
      .addCase(bulkUpdatePermissions.fulfilled, (state, action) => {
        state.loading.bulkUpdate = false;
        action.payload.forEach(({ id, fields }) => {
          if (state.byId[id]) {
            state.byId[id] = {
              ...state.byId[id],
              ...fields,
            };
          }
        });
      })
      .addCase(bulkUpdatePermissions.rejected, (state, action) => {
        state.loading.bulkUpdate = false;
        state.error = action.payload;
      })

      // ================= DELETE =================
      .addCase(deletePermission.pending, (state) => {
        state.loading.delete = true;
        state.error = null;
      })
      .addCase(deletePermission.fulfilled, (state, action) => {
        state.loading.delete = false;
        const id = action.payload;
        delete state.byId[id];
        state.allIds = state.allIds.filter((pid) => pid !== id);
      })
      .addCase(deletePermission.rejected, (state, action) => {
        state.loading.delete = false;
        state.error = action.payload;
      });
  },
});

/*
|--------------------------------------------------------------------------
| Selectors (Memoized)
|--------------------------------------------------------------------------
*/

const selectPermissionState = (state) => state.permissions;

export const selectAllPermissions = createSelector(
  [selectPermissionState],
  (state) => state.allIds.map((id) => state.byId[id]),
);

export const selectPermissionById = (id) =>
  createSelector([selectPermissionState], (state) => state.byId[id]);

export const selectPermissionsByCategory = (category) =>
  createSelector([selectAllPermissions], (permissions) =>
    permissions.filter((p) => p.category === category),
  );

export const selectPermissionLoading = createSelector(
  [selectPermissionState],
  (state) => state.loading,
);

export const selectPermissionError = createSelector(
  [selectPermissionState],
  (state) => state.error,
);

/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/

export const { clearPermissionError } = permissionSlice.actions;
export default permissionSlice.reducer;
