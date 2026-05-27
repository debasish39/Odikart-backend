import express from "express";

import {

  saveWishlist,

  getWishlist,

  clearWishlist,

  removeWishlistItem,

} from "../controllers/wishlistController.js";

const router = express.Router();

/* =====================================
   WISHLIST ROUTES
===================================== */

// Save wishlist
router.post(
  "/wishlist",
  saveWishlist
);

// Get wishlist
router.get(
  "/wishlist/:userId",
  getWishlist
);

// Clear wishlist
router.delete(
  "/wishlist/clear/:userId",
  clearWishlist
);

// Remove wishlist item
router.delete(
  "/wishlist/remove",
  removeWishlistItem
);

export default router;