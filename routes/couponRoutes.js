import express from "express";

import {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  getAvailableCoupons,
} from "../controllers/couponController.js";

import {
  authMiddleware,
} from "../middleware/authMiddleware.js";

import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

/* ==============================
   ADMIN
============================== */

router.post(
  "/create",
  authMiddleware,
  authorizeRoles("admin"),
  createCoupon
);

router.get(
  "/",
  authMiddleware,
  authorizeRoles("admin"),
  getCoupons
);

/* ==============================
   USER
============================== */

router.get(
  "/available",
  authMiddleware,
  getAvailableCoupons
);

router.post(
  "/apply",
  authMiddleware,
  applyCoupon
);

/* ==============================
   ADMIN - SINGLE COUPON
============================== */

router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("admin"),
  getCouponById
);

router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin"),
  updateCoupon
);

router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin"),
  deleteCoupon
);

export default router;