import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./config/db.js";

import userRoutes from "./routes/userRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";

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
  "/api/users",
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
  "/api",
  cartRoutes
);

app.use(
  "/api",
  wishlistRoutes
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