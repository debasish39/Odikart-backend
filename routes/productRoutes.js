import express from "express";

import {
  createProduct,
  getProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  getSellerProducts,
  addReview,
  deleteReview,
  toggleReviewLike,
} from "../controllers/productController.js";

import upload from "../middleware/uploadMiddleware.js";

import {
  authMiddleware,
} from "../middleware/authMiddleware.js";

import authorizeRoles
from "../middleware/roleMiddleware.js";

const router = express.Router();

/* =====================================
   CREATE PRODUCT
===================================== */

router.post(
  "/create",

  authMiddleware,

  authorizeRoles(
    "seller",
    "admin"
  ),
upload.fields([ { name: "images", maxCount: 10, }, { name: "videos", maxCount: 5, }, ]),
  createProduct
);

/* =====================================
   GET ALL PRODUCTS
===================================== */

router.get(
  "/",
  getProducts
);

/* =====================================
   GET SELLER PRODUCTS
===================================== */

router.get(
  "/seller/my-products",

  authMiddleware,

  authorizeRoles(
    "seller",
    "admin"
  ),

  getSellerProducts
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

  addReview
);

/* =====================================
   DELETE REVIEW
===================================== */

router.delete(
  "/:productId/review/:reviewId",

  authMiddleware,

  deleteReview
);

/* =====================================
   LIKE REVIEW
===================================== */

router.put(
  "/:productId/review/:reviewId/like",

  authMiddleware,

  toggleReviewLike
);

/* =====================================
   GET SINGLE PRODUCT
===================================== */

router.get(
  "/:id",
  getSingleProduct
);

/* =====================================
   UPDATE PRODUCT
===================================== */

router.put(
  "/:id",

  authMiddleware,

  authorizeRoles(
    "seller",
    "admin"
  ),

  updateProduct
);

/* =====================================
   DELETE PRODUCT
===================================== */

router.delete(
  "/:id",

  authMiddleware,

  authorizeRoles(
    "seller",
    "admin"
  ),

  deleteProduct
);

export default router;

