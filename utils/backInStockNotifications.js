import Wishlist from "../models/Wishlist.js";
import { createAndSendNotification } from "./notificationService.js";

export const notifyWishlistBackInStock = async ({ product }) => {
  if (!product?._id) {
    return;
  }

  const hasStock = (product.variants || []).some(
    (variant) =>
      variant?.isActive !== false &&
      Number(variant?.stock) > 0
  );

  if (!hasStock) {
    return;
  }

  const wishlists = await Wishlist.find({
    "items.productId": product._id,
  });

  const imageUrl = product.media?.images?.[0] || "";

  for (const wishlist of wishlists) {
    const isWishlisted = wishlist.items.some(
      (item) =>
        String(item.productId) === String(product._id)
    );

    if (!isWishlisted) {
      continue;
    }

    try {
      await createAndSendNotification({
        userId: wishlist.userId,
        type: "back_in_stock",
        title: "Back in Stock! 🎉",
        message: `${product.title} is available again. Get it before it sells out!`,
        productId: product._id,
        link: `/product/${product._id}`,
        imageUrl,
        isPromotional: false,
      });
    } catch (error) {
      console.error(
        `Back-in-stock notification failed for user ${wishlist.userId}:`,
        error?.message || error
      );
    }
  }
};