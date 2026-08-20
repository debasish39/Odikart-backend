import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // Selected variant
    variantSku: {
      type: String,
      default: "",
    },

    // Snapshot of selected variant attributes
    attributes: {
      type: Map,
      of: String,
      default: {},
    },

    // Product information snapshot
    title: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    image: {
      type: String,
      default: "",
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    _id: true,
  }
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    items: [cartItemSchema],
  },

  {
    timestamps: true,
  }
);

const Cart = mongoose.model(
  "Cart",
  cartSchema
);

export default Cart;