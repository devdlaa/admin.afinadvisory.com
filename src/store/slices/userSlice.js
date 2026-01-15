// store/usersSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Base API path
const API_BASE = "/api/admin_ops/staff-managment/admin-users";

// Async thunks for API calls
export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async ({ status, search, page = 1, limit = 20 } = {}) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (search) params.append("search", search);
    params.append("page", page);
    params.append("limit", limit);

    const response = await fetch(`${API_BASE}?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to fetch users");
    }

    const re = await response.json();

    return re?.data || [];
  }
);

export const updateUser = createAsyncThunk(
  "users/updateUser",
  async ({ userId, userData }) => {
    const response = await fetch(`${API_BASE}/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update user");
    }

    const result = await response.json();
    return { userId, userData, result };
  }
);

export const toggleUserStatus = createAsyncThunk(
  "users/toggleUserStatus",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/toggle-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userId),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return rejectWithValue(result.error || "Failed to toggle user status");
      }

      return {
        userId,
        updatedUser: result.data,
      };
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

// Update user permissions
export const updateUserPermissions = createAsyncThunk(
  "users/updateUserPermissions",
  async ({ userId, permissionCodes }) => {
    const response = await fetch(`${API_BASE}/${userId}/permissions`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ permissionCodes }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update permissions");
    }

    const result = await response.json();
    return { userId, permissionCodes, result };
  }
);

// Resend invitation
export const resendInvite = createAsyncThunk(
  "users/resendInvite",
  async ({ userId }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/resend-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userId),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return rejectWithValue(result.message || "Failed to resend invite");
      }

      return result;
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

// Invite new user
export const inviteUser = createAsyncThunk(
  "users/inviteUser",
  async (userData, { rejectWithValue }) => {
    try {
      let normalizedData = { ...userData };

      // Remove empty optional fields
      Object.keys(normalizedData).forEach((key) => {
        if (
          normalizedData[key] === "" ||
          normalizedData[key] === null ||
          normalizedData[key] === undefined
        ) {
          if (key !== "permission_codes") {
            delete normalizedData[key];
          }
        }
      });

      const response = await fetch(`${API_BASE}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalizedData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        return rejectWithValue({
          message: responseData.message || "Failed to invite user",
          status: response.status,
        });
      }

      return responseData;
    } catch (error) {
      return rejectWithValue({
        message: "Network error - please check your connection",
        status: 0,
      });
    }
  }
);

// Fetch permissions data
export const fetchPermissions = createAsyncThunk(
  "users/fetchPermissions",
  async () => {
    const response = await fetch(`${API_BASE}/get_defaults`);

    if (!response.ok) {
      throw new Error("Failed to fetch permissions");
    }
    const data = await response.json();

    return data;
  }
);

// Reset user onboarding
export const resetUserOnboarding = createAsyncThunk(
  "users/resetUserOnboarding",
  async ({ userId }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/reset-onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userId),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return rejectWithValue(
          result.message || "Failed to send onboarding reset link"
        );
      }

      return result;
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

// Delete user
export const deleteUser = createAsyncThunk(
  "users/deleteUser",
  async ({ userId }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return rejectWithValue(result.message || "Failed to delete user");
      }

      return { userId, result };
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

// Send password reset link
export const sendPasswordResetLink = createAsyncThunk(
  "users/sendPasswordResetLink",
  async ({ userId }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE}/pwd-reset-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userId),
      });

      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.message || "Failed to send reset link");
      }

      return data;
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

// Upload profile image
export const uploadProfileImage = createAsyncThunk(
  "users/uploadProfileImage",
  async ({ userId, file }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_BASE}/${userId}/profile-image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        return rejectWithValue(result.message || "Failed to upload image");
      }

      return { userId, url: result.data.url };
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

// Delete profile image
export const deleteProfileImage = createAsyncThunk(
  "users/deleteProfileImage",
  async ({ userId }, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${API_BASE}/${userId}/profile-image/delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        return rejectWithValue(result.message || "Failed to delete image");
      }

      return { userId };
    } catch (err) {
      return rejectWithValue(err.message || "Network error");
    }
  }
);

const usersSlice = createSlice({
  name: "users",
  initialState: {
    users: [],
    selectedUser: null,
    permissionsData: null,
    searchTerm: "",
    selectedRole: "",
    selectedStatus: "",
    currentPage: 1,
    itemsPerPage: 40,
    totalItems: 0,
    totalPages: 0,
    loading: false,
    error: null,
    updating: false,
    updateError: null,
    permissionsLoading: false,
    permissionsError: null,
    inviting: false,
    inviteError: null,
    reinviting: false,
    reinviteError: null,
    sentReinvite: false,
    resettingOnboarding: false,
    resetOnboardingError: null,
    sentOnboardingReset: false,
    resettingPassword: false,
    resetPasswordError: null,
    sentPasswordReset: false,
    deleting: false,
    deleteError: null,
    uploadingImage: false,
    uploadImageError: null,
    togglingStatus: false,
    toggleStatusError: null,
  },
  reducers: {
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
      state.currentPage = 1;
    },
    setSelectedRole: (state, action) => {
      state.selectedRole = action.payload;
      state.currentPage = 1;
    },
    setSelectedStatus: (state, action) => {
      state.selectedStatus = action.payload;
      state.currentPage = 1;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null;
    },
    clearFilters: (state) => {
      state.searchTerm = "";
      state.selectedRole = "";
      state.selectedStatus = "";
      state.currentPage = 1;
    },
    clearUpdateError: (state) => {
      state.updateError = null;
    },
    clearPermissionsError: (state) => {
      state.permissionsError = null;
    },
    clearInviteError: (state) => {
      state.inviteError = null;
    },
    clearResetPasswordError: (state) => {
      state.resetPasswordError = null;
      state.sentPasswordReset = false;
    },
    clearReinviteError: (state) => {
      state.reinviteError = null;
      state.sentReinvite = false;
    },
    clearResetOnboardingError: (state) => {
      state.resetOnboardingError = null;
      state.sentOnboardingReset = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch users
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload?.data || [];
        state.totalItems = action.payload?.pagination?.total_items || 0;
        state.totalPages = action.payload?.pagination?.total_pages || 0;
        state.currentPage = action.payload?.pagination?.page || 1;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Delete user
      .addCase(deleteUser.pending, (state) => {
        state.deleting = true;
        state.deleteError = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.deleting = false;
        const deletedId = action.payload.userId;
        state.users = state.users.filter((u) => u.id !== deletedId);
        if (state.selectedUser?.id === deletedId) {
          state.selectedUser = null;
        }
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError = action.payload || "Failed to delete user";
      })

      // Send password reset link
      .addCase(sendPasswordResetLink.pending, (state) => {
        state.resettingPassword = true;
        state.resetPasswordError = null;
        state.sentPasswordReset = false;
      })
      .addCase(sendPasswordResetLink.fulfilled, (state) => {
        state.resettingPassword = false;
        state.sentPasswordReset = true;
      })
      .addCase(sendPasswordResetLink.rejected, (state, action) => {
        state.resettingPassword = false;
        state.resetPasswordError = action.payload || "Something went wrong";
      })

      // Update user
      .addCase(updateUser.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.updating = false;
        const { userId, result } = action.payload;
        const updatedUser = result.data;

        const userIndex = state.users.findIndex((user) => user.id === userId);
        if (userIndex !== -1) {
          state.users[userIndex] = {
            ...state.users[userIndex],
            ...updatedUser,
          };
        }

        if (state.selectedUser?.id === userId) {
          state.selectedUser = { ...state.selectedUser, ...updatedUser };
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.error.message;
      })

      // Reset user onboarding
      .addCase(resetUserOnboarding.pending, (state) => {
        state.resettingOnboarding = true;
        state.resetOnboardingError = null;
        state.sentOnboardingReset = false;
      })
      .addCase(resetUserOnboarding.fulfilled, (state) => {
        state.resettingOnboarding = false;
        state.sentOnboardingReset = true;
      })
      .addCase(resetUserOnboarding.rejected, (state, action) => {
        state.resettingOnboarding = false;
        state.resetOnboardingError =
          action.payload || "Failed to send onboarding reset link";
      })

      // Update user permissions
      .addCase(updateUserPermissions.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateUserPermissions.fulfilled, (state, action) => {
        state.updating = false;
        const { userId, result } = action.payload;
        const updatedPermissions = result.data;

        const updateUserInList = (user) => ({
          ...user,
          permissions: updatedPermissions,
          updated_at: new Date().toISOString(),
        });

        const userIndex = state.users.findIndex((user) => user.id === userId);
        if (userIndex !== -1) {
          state.users[userIndex] = updateUserInList(state.users[userIndex]);
        }

        if (state.selectedUser?.id === userId) {
          state.selectedUser = updateUserInList(state.selectedUser);
        }
      })
      .addCase(updateUserPermissions.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.error.message;
      })

      // Invite user
      .addCase(inviteUser.pending, (state) => {
        state.inviting = true;
        state.inviteError = null;
      })
      .addCase(inviteUser.fulfilled, (state, action) => {
        state.inviting = false;
        state.inviteError = null;

        const result = action.payload;
        if (result.success && result.data) {
          state.users.unshift(result.data);
        }
      })
      .addCase(inviteUser.rejected, (state, action) => {
        state.inviting = false;
        state.inviteError = action.payload?.message || "Failed to invite user";
      })
      // Toggle ACTIVE / INACTIVE
      .addCase(toggleUserStatus.pending, (state) => {
        state.togglingStatus = true;
        state.toggleStatusError = null;
      })
      .addCase(toggleUserStatus.fulfilled, (state, action) => {
        state.togglingStatus = false;

        const { userId, updatedUser } = action.payload;

        // update in list
        const idx = state.users.findIndex((u) => u.id === userId?.userId);
        if (idx !== -1) {
          state.users[idx] = { ...state.users[idx], ...updatedUser };
        }

        // update selected user if open
        if (state.selectedUser?.id === userId?.userId) {
          state.selectedUser = { ...state.selectedUser, ...updatedUser };
        }
      })
      .addCase(toggleUserStatus.rejected, (state, action) => {
        state.togglingStatus = false;
        state.toggleStatusError =
          action.payload || "Failed to toggle user status";
      })

      // Resend invite
      .addCase(resendInvite.pending, (state) => {
        state.reinviting = true;
        state.reinviteError = null;
        state.sentReinvite = false;
      })
      .addCase(resendInvite.fulfilled, (state) => {
        state.reinviting = false;
        state.sentReinvite = true;
      })
      .addCase(resendInvite.rejected, (state, action) => {
        state.reinviting = false;
        state.reinviteError = action.payload || "Failed to resend invite";
      })

      // Fetch permissions
      .addCase(fetchPermissions.pending, (state) => {
        state.permissionsLoading = true;
        state.permissionsError = null;
      })
      .addCase(fetchPermissions.fulfilled, (state, action) => {
        state.permissionsLoading = false;
        state.permissionsData = action.payload?.data;
      })
      .addCase(fetchPermissions.rejected, (state, action) => {
        state.permissionsLoading = false;
        state.permissionsError = action.error.message;
      })

      // Upload profile image
      .addCase(uploadProfileImage.pending, (state) => {
        state.uploadingImage = true;
        state.uploadImageError = null;
      })
      .addCase(uploadProfileImage.fulfilled, (state, action) => {
        state.uploadingImage = false;
        const { userId, url } = action.payload;

        const userIndex = state.users.findIndex((user) => user.id === userId);
        if (userIndex !== -1) {
          state.users[userIndex].profile_image_url = url;
        }

        if (state.selectedUser?.id === userId) {
          state.selectedUser.profile_image_url = url;
        }
      })
      .addCase(uploadProfileImage.rejected, (state, action) => {
        state.uploadingImage = false;
        state.uploadImageError = action.payload || "Failed to upload image";
      })

      // Delete profile image
      .addCase(deleteProfileImage.pending, (state) => {
        state.uploadingImage = true;
        state.uploadImageError = null;
      })
      .addCase(deleteProfileImage.fulfilled, (state, action) => {
        state.uploadingImage = false;
        const { userId } = action.payload;

        const userIndex = state.users.findIndex((user) => user.id === userId);
        if (userIndex !== -1) {
          state.users[userIndex].profile_image_url = null;
        }

        if (state.selectedUser?.id === userId) {
          state.selectedUser.profile_image_url = null;
        }
      })
      .addCase(deleteProfileImage.rejected, (state, action) => {
        state.uploadingImage = false;
        state.uploadImageError = action.payload || "Failed to delete image";
      });
  },
});

export const {
  setSearchTerm,
  setSelectedRole,
  setSelectedStatus,
  setCurrentPage,
  setSelectedUser,
  clearSelectedUser,
  clearFilters,
  clearUpdateError,
  clearPermissionsError,
  clearInviteError,
  clearResetPasswordError,
  clearReinviteError,
  clearResetOnboardingError,
} = usersSlice.actions;

export default usersSlice.reducer;
