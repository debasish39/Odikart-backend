import mongoose from "mongoose";
const orderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },

  user: {
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
  paymentMethod: String,
  paymentStatus: String,

  status: {
    type: String,
    default: "Processing",
  },

  items: [
    {
      title: String,
      price: Number,
      quantity: Number,
    },
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  },
  cancelled: {
  type: Boolean,
  default: false,
},
cancelledAt: {
  type: Date,
  default: null,
},
});

export default mongoose.model("Order", orderSchema);