import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // =====================================================
    // SELECTED VARIANT
    // =====================================================

    variantSku: {
      type: String,
      default: "",
      trim: true,
    },

    // Snapshot of selected variant attributes
    attributes: {
      type: Map,
      of: String,
      default: {},
    },

    // =====================================================
    // PRODUCT INFORMATION SNAPSHOT
    // =====================================================

    title: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
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

    // =====================================================
    // PRICING INFORMATION
    // =====================================================

    /*
     * Tax percentage from Product variant.
     *
     * Example:
     * 18 = 18%
     *
     * IMPORTANT:
     * This is a percentage, NOT the final tax amount.
     */

    taxPercentage: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
     * Variant discount percentage.
     *
     * Example:
     * 15 = 15%
     */

    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =====================================================
    // PRODUCT OFFER SNAPSHOT
    // =====================================================

    offer: {
      enabled: {
        type: Boolean,
        default: false,
      },

      discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage",
      },

      value: {
        type: Number,
        default: 0,
        min: 0,
      },

      startDate: {
        type: Date,
        default: null,
      },

      endDate: {
        type: Date,
        default: null,
      },
    },
  },
  {
    _id: true,
  }
);


// =========================================================
// CART
// =========================================================

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },
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

