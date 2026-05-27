import mongoose from "mongoose";
const cartSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },

  items: [
    {
      productId: String,
      title: String,
      price: Number,
      image: String,
      quantity: {
        type: Number,
        default: 1,
      },
    },
  ],

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;