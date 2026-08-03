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

  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },

  sellerName: {
    type: String,
    default: "",
  },

  /* =====================================
     DELIVERY ADDRESS
  ===================================== */

  deliveryAddress: {

    street: String,

    city: String,

    state: String,

    postcode: String,

    country: String,

  },

  /* =====================================
     PRICE DETAILS
  ===================================== */

  subtotal: {
    type: Number,
    default: 0,
    required: true,
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
    uppercase: true,
  },

  couponDiscount: {
    type: Number,
    default: 0,
  },

  couponType: {
    type: String,
    enum: ["", "FIXED", "PERCENTAGE"],
    default: "",
  },

  total: {
    type: Number,
    default: 0,
    required: true,
  },

  /* =====================================
     MARKETPLACE REVENUE
  ===================================== */

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

  /* =====================================
     PAYMENT
  ===================================== */

  paymentMethod: {
    type: String,
    enum: ["COD", "Razorpay"],
    default: "COD",
  },

  paymentStatus: {
    type: String,
    enum: [
      "Pending",
      "Paid",
      "Failed",
      "Refunded",
    ],
    default: "Pending",
    index: true,
  },

  transactionId: {
    type: String,
    default: "",
  },

  paymentDate: {
    type: Date,
    default: null,
  },

  /* =====================================
     RAZORPAY
  ===================================== */

  razorpayOrderId: {
    type: String,
    default: "",
  },

  razorpayPaymentId: {
    type: String,
    default: "",
  },

  razorpaySignature: {
    type: String,
    default: "",
  },

  /* =====================================
     REFUND
  ===================================== */

  refundId: {
    type: String,
    default: "",
  },

  refundStatus: {
    type: String,
    enum: [
      "NotRequested",
      "Processing",
      "Completed",
      "Failed",
    ],
    default: "NotRequested",
  },

  refundAmount: {
    type: Number,
    default: 0,
  },

  refundedAt: {
    type: Date,
    default: null,
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

    /* Return Flow */

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

    /* Others */

    "Cancelled"

  ],
  default: "Confirmed",
},

  statusHistory: [

    {

      status: String,

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

    }

  ],

  /* =====================================
     RETURN
  ===================================== */

 returnDetails: {
    requested: {
        type: Boolean,
        default: false,
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
        enum: ["Pending", "Passed", "Failed"],
        default: "Pending",
    },

    refundAmount: {
        type: Number,
        default: 0,
    },

    images: [String],

    videos: [String],
},
  /* =====================================
     ORDER ITEMS
  ===================================== */

  items: [

    {

      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },

      title: {
        type: String,
        required: true,
      },

      image: {
        type: String,
        default: "",
      },

      price: {
        type: Number,
        required: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 1,
      },

    }

  ],

  /* =====================================
     COURIER
  ===================================== */

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
    default: null,
  },

  deliveredAt: {
    type: Date,
    default: null,
  },

  /* =====================================
     CANCELLATION
  ===================================== */

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
      "",
      "Customer",
      "Seller",
      "Admin",
    ],
    default: "",
  },

  cancelReason: {
    type: String,
    default: "",
  },

},
{
  timestamps: true,
}
);

/* =====================================
   INDEXES
===================================== */

orderSchema.index({ createdAt: -1 });

// orderSchema.index({ userId: 1 });

// orderSchema.index({ sellerId: 1 });

orderSchema.index({ status: 1 });

// orderSchema.index({ paymentStatus: 1 });

export default mongoose.model("Order", orderSchema);