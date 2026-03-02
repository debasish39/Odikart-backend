/* eslint-env node */
import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

/* =============================
   MIDDLEWARE
============================= */
app.use(express.json());
app.use(
  cors({
    origin: "*", // Change to your frontend domain in production
  })
);

/* =============================
   HEALTH CHECK ROUTE
============================= */
app.get("/", (req, res) => {
  res.send("Backend is running successfully 🚀");
});

/* =============================
   RAZORPAY INSTANCE
============================= */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

/* =============================
   CREATE ORDER
============================= */
app.post("/api/create-order", async (req, res) => {
  try {
    console.log("Incoming Body:", req.body);

    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const order = await razorpay.orders.create({
      amount: Number(amount) * 100, // Convert ₹ to paise
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    res.json(order);
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =============================
   VERIFY PAYMENT
============================= */
app.post("/api/verify-payment", (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

/* =============================
   START SERVER
============================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});