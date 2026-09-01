import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";

/* =====================================
   ROUTES
===================================== */

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
import razorpayWebhookRoutes
  from "./routes/razorpayWebhookRoutes.js";

import serviceabilityRoutes from "./routes/serviceabilityRoutes.js";

dotenv.config();


const app =
  express();


/* =====================================================
   DATABASE
===================================================== */

connectDB();
/* =====================================================
   CORS
===================================================== */
const allowedOrigins = [ "http://localhost:5173",
  "http://localhost:5174", process.env.FRONTEND_URL, process.env.FRONTEND_URL_WWW,process.env.SELLER_URL].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman/server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("❌ CORS blocked origin:", origin);

      return callback(
        new Error("Not allowed by CORS")
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
    ],
  })
);
/* =====================================================
   COOKIE
===================================================== */

app.use(
  cookieParser()
);


/* =====================================================
   RAZORPAY WEBHOOK
     
   IMPORTANT:
   This MUST be registered BEFORE express.json()

   Razorpay needs the raw request body for:
   X-Razorpay-Signature verification.
===================================================== */

app.use(
  "/api/payment/webhook",
  razorpayWebhookRoutes
);


/* =====================================================
   NORMAL BODY PARSERS

   These come AFTER the webhook route.
===================================================== */

app.use(
  express.json({
    limit: "10mb",
  })
);


app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);


/* =====================================================
   HEALTH ROUTE
===================================================== */

app.get(
  "/",
  (req, res) => {

    res.status(200).json({

      success: true,

      status:
        "Backend running ✅",

    });

  }
);


/* =====================================================
   USER ROUTES
===================================================== */

app.use(
  "/api",
  userRoutes
);


/* =====================================================
   PAYMENT ROUTES
===================================================== */

app.use(
  "/api",
  paymentRoutes
);


/* =====================================================
   ORDER ROUTES
===================================================== */

app.use(
  "/api",
  orderRoutes
);


/* =====================================================
   CART
===================================================== */

app.use(
  "/api/cart",
  cartRoutes
);


/* =====================================================
   CATEGORY
===================================================== */

app.use(
  "/api",
  categoryRoutes
);


/* =====================================================
   BRAND
===================================================== */

app.use(
  "/api",
  brandRoutes
);


/* =====================================================
   COURIER
===================================================== */

app.use(
  "/api",
  courierRoutes
);


/* =====================================================
   WISHLIST
===================================================== */

app.use(
  "/api",
  wishlistRoutes
);


/* =====================================================
   AUTH
===================================================== */

app.use(
  "/api/auth",
  authRoutes
);


/* =====================================================
   PRODUCTS
===================================================== */

app.use(
  "/api/products",
  productRoutes
);

app.use("/api/serviceability", serviceabilityRoutes);
/* =====================================================
   COUPONS
===================================================== */

app.use(
  "/api/coupons",
  couponRoutes
);


/* =====================================================
   WALLET
===================================================== */

app.use(
  "/api/wallet",
  walletRoutes
);


/* =====================================================
   WITHDRAWAL
===================================================== */

app.use(
  "/api/wallet/withdraw",
  withdrawalRoutes
);


/* =====================================================
   SELLER SETTINGS
===================================================== */

app.use(
  "/api/seller/settings",
  sellerSettingsRoutes
);


/* =====================================================
   404 HANDLER
===================================================== */

app.use(
  (req, res) => {

    console.warn(
      "❌ ROUTE NOT FOUND:",
      req.method,
      req.originalUrl
    );


    res.status(404).json({

      success: false,

      message:
        "API route not found",

      path:
        req.originalUrl,

    });

  }
);


/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.error(
      "======================================"
    );

    console.error(
      "❌ GLOBAL EXPRESS ERROR"
    );

    console.error(
      "Method:",
      req.method
    );

    console.error(
      "URL:",
      req.originalUrl
    );

    console.error(
      "Error:",
      error
    );

    console.error(
      "======================================"
    );


    if (
      res.headersSent
    ) {

      return next(
        error
      );

    }


    return res.status(
      error.status || 500
    ).json({

      success: false,

      message:
        error.message ||
        "Internal server error",

    });

  }
);


/* =====================================================
   SERVER
===================================================== */

const PORT =
  process.env.PORT ||
  5000;


app.listen(
  PORT,
  () => {

    console.log(
      "======================================"
    );

    console.log(
      "🚀 ODikart backend started"
    );

    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      "Razorpay webhook endpoint:"
    );

    console.log(
      `/api/payment/webhook`
    );

    console.log(
      "======================================"
    );

  }
);