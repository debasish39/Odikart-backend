
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        // New Odikart notification types
        "promotion",
        "price_drop",
        "wishlist_offer",
        "new_product",
        "flash_sale",
        "order_update",
        "coupon",
        "cart_reminder",

        // Existing types retained for compatibility
        "order",
        "delivery",
        "wishlist",
        "offer",
        "account",
        "announcement",
        "system",
      ],
      default: "system",
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    // Optional reference for product-related notifications.
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    // Keep as an ID without a model reference because the
    // actual coupon model name may differ in your backend.
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    link: {
      type: String,
      default: "",
      trim: true,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    isPromotional: {
      type: Boolean,
      default: false,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);

export default Notification;
