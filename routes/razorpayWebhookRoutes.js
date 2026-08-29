import express from "express";

import {
  razorpayWebhook,
} from "../controllers/razorpayWebhookController.js";


const router =
  express.Router();


/* =====================================================
   RAZORPAY WEBHOOK

   IMPORTANT:
   Do NOT use authMiddleware here.

   Razorpay authenticates using:
   X-Razorpay-Signature
===================================================== */

router.post(
  "/",
  express.raw({
    type: "application/json",
  }),
  razorpayWebhook
);


export default router;