import express from "express";

import {
  saveOrder,
  getOrders,
  getUserOrders,
  getSingleOrder,
  updateOrderStatus,
  trackOrder,
  cancelOrder,
  assignCourier,
  updateTracking,
  changeCourier,
  getCourierDetails,
  getSellerAnalytics,
  getSellerOrders,
  requestReturn,
  approveReturn,
  rejectReturn,
  assignReturnCourier,
  returnPickedUp,
  receiveReturnedProduct,
  inspectReturnedProduct,
  completeRefund,
} from "../controllers/orderController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

/* =====================================================
   CUSTOMER ROUTES
===================================================== */

router.post("/save-order", authMiddleware, saveOrder);

router.get("/my-orders", authMiddleware, getUserOrders);

router.get(
  "/order/:id",
  authMiddleware,
  authorizeRoles("user", "seller", "admin"),
  getSingleOrder
);

router.get(
  "/track-order/:orderNumber",
  authMiddleware,
  authorizeRoles("user", "seller", "admin"),
  trackOrder
);

router.put("/order/cancel/:id", authMiddleware, cancelOrder);

/* =====================================================
   RETURN REQUEST
   USER + SELLER
===================================================== */

router.put(
  "/return/request/:orderId",
  authMiddleware,
  authorizeRoles("user", "seller"),
  requestReturn
);

/* =====================================================
   ADMIN ROUTES
===================================================== */

router.get(
  "/orders",
  authMiddleware,
  authorizeRoles("admin"),
  getOrders
);

router.put(
  "/order/status/:orderId",
  authMiddleware,
  authorizeRoles("seller", "admin"),
  updateOrderStatus
);

/* Assign Courier */
router.put(
  "/order/assign/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  assignCourier
);

/* Update Tracking */
router.put(
  "/order/tracking/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  updateTracking
);

/* Change Courier */
router.put(
  "/courier/order/change/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  changeCourier
);

/* Courier Details */
router.get(
  "/courier/order/:orderId",
  authMiddleware,
  authorizeRoles("user", "seller", "admin"),
  getCourierDetails
);

/* =====================================================
   RETURN MANAGEMENT
===================================================== */

router.put(
  "/return/approve/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  approveReturn
);

router.put(
  "/return/reject/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  rejectReturn
);

router.put(
  "/return/assign-courier/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  assignReturnCourier
);

router.put(
  "/return/picked/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  returnPickedUp
);

router.put(
  "/return/received/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  receiveReturnedProduct
);

router.put(
  "/return/inspection/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  inspectReturnedProduct
);

router.put(
  "/return/refund-complete/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  completeRefund
);

/* =====================================================
   SELLER
===================================================== */

router.get(
  "/order/seller/orders",
  authMiddleware,
  authorizeRoles("seller"),
  getSellerOrders
);

router.get(
  "/seller/orders/analytics",
  authMiddleware,
  authorizeRoles("seller"),
  getSellerAnalytics
);

export default router;
