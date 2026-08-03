import mongoose from "mongoose";
const cartSchema = new mongoose.Schema({
 userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true,
},
  items: [
    {
     productId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Product",
},
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