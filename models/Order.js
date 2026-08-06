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

  /* =====================================
   DELIVERY ADDRESS
===================================== */

deliveryAddress: {

  customer: {
    fullName: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    alternatePhone: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
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
      trim: true,
      required: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    postalCode: {
  type: String,
  required: true,
  match: /^[1-9][0-9]{5}$/
},

    country: {
      type: String,
      default: "India",
      trim: true,
    },
  },

  location: {
    latitude: Number,

    longitude: Number,

    formattedAddress: String,

    googlePlaceId: String,

    plusCode: String,

    mapUrl: String,
  },

  preference: {
    addressType: {
      type: String,
      enum: ["Home", "Office", "Other"],
      default: "Home",
    },

    preferredDeliveryTime: {
      type: String,
      enum: ["", "Morning", "Afternoon", "Evening", "Anytime"],
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
    default: 0
  },

  shippingCharge: {
    type: Number,
    default: 0
  },

  tax: {
    type: Number,
    default: 0
  },

  couponCode: {
    type: String,
    default: ""
  },

  couponDiscount: {
    type: Number,
    default: 0
  },

  couponType: {
    type: String,
    enum: ["", "FIXED", "PERCENTAGE"],
    default: ""
  },

  total: {
    type: Number,
    required: true,
    default: 0
  }
},
  /* =====================================
     MARKETPLACE REVENUE
  ===================================== */
marketplace: {
  commissionAmount: {
    type: Number,
    default: 0
  },

  sellerAmount: {
    type: Number,
    default: 0
  },

  platformProfit: {
    type: Number,
    default: 0
  }
},

  /* =====================================
     PAYMENT
  ===================================== */
payment: {
  method: {
    type: String,
    enum: ["COD", "Razorpay"],
    default: "COD",
  },

  status: {
    type: String,
    enum: ["Pending", "Paid", "Failed", "Refunded"],
    default: "Pending",
    index: true,
  },

  transactionId: {
    type: String,
    default: "",
  },

  paymentFailureReason: {
    type: String,
    default: "",
  },

  paymentDate: Date,

  gateway: {
    orderId: String,
    paymentId: String,
    signature: String,
  },
},
  // /* =====================================
  //    RAZORPAY
  // ===================================== */

  // razorpayOrderId: {
  //   type: String,
  //   default: "",
  // },

  // razorpayPaymentId: {
  //   type: String,
  //   default: "",
  // },

  // razorpaySignature: {
  //   type: String,
  //   default: "",
  // },

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
      "Failed"
    ],
    default: "NotRequested"
  },

  amount: {
    type: Number,
    default: 0
  },

  refundId: {
    type: String,
    default: ""
  },

  refundMethod: {
    type: String,
    enum: [
      "",
      "Razorpay",
      "UPI",
      "Bank Transfer",
      "Cash"
    ],
    default: ""
  },

  refundTransactionId: {
    type: String,
    default: ""
  },

  refundedAt: {
    type: Date,
    default: null
  },

  remark: {
    type: String,
    default: ""
  }
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
resolution: {
  type: String,
  enum: [
    "Refund",
    "Replacement",
    "Exchange"
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
    "Other"
  ],
  default: "Other"
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
      ref: "Product"
    },

    sku: String,

    title: String,

    slug: String,

    image: String,

    brand: String,

    category: String,

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    price: Number,

    quantity: Number,

    tax: Number,

    discount: Number,

    total: Number
  }
],

  /* =====================================
     COURIER
  ===================================== */
shipping: {

  courier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Courier",
    default: null
  },

  courierName: {
    type: String,
    default: ""
  },

  trackingNumber: {
  type: String,
  default: "",
  index: true,
},

  trackingUrl: {
    type: String,
    default: ""
  },

  estimatedDelivery: Date,

  shippedAt: Date,

  deliveredAt: Date
},
 

  /* =====================================
     CANCELLATION
  ===================================== */

 cancellation: {

  cancelled: {
    type: Boolean,
    default: false
  },

  cancelledAt: Date,

  cancelledBy: {
    type: String,
    enum: [
      "",
      "Customer",
      "Seller",
      "Admin"
    ],
    default: ""
  },

  reason: {
    type: String,
    default: ""
  }
},
timeline: {

  confirmedAt: Date,

  packedAt: Date,

  shippedAt: Date,

  outForDeliveryAt: Date,

  deliveredAt: Date,

  cancelledAt: Date,

  refundedAt: Date
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