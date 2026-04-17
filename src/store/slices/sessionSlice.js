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

export const { setSession, clearSession } = sessionSlice.actions;

export const selectSession = (state) => state.session;
export const selectUser = (state) => state.session.user;
export const selectPermissions = (state) => state.session.permissions;

export default sessionSlice.reducer;
