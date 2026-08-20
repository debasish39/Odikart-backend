import express from "express";

import {
  getSellerWallet,
  getWalletTransactions,
} from "../controllers/walletController.js";

import authMiddleware from "../middleware/authMiddleware.js";

import authorizeRoles
  from "../middleware/roleMiddleware.js";

const router =
  express.Router();


/* =====================================
   SELLER WALLET
===================================== */

router.get(
  "/",
  authMiddleware,
  authorizeRoles("seller"),
  getSellerWallet
);


/* =====================================
   TRANSACTIONS
===================================== */

router.get(
  "/transactions",
  authMiddleware,
  authorizeRoles("seller"),
  getWalletTransactions
);


export default router;