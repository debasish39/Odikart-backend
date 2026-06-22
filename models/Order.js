import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
{
  userId: {
    type: String,
    required: true,
  },

  fullname: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
  },

  phone: {
    type: String,
    required: true,
  },

  deliveryAddress: {
    street: String,
    state: String,
    postcode: String,
    country: String,
  },

  total: Number,

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
      "Refunded",
      "Failed",
    ],
    default: "Pending",
  },

  /* =====================================
     RAZORPAY INFO
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

  status: {
    type: String,
    enum: [
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ],
    default: "Processing",
  },

 items: [
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    title: String,

    image: String,

    price: Number,

    quantity: Number,
  },
],

  cancelled: {
    type: Boolean,
    default: false,
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

export default mongoose.model("Order", orderSchema);