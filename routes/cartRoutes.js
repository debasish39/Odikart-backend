import express from "express";

import {
  addToCart,
  getCart,
  increaseQuantity,
  decreaseQuantity,
  removeCartItem,
  clearCart,
} from "../controllers/cartController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/* =====================================
   GET CART
===================================== */

router.get(
  "/",
  authMiddleware,
  getCart
);

/* =====================================
   ADD TO CART
===================================== */

router.post(
  "/add",
  authMiddleware,
  addToCart
);

/* =====================================
   INCREASE
===================================== */

router.put(
  "/increase",
  authMiddleware,
  increaseQuantity
);

/* =====================================
   DECREASE
===================================== */

router.put(
  "/decrease",
  authMiddleware,
  decreaseQuantity
);

/* =====================================
   REMOVE
===================================== */

router.delete(
  "/remove",
  authMiddleware,
  removeCartItem
);

/* =====================================
   CLEAR
===================================== */

router.delete(
  "/clear",
  authMiddleware,
  clearCart
);

export default router;