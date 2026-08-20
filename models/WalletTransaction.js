import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
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

    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },

    // =====================================
    // TRANSACTION TYPE
    // =====================================

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

    // =====================================
    // CREDIT / DEBIT
    // =====================================

    direction: {
      type: String,

      enum: [
        "CREDIT",
        "DEBIT",
      ],

      required: true,
    },

    // =====================================
    // SALE INFORMATION
    // =====================================

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

    // =====================================
    // TRANSACTION AMOUNT
    // =====================================

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // =====================================
    // BALANCE SNAPSHOT
    // =====================================

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

    // =====================================
    // ORDER
    // =====================================

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

    // =====================================
    // WITHDRAWAL
    // =====================================

    withdrawalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Withdrawal",
      default: null,
      index: true,
    },

    // =====================================
    // PAYMENT PROVIDER
    // =====================================

    provider: {
      type: String,

      enum: [
        "INTERNAL",
        "RAZORPAY",
        "CASHFREE",
        "STRIPE",
        "OTHER",
      ],

      default: "INTERNAL",
    },

    referenceId: {
      type: String,
      default: "",
      index: true,
    },

    // =====================================
    // IDEMPOTENCY
    // =====================================

    idempotencyKey: {
      type: String,
      default: "",
      unique: true,
      sparse: true,
      index: true,
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
        "REVERSED",
      ],

      default: "COMPLETED",
      index: true,
    },

    // =====================================
    // CREATED BY
    // =====================================

    createdBy: {
      type: String,

      enum: [
        "SELLER",
        "ADMIN",
        "SYSTEM",
      ],

      default: "SYSTEM",
    },

    // =====================================
    // DESCRIPTION
    // =====================================

    description: {
      type: String,
      default: "",
    },

    failureReason: {
      type: String,
      default: "",
    },

    note: {
      type: String,
      default: "",
    },

    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


// =====================================
// SALE DUPLICATE PROTECTION
// =====================================

walletTransactionSchema.index(
  {
    sellerId: 1,
    orderId: 1,
    type: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      type: "SALE",
      orderId: {
        $exists: true,
        $ne: null,
      },
    },
  }
);


// =====================================
// SELLER HISTORY
// =====================================

walletTransactionSchema.index({
  sellerId: 1,
  createdAt: -1,
});


// =====================================
// WITHDRAWAL HISTORY
// =====================================

walletTransactionSchema.index({
  withdrawalId: 1,
  createdAt: -1,
});


export default mongoose.model(
  "WalletTransaction",
  walletTransactionSchema
);