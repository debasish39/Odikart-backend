import express from "express";

import {

  saveWishlist,

  getWishlist,

  addToWishlist,

  removeWishlistItem,

  clearWishlist,

} from "../controllers/wishlistController.js";

import authMiddleware
from "../middleware/authMiddleware.js";

const router =
  express.Router();

/* =====================================
   SAVE WISHLIST
===================================== */

router.post(

  "/wishlist",

  authMiddleware,

  saveWishlist

);

/* =====================================
   GET WISHLIST
===================================== */

router.get(

  "/wishlist",

  authMiddleware,

  getWishlist

);

/* =====================================
   ADD TO WISHLIST
===================================== */

router.post(

  "/wishlist/add",

  authMiddleware,

  addToWishlist

);

/* =====================================
   REMOVE ITEM
===================================== */

router.delete(

  "/wishlist/remove",

  authMiddleware,

  removeWishlistItem

);

/* =====================================
   CLEAR WISHLIST
===================================== */

router.delete(

  "/wishlist/clear",

  authMiddleware,

  clearWishlist

);

export default router;
