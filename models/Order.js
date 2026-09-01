import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    /* =====================================
       USER DETAILS
    ===================================== */

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    fullname: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    /* =====================================
       ORDER DETAILS
    ===================================== */

    orderNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    /*
      Keep this only if you intentionally use it
      for single-seller orders / backward compatibility.

      For marketplace orders, use items.sellerId.
    */

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    sellerName: {
      type: String,
      default: "",
      trim: true,
    },

    /* =====================================
       DELIVERY ADDRESS
    ===================================== */

    deliveryAddress: {
      customer: {
        fullName: {
          type: String,
          required: true,
          trim: true,
        },

        phone: {
          type: String,
          required: true,
          trim: true,
        },

        alternatePhone: {
          type: String,
          default: "",
          trim: true,
        },

        email: {
          type: String,
          default: "",
          trim: true,
        },
      },

      address: {
        addressLine1: {
          type: String,
          required: true,
          trim: true,
        },

        addressLine2: {
          type: String,
          default: "",
          trim: true,
        },

        landmark: {
          type: String,
          default: "",
          trim: true,
        },

        area: {
          type: String,
          required: true,
          trim: true,
        },

        city: {
          type: String,
          required: true,
          trim: true,
        },

        district: {
          type: String,
          required: true,
          trim: true,
        },

        state: {
          type: String,
          required: true,
          trim: true,
        },

        postalCode: {
          type: String,
          required: true,
          match: /^[1-9][0-9]{5}$/,
        },

        country: {
          type: String,
          default: "India",
          trim: true,
        },
      },

      location: {
        latitude: {
          type: Number,
        },

        longitude: {
          type: Number,
        },

        formattedAddress: {
          type: String,
          default: "",
        },

        googlePlaceId: {
          type: String,
          default: "",
        },

        plusCode: {
          type: String,
          default: "",
        },

        mapUrl: {
          type: String,
          default: "",
        },
      },

      preference: {
        addressType: {
          type: String,
          enum: [
            "Home",
            "Office",
            "Other",
          ],
          default: "Home",
        },

        preferredDeliveryTime: {
          type: String,
          enum: [
            "",
            "Morning",
            "Afternoon",
            "Evening",
            "Anytime",
          ],
          default: "",
        },

        deliveryInstructions: {
          type: String,
          default: "",
        },

        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    },

    /* =====================================
       PRICE DETAILS
    ===================================== */

    pricing: {
      subtotal: {
        type: Number,
        required: true,
        default: 0,
      },

      shippingCharge: {
        type: Number,
        default: 0,
      },

      tax: {
        type: Number,
        default: 0,
      },

      couponCode: {
        type: String,
        default: "",
        trim: true,
      },

      couponDiscount: {
        type: Number,
        default: 0,
      },

      couponType: {
        type: String,
        enum: [
          "",
          "FIXED",
          "PERCENTAGE",
        ],
        default: "",
      },

      total: {
        type: Number,
        required: true,
        default: 0,
      },
    },

    /* =====================================
       MARKETPLACE REVENUE
    ===================================== */

    marketplace: {
      commissionAmount: {
        type: Number,
        default: 0,
      },

      sellerAmount: {
        type: Number,
        default: 0,
      },

      platformProfit: {
        type: Number,
        default: 0,
      },
    },

    /* =====================================
       PAYMENT
    ===================================== */

    payment: {
      method: {
        type: String,

        enum: [
          "COD",
          "Razorpay",
        ],

        default: "COD",
      },

      status: {
        type: String,

        enum: [
          "Pending",
          "Paid",
          "Failed",
          "Refunded",
        ],

        default: "Pending",
      },

      transactionId: {
        type: String,
        default: "",
      },

      paymentFailureReason: {
        type: String,
        default: "",
      },

      paymentDate: {
        type: Date,
      },

      gateway: {
        orderId: {
          type: String,
          default: "",
        },

        paymentId: {
          type: String,
          default: "",
        },

        signature: {
          type: String,
          default: "",
        },
      },
    },

    /* =====================================
       REFUND
    ===================================== */

    refund: {
      status: {
        type: String,

        enum: [
          "NotRequested",
          "Processing",
          "Completed",
          "Failed",
        ],

        default: "NotRequested",
      },

      amount: {
        type: Number,
        default: 0,
      },

      refundId: {
        type: String,
        default: "",
      },

      refundMethod: {
        type: String,

        enum: [
          "",
          "Razorpay",
          "UPI",
          "Bank Transfer",
          "Cash",
        ],

        default: "",
      },

      refundTransactionId: {
        type: String,
        default: "",
      },

      refundedAt: {
        type: Date,
        default: null,
      },

      remark: {
        type: String,
        default: "",
      },
    },

    /* =====================================
       ORDER STATUS
    ===================================== */

    status: {
      type: String,

      enum: [
        "Pending Payment",

        "Confirmed",

        "Processing",

        "Packed",

        "Ready for Pickup",

        "Shipped",

        "In Transit",

        "Out for Delivery",

        "Delivered",

        /* Return */

        "Return Requested",

        "Return Approved",

        "Return Pickup Scheduled",

        "Return Picked Up",

        "Received by Admin",

        "Inspection",

        "Return Rejected",

        "Returned",

        "Refund Processing",

        "Refund Completed",

        /* Cancellation */

        "Cancelled",
      ],

      default: "Confirmed",

      index: true,
    },

    /* =====================================
       STATUS HISTORY
    ===================================== */

    statusHistory: [
      {
        status: {
          type: String,
        },

        date: {
          type: Date,
          default: Date.now,
        },

        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        remark: {
          type: String,
          default: "",
        },
      },
    ],

    /* =====================================
       RETURN
    ===================================== */

    returnDetails: {
      requested: {
        type: Boolean,
        default: false,
      },

      resolution: {
        type: String,

        enum: [
          "Refund",
          "Replacement",
          "Exchange",
        ],

        default: "Refund",
      },

      requestedAt: Date,

      approvedAt: Date,

      rejectedAt: Date,

      pickupScheduledAt: Date,

      pickedUpAt: Date,

      receivedByAdminAt: Date,

      inspectedAt: Date,

      refundStartedAt: Date,

      refundedAt: Date,

      reason: {
        type: String,
        default: "",
      },

      reasonType: {
        type: String,

        enum: [
          "Damaged",
          "Wrong Product",
          "Defective",
          "Missing Item",
          "Expired",
          "Quality Issue",
          "Changed Mind",
          "Other",
        ],

        default: "Other",
      },

      customerComment: {
        type: String,
        default: "",
      },

      sellerRemark: {
        type: String,
        default: "",
      },

      adminRemark: {
        type: String,
        default: "",
      },

      inspectionStatus: {
        type: String,

        enum: [
          "Pending",
          "Passed",
          "Failed",
        ],

        default: "Pending",
      },

      refundAmount: {
        type: Number,
        default: 0,
      },

      images: {
        type: [String],
        default: [],
      },

      videos: {
        type: [String],
        default: [],
      },
    },

    /* =====================================
       ORDER ITEMS
    ===================================== */

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },

        variantSku: {
          type: String,
          required: true,
          trim: true,
        },

        title: {
          type: String,
          default: "",
        },

        slug: {
          type: String,
          default: "",
        },

        image: {
          type: String,
          default: "",
        },

        brand: {
          type: String,
          default: "",
        },

        category: {
          type: String,
          default: "",
        },

        sellerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        price: {
          type: Number,
          default: 0,
        },

        quantity: {
          type: Number,
          min: 1,
          default: 1,
        },

        tax: {
          type: Number,
          default: 0,
        },

        discount: {
          type: Number,
          default: 0,
        },

        total: {
          type: Number,
          default: 0,
        },
      },
    ],

    /* =====================================
       SHIPPING / COURIER
    ===================================== */

    shipping: {
      courier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Courier",
        default: null,
      },

      courierName: {
        type: String,
        default: "",
      },

      trackingNumber: {
        type: String,
        default: "",
        index: true,
      },

      trackingUrl: {
        type: String,
        default: "",
      },

      estimatedDelivery: {
        type: Date,
      },

      shippedAt: {
        type: Date,
      },

      deliveredAt: {
        type: Date,
      },
    },

    /* =====================================
       CANCELLATION
    ===================================== */

    cancellation: {
      allowed: {
        type: Boolean,
        default: true,
      },

      cancelBefore: {
        type: Date,

        default: () =>
          new Date(
            Date.now() +
              24 * 60 * 60 * 1000,
          ),
      },

      cancelled: {
        type: Boolean,
        default: false,
      },

      cancelledAt: {
        type: Date,
        default: null,
      },

      cancelledBy: {
        type: String,

        enum: [
          "Customer",
          "Seller",
          "Admin",
          "",
        ],

        default: "",
      },

      reason: {
        type: String,
        default: "",
      },
    },

    /* =====================================
       INVENTORY
    ===================================== */

    stock: {
      deducted: {
        type: Boolean,
        default: false,
      },

      restored: {
        type: Boolean,
        default: false,
      },

      deductedAt: {
        type: Date,
        default: null,
      },

      restoredAt: {
        type: Date,
        default: null,
      },
    },

    /* =====================================
       TIMELINE
    ===================================== */

    timeline: {
      confirmedAt: Date,

      packedAt: Date,

      shippedAt: Date,

      outForDeliveryAt: Date,

      deliveredAt: Date,

      cancelledAt: Date,

      refundedAt: Date,
    },
  },

  {
    timestamps: true,
  },
);

/* =========================================================
   INDEXES
========================================================= */

orderSchema.index({
  createdAt: -1,
});

orderSchema.index({
  userId: 1,
  createdAt: -1,
});

orderSchema.index({
  "items.sellerId": 1,
  createdAt: -1,
});

orderSchema.index({
  status: 1,
  createdAt: -1,
});

orderSchema.index({
  "payment.status": 1,
});

orderSchema.index({
  "shipping.trackingNumber": 1,
});

/* =========================================================
   MODEL
========================================================= */

const Order =
  mongoose.models.Order ||
  mongoose.model(
    "Order",
    orderSchema,
  );

export default Order;