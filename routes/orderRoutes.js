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
  getSellerAnalytics,requestReturn,
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

/* Place Order */

router.post(
  "/save-order",
  authMiddleware,
  saveOrder
);

/* My Orders */

router.get(
  "/my-orders",
  authMiddleware,
  getUserOrders
);

/* Single Order */

router.get(
  "/order/:id",
  authMiddleware,
  authorizeRoles("user", "seller", "admin"),
  getSingleOrder
);

/* Track Order */

router.get(
  "/track-order/:id",
  authMiddleware,
  authorizeRoles("user", "seller", "admin"),
  trackOrder
);

/* Cancel Order */

router.put(
  "/order/cancel/:id",
  authMiddleware,
  cancelOrder
);

/* =====================================================
   RETURN (CUSTOMER)
===================================================== */

/* Request Return */

router.put(
  "/return/request/:orderId",
  authMiddleware,
  requestReturn
);

/* =====================================================
   ADMIN ROUTES
===================================================== */

/* All Orders */

router.get(
  "/orders",
  authMiddleware,
  authorizeRoles("admin"),
  getOrders
);

/* Update Order Status */

router.put(
  "/order/status/:orderId",
  authMiddleware,
  authorizeRoles("seller", "admin"),
  updateOrderStatus
);

/* Assign Courier for order*/

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
   RETURN MANAGEMENT (ADMIN)
===================================================== */

/* Approve Return */

router.put(
  "/return/approve/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  approveReturn
);

/* Reject Return */

router.put(
  "/return/reject/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  rejectReturn
);

/* Assign Return Courier */

router.put(
  "/return/assign-courier/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  assignReturnCourier
);

/* Product Picked Up */

router.put(
  "/return/picked/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  returnPickedUp
);

/* Product Received */

router.put(
  "/return/received/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  receiveReturnedProduct
);

/* Inspection */

router.put(
  "/return/inspection/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  inspectReturnedProduct
);

/* Refund */

router.put(
  "/return/refund/:orderId",
  authMiddleware,
  authorizeRoles("admin"),
  completeRefund
);

/* =====================================================
   SELLER
===================================================== */

router.get(
  "/seller-analytics",
  authMiddleware,
  authorizeRoles("seller"),
  getSellerAnalytics
);

export default router;