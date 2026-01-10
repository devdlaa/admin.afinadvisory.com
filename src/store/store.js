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
import notificationReducer from "./slices/notificationSlice";
import taskReducer from "./slices/taskSlice";
import TaskDetailReducer from "./slices/taskDetailsSlice";
import taskCategoryReducer from "./slices/taskCategorySlice";
import TaskTimelineReducer from "./slices/taskTimelineSlice";


export const store = configureStore({
  reducer: {
    session: sessionReducer,
    user: userReducer,
    influencers: partnerReducer,
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
    taskDetail : TaskDetailReducer,
    taskTimeline : TaskTimelineReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(toastMiddleware),
});
