import mongoose from "mongoose";

const referralWalletTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["credit", "debit", "reversal"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },

    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    referral: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Referral",
      default: null,
      index: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  {
    timestamps: true,
  }
);

const ReferralWalletTransaction =
  mongoose.models.ReferralWalletTransaction ||
  mongoose.model(
    "ReferralWalletTransaction",
    referralWalletTransactionSchema
  );

export default ReferralWalletTransaction;