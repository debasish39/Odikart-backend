import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({

  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },

  discountType: {
    type: String,
    enum: ["PERCENTAGE", "FIXED"],
    default: "PERCENTAGE",
  },

  discountValue: {
    type: Number,
    required: true,
  },

  minOrderAmount: {
    type: Number,
    default: 0,
  },

  maxDiscount: {
    type: Number,
    default: 0,
  },

  expiryDate: Date,

  isActive: {
    type: Boolean,
    default: true,
  },

  usedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

});

export default mongoose.model(
  "Coupon",
  couponSchema
);