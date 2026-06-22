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

import authMiddleware
from "../middleware/authMiddleware.js";

const router =
  express.Router();

/* =====================================
   CART ROUTES
===================================== */

// SAVE CART
router.post(

  "/cart",

  authMiddleware,

  saveCart

);

// GET USER CART
router.get(

  "/cart",

  authMiddleware,

  getCart

);

// ADD TO CART
router.post(

  "/cart/add",

  authMiddleware,

  addToCart

);

// INCREASE QUANTITY
router.put(

  "/cart/increase",

  authMiddleware,

  increaseQuantity

);

// DECREASE QUANTITY
router.put(

  "/cart/decrease",

  authMiddleware,

  decreaseQuantity

);

// REMOVE ITEM
router.delete(

  "/cart/remove",

  authMiddleware,

  removeCartItem

);

// CLEAR CART
router.delete(

  "/cart/clear",

  authMiddleware,

  clearCart

);

export default router;
