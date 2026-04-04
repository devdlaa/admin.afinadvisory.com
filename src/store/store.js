import { configureStore } from "@reduxjs/toolkit";
import serviceReducer from "./slices/servicesSlice";
import userReducer from "./slices/userSlice";
import partnerReducer from "./slices/influencersSlice";
import customerReducers from "./slices/customersSlice";
import couponsReducer from "./slices/couponsSlice";
import comissionsReducers from "./slices/commissionsSlice";
import paymentsReducers from "./slices/paymentSlice";
import paymentLinkReducer from "./slices/createPaymentLink";
import paymentLinksPageReducer from "./slices/paymentLinksPageSlice";
import sessionReducer from "./slices/sessionSlice";
import toastMiddleware from "./toastMiddleware";
import entityReducer from "./slices/entitySlice";
import ReconcileReducer from "./slices/reconcileSlice";
import documentsReducer from "./slices/documentSlice";
import companyProfileReducer from "./slices/companyProfileSlice";
import permissionsReducer from "./slices/permissionSlice";
import notificationReducer, {
  setSoundEnabled,
} from "./slices/notificationSlice";
import invoiceReducer from "./slices/invoiceSlice";
import taskReducer from "./slices/taskSlice";
import TaskDetailReducer from "./slices/taskDetailsSlice";
import taskCategoryReducer from "./slices/taskCategorySlice";
import outstandingReducer from "./slices/outstandingSlice";
import TaskTimelineReducer from "./slices/taskTimelineSlice";
import LeadTimelineReducer from "./slices/leadTimelineSlice";
import { forceLogoutMiddleware } from "@/lib/forceLogoutMiddleware";
import chargesReducer from "./slices/chargesSlice";
import taskSearchReducer from "./slices/tasksSearchSlice";
import reminderMetaReducer from "./slices/reminderMetaSlice";
import remindersReducer from "./slices/remindersSlice";
import leadsMetReducer from "./slices/leadsMetaSlice";
import leadPipelinesReducer from "./slices/leadPipelinesSlice";
import InfluncerNewReducer from "./slices/influncersSlice";
import leadContactReducer from "./slices/leadContactSlice";
import leadsReducer from "./slices/leadsSlice";
import leadDetailsReducer from "./slices/leadDetails.slice";
import leadAnalyticsReducer from "./slices/leadAnalyticsSlice";
import activitiesReducer from "./slices/activities.slice";
export const store = configureStore({
  reducer: {
    session: sessionReducer,
    user: userReducer,
    influencers: partnerReducer,
    influencers_new: InfluncerNewReducer,
    services: serviceReducer,
    customers: customerReducers,
    coupons: couponsReducer,
    commissions: comissionsReducers,
    payments: paymentsReducers,
    paymentLink: paymentLinkReducer,
    paymentLinks: paymentLinksPageReducer,
    entity: entityReducer,
    notifications: notificationReducer,
    taskCategory: taskCategoryReducer,
    task: taskReducer,
    reconcile: ReconcileReducer,
    taskDetail: TaskDetailReducer,
    taskTimeline: TaskTimelineReducer,
    charges: chargesReducer,
    invoice: invoiceReducer,
    outstanding: outstandingReducer,
    documents: documentsReducer,
    companyProfile: companyProfileReducer,
    permissions: permissionsReducer,
    taskSearch: taskSearchReducer,
    reminderMeta: reminderMetaReducer,
    remindersSlice: remindersReducer,
    leadsMeta: leadsMetReducer,
    leadPipelines: leadPipelinesReducer,
    leadContact: leadContactReducer,
    leadTimeline: LeadTimelineReducer,
    leads: leadsReducer,
    leadDetails: leadDetailsReducer,
    leadAnalytics: leadAnalyticsReducer,
    activities: activitiesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(forceLogoutMiddleware)
      .concat(toastMiddleware),
});

/* -----------------------------
   Restore notification sound preference
   ----------------------------- */

if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("notification_sound_enabled");

    if (saved !== null) {
      store.dispatch(setSoundEnabled(saved === "true"));
    }
  } catch (err) {
    console.warn("Failed to load notification sound preference", err);
  }
}
