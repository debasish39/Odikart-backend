import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
        "REJECTED",
      ],
      default: "PENDING",
      index: true,
    },

    bankAccount: {
      accountHolderName: {
        type: String,
        required: true,
        trim: true,
      },
      accountNumber: {
        type: String,
        required: true,
        trim: true,
      },
      ifsc: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
      },
      bankName: {
        type: String,
        default: "",
        trim: true,
      },
    },

    provider: {
      type: String,
      enum: ["INTERNAL", "RAZORPAY", "CASHFREE", "OTHER"],
      default: "INTERNAL",
    },

    providerPayoutId: {
      type: String,
      default: "",
      trim: true,
    },

    referenceId: {
      type: String,
      default: "",
      trim: true,
    },

    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    adminNote: {
      type: String,
      default: "",
      trim: true,
    },

    failureReason: {
      type: String,
      default: "",
      trim: true,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

withdrawalSchema.index({ sellerId: 1, createdAt: -1 });
withdrawalSchema.index({ sellerId: 1, status: 1, createdAt: -1 });

export default mongoose.model("Withdrawal", withdrawalSchema);
