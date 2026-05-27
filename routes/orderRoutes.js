import express from "express";

import {

  createOrder,

  saveOrder,

  getOrders,

  getUserOrders,

  trackOrder,

  cancelOrder,

} from "../controllers/orderController.js";

const router = express.Router();

/* =====================================
   ORDER ROUTES
===================================== */

// Razorpay create order
router.post(
  "/create-order",
  createOrder
);

// Save order
router.post(
  "/save-order",
  saveOrder
);

// Get all orders
router.get(
  "/orders",
  getOrders
);

// Get user orders
router.get(
  "/orders/:userId",
  getUserOrders
);

// Track order
router.get(
  "/order/:id",
  trackOrder
);

// Cancel order
router.put(
  "/order/cancel/:id",
  cancelOrder
);

export default router;