import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },

  title: String,
  description: String,

  discount: {
    kind: { type: String, enum: ["flat", "percent"], required: true },
    amount: { type: Number, required: true },
    maxDiscount: Number,
  },

  linkedServices: [{ type: String }],
  linkedCustomers: [{ type: String }],

  appliesTo: {
    users: { type: String, enum: ["all", "new"], default: "all" },
  },

  usageLimits: {
    perUser: { type: Number, default: 1 },
    total: Number,
    used: { type: Number, default: 0 },
  },

  validFrom: { type: Date, default: Date.now },
  expiresAt: Date,

  state: {
    type: String,
    enum: ["active", "expired", "inactive", "usedUp"],
    default: "active",
  },

  isInfluencerCoupon: { type: Boolean, default: false },
  influencerId: { type: String, default: "" },

  commission: {
    kind: { type: String, enum: ["percent", "fixed"] },
    amount: { type: Number, default: 0 },
    maxCommission: { type: Number, default: 0 },
  },

  createdBy: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);
