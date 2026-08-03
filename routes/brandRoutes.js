import express from "express";
import {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
  getBrandsByCategory
} from "../controllers/brandController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
const router = express.Router();

router.post("/brand", authMiddleware,
  authorizeRoles("admin"), createBrand);

router.get("/brand", getBrands);

router.get("/brand/:id", getBrandById);

router.put("/brand/:id", authMiddleware,
  authorizeRoles("admin"), updateBrand);

router.delete("/brand/:id", authMiddleware,
  authorizeRoles("admin"), deleteBrand);

router.get("/category/:categoryId", getBrandsByCategory);

export default router;