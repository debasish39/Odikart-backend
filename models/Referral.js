import mongoose from "mongoose";

const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    referralCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "registered",
        "qualified",
        "rewarded",
        "cancelled",
      ],
      default: "registered",
    },

    friendCouponAmount: {
      type: Number,
      default: 100,
    },

    referrerRewardAmount: {
      type: Number,
      default: 100,
    },

    qualifyingOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    rewardGivenAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Referral =
  mongoose.models.Referral ||
  mongoose.model("Referral", referralSchema);

export default Referral;