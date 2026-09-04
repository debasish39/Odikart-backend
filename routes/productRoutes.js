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

  /* =====================================
     ECOMMERCE DISCOVERY
  ===================================== */

  getTrendingProducts,
  getBestSellerProducts,
  getPopularProducts,
  getTopRatedProducts,
  getNewArrivalProducts,
  getFeaturedProducts,
  getRecommendedProducts,
  getFlashSaleProducts,
  getDealProducts,
  getLowStockProducts,

  /* =====================================
     PRODUCT ANALYTICS
  ===================================== */

  trackProductEvent,
  resetRecentProductAnalytics,

  /* =====================================
     RECENTLY VIEWED
  ===================================== */

  addRecentlyViewed,
  getRecentlyViewed,
  removeRecentlyViewed,
  clearRecentlyViewed,
} from "../controllers/ProductController.js";

import upload from "../middleware/uploadMiddleware.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import sellerVerificationMiddleware from "../middleware/sellerVerificationMiddleware.js";

const router = express.Router();

/* =====================================================
   CREATE PRODUCT
   SELLER MUST BE VERIFIED
===================================================== */

router.post(
  "/create",

  authMiddleware,

  authorizeRoles(
    "seller",
    "admin"
  ),

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

  createProduct
);


/* =====================================================
   ECOMMERCE DISCOVERY
===================================================== */

/* =====================================================
   TRENDING
===================================================== */

router.get(
  "/trending",
  getTrendingProducts
);


/* =====================================================
   BEST SELLERS
===================================================== */

router.get(
  "/best-sellers",
  getBestSellerProducts
);


/* =====================================================
   POPULAR
===================================================== */

router.get(
  "/popular",
  getPopularProducts
);


/* =====================================================
   TOP RATED
===================================================== */

router.get(
  "/top-rated",
  getTopRatedProducts
);


/* =====================================================
   NEW ARRIVALS
===================================================== */

router.get(
  "/new-arrivals",
  getNewArrivalProducts
);


/* =====================================================
   FEATURED
===================================================== */

router.get(
  "/featured",
  getFeaturedProducts
);


/* =====================================================
   RECOMMENDED
===================================================== */

router.get(
  "/recommended",
  getRecommendedProducts
);


/* =====================================================
   FLASH SALES
===================================================== */

router.get(
  "/flash-sales",
  getFlashSaleProducts
);


/* =====================================================
   DEALS
===================================================== */

router.get(
  "/deals",
  getDealProducts
);


/* =====================================================
   LOW STOCK
===================================================== */

router.get(
  "/low-stock",
  getLowStockProducts
);


/* =====================================================
   RECENTLY VIEWED
   COOKIE BASED
   NO AUTHENTICATION REQUIRED
===================================================== */

/*
  GET

  Returns recently viewed products for the
  current browser using the recentVisitorId cookie.
*/

router.get(
  "/recently-viewed",
  getRecentlyViewed
);


/*
  POST

  Saves a product as recently viewed.

  No login required.
  Backend creates/reads recentVisitorId cookie.
*/

router.post(
  "/recently-viewed/:productId",
  addRecentlyViewed
);


/*
  DELETE ONE

  Removes one product from the current
  browser's recently viewed list.
*/

router.delete(
  "/recently-viewed/:productId",
  removeRecentlyViewed
);


/*
  DELETE ALL

  Clears the current browser's
  recently viewed list.
*/

router.delete(
  "/recently-viewed",
  clearRecentlyViewed
);


/* =====================================================
   PRODUCT ANALYTICS
===================================================== */

/*
  Example:

  POST /api/products/PRODUCT_ID/track-event

  Body:

  {
    "event": "view"
  }

  Supported:

  view
  wishlist
  cart
  sale
  order
*/

router.post(
  "/:id/track-event",
  trackProductEvent
);


/* =====================================================
   SELLER PRODUCTS
===================================================== */

/*
  GET

  /api/products/seller/my-products

  Seller gets their own products.
  Admin is also allowed.
*/

router.get(
  "/seller/my-products",

  authMiddleware,

  authorizeRoles(
    "seller",
    "admin"
  ),

  getSellerProducts
);


/* =====================================================
   ADMIN - ALL PRODUCTS
===================================================== */

/*
  GET

  /api/products/admin/all

  Admin gets all products.
*/

router.get(
  "/admin/all",

  authMiddleware,

  authorizeRoles("admin"),

  getAdminProducts
);


/* =====================================================
   ADMIN - PENDING PRODUCTS
===================================================== */

/*
  GET

  /api/products/admin/pending

  Admin gets pending products.
*/

router.get(
  "/admin/pending",

  authMiddleware,

  authorizeRoles("admin"),

  getPendingProducts
);


/* =====================================================
   ADMIN - RESET RECENT ANALYTICS
===================================================== */

/*
  This resets:

  recentViews
  recentWishlist
  recentCart
  recentSales
  recentOrders

  Lifetime analytics are NOT deleted.

  Can be used manually by admin
  or from a cron job.
*/

router.post(
  "/admin/reset-recent-analytics",

  authMiddleware,

  authorizeRoles("admin"),

  resetRecentProductAnalytics
);


/* =====================================================
   ADMIN - APPROVE PRODUCT
===================================================== */

router.put(
  "/admin/:id/approve",

  authMiddleware,

  authorizeRoles("admin"),

  approveProduct
);


/* =====================================================
   ADMIN - REJECT PRODUCT
===================================================== */

router.put(
  "/admin/:id/reject",

  authMiddleware,

  authorizeRoles("admin"),

  rejectProduct
);


/* =====================================================
   ADMIN - BLOCK PRODUCT
===================================================== */

router.put(
  "/admin/:id/block",

  authMiddleware,

  authorizeRoles("admin"),

  blockProduct
);


/* =====================================================
   UPDATE VARIANT STOCK
===================================================== */

router.put(
  "/stock",

  authMiddleware,

  authorizeRoles(
    "seller",
    "admin"
  ),

  sellerVerificationMiddleware,

  updateVariantStock
);


/* =====================================================
   SUBMIT PRODUCT
   SELLER MUST BE VERIFIED
===================================================== */

router.put(
  "/:id/submit",

  authMiddleware,

  authorizeRoles(
    "seller",
    "admin"
  ),

  sellerVerificationMiddleware,

  submitProduct
);


/* =====================================================
   ADD REVIEW
===================================================== */

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


/* =====================================================
   DELETE REVIEW
===================================================== */

router.delete(
  "/:productId/review/:reviewId",

  authMiddleware,

  deleteReview
);


/* =====================================================
   LIKE REVIEW
===================================================== */

router.put(
  "/:productId/review/:reviewId/like",

  authMiddleware,

  toggleReviewLike
);


/* =====================================================
   GET ALL PRODUCTS
===================================================== */

/*
  IMPORTANT:

  Keep this before /:id.

  GET /api/products/
*/

router.get(
  "/",
  getProducts
);


/* =====================================================
   GET SINGLE PRODUCT
===================================================== */

/*
  IMPORTANT:

  This MUST be near the bottom.

  Otherwise:

  /trending
  /popular
  /admin/all
  /admin/pending
  /seller/my-products
  /recently-viewed

  could be interpreted as:

  /:id

  Only ONE /:id GET route should exist.
*/

router.get(
  "/:id",
  getProduct
);


/* =====================================================
   UPDATE PRODUCT
===================================================== */

router.put(
  "/:id",

  authMiddleware,

  authorizeRoles(
    "seller",
    "admin"
  ),

  updateProduct
);


/* =====================================================
   DELETE PRODUCT
===================================================== */

router.delete(
  "/:id",

  authMiddleware,

  authorizeRoles(
    "seller",
    "admin"
  ),

  sellerVerificationMiddleware,

  deleteProduct
);


/* =====================================================
   EXPORT ROUTER
===================================================== */

export default router;