import express from "express";

import {
  createWithdrawal,
  processWithdrawal,
  rejectWithdrawal,
} from "../controllers/withdrawalController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router =
  express.Router();


// =====================================
// SELLER
// =====================================

// Create withdrawal
router.post(
  "/",
  authMiddleware,
  createWithdrawal
);


// =====================================
// ADMIN
// =====================================

// Process
router.put(
  "/:withdrawalId/process",
  authMiddleware,
  processWithdrawal
);


// Reject
router.put(
  "/:withdrawalId/reject",
  authMiddleware,
  rejectWithdrawal
);


export default router;