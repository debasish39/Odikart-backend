
import express from "express";

import {

  saveOrder,

  getOrders,

  getUserOrders,

  trackOrder,

  cancelOrder,

  getSellerAnalytics,

} from "../controllers/orderController.js";

import authMiddleware
from "../middleware/authMiddleware.js";

const router =
  express.Router();

/* =====================================
   SAVE ORDER
===================================== */

router.post(

  "/save-order",

  authMiddleware,

  saveOrder

);

/* =====================================
   GET ALL ORDERS
   ADMIN ONLY
===================================== */

router.get(

  "/orders",

  authMiddleware,

  getOrders

);

/* =====================================
   GET USER ORDERS
===================================== */

router.get(

  "/my-orders",

  authMiddleware,

  getUserOrders

);

/* =====================================
   TRACK ORDER
===================================== */

router.get(

  "/order/:id",

  authMiddleware,

  trackOrder

);

/* =====================================
   CANCEL ORDER
===================================== */

router.put(

  "/order/cancel/:id",

  authMiddleware,

  cancelOrder

);

/* =====================================
   SELLER ANALYTICS
===================================== */

router.get(

  "/seller-analytics",

  authMiddleware,

  getSellerAnalytics

);

export default router;

