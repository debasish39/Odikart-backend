const orderSchema = new mongoose.Schema({

  user: {
    type: String,
    required: true
  },

  email: {            // ✅ ADD THIS
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

  paymentMethod: String,
  paymentStatus: String,

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