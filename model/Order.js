const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

  user: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    required: true
  },

  total: {
    type: Number,
    required: true
  },

  paymentMethod: {
    type: String
  },

  paymentStatus: {
    type: String
  },

  status: {
    type: String,
    default: "Processing"
  },

  items: [
    {
      title: String,
      price: Number,
      quantity: Number
    }
  ],

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Order", orderSchema);