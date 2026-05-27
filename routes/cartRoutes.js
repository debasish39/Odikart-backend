import express from "express";

import {

  saveCart,

  getCart,

  addToCart,

  increaseQuantity,

  decreaseQuantity,

  removeCartItem,

  clearCart,

} from "../controllers/cartController.js";

const router = express.Router();

/* =====================================
   CART ROUTES
===================================== */

// Save cart
router.post(
  "/cart",
  saveCart
);

// Get cart
router.get(
  "/cart/:userId",
  getCart
);

// Add item
router.post(
  "/cart/add",
  addToCart
);

// Increase quantity
router.put(
  "/cart/increase",
  increaseQuantity
);

// Decrease quantity
router.put(
  "/cart/decrease",
  decreaseQuantity
);

// Remove item
router.delete(
  "/cart/remove",
  removeCartItem
);

// Clear cart
router.delete(
  "/cart/clear/:userId",
  clearCart
);

export default router;