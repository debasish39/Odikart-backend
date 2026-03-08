/* eslint-env node */
import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({ origin: "*" }));

/* =============================
   MONGODB CONNECTION
============================= */

/* =============================
   MONGODB CONNECTION
============================= */

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected ✅");

  } catch (error) {

    console.error("MongoDB Connection Error:", error);

    process.exit(1);
  }
};

connectDB();
/* =============================
   ORDER SCHEMA
============================= */

const orderSchema = new mongoose.Schema({
  user: String,
  phone: String,
  total: Number,
  paymentMethod: String,
  paymentStatus: String,
  status: {
    type: String,
    default: "Processing",
  },
  items: [
    {
      title: String,
      price: Number,
      quantity: Number,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Order = mongoose.model("Order", orderSchema);

/* =============================
   HEALTH ROUTE
============================= */

app.get("/", (req, res) => {
  res.json({ status: "Backend running ✅" });
});

/* =============================
   RAZORPAY INSTANCE
============================= */

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

/* =============================
   CREATE RAZORPAY ORDER
============================= */

app.post("/api/create-order", async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount value" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
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
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false });
    }
  } catch (error) {
    console.error("Verify Error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});

/* =============================
   SAVE ORDER IN MONGODB
============================= */

app.post("/api/save-order", async (req, res) => {
  try {

    const order = new Order(req.body);

    await order.save();

    res.json({
      success: true,
      message: "Order saved to MongoDB",
      order,
    });

  } catch (error) {

    console.error("Save Order Error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to save order",
    });

  }
});

/* =============================
   GET ALL ORDERS
============================= */
app.get("/api/orders", async (req, res) => {
  try {

    const orders = await Order.find().sort({ createdAt: -1 });

    res.json(orders);

  } catch (error) {

    console.error("Fetch Orders Error:", error);

    res.status(500).json({
      error: error.message
    });

  }
});
/* =============================
   SERVER START
============================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);