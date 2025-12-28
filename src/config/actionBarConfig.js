import {
  Users,
  ListPlus,
  ShoppingBag,
  FileText,
  CirclePlus,
  UserPlus,
  Plus,
} from "lucide-react";

// Import your Redux slices and selectors
import {
  // Services/Bookings slice
  fetchBookings,
  searchBookings,
  resetState as resetServicesState,
  clearSearch as clearServicesSearch,
  clearFilters as clearServicesFilters,
  setSearchField as setServicesSearchField,
  setSearchQuery as setServicesSearchQuery,
  goToNextPage as goServicesNextPage,
  goToPrevPage as goServicesPrevPage,
  filterBookings,
  selectBookingsStats,
  selectLoadingStates as selectServicesLoadingStates,
  selectActiveStates as selectServicesActiveStates,
  selectSearchState as selectServicesSearchState,
} from "@/store/slices/servicesSlice";

import {
  // Customers slice
  fetchCustomers,
  searchCustomers,
  resetState as resetCustomersState,
  clearSearch as clearCustomersSearch,
  clearFilters as clearCustomersFilters,
  setSearchField as setCustomersSearchField,
  setSearchQuery as setCustomersSearchQuery,
  goToNextPage as goCustomersNextPage,
  goToPrevPage as goCustomersPrevPage,
  filterCustomers,
  selectCustomersStats,
  selectLoadingStates as selectCustomersLoadingStates,
  selectActiveStates as selectCustomersActiveStates,
  selectSearchState as selectCustomersSearchState,
} from "@/store/slices/customersSlice";

import {
  fetchInfluencers,
  searchInfluencers,
  resetState as resetInfluencersState,
  clearSearch as clearInfluencersSearch,
  clearFilters as clearInfluencersFilters,
  setSearchField as setInfluencersSearchField,
  setSearchQuery as setInfluencersSearchQuery,
  goToNextPage as goInfluencersNextPage,
  goToPrevPage as goInfluencersPrevPage,
  filterInfluencers,
  selectInfluencersStats,
  selectInfluencersLoadingStates,
  selectInfluencersActiveStates,
  selectInfluencersSearchState,
} from "@/store/slices/influencersSlice";

// Import your export functions
import {
  exportServiceBookingsToExcel,
  exportCustomersToExcel,
  exportInfluencersToExcel
} from "@/utils/server/utils";

// Services/Bookings Configuration
export const servicesActionBarConfig = {
  config: {
    entityName: "Service Booking",
    entityNamePlural: "Service Bookings",
    description: "Manage your Bookings and their details",
    icon: ListPlus,
    className: "services-ab", // Use existing CSS class
    showAddButton: true,
    addButtonText: "Add new Booking",
    addButtonIcon: CirclePlus,
  },

  selectors: {
    selectStats: selectBookingsStats,
    selectLoadingStates: selectServicesLoadingStates,
    selectActiveStates: selectServicesActiveStates,
    selectSearchState: selectServicesSearchState,
  },

  actions: {
    fetchData: fetchBookings,
    searchData: searchBookings,
    resetState: resetServicesState,
    clearSearch: clearServicesSearch,
    clearFilters: clearServicesFilters,
    setSearchField: setServicesSearchField,
    setSearchQuery: setServicesSearchQuery,
    goToNextPage: goServicesNextPage,
    goToPrevPage: goServicesPrevPage,
  },

  searchOptions: [
    { value: "service_booking_id", label: "Service Booking ID" },
    { value: "pay_id", label: "Payment ID" },
    { value: "razorpay_order_id", label: "Order ID" },
    { value: "invoiceNumber", label: "Invoice Number" },
  ],

  detectField: (value) => {
    if (/^SBID[0-9a-z]+$/i.test(value)) return "service_booking_id";
    if (/^pay_[0-9a-z]+$/i.test(value)) return "pay_id";
    if (/^order_[0-9a-z]+$/i.test(value)) return "razorpay_order_id";
    if (/^AFIN\/INV\/\d{4}\/\d{2}\/\d{4,}$/i.test(value))
      return "invoiceNumber";
    return null;
  },
};

export const servicesFilterConfig = {
  config: {
    entityName: "Service Booking",
    entityNamePlural: "Service Bookings",
    className: "", // Use existing CSS class
  },

  selectors: {
    selectLoadingStates: selectServicesLoadingStates,
    selectExportData: (state) => state.services.exportData,
  },

  actions: {
    filterDataAction: filterBookings,
  },

  fieldOptions: [
    { label: "Select Field", value: "" },
    { label: "Service Booking ID", value: "service_booking_id" },
    { label: "Payment ID", value: "pay_id" },
    { label: "Razorpay Order ID", value: "razorpay_order_id" },
    { label: "Invoice Number", value: "invoiceNumber" },
    { label: "Service ID", value: "service_details.service_id" },
    { label: "User ID", value: "user_details.uid" },
    { label: "Phone Number", value: "user_details.phone" },
    { label: "Email Address", value: "user_details.email" },
    { label: "Master Status", value: "master_status" },
  ],

  exportFunction: exportServiceBookingsToExcel,
};

// Customers Configuration
export const customersActionBarConfig = {
  config: {
    entityName: "Customer",
    entityNamePlural: "Customers",
    description: "Manage your customers and their details",
    icon: Users,
    className: "customers-ab",
    showAddButton: true,
    addButtonText: "Add new Customer",
    addButtonIcon: UserPlus,
  },

  selectors: {
    selectStats: selectCustomersStats,
    selectLoadingStates: selectCustomersLoadingStates,
    selectActiveStates: selectCustomersActiveStates,
    selectSearchState: selectCustomersSearchState,
  },

  actions: {
    fetchData: fetchCustomers,
    searchData: searchCustomers,
    resetState: resetCustomersState,
    clearSearch: clearCustomersSearch,
    clearFilters: clearCustomersFilters,
    setSearchField: setCustomersSearchField,
    setSearchQuery: setCustomersSearchQuery,
    goToNextPage: goCustomersNextPage,
    goToPrevPage: goCustomersPrevPage,
  },

  searchOptions: [
    { value: "uid", label: "User ID" },
    { value: "email", label: "Email Address" },
    { value: "phoneNumber", label: "Phone Number" },
  ],

  detectField: (value) => {
    if (/^[A-Za-z0-9_-]{10,}$/i.test(value)) return "uid"; // Firestore doc id
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email"; // email
    if (/^\+?\d{7,15}$/.test(value)) return "phoneNumber"; // phone number
    return null;
  },
};

export const customersFilterConfig = {
  config: {
    entityName: "Customer",
    entityNamePlural: "Customers",
    className: "", // Use existing CSS class
  },

  selectors: {
    selectLoadingStates: selectCustomersLoadingStates,
    selectExportData: (state) => state.customers.exportData,
  },

  actions: {
    filterDataAction: filterCustomers,
  },

  fieldOptions: [
    { label: "Select Field", value: "" },
    { label: "User ID", value: "uid" },
    { label: "Phone Number", value: "phoneNumber" },
    { label: "Email Address", value: "email" },
    { label: "Account Status", value: "accountStatus" },
  ],

  exportFunction: exportCustomersToExcel,
};

// Influencers Configuration
export const influencersActionBarConfig = {
  config: {
    entityName: "Influencer",
    entityNamePlural: "Influencers",
    description: "Manage your influencers and their details",
    icon: Users,
    className: "influncer-ab",
    showAddButton: true,
    addButtonText: "Add new Influencer",
    addButtonIcon: UserPlus,
  },

  selectors: {
    selectStats: selectInfluencersStats,
    selectLoadingStates: selectInfluencersLoadingStates,
    selectActiveStates: selectInfluencersActiveStates,
    selectSearchState: selectInfluencersSearchState,
  },

  actions: {
    fetchData: fetchInfluencers,
    searchData: searchInfluencers,
    resetState: resetInfluencersState,
    clearSearch: clearInfluencersSearch,
    clearFilters: clearInfluencersFilters,
    setSearchField: setInfluencersSearchField,
    setSearchQuery: setInfluencersSearchQuery,
    goToNextPage: goInfluencersNextPage,
    goToPrevPage: goInfluencersPrevPage,
  },

  searchOptions: [
    { value: "id", label: "Influencer ID" },
    { value: "email", label: "Email Address" },
    { value: "phone", label: "Phone Number" },
    { value: "lowercase_name", label: "Name" },
  ],

  detectField: (value) => {
    if (/^influencer_[A-Za-z0-9]+$/.test(value)) return "id"; // Influencer ID format
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email"; // Email
    if (/^\+?\d{7,15}$/.test(value)) return "phone"; // Phone number
    if (/^[a-zA-Z0-9_]+$/.test(value) && value.length > 2)
      return "lowercase_name"; // Username
    return "lowercase_name"; // Default to name for any other text
  },
};

export const influencersFilterConfig = {
  config: {
    entityName: "Influencer",
    entityNamePlural: "Influencers",
    className: "",
  },

  selectors: {
    selectLoadingStates: selectInfluencersLoadingStates,
    selectExportData: (state) => state.influencers.exportData,
  },

  actions: {
    filterDataAction: filterInfluencers,
  },

  fieldOptions: [
    { label: "Select Field", value: "" },
    { label: "Influencer ID", value: "id" },
    { label: "Phone Number", value: "phone" },
    { label: "Email Address", value: "email" },
    { label: "Name", value: "lowercase_name" },
  ],

  exportFunction: exportInfluencersToExcel,
};

// Helper function to create a basic config for any new route
export const createActionBarConfig = ({
  entityName,
  entityNamePlural,
  description,
  icon,
  className,
  showAddButton = false,
  addButtonText = "Add New",
  addButtonIcon = Plus,
  selectors,
  actions,
  searchOptions = [],
  detectField = null,
}) => ({
  config: {
    entityName,
    entityNamePlural,
    description,
    icon,
    className,
    showAddButton,
    addButtonText,
    addButtonIcon,
  },
  selectors,
  actions,
  searchOptions,
  detectField,
});

export const createFilterConfig = ({
  entityName,
  entityNamePlural,
  className,
  selectors,
  actions,
  fieldOptions = [],
  exportFunction = null,
  quickFilters = [
    { label: "7 Days", value: "last7days" },
    { label: "15 Days", value: "last15days" },
    { label: "This Month", value: "thisMonth" },
    { label: "3 Months", value: "last3months" },
    { label: "6 Months", value: "last6months" },
    { label: "This Year", value: "thisYear" },
  ],
}) => ({
  config: {
    entityName,
    entityNamePlural,
    className,
  },
  selectors,
  actions,
  fieldOptions,
  exportFunction,
  quickFilters,
});
