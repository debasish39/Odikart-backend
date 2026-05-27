import express from "express";

import {
  createOrder,
  verifyPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

/* =====================================
   PAYMENT ROUTES
===================================== */

router.post(
  "/create-order",
  createOrder
);
router.post(
  "/verify-payment",
  verifyPayment
);

export default router;