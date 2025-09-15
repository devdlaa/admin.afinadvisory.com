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
export default sessionSlice.reducer;
