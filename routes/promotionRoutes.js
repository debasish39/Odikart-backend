import express from "express";

import {
  createPromotion,
  getPromotions,
  getPromotionById,
  sendPromotion,
  deletePromotion,
} from "../controllers/promotionController.js";

import {
  authMiddleware,
} from "../middleware/authMiddleware.js";

const router = express.Router();


// Create campaign
router.post(
  "/",
  authMiddleware,
  createPromotion
);


// Get all campaigns
router.get(
  "/",
  authMiddleware,
  getPromotions
);


// Get single campaign
router.get(
  "/:id",
  authMiddleware,
  getPromotionById
);


// Send campaign
router.post(
  "/:id/send",
  authMiddleware,
  sendPromotion
);


// Delete campaign
router.delete(
  "/:id",
  authMiddleware,
  deletePromotion
);


export default router;