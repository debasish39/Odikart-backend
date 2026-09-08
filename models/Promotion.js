import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
    },

    couponCode: {
      type: String,
      default: null,
      trim: true,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    targetAudience: {
      type: String,
      enum: [
        "all",
        "new_users",
        "customers",
        "inactive_users",
      ],
      default: "all",
    },

    status: {
      type: String,
      enum: [
        "draft",
        "scheduled",
        "sending",
        "sent",
        "failed",
      ],
      default: "draft",
    },

    scheduledAt: {
      type: Date,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    totalRecipients: {
      type: Number,
      default: 0,
    },

    totalSent: {
      type: Number,
      default: 0,
    },

    totalFailed: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Promotion =
  mongoose.models.Promotion ||
  mongoose.model("Promotion", promotionSchema);

export default Promotion;