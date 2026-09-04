import express from "express";

import {
  createWithdrawal,
  processWithdrawal,
  rejectWithdrawal,
} from "../controllers/withdrawalController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

// Seller: request a withdrawal.
router.post(
  "/",
  authMiddleware,
  authorizeRoles("seller"),
  createWithdrawal
);

// Admin: process a pending withdrawal.
router.put(
  "/:withdrawalId/process",
  authMiddleware,
  authorizeRoles("admin"),
  processWithdrawal
);

// Admin: reject a pending withdrawal.
router.put(
  "/:withdrawalId/reject",
  authMiddleware,
  authorizeRoles("admin"),
  rejectWithdrawal
);

export default router;
