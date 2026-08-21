import express from "express";

import {
  createCategory,
  getCategories,
  getSubCategories,
  getCategoryTree,
  getCategory,
  updateCategory,
  deleteCategory,
  searchCategory,
} from "../controllers/categoryController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

/* =====================================
   PUBLIC / SELLER
===================================== */

// Get parent categories
router.get(
  "/category",
  getCategories
);

// Search categories
router.get(
  "/category/search",
  searchCategory
);

// Get subcategories of a category
router.get(
  "/category/:categoryId/subcategories",
  getSubCategories
);

// Get one category
router.get(
  "/category/:id",
  getCategory
);


/* =====================================
   ADMIN
===================================== */

// Get category + subcategory tree
router.get(
  "/category/admin/tree",
  authMiddleware,
  authorizeRoles("admin"),
  getCategoryTree
);

// Create category/subcategory
router.post(
  "/category/create",
  authMiddleware,
  authorizeRoles("admin"),
  createCategory
);

// Update category/subcategory
router.put(
  "/category/:id",
  authMiddleware,
  authorizeRoles("admin"),
  updateCategory
);

// Delete/deactivate category
router.delete(
  "/category/:id",
  authMiddleware,
  authorizeRoles("admin"),
  deleteCategory
);

export default router;