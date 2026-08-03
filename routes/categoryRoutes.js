import express from "express";

import {

createCategory,

getCategories,

getCategory,

updateCategory,

deleteCategory,

searchCategory,

} from "../controllers/categoryController.js";

import authMiddleware from "../middleware/authMiddleware.js";

import authorizeRoles from "../middleware/roleMiddleware.js";
const router = express.Router();

/* ===========================
   ADMIN
=========================== */

router.post(
  "/category",
  authMiddleware,
  authorizeRoles("admin"),
  createCategory
);

router.put(
  "/category/:id",
  authMiddleware,
  authorizeRoles("admin"),
  updateCategory
);

router.delete(
  "/category/:id",
  authMiddleware,
  authorizeRoles("admin"),
  deleteCategory
);

router.get("/category", getCategories);

router.get("/category/search", searchCategory);

router.get("/category/:id", getCategory);
export default router;