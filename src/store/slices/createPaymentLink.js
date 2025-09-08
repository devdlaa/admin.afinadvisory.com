import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Async thunks for API calls
export const checkExistingCustomer = createAsyncThunk(
  "paymentLink/checkExistingCustomer",
  async (searchValue, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/customers/get_customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchValue }),
      });
      const data = await response.json();

      if (!data.success) {
        return rejectWithValue(data.error);
      }
      return data.customer;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createNewCustomer = createAsyncThunk(
  "paymentLink/createNewCustomer",
  async (customerData, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/customers/add_new_customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerData),
      });
      const data = await response.json();

      if (!data.success) {
        return rejectWithValue(data.error);
      }
      return data.data.user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchServices = createAsyncThunk(
  "paymentLink/fetchServices",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/service_pricing/get");
      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error);
      }
      return data.services;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchServicePricing = createAsyncThunk(
  "paymentLink/fetchServicePricing",
  async (serviceId, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/service_pricing/get_by_id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });
      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error);
      }
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const validateCoupon = createAsyncThunk(
  "paymentLink/validateCoupon",
  async ({ code, customerId, serviceId }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/coupons/validate-promo-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, customerId, serviceId }),
      });
      const data = await response.json();

      if (!data.success) {
        return rejectWithValue(data.message);
      }
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createPaymentLink = createAsyncThunk(
  "paymentLink/createPaymentLink",
  async (paymentDetailsObject, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/admin/services/create_payment_link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentDetailsObject),
      });
      const data = await response.json();

      if (!data.success) {
        return rejectWithValue(data.error || "Failed to create payment link");
      }
      return data.paymentLink;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  // UI States
  currentStep: 1,
  loading: false,
  error: null,
  canProceedToNextStep: false,

  // Step 1 - Customer
  customerTab: "existing",
  customerEmailPhone: "",
  newCustomerData: {
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    alternatePhone: "",
    address: { state: "" },
  },
  selectedCustomer: null,
  customerMissingFields: [],

  // Step 2 - Service Selection
  services: [],
  searchTerm: "",
  selectedService: null,
  servicePricingCache: {}, // Cache for service pricing
  selectedServicePricing: null,
  selectedPlan: null,
  selectedState: "",
  quantity: 1,

  // Step 3 - Discounts
  discountTab: "coupon",
  couponCode: "",
  couponData: null,
  customDiscount: {
    type: "percentage",
    value: 0,
  },

  // Calculated amounts
  calculatedAmounts: {
    basePrice: 0,
    totalPrice: 0,
    discountAmount: 0,
    finalAmount: 0,
    gstAmount: 0,
    totalWithGst: 0,
  },

  // Step 5 - Payment Link
  paymentLink: "",
  paymentLinkCreated: false,
};

const createPaymentLinkSlice = createSlice({
  name: "paymentLink",
  initialState,
  reducers: {
    setCurrentStep: (state, action) => {
      state.currentStep = action.payload;
      state.error = null;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.canProceedToNextStep = false;
    },
    clearError: (state) => {
      state.error = null;
    },

    setCanProceedToNextStep: (state, action) => {
      state.canProceedToNextStep = action.payload;
    },

    // Step 1 actions
    setCustomerTab: (state, action) => {
      state.customerTab = action.payload;
      state.error = null;
    },
    setCustomerEmailPhone: (state, action) => {
      state.customerEmailPhone = action.payload;
    },
    setNewCustomerData: (state, action) => {
      state.newCustomerData = { ...state.newCustomerData, ...action.payload };
    },
    clearCustomerData: (state) => {
      state.selectedCustomer = null;
      state.customerEmailPhone = "";
      state.newCustomerData = initialState.newCustomerData;
      state.customerMissingFields = [];
      state.canProceedToNextStep = false;
    },

    // Update selected customer fields
    updateSelectedCustomerField: (state, action) => {
      const { field, value } = action.payload;
      if (state.selectedCustomer) {
        if (field.includes(".")) {
          const [parent, child] = field.split(".");
          state.selectedCustomer[parent] = {
            ...state.selectedCustomer[parent],
            [child]: value,
          };
        } else {
          state.selectedCustomer[field] = value;
        }

        // Remove from missing fields if now filled
        if (value && value.trim()) {
          state.customerMissingFields = state.customerMissingFields.filter(
            (f) => f !== field
          );
        }
      }
    },

    setCustomerMissingFields: (state, action) => {
      state.customerMissingFields = action.payload;
    },

    // Step 2 actions
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    },
    setSelectedService: (state, action) => {
      const service = action.payload;
      state.selectedService = service;
      state.selectedPlan = null;

      // Check if we have cached pricing for this service
      if (service && state.servicePricingCache[service.serviceId]) {
        state.selectedServicePricing =
          state.servicePricingCache[service.serviceId];
      } else {
        state.selectedServicePricing = null;
      }

      if (!service?.isMultiState) {
        state.selectedState = "";
      }
      state.quantity = 1;
    },
    setSelectedPlan: (state, action) => {
      state.selectedPlan = action.payload;
      // Recalculate amounts when plan changes
      createPaymentLinkSlice.caseReducers.calculateAmounts(state);
    },
    setSelectedState: (state, action) => {
      state.selectedState = action.payload;

      createPaymentLinkSlice.caseReducers.calculateAmounts(state);
    },
    setQuantity: (state, action) => {
      state.quantity = action.payload;
      // Recalculate amounts when quantity changes
      createPaymentLinkSlice.caseReducers.calculateAmounts(state);
    },

    // Step 3 actions
    setDiscountTab: (state, action) => {
      const newTab = action.payload;

      // Clear previous discount data when switching tabs
      if (newTab !== state.discountTab) {
        if (newTab === "coupon") {
          // Clear custom discount
          state.customDiscount = { type: "percentage", value: 0 };
        } else {
          // Clear coupon data
          state.couponCode = "";
          state.couponData = null;
        }
      }

      state.discountTab = newTab;
      // Recalculate amounts after clearing
      createPaymentLinkSlice.caseReducers.calculateAmounts(state);
    },
    setCouponCode: (state, action) => {
      state.couponCode = action.payload;
      // Clear coupon data when code changes
      if (state.couponData) {
        state.couponData = null;
        createPaymentLinkSlice.caseReducers.calculateAmounts(state);
      }
    },
    clearCouponData: (state) => {
      state.couponData = null;
      createPaymentLinkSlice.caseReducers.calculateAmounts(state);
    },
    setCustomDiscount: (state, action) => {
      state.customDiscount = { ...state.customDiscount, ...action.payload };
      // Recalculate amounts when custom discount changes
      createPaymentLinkSlice.caseReducers.calculateAmounts(state);
    },

    // Amount calculation
    calculateAmounts: (state) => {
      if (!state.selectedPlan || !state.selectedServicePricing) {
        state.calculatedAmounts = initialState.calculatedAmounts;
        return;
      }

      const planIndex = state.selectedServicePricing.AVAILABLE_PLANS?.findIndex(
        (plan) => plan.planId === state.selectedPlan.planId
      );
      const planNumber = planIndex !== -1 ? planIndex + 1 : 1;

      const stateSpecificPlan =
        state.selectedServicePricing?.isMultiState && state.selectedState
          ? state.selectedServicePricing.stateWiseExtras?.find(
              (item) =>
                item.state_name === state.selectedState &&
                item.for_plan_number === planNumber
            )
          : null;

      const basePrice = stateSpecificPlan
        ? stateSpecificPlan.extra_charges
        : state.selectedPlan.price;

      const totalPrice = basePrice * state.quantity;

      let discountAmount = 0;
      if (state.discountTab === "coupon" && state.couponData) {
        const discount = state.couponData.discount;
        const type = discount.kind === "percent" ? "percentage" : "flat";
        const value = discount.amount;

        if (type === "percentage") {
          discountAmount = totalPrice * (value / 100);
        } else {
          discountAmount = value;
        }
      } else if (
        state.discountTab === "custom" &&
        state.customDiscount.value > 0
      ) {
        if (state.customDiscount.type === "percentage") {
          discountAmount = totalPrice * (state.customDiscount.value / 100);
        } else {
          discountAmount = state.customDiscount.value;
        }
      }

      const finalAmount = Math.max(0, totalPrice - discountAmount);
      const gstRate = state.selectedServicePricing?.gstRate || 18;
      const gstAmount = (finalAmount * gstRate) / 100;

      state.calculatedAmounts = {
        basePrice: Math.round(basePrice),
        totalPrice: Math.round(totalPrice),
        discountAmount: Math.round(discountAmount),
        finalAmount: Math.round(finalAmount),
        gstAmount: Math.round(gstAmount),
        totalWithGst: Math.round(finalAmount + gstAmount),
      };
    },

    // Reset state
    resetPaymentLink: (state) => {
      return initialState;
    },

    // Clear payment link
    clearPaymentLink: (state) => {
      state.paymentLink = "";
      state.paymentLinkCreated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Check existing customer
      .addCase(checkExistingCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.canProceedToNextStep = false;
      })
      .addCase(checkExistingCustomer.fulfilled, (state, action) => {
        state.loading = false;
        const customer = action.payload;
        state.selectedCustomer = customer;

        // Check for missing required fields
        const missingFields = [];
        if (!customer.firstName) missingFields.push("firstName");
        if (!customer.lastName) missingFields.push("lastName");
        if (!customer.phoneNumber) missingFields.push("phoneNumber");
        if (!customer.address?.state) missingFields.push("address.state");

        state.customerMissingFields = missingFields;

        // Can proceed only if no missing fields
        state.canProceedToNextStep = missingFields.length === 0;
      })
      .addCase(checkExistingCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.canProceedToNextStep = false;
      })

      // Create new customer
      .addCase(createNewCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.canProceedToNextStep = false;
      })
      .addCase(createNewCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedCustomer = action.payload;
        state.customerMissingFields = [];
        state.canProceedToNextStep = true;
        // Auto-advance to step 2 for new customer creation
        state.currentStep = 2;
      })
      .addCase(createNewCustomer.rejected, (state, action) => {
        state.loading = false;
        if (action.payload.details) {
          const errorsArray = action.payload?.details?.errors || [];
          state.error = errorsArray.join(", ") || action.payload;
        } else if (action.payload.error) {
          state.error = action.payload.error?.message;
        } else {
          state.error = "Error | Please check if user already Exist";
        }
        state.error = `${state.error} , Use Existing User`;
        state.canProceedToNextStep = false;
      })

      // Fetch services
      .addCase(fetchServices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.loading = false;
        state.services = action.payload;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch service pricing
      .addCase(fetchServicePricing.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServicePricing.fulfilled, (state, action) => {
        state.loading = false;
        const pricingData = action.payload;
        state.selectedServicePricing = pricingData;

        // Cache the pricing data
        if (state.selectedService) {
          state.servicePricingCache[state.selectedService.serviceId] =
            pricingData;
        }
      })
      .addCase(fetchServicePricing.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Validate coupon
      .addCase(validateCoupon.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(validateCoupon.fulfilled, (state, action) => {
        state.loading = false;
        state.couponData = action.payload;
        createPaymentLinkSlice.caseReducers.calculateAmounts(state);
      })
      .addCase(validateCoupon.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.couponData = null;
        createPaymentLinkSlice.caseReducers.calculateAmounts(state);
      })

      // Create payment link
      .addCase(createPaymentLink.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPaymentLink.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentLink = action.payload;
        state.paymentLinkCreated = true;
        state.error = null;
      })
      .addCase(createPaymentLink.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.paymentLink = "";
        state.paymentLinkCreated = false;
      });
  },
});

export const {
  setCurrentStep,
  setError,
  clearError,
  setCanProceedToNextStep,
  setCustomerTab,
  setCustomerEmailPhone,
  setNewCustomerData,
  clearCustomerData,
  updateSelectedCustomerField,
  setCustomerMissingFields,
  setSearchTerm,
  setSelectedService,
  setSelectedPlan,
  setSelectedState,
  setQuantity,
  setDiscountTab,
  setCouponCode,
  clearCouponData,
  setCustomDiscount,
  calculateAmounts,
  resetPaymentLink,
  clearPaymentLink,
} = createPaymentLinkSlice.actions;

export default createPaymentLinkSlice.reducer;