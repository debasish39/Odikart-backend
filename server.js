/* eslint-env node */
import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import { Clerk } from "@clerk/clerk-sdk-node";
import { sendEmail } from "./utils/sendEmail.js";
import connectDB from "./config/db.js";
import Order from "./models/Order.js";
import Cart from "./models/Cart.js";
import Wishlist from "./models/Wishlist.js";
import userRoutes from "./routes/userRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
dotenv.config();

const app = express();

/* =============================
   MIDDLEWARE
============================= */

// CORS
app.use(cors());

// handle preflight requests
app.options("*", cors());

// body parser
app.use(express.json());

// const clerk = new Clerk({
//   secretKey: process.env.CLERK_SECRET_KEY,
// });

connectDB();

/* =============================
   HEALTH ROUTE
============================= */

app.get("/", (req, res) => {
  res.json({ status: "Backend running ✅" });
});
/* =============================
   GET ALL USERS FROM CLERK (ADMIN)
============================= */
app.use("/api/users",userRoutes); 
// app.put("/api/users/:id/email", adminGuard, async (req, res) => {
//   try {
//     const userId = req.params.id;
//     const { email } = req.body;

//     const newEmail = await clerk.emailAddresses.createEmailAddress({
//       userId,
//       emailAddress: email,
//     });

//     // 🔥 Send verification code
//     await clerk.emailAddresses.prepareVerification(newEmail.id, {
//       strategy: "email_code",
//     });

//     res.json({
//       success: true,
//       message: "Verification code sent to email",
//       emailId: newEmail.id, // 🔥 important for next step
//     });

//   }catch (err) {
//     console.error("Update email error:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });
// app.put(
//   "/api/users/:id/image",
//   adminGuard,
//   upload.single("image"),
//   async (req, res) => {
//     try {
//       const userId = req.params.id;

//       if (!req.file) {
//         return res.status(400).json({
//           error: "No file uploaded",
//         });
//       }

//       console.log("FILE TYPE:", req.file.mimetype); // debug

//       const updatedUser = await clerk.users.updateUserProfileImage(
//         userId,
//         {
//           file: req.file.buffer, // ✅ FIXED
//         }
//       );

//       res.json({
//         success: true,
//         imageUrl: updatedUser.imageUrl,
//       });

//     } catch (error) {
//       console.error("Update image error:", error.errors);

//       res.status(500).json({
//         success: false,
//         error: error.errors?.[0]?.message || error.message,
//       });
//     }
//   }
// );

/* =============================
   CREATE RAZORPAY ORDER
============================= */

app.post("/api",paymentRoutes);


/* =============================
   SAVE ORDER IN MONGODB
============================= */

app.use("/api",orderRoutes);

/* =============================
   SAVE / UPDATE CART
============================= */

app.use("/api",cartRoutes);
/* =============================
   SAVE / UPDATE WISHLIST
============================= */
app.use("/api",wishlistRoutes);

/* =============================
   SERVER START
============================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));