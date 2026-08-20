import express from "express";

import {
  getSellerSettings,
  updateSellerSettings,
} from "../controllers/sellerSettingsController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();


/* =====================================
   GET SETTINGS
===================================== */

router.get(
  "/",
  authMiddleware,
  getSellerSettings
);


/* =====================================
   UPDATE SETTINGS
===================================== */

router.put(
  "/",
  authMiddleware,
  updateSellerSettings
);


export default router;