import express from "express";

import {

  createOrder,

  verifyPayment,

} from "../controllers/paymentController.js";

import authMiddleware
from "../middleware/authMiddleware.js";

const router =
  express.Router();

/* =====================================
   CREATE PAYMENT ORDER
===================================== */

router.post(

  "/create-order",

  authMiddleware,

  createOrder

);

/* =====================================
   VERIFY PAYMENT
===================================== */

router.post(

  "/verify-payment",

  authMiddleware,

  verifyPayment

);

export default router;
