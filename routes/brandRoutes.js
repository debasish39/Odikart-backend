import express from "express";

import {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
  getBrandsByCategory,
  getBrandsBySubCategory,
} from "../controllers/brandController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";


const router = express.Router();


/* =====================================
   CREATE BRAND
   POST /api/brand
===================================== */

router.post(
  "/brand",
  authMiddleware,
  authorizeRoles("admin"),
  createBrand
);


/* =====================================
   GET ALL BRANDS
   GET /api/brand
===================================== */

router.get(
  "/brand",
  getBrands
);


/* =====================================
   GET BRAND BY ID
   GET /api/brand/:id
===================================== */

router.get(
  "/brand/:id",
  getBrandById
);


/* =====================================
   UPDATE BRAND
   PUT /api/brand/:id
===================================== */

router.put(
  "/brand/:id",
  authMiddleware,
  authorizeRoles("admin"),
  updateBrand
);


/* =====================================
   DELETE BRAND
   DELETE /api/brand/:id
===================================== */

router.delete(
  "/brand/:id",
  authMiddleware,
  authorizeRoles("admin"),
  deleteBrand
);


/* =====================================
   GET BRANDS BY CATEGORY
   GET /api/category/:categoryId
===================================== */

router.get(
  "/category/:categoryId",
  getBrandsByCategory
);


/* =====================================
   GET BRANDS BY SUBCATEGORY
   GET /api/brand/subcategory/:subCategoryId
===================================== */

router.get(
  "/brand/subcategory/:subCategoryId",
  getBrandsBySubCategory
);


export default router;

