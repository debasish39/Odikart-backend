import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "SALE",
        "REFUND",
        "WITHDRAWAL",
        "SETTLEMENT",
        "ADJUSTMENT",
        "REVERSAL",
      ],
      required: true,
      index: true,
    },

    direction: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
    },

    grossAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    commission: {
      type: Number,
      default: 0,
      min: 0,
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

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

    withdrawalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Withdrawal",
      default: null,
      index: true,
    },

    provider: {
      type: String,
      enum: ["INTERNAL", "RAZORPAY", "CASHFREE", "STRIPE", "OTHER"],
      default: "INTERNAL",
    },

    referenceId: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    idempotencyKey: {
      type: String,
      default: undefined,
      unique: true,
      sparse: true,
      index: true,
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
        "REVERSED",
      ],
      default: "COMPLETED",
      index: true,
    },

    createdBy: {
      type: String,
      enum: ["SELLER", "ADMIN", "SYSTEM"],
      default: "SYSTEM",
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    failureReason: {
      type: String,
      default: "",
      trim: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    processedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

walletTransactionSchema.index(
  { sellerId: 1, orderId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: "SALE",
      orderId: { $exists: true, $ne: null },
    },
  }
);

walletTransactionSchema.index({ sellerId: 1, createdAt: -1 });
walletTransactionSchema.index({ withdrawalId: 1, createdAt: -1 });

export default mongoose.model("WalletTransaction", walletTransactionSchema);
