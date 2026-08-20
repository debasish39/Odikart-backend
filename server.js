import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./config/db.js";

import userRoutes from "./routes/userRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import courierRoutes from "./routes/courierRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import withdrawalRoutes from "./routes/withdrawalRoutes.js";
import sellerSettingsRoutes from "./routes/sellerSettingsRoutes.js";

dotenv.config();

const app = express();

/* =====================================
   DATABASE
===================================== */

connectDB();

/* =====================================
   MIDDLEWARE
===================================== */

app.use(cors());

app.use(express.json());

/* =====================================
   HEALTH ROUTE
===================================== */

app.get("/", (req, res) => {

  res.json({

    status:
      "Backend running ✅"

  });

});

/* =====================================
   ROUTES
===================================== */

app.use(
  "/api",
  userRoutes
);

app.use(
  "/api",
  paymentRoutes
);

app.use(
  "/api",
  orderRoutes
);

app.use(
  "/api/cart",
  cartRoutes
);

app.use(
  "/api",
  categoryRoutes
);

app.use(
  "/api",
  brandRoutes
);

app.use("/api", courierRoutes);

app.use(
  "/api",
  wishlistRoutes
);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/coupons", couponRoutes);
app.use(
  "/api/wallet",
  walletRoutes
);
app.use(
  "/api/wallet/withdraw",
  withdrawalRoutes
);
app.use(
  "/api/seller/settings",
  sellerSettingsRoutes
);
/* =====================================
   SERVER
===================================== */

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () =>

  console.log(
    `Server running on port ${PORT}`
  )

);      