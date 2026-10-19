
import Wishlist from "../models/Wishlist.js";
import User from "../models/User.js";
import { createAndSendNotification } from "./notificationService.js";

export const notifyWishlistBackInStock = async ({ product }) => {
  if (!product?._id) return;

  // Confirm that at least one active variant is available.
  const hasStock = (product.variants || []).some(
    (variant) =>
      variant?.isActive !== false &&
      Number(variant?.stock) > 0
  );

  if (!hasStock) return;

  // Fetch only wishlists containing this product.
  const wishlists = await Wishlist.find({
    "items.productId": product._id,
  }).select("userId items");

  if (!wishlists.length) {
    console.log("No wishlist customers for this product.");
    return;
  }

  const imageUrl = product.media?.images?.[0] || "";
  const productName = product.title || product.name || "This product";

  // Avoid sending more than once per user if duplicate wishlist
  // records exist.
  const userIds = [
    ...new Set(wishlists.map((wishlist) => String(wishlist.userId))),
  ];

  let processed = 0;

  for (const userId of userIds) {
    try {
      // Respect the customer's back-in-stock preference.
      const user = await User.findById(userId).select(
        "notificationSettings isBlocked isDeleted"
      );

      if (
        !user ||
        user.isBlocked ||
        user.isDeleted ||
        user.notificationSettings?.backInStockAlerts === false
      ) {
        continue;
      }

      await createAndSendNotification({
        userId,
        type: "back_in_stock",
        title: "Back in Stock! 🎉",
        message: `${productName} is available again. Get it before it sells out!`,
        productId: product._id,
        link: `/product/${product._id}`,
        imageUrl,
        isPromotional: false,
      });

      processed++;
    } catch (error) {
      console.error(
        `Back-in-stock notification failed for user ${userId}:`,
        error?.message || error
      );
    }
  }

  console.log("Back-in-stock notifications processed:", {
    productId: String(product._id),
    customers: processed,
  });
};
