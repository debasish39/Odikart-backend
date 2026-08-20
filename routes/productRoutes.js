import express from "express";

import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getSellerProducts,
  addReview,
  deleteReview,
  toggleReviewLike,
  updateVariantStock,
  submitProduct,
  getAdminProducts,
  getPendingProducts,
  approveProduct,
  rejectProduct,
  blockProduct,
} from "../controllers/ProductController.js";

import upload from "../middleware/uploadMiddleware.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

import authorizeRoles from "../middleware/roleMiddleware.js";

import sellerVerificationMiddleware from "../middleware/sellerVerificationMiddleware.js";

const router = express.Router();

/* =====================================
   CREATE PRODUCT
   SELLER MUST BE VERIFIED
===================================== */

router.post(
  "/create",

  authMiddleware,

  authorizeRoles("seller", "admin"),

  sellerVerificationMiddleware,

  upload.fields([
    {
      name: "images",
      maxCount: 10,
    },
    {
      name: "videos",
      maxCount: 5,
    },
  ]),

  createProduct,
);

/* =====================================
   GET ALL PRODUCTS
===================================== */

router.get("/", getProducts);

/* =====================================
   GET SELLER PRODUCTS
===================================== */

router.get(
  "/seller/my-products",

  authMiddleware,

  authorizeRoles("seller", "admin"),

  getSellerProducts,
);

/* =====================================
   ADMIN - ALL PRODUCTS
===================================== */

router.get(
  "/admin/all",

  authMiddleware,

  authorizeRoles("admin"),

  getAdminProducts,
);

/* =====================================
   ADMIN - PENDING PRODUCTS
===================================== */

router.get(
  "/admin/pending",

  authMiddleware,

  authorizeRoles("admin"),

  getPendingProducts,
);

/* =====================================
   ADMIN - APPROVE PRODUCT
===================================== */

router.put(
  "/admin/:id/approve",

  authMiddleware,

  authorizeRoles("admin"),

  approveProduct,
);

/* =====================================
   ADMIN - REJECT PRODUCT
===================================== */

router.put(
  "/admin/:id/reject",

  authMiddleware,

  authorizeRoles("admin"),

  rejectProduct,
);

/* =====================================
   ADMIN - BLOCK PRODUCT
===================================== */

router.put(
  "/admin/:id/block",

  authMiddleware,

  authorizeRoles("admin"),

  blockProduct,
);

/* =====================================
   UPDATE VARIANT STOCK
===================================== */

router.put(
  "/stock",

  authMiddleware,

  authorizeRoles("seller", "admin"),

  sellerVerificationMiddleware,

  updateVariantStock,
);

/* =====================================
   SUBMIT PRODUCT
   SELLER MUST BE VERIFIED
===================================== */

router.put(
  "/:id/submit",

  authMiddleware,

  authorizeRoles("seller", "admin"),

  sellerVerificationMiddleware,

  submitProduct,
);

/* =====================================
   ADD REVIEW
===================================== */

router.post(
  "/:id/review",

  authMiddleware,

  upload.fields([
    {
      name: "images",
      maxCount: 5,
    },
    {
      name: "videos",
      maxCount: 3,
    },
  ]),

  addReview,
);

/* =====================================
   DELETE REVIEW
===================================== */

router.delete(
  "/:productId/review/:reviewId",

  authMiddleware,

  deleteReview,
);

/* =====================================
   LIKE REVIEW
===================================== */

router.put(
  "/:productId/review/:reviewId/like",

  authMiddleware,

  toggleReviewLike,
);

/* =====================================
   GET SINGLE PRODUCT
===================================== */

router.get(
  "/:id",

  getProduct,
);

/* =====================================
   UPDATE PRODUCT
===================================== */

router.put(
  "/:id",

  authMiddleware,

  authorizeRoles("seller", "admin"),

  sellerVerificationMiddleware,

  updateProduct,
);

/* =====================================
   DELETE PRODUCT
===================================== */

router.delete(
  "/:id",

  authMiddleware,

  authorizeRoles("seller", "admin"),

  sellerVerificationMiddleware,

  deleteProduct,
);

export default router;
