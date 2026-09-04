import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

import {
  getFinanceOverview,
  getAdminWallets,
  getAdminWallet,
  getAdminTransactions,
  getAdminWithdrawals,
  getCommissionOverview,
} from "../controllers/financeController.js";

import {
  processWithdrawal,
  rejectWithdrawal,
} from "../controllers/withdrawalController.js";

const router = express.Router();

/* =========================================
   FINANCE OVERVIEW
========================================= */

router.get(
  "/overview",
  authMiddleware,
  authorizeRoles("admin"),
  getFinanceOverview
);

/* =========================================
   SELLER WALLETS
========================================= */

router.get(
  "/wallets",
  authMiddleware,
  authorizeRoles("admin"),
  getAdminWallets
);

/* =========================================
   SINGLE SELLER WALLET
========================================= */

router.get(
  "/wallets/:sellerId",
  authMiddleware,
  authorizeRoles("admin"),
  getAdminWallet
);

/* =========================================
   TRANSACTIONS
========================================= */

router.get(
  "/transactions",
  authMiddleware,
  authorizeRoles("admin"),
  getAdminTransactions
);

/* =========================================
   WITHDRAWALS
========================================= */

router.get(
  "/withdrawals",
  authMiddleware,
  authorizeRoles("admin"),
  getAdminWithdrawals
);

router.put(
  "/withdrawals/:withdrawalId/process",
  authMiddleware,
  authorizeRoles("admin"),
  processWithdrawal
);

router.put(
  "/withdrawals/:withdrawalId/reject",
  authMiddleware,
  authorizeRoles("admin"),
  rejectWithdrawal
);

/* =========================================
   COMMISSION
========================================= */

router.get(
  "/commission",
  authMiddleware,
  authorizeRoles("admin"),
  getCommissionOverview
);

export default router;