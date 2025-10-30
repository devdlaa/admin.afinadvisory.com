import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  permissions: [],
  user: null,
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    setSession: (state, action) => {
      state.user = action.payload.user;
      state.permissions = action.payload.permissions;
    },
    clearSession: (state) => {
      state.user = null;
      state.permissions = [];
    },
  },
});

// ✅ Actions
export const { setSession, clearSession } = sessionSlice.actions;

// ✅ Selectors
export const selectSession = (state) => state.session; // full session object
export const selectUser = (state) => state.session.user; // just user
export const selectPermissions = (state) => state.session.permissions; // just permissions

// ✅ Reducer
export default sessionSlice.reducer;
