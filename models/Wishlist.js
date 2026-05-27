import mongoose from "mongoose";
const wishlistSchema = new mongoose.Schema({
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
    },
  ],

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
export default Wishlist;