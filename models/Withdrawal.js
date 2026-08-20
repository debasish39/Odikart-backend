import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    // =====================================
    // SELLER
    // =====================================

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // =====================================
    // AMOUNT
    // =====================================

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    currency: {
      type: String,
      default: "INR",
    },

    // =====================================
    // STATUS
    // =====================================

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

    // =====================================
    // BANK ACCOUNT
    // =====================================

    bankAccount: {
      accountHolderName: {
        type: String,
        required: true,
        trim: true,
      },

      accountNumber: {
        type: String,
        required: true,
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
      },
    },

    // =====================================
    // PROVIDER
    // =====================================

    provider: {
      type: String,

      enum: [
        "INTERNAL",
        "RAZORPAY",
        "CASHFREE",
        "OTHER",
      ],

      default: "INTERNAL",
    },

    providerPayoutId: {
      type: String,
      default: "",
    },

    referenceId: {
      type: String,
      default: "",
    },

    // =====================================
    // ADMIN
    // =====================================

    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    adminNote: {
      type: String,
      default: "",
    },

    // =====================================
    // FAILURE
    // =====================================

    failureReason: {
      type: String,
      default: "",
    },

    // =====================================
    // DATES
    // =====================================

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

  {
    timestamps: true,
  }
);


// =====================================
// SELLER WITHDRAWAL HISTORY
// =====================================

withdrawalSchema.index({
  sellerId: 1,
  createdAt: -1,
});


export default mongoose.model(
  "Withdrawal",
  withdrawalSchema
);