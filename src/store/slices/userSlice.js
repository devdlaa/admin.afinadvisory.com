// store/usersSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Async thunks for API calls
export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async ({ cursor = null, pageSize = 20 } = {}) => {
    const response = await fetch("/api/admin/users/get_users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cursor, pageSize }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch users");
    }

    return await response.json();
  }
);

export const searchUsers = createAsyncThunk(
  "users/searchUsers",
  async (searchValue) => {
    const response = await fetch("/api/admin/users/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: searchValue }),
    });

    if (!response.ok) {
      throw new Error("Failed to search users");
    }

    return await response.json();
  }
);

export const updateUser = createAsyncThunk(
  "users/updateUser",
  async ({ userId, userData }) => {
    const response = await fetch("/api/admin/users/update", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, ...userData }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.errors?.[0]?.message || "Failed to update user"
      );
    }

    const result = await response.json();
    return { userId, userData, result };
  }
);

// New async thunk for updating user permissions and role
export const updateUserPermissions = createAsyncThunk(
  "users/updateUserPermissions",
  async ({ userId, role, permissions }) => {
    const updateData = {};

    if (role !== undefined) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;

    const response = await fetch("/api/admin/users/alter-permissions", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, ...updateData }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.errors?.[0]?.message || "Failed to update permissions"
      );
    }

    const result = await response.json();
    return { userId, updateData, result };
  }
);

// Async thunk for resending invitation
export const resendInvite = createAsyncThunk(
  "users/resendInvite",
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/users/resend-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return rejectWithValue(
          result.errors || [{ message: "Failed to resend invite" }]
        );
      }

      return result; // contains success + data
    } catch (err) {
      return rejectWithValue([{ message: err.message || "Network error" }]);
    }
  }
);

// Async thunk for inviting new user
export const inviteUser = createAsyncThunk(
  "users/inviteUser",
  async (userData, { rejectWithValue }) => {
    try {
      // Normalize dateOfJoining to YYYY-MM-DD if present
      let normalizedData = { ...userData };

      if (userData.dateOfJoining) {
        const date = new Date(userData.dateOfJoining);
        // Ensure valid date before formatting
        if (!isNaN(date)) {
          normalizedData.dateOfJoining = date.toISOString().split("T")[0];
        }
      }

      // Remove empty optional fields to avoid validation issues
      Object.keys(normalizedData).forEach((key) => {
        if (
          normalizedData[key] === "" ||
          normalizedData[key] === null ||
          normalizedData[key] === undefined
        ) {
          if (key !== "permissions") {
            // Keep permissions array even if empty
            delete normalizedData[key];
          }
        }
      });

      const response = await fetch("/api/admin/users/invite", {
        // Fixed endpoint
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalizedData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle different error formats from the improved API
        if (responseData.errors && Array.isArray(responseData.errors)) {
          // Multiple errors - return the formatted error object
          return rejectWithValue({
            message: responseData.message || "Failed to invite user",
            errors: responseData.errors,
            status: response.status,
          });
        } else {
          // Single error or unexpected format
          return rejectWithValue({
            message:
              responseData.message ||
              responseData.error ||
              "Failed to invite user",
            errors: [
              {
                field: "general",
                message: responseData.message || "An error occurred",
              },
            ],
            status: response.status,
          });
        }
      }

      return responseData;
    } catch (error) {
      console.error("Network or parsing error:");
      return rejectWithValue({
        message: "Network error - please check your connection",
        errors: [
          {
            field: "network",
            message: "Failed to connect to server",
          },
        ],
        status: 0,
      });
    }
  }
);

// Async thunk for fetching permissions data
export const fetchPermissions = createAsyncThunk(
  "users/fetchPermissions",
  async () => {
    const response = await fetch("/api/admin/users/get_defaults");

    if (!response.ok) {
      throw new Error("Failed to fetch permissions");
    }

    return await response.json();
  }
);

export const resetUserPassword = createAsyncThunk(
  "users/resetUserPassword",
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return rejectWithValue(
          result.errors || [{ message: "Failed to send password reset link" }]
        );
      }

      return result;
    } catch (err) {
      return rejectWithValue([{ message: err.message || "Network error" }]);
    }
  }
);

export const deleteUser = createAsyncThunk(
  "users/deleteUser",
  async ({ userId }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/users/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId, confirmDelete: true }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return rejectWithValue(
          result.errors || [
            { message: result.message || "Failed to delete user" },
          ]
        );
      }

      return result; // contains deletedUser + operations
    } catch (err) {
      return rejectWithValue([{ message: err.message || "Network error" }]);
    }
  }
);

const usersSlice = createSlice({
  name: "users",
  initialState: {
    users: [],
    searchResults: [],
    selectedUser: null,
    permissionsData: null,
    isSearchMode: false,
    searchTerm: "",
    selectedDepartment: "",
    selectedRole: "",
    selectedStatus: "",
    currentPage: 1,
    itemsPerPage: 10,
    hasMore: false,
    nextCursor: null,
    loading: false,
    error: null,
    updating: false,
    updateError: null,
    permissionsLoading: false,
    permissionsError: null,
    inviting: false,
    inviteError: null,
    inviteErrors: [],
    reinviting: false,
    reinviteError: null,
    reinvitingResults: null,
    sentReinvite: false,
    resettingPassword: false,
    resetPasswordError: null,
    resetPasswordResults: null,
    sentPasswordReset: false,
    deleting: false,
    deleteError: null,
    deletedUser: null,
  },
  reducers: {
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    },
    setSelectedDepartment: (state, action) => {
      state.selectedDepartment = action.payload;
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
      state.selectedDepartment = "";
      state.selectedRole = "";
      state.selectedStatus = "";
      state.currentPage = 1;
    },
    clearSearch: (state) => {
      state.isSearchMode = false;
      state.searchResults = [];
      state.searchTerm = "";
    },
    setSearchMode: (state, action) => {
      state.isSearchMode = action.payload;
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
    },
    clearResetPasswordResults: (state) => {
      state.resetPasswordResults = null;
      state.sentPasswordReset = false;
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

        const newUsers = action.payload?.data?.users || [];
        const { hasMore, nextCursor } = action.payload?.data?.pagination || {};

        // If cursor is null, replace users. Otherwise, append.
        if (action.meta.arg?.cursor === null) {
          state.users = newUsers;
        } else {
          state.users = [...state.users, ...newUsers];
        }

        state.hasMore = hasMore ?? false;
        state.nextCursor = nextCursor ?? null;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(deleteUser.pending, (state) => {
        state.deleting = true;
        state.deleteError = null;
        state.deletedUser = null;
      })

      .addCase(deleteUser.fulfilled, (state, action) => {
        state.deleting = false;
        state.deletedUser = action.payload.data.deletedUser;

        const deletedId = action.payload.data.deletedUser.userId;

        // Remove from users list
        state.users = state.users.filter((u) => u.id !== deletedId);

        // Remove from search results
        state.searchResults = state.searchResults.filter(
          (u) => u.id !== deletedId
        );

        // Clear selected user if it matches
        if (state.selectedUser?.id === deletedId) {
          state.selectedUser = null;
        }
      })

      .addCase(deleteUser.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError =
          action?.payload?.[0]?.message || "Failed to delete user";
      })

      // Search users
      .addCase(searchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload.data?.users || [];
        state.isSearchMode = true;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Somwthing Went Worng!";
      })

      // Update user (general)
      .addCase(updateUser.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.updating = false;
        const { userId, userData } = action?.payload;

        const mergeUser = (existingUser) => {
          const updated = {
            ...existingUser,
            ...userData,
            updatedAt: new Date().toISOString(),
          };

          if (
            userData.line1 !== undefined ||
            userData.city !== undefined ||
            userData.pincode !== undefined ||
            userData.state !== undefined
          ) {
            updated.address = {
              ...existingUser.address,
              line1: userData.line1 ?? existingUser.address?.line1 ?? "",
              city: userData.city ?? existingUser.address?.city ?? "",
              pincode: userData.pincode ?? existingUser.address?.pincode ?? "",
              state: userData.state ?? existingUser.address?.state ?? "",
            };

            delete updated.line1;
            delete updated.city;
            delete updated.pincode;
            delete updated.state;
          }

          return updated;
        };

        // Update in users array
        const userIndex = state.users.findIndex((user) => user.id === userId);
        if (userIndex !== -1) {
          state.users[userIndex] = mergeUser(state.users[userIndex]);
        }

        // Update in search results
        if (state.isSearchMode) {
          const searchUserIndex = state.searchResults.findIndex(
            (user) => user.id === userId
          );
          if (searchUserIndex !== -1) {
            state.searchResults[searchUserIndex] = mergeUser(
              state.searchResults[searchUserIndex]
            );
          }
        }

        // Update selected user if it's the same user
        if (state.selectedUser && state.selectedUser.id === userId) {
          state.selectedUser = mergeUser(state.selectedUser);
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.error.message;
      })

      // Reset user password
      .addCase(resetUserPassword.pending, (state) => {
        state.resettingPassword = true;
        state.resetPasswordError = null;
        state.sentPasswordReset = false;
      })
      .addCase(resetUserPassword.fulfilled, (state, action) => {
        state.resettingPassword = false;
        state.sentPasswordReset = true;
        state.resetPasswordResults = action.payload.message;

        const { email } = action.payload.data;

        // Update user timestamps in all relevant arrays
        const updateUserTimestamps = (user) => ({
          ...user,
          lastPasswordResetRequestAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Update in users array
        const userIndex = state.users.findIndex((u) => u.email === email);
        if (userIndex !== -1) {
          state.users[userIndex] = updateUserTimestamps(state.users[userIndex]);
        }

        // Update in search results
        const searchIndex = state.searchResults.findIndex(
          (u) => u.email === email
        );
        if (searchIndex !== -1) {
          state.searchResults[searchIndex] = updateUserTimestamps(
            state.searchResults[searchIndex]
          );
        }

        // Update selected user
        if (state.selectedUser && state.selectedUser.email === email) {
          state.selectedUser = updateUserTimestamps(state.selectedUser);
        }
      })
      .addCase(resetUserPassword.rejected, (state, action) => {
        state.resettingPassword = false;
        state.resetPasswordError =
          action?.payload?.[0]?.message || "Failed to send password reset link";
      })

      // Update user permissions
      .addCase(updateUserPermissions.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateUserPermissions.fulfilled, (state, action) => {
        state.updating = false;

        const { result } = action.payload;
        const { userId, changes, timestamp } = result.data;

        // Build updated user object based on API response
        const updateUserPermissions = (user) => {
        

          const updatedUser = {
            ...user,
            role: changes?.role ? changes.role.to : user.role,
            permissions: changes?.permissions
              ? changes.permissions.to.map((p) => p)
              : user.permissions,
            updatedAt: timestamp || new Date().toISOString(),
          };

       
          return updatedUser;
        };

        // Update in users array
        const userIndex = state.users.findIndex((user) => user.id === userId);
    
        if (userIndex !== -1) {
          state.users[userIndex] = updateUserPermissions(
            state.users[userIndex]
          );
        }

        // Update in search results
        if (state.isSearchMode) {
          const searchUserIndex = state.searchResults.findIndex(
            (user) => user.id === userId
          );
          if (searchUserIndex !== -1) {
            state.searchResults[searchUserIndex] = updateUserPermissions(
              state.searchResults[searchUserIndex]
            );
          }
        }

        // Update selected user if it's the same user
        if (state.selectedUser && state.selectedUser.id === userId) {
          state.selectedUser = updateUserPermissions(state.selectedUser);
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

        // Only add to local state if we have valid response data
        if (result.success && result.data) {
          // Create new user object for local state
          const newUser = {
            id: result.data.userId,
            userCode: result.data.userCode,
            name: action.meta.arg.name,
            email: action.meta.arg.email,
            phone: action.meta.arg.phone,
            alternatePhone: action.meta.arg.alternatePhone || "",
            department: action.meta.arg.department || "",
            designation: action.meta.arg.designation || "",
            role: action.meta.arg.role,
            permissions: action.meta.arg.permissions || [],
            dateOfJoining: action.meta.arg.dateOfJoining,
            status: result.data.status || "pending",
            twoFactorEnabled: false,
            invitedBy: "Admin User",
            emailSent: result.data.emailSent,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Add to beginning of users array
          state.users.unshift(newUser);
        }
      })

      .addCase(inviteUser.rejected, (state, action) => {
        state.inviting = false;

        // Handle different error payload formats
        if (action.payload) {
          // Structured error from rejectWithValue
          state.inviteError = action.payload.message || "Failed to invite user";
          state.inviteErrors = action.payload.errors || [];
        } else {
          // Fallback for unexpected errors
          state.inviteError =
            action.error?.message || "An unexpected error occurred";
          state.inviteErrors = [
            {
              field: "unknown",
              message: state.inviteError,
            },
          ];
        }
      })

      .addCase(resendInvite.pending, (state) => {
        state.reinviting = true;
        state.reinviteError = null;
        state.sentReinvite = false;
      })
      .addCase(resendInvite.fulfilled, (state, action) => {
        state.reinviting = false;
        state.sentReinvite = true;

        const { email, emailSent, sentAt } = action.payload.data;

        // Update user in users list
        const userIndex = state.users.findIndex((u) => u.email === email);
        if (userIndex !== -1) {
          state.users[userIndex] = {
            ...state.users[userIndex],
            emailSent: emailSent ?? true,
            lastInvitationSentAt: sentAt,
            isInvitationLinkResent: true,
          };
        }

        // Update in searchResults if present
        const searchIndex = state.searchResults.findIndex(
          (u) => u.email === email
        );
        if (searchIndex !== -1) {
          state.searchResults[searchIndex] = {
            ...state.searchResults[searchIndex],
            emailSent: emailSent ?? true,
            lastInvitationSentAt: sentAt,
            isInvitationLinkResent: true,
          };
        }

        // Update selectedUser if it matches
        if (state.selectedUser && state.selectedUser.email === email) {
          state.selectedUser = {
            ...state.selectedUser,
            emailSent: emailSent ?? true,
            lastInvitationSentAt: sentAt,
            isInvitationLinkResent: true,
          };
        }
      })
      .addCase(resendInvite.rejected, (state, action) => {
        state.reinviting = false;

        state.reinviteError =
          action?.payload[0]?.message || "Failed to resend invite";
      })
      // Fetch permissions
      .addCase(fetchPermissions.pending, (state) => {
        state.permissionsLoading = true;
        state.permissionsError = null;
      })
      .addCase(fetchPermissions.fulfilled, (state, action) => {
        state.permissionsLoading = false;
        state.permissionsData = action.payload.data;
      })
      .addCase(fetchPermissions.rejected, (state, action) => {
        state.permissionsLoading = false;
        state.permissionsError = action.error.message;
      });
  },
});

export const {
  setSearchTerm,
  setSelectedDepartment,
  setSelectedRole,
  setSelectedStatus,
  setCurrentPage,
  setSelectedUser,
  clearSelectedUser,
  clearFilters,
  clearSearch,
  setSearchMode,
  clearUpdateError,
  clearPermissionsError,
  clearInviteError,
  clearResetPasswordError,
  clearResetPasswordResults,
} = usersSlice.actions;

export default usersSlice.reducer;
