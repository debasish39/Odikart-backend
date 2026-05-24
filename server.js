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

const clerk = new Clerk({
  secretKey: process.env.CLERK_SECRET_KEY,
});
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
  userId: {
    type: String,
    required: true,
  },

  user: {
    type: String,
    required: true,
  },
  email: {
    // ✅ ADDED THIS
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },

  deliveryAddress: {
    street: String,
    state: String,
    postcode: String,
    country: String,
  },

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
  cancelled: {
  type: Boolean,
  default: false,
},
cancelledAt: {
  type: Date,
  default: null,
},
});
const Order = mongoose.model("Order", orderSchema);
/* =============================
   CART SCHEMA
============================= */

const cartSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },

  items: [
    {
      productId: String,
      title: String,
      price: Number,
      image: String,
      quantity: {
        type: Number,
        default: 1,
      },
    },
  ],

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Cart = mongoose.model("Cart", cartSchema);
/* =============================
   WISHLIST SCHEMA
============================= */

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },

  items: [
    {
      productId: String,
      title: String,
      price: Number,
      image: String,
    },
  ],

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

// simple file upload (memory)
const upload = multer({ storage: multer.memoryStorage() });

// 🔐 basic admin guard (replace with real auth/JWT later)
const adminGuard = (req, res, next) => {
  if (req.headers.authorization !== "ADMIN_SECRET") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
};
/* =============================
   GET ALL USERS FROM CLERK (ADMIN)
============================= */
app.get("/api/users", async (req, res) => {
  try {
    // ✅ Step 1: Read query params
    const page = Number(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    // ✅ Step 2: Fetch users from :contentReference[oaicite:0]{index=0}
    const users = await clerk.users.getUserList({ limit, offset });

    console.log("USERS:", users);

    // ✅ Step 3: Handle empty case
    if (!users || users.length === 0) {
      return res.json({
        success: true,
        users: [],
        message: "No users found",
      });
    }
    const formatIST = (date) => {
      if (!date) return "No login yet";

      return new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const formattedUsers = users.map((user) => ({
      id: user.id,

      // 🔥 ALL emails
      emails: user.emailAddresses.map((e) => e.emailAddress),

      name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),

      image: user.imageUrl,
      // ✅ IST formatted
      createdAt: formatIST(user.createdAt),

      // ✅ IST formatted (with fallback)
      lastSignIn: formatIST(user.lastSignInAt),
    }));

    // ✅ Step 5: Send response
    res.json({
      success: true,
      page,
      count: formattedUsers.length,
      users: formattedUsers, // ⚠️ use formatted, not raw
    });
  } catch (error) {
    console.error("Fetch Users Error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch users",
    });
  }
});

app.put("/api/users/:id", adminGuard, async (req, res) => {
  try {
    const userId = req.params.id;
    const { firstName, lastName } = req.body;

    const updated = await clerk.users.updateUser(userId, {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
    });

    res.json({
      success: true,
      user: {
        id: updated.id,
        name: `${updated.firstName || ""} ${updated.lastName || ""}`.trim(),
        email: updated.emailAddresses[0]?.emailAddress || "No email",
      },
    });
  } catch (err) {
    console.error("Update name error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.put("/api/users/:id/password", adminGuard, async (req, res) => {
  try {
    const userId = req.params.id;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be ≥ 8 chars" });
    }

    const updated = await clerk.users.updateUser(userId, { password });

    res.json({
      success: true,
      message: "Password updated",
      userId: updated.id,
    });
  } catch (error) {
    console.error("ERROR DETAILS:", error.errors);

    if (error.errors?.[0]?.code === "form_identifier_exists") {
      return res.status(400).json({
        success: false,
        error: "Email already exists",
      });
    }

    if (error.errors?.[0]?.code === "form_verification_needed") {
      return res.status(400).json({
        success: false,
        error: "Email must be verified before setting as primary",
      });
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

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

    // ✅ use order (NOT req.body)
   await sendEmail(
  order.email,
  "🛒 Order Confirmed – EShop",
  `
  <div style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    
    <div style="max-width:620px;margin:30px auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.08);">
      
      <!-- HEADER -->
     
<div style="
  background:linear-gradient(135deg,#6366f1,#4f46e5);
  padding:25px;
  text-align:center;
  color:white;
">

  <!-- LOGO -->
  <img
    src="https://res.cloudinary.com/dqyltwn9z/image/upload/v1779617751/web-app-manifest-512x512_szlsma.png"
    alt="EShop Logo"
    width="90"
    style="
      display:block;
      margin:0 auto 15px;
      border-radius:14px;
      background:white;
      padding:6px;
    "
  />

  <h1 style="
    margin:0;
    font-size:22px;
    color:white;
  ">
    🛍️ EShop
  </h1>

  <p style="
    margin-top:6px;
    font-size:13px;
    opacity:0.9;
  ">
    Your order has been placed successfully 🎉
  </p>

</div>



      <!-- STATUS -->
      <div style="text-align:center;padding:16px;">
        <span style="
          background:#ecfeff;
          color:#0891b2;
          padding:6px 14px;
          border-radius:50px;
          font-size:12px;
          font-weight:600;
        ">
          📦 ${order.status}
        </span>
      </div>

      <!-- BODY -->
      <div style="padding:0 25px 25px;">

        <h2 style="color:#111;font-size:18px;">Hi ${order.user},</h2>

        <!-- ORDER SUMMARY -->
        <div style="
          background:#f9fafb;
          border-radius:10px;
          padding:16px;
          margin-top:20px;
          border:1px solid #e5e7eb;
        ">
          <table style="width:100%;font-size:14px;color:#333;">
            
            <tr>
              <td><b>🆔 Order ID</b></td>
              <td style="text-align:right;">
                <span style="
                  background:#eef2ff;
                  color:#4338ca;
                  padding:5px 10px;
                  border-radius:6px;
                  font-family:monospace;
                  font-weight:bold;
                ">
                  ${order._id}
                </span>
              </td>
            </tr>

            <tr>
              <td>📧 Email</td>
              <td style="text-align:right;">${order.email}</td>
            </tr>

            <tr>
              <td>📞 Phone</td>
              <td style="text-align:right;">${order.phone}</td>
            </tr>

            <tr>
              <td>💰 Total</td>
              <td style="text-align:right;color:#16a34a;font-weight:bold;">
                ₹${order.total}
              </td>
            </tr>

            <tr>
              <td>💳 Payment</td>
              <td style="text-align:right;">
                ${order.paymentMethod} (${order.paymentStatus})
              </td>
            </tr>

            <tr>
              <td>📅 Order Date</td>
              <td style="text-align:right;">
                ${new Date(order.createdAt).toLocaleString()}
              </td>
            </tr>

          </table>
        </div>

        <!-- ITEMS -->
        <div style="margin-top:25px;">
          <h3 style="font-size:16px;color:#111;">🛒 Order Items</h3>

          <div style="
            margin-top:10px;
            border:1px solid #e5e7eb;
            border-radius:10px;
            overflow:hidden;
            background:#fafafa;
          ">

            ${
              order.items?.length
                ? order.items.map((item, index) => `
                  <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    padding:12px 15px;
                    border-bottom:${index !== order.items.length - 1 ? "1px solid #eee" : "none"};
                    font-size:14px;
                  ">
                    
                    <div>
                      <div style="font-weight:600;color:#111;">
                        🛍 ${item.title}
                      </div>
                      <div style="font-size:12px;color:#777;">
                        Qty: ${item.quantity}
                      </div>
                    </div>

                    <div style="font-weight:bold;color:#16a34a;">
                      ₹${item.price * item.quantity}
                    </div>

                  </div>
                `).join("")
                : `<div style="padding:12px;color:#777;">No items found</div>`
            }

            <!-- TOTAL -->
            <div style="
              display:flex;
              justify-content:space-between;
              padding:12px 15px;
              font-weight:bold;
              background:#f1f5f9;
              border-top:1px solid #ddd;
            ">
              <span>Total</span>
              <span>₹${order.total}</span>
            </div>

          </div>
        </div>

        <!-- ADDRESS -->
        <div style="margin-top:25px;">
          <h3 style="font-size:16px;color:#111;">📍 Delivery Address</h3>

          <div style="
            background:#f8fafc;
            border:1px solid #e5e7eb;
            border-radius:10px;
            padding:12px;
            margin-top:8px;
            font-size:14px;
            color:#555;
          ">
            ${order.deliveryAddress?.street || ""}<br/>
            ${order.deliveryAddress?.state || ""} - ${order.deliveryAddress?.postcode || ""}<br/>
            ${order.deliveryAddress?.country || ""}
          </div>
        </div>

        <!-- CTA -->
        <div style="text-align:center;margin:30px 0;">
          <a href="https://eshop.debasish.xyz/track-order"
             style="
              background:#6366f1;
              color:white;
              padding:12px 24px;
              text-decoration:none;
              border-radius:8px;
              font-weight:600;
              display:inline-block;
              box-shadow:0 6px 18px rgba(99,102,241,0.3);
             ">
            📦 Track Your Order
          </a>
        </div>

        <p style="font-size:13px;color:#777;text-align:center;">
          We’ll notify you when your order ships 🚚
        </p>

        <p style="text-align:center;margin-top:10px;">
          ❤️ Thank you for choosing <b>EShop</b>
        </p>

      </div>

      <!-- FOOTER -->
      <div style="background:#f3f4f6;padding:12px;text-align:center;font-size:12px;color:#888;">
        © ${new Date().getFullYear()} EShop. All rights reserved.
      </div>

    </div>

  </div>
  `
);
    res.json({
      success: true,
      message: "Order saved & email sent",
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
   GET ALL ORDERS (ADMIN)
============================= */

app.get("/api/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

/* =============================
   GET ORDERS FOR SPECIFIC USER
============================= */

app.get("/api/orders/:userId", async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.params.userId,
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch user orders",
    });
  }
});
/* =============================
   SAVE / UPDATE CART
============================= */

app.post("/api/cart", async (req, res) => {
  try {
    const { userId, items } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    let cart = await Cart.findOne({ userId });

    if (cart) {
      cart.items = items;
      cart.updatedAt = new Date();
      await cart.save();
    } else {
      cart = new Cart({
        userId,
        items,
      });
      await cart.save();
    }

    res.json({
      success: true,
      message: "Cart saved",
      cart,
    });
  } catch (error) {
    console.error("Cart Save Error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to save cart",
    });
  }
});
/* =============================
   GET USER CART
============================= */

app.get("/api/cart/:userId", async (req, res) => {
  try {
    const cart = await Cart.findOne({
      userId: req.params.userId,
    });

    if (!cart) {
      return res.json({ items: [] });
    }

    res.json(cart);
  } catch (error) {
    console.error("Fetch Cart Error:", error);

    res.status(500).json({
      error: "Failed to fetch cart",
    });
  }
});
/* =============================
   ADD ITEM TO CART
============================= */

app.post("/api/cart/add", async (req, res) => {
  try {
    const { userId, product } = req.body;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [{ ...product, quantity: 1 }],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.productId === product.productId,
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += 1;
      } else {
        cart.items.push({ ...product, quantity: 1 });
      }
    }

    await cart.save();

    res.json({
      success: true,
      cart,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to add item",
    });
  }
});
/* =============================
   INCREASE QUANTITY
============================= */

app.put("/api/cart/increase", async (req, res) => {
  try {
    const { userId, productId } = req.body;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const item = cart.items.find((item) => item.productId === productId);

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    item.quantity += 1;

    await cart.save();

    res.json({
      success: true,
      cart,
    });
  } catch (error) {
    res.status(500).json({
      error: "Increase quantity failed",
    });
  }
});
/* =============================
   DECREASE QUANTITY
============================= */

app.put("/api/cart/decrease", async (req, res) => {
  try {
    const { userId, productId } = req.body;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const item = cart.items.find((item) => item.productId === productId);

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    item.quantity -= 1;

    if (item.quantity <= 0) {
      cart.items = cart.items.filter((item) => item.productId !== productId);
    }

    await cart.save();

    res.json({
      success: true,
      cart,
    });
  } catch (error) {
    res.status(500).json({
      error: "Decrease quantity failed",
    });
  }
});
/* =============================
   REMOVE ITEM FROM CART
============================= */

app.delete("/api/cart/remove", async (req, res) => {
  try {
    const { userId, productId } = req.body;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    cart.items = cart.items.filter((item) => item.productId !== productId);

    await cart.save();

    res.json({
      success: true,
      cart,
    });
  } catch (error) {
    res.status(500).json({
      error: "Remove item failed",
    });
  }
});
/* =============================
   CLEAR USER CART
============================= */

app.delete("/api/cart/clear/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    await Cart.findOneAndUpdate({ userId }, { items: [] });

    res.json({
      success: true,
      message: "Cart cleared",
    });
  } catch (error) {
    console.error("Clear Cart Error:", error);

    res.status(500).json({
      error: "Failed to clear cart",
    });
  }
});
/* =============================
   SAVE / UPDATE WISHLIST
============================= */

app.post("/api/wishlist", async (req, res) => {
  try {
    const { userId, items } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (wishlist) {
      wishlist.items = items;
      wishlist.updatedAt = new Date();
      await wishlist.save();
    } else {
      wishlist = new Wishlist({
        userId,
        items,
      });
      await wishlist.save();
    }

    res.json({
      success: true,
      message: "Wishlist saved",
      wishlist,
    });
  } catch (error) {
    console.error("Wishlist Save Error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to save wishlist",
    });
  }
});
/* =============================
   GET USER WISHLIST
============================= */

app.get("/api/wishlist/:userId", async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({
      userId: req.params.userId,
    });

    if (!wishlist) {
      return res.json({ items: [] });
    }

    res.json(wishlist);
  } catch (error) {
    console.error("Fetch Wishlist Error:", error);

    res.status(500).json({
      error: "Failed to fetch wishlist",
    });
  }
});
/* =============================
   CLEAR USER WISHLIST
============================= */

app.delete("/api/wishlist/clear/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(404).json({
        error: "Wishlist not found",
      });
    }

    wishlist.items = [];
    wishlist.updatedAt = new Date();

    await wishlist.save();

    res.json({
      success: true,
      message: "Wishlist cleared",
      wishlist,
    });
  } catch (error) {
    console.error("Clear Wishlist Error:", error);

    res.status(500).json({
      error: "Failed to clear wishlist",
    });
  }
});
/* =============================
   REMOVE ITEM FROM WISHLIST
============================= */

app.delete("/api/wishlist/remove", async (req, res) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({
        error: "userId and productId required",
      });
    }

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(404).json({
        error: "Wishlist not found",
      });
    }

    // Remove product
    wishlist.items = wishlist.items.filter(
      (item) => item.productId !== productId,
    );

    wishlist.updatedAt = new Date();

    await wishlist.save();

    res.json({
      success: true,
      message: "Item removed from wishlist",
      wishlist,
    });
  } catch (error) {
    console.error("Remove Wishlist Error:", error);

    res.status(500).json({
      error: "Failed to remove item",
    });
  }
});

// Track order by ID
app.get("/api/order/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Track Order Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Cancel order by ID
app.put("/api/order/cancel/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // ⛔ Already cancelled
    if (order.cancelled) {
      return res.status(400).json({
        success: false,
        message: "Order already cancelled",
      });
    }

    // ⏱️ Check 7 days rule
    const now = new Date();
    const orderDate = new Date(order.createdAt);

    const diffDays =
      (now - orderDate) / (1000 * 60 * 60 * 24);

    if (diffDays > 7) {
      return res.status(400).json({
        success: false,
        message: "Cancellation period expired (7 days)",
      });
    }

    // ✅ Cancel order
    order.cancelled = true;
    order.cancelledAt = new Date();
    order.status = "Cancelled";

    await order.save();

    // 📧 SEND EMAIL AFTER CANCEL

await sendEmail(
  order.email,
  "❌ Order Cancelled – EShop",
  `
  <div style="
    margin:0;
    padding:0;
    background:#f4f6fb;
    font-family:Arial,sans-serif;
  ">

    <div style="
      max-width:620px;
      margin:30px auto;
      background:#ffffff;
      border-radius:16px;
      overflow:hidden;
      box-shadow:0 10px 25px rgba(0,0,0,0.08);
    ">

      <!-- HEADER -->
      <div style="
        background:linear-gradient(135deg,#ef4444,#dc2626);
        padding:30px 20px;
        text-align:center;
        color:white;
      ">

        <!-- LOGO -->
        <img
          src="https://res.cloudinary.com/dqyltwn9z/image/upload/v1779617751/web-app-manifest-512x512_szlsma.png"
          alt="EShop Logo"
          width="90"
          style="
            display:block;
            margin:0 auto 15px;
            border-radius:14px;
            background:white;
            padding:6px;
          "
        />

        <h1 style="
          margin:0;
          font-size:26px;
          color:white;
        ">
          ❌ Order Cancelled
        </h1>

        <p style="
          margin-top:8px;
          font-size:14px;
          opacity:0.95;
        ">
          Your order has been cancelled successfully
        </p>

      </div>

      <!-- BODY -->
      <div style="padding:25px;">

        <h2 style="
          color:#111827;
          margin-top:0;
          font-size:22px;
        ">
          Hi ${order.user},
        </h2>

        <p style="
          color:#4b5563;
          font-size:15px;
          line-height:1.7;
        ">
          Your order has been successfully cancelled.
        </p>

        ${
          order.paymentStatus === "Paid"
            ? `
            <div style="
              background:#ecfdf5;
              color:#065f46;
              padding:14px;
              border-radius:10px;
              margin-top:20px;
              border:1px solid #a7f3d0;
              font-size:14px;
            ">
              💰 Refund will be processed within 5–7 business days.
            </div>
            `
            : ""
        }

        <!-- ORDER DETAILS -->
        <div style="
          background:#f9fafb;
          border-radius:12px;
          padding:18px;
          margin-top:25px;
          border:1px solid #e5e7eb;
        ">

          <h3 style="
            margin-top:0;
            margin-bottom:15px;
            color:#111827;
            font-size:16px;
          ">
            📄 Order Details
          </h3>

          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;">

            <tr>
              <td style="padding:8px 0;"><b>🆔 Order ID</b></td>
              <td align="right">${order._id}</td>
            </tr>

            <tr>
              <td style="padding:8px 0;"><b>💰 Amount</b></td>
              <td align="right">₹${order.total}</td>
            </tr>

            <tr>
              <td style="padding:8px 0;"><b>💳 Payment</b></td>
              <td align="right">
                ${order.paymentMethod} (${order.paymentStatus})
              </td>
            </tr>

            <tr>
              <td style="padding:8px 0;"><b>📅 Cancelled At</b></td>
              <td align="right">
                ${new Date(order.cancelledAt).toLocaleString()}
              </td>
            </tr>

          </table>

        </div>

        <!-- ITEMS -->
        <div style="margin-top:30px;">

          <h3 style="
            font-size:17px;
            color:#111827;
            margin-bottom:15px;
          ">
            🛒 Cancelled Items
          </h3>

          <div style="
            border:1px solid #e5e7eb;
            border-radius:12px;
            overflow:hidden;
            background:#fafafa;
          ">

            ${
              order.items?.length
                ? order.items.map((item, index) => `
                  <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                      padding:15px;
                      border-bottom:${index !== order.items.length - 1 ? "1px solid #eee" : "none"};
                    "
                  >
                    <tr>

                      <td style="padding:15px;">
                        <div style="
                          font-weight:600;
                          color:#111827;
                          font-size:14px;
                        ">
                          ${item.title}
                        </div>

                        <div style="
                          margin-top:4px;
                          font-size:12px;
                          color:#6b7280;
                        ">
                          Qty: ${item.quantity}
                        </div>
                      </td>

                      <td
                        align="right"
                        style="
                          padding:15px;
                          font-weight:bold;
                          color:#dc2626;
                          font-size:14px;
                        "
                      >
                        ₹${item.price * item.quantity}
                      </td>

                    </tr>
                  </table>
                `).join("")
                : `
                <div style="
                  padding:15px;
                  color:#6b7280;
                ">
                  No items found
                </div>
                `
            }

            <!-- TOTAL -->
            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="
                background:#f3f4f6;
                border-top:1px solid #ddd;
              "
            >
              <tr>
                <td style="
                  padding:15px;
                  font-weight:bold;
                ">
                  Total
                </td>

                <td
                  align="right"
                  style="
                    padding:15px;
                    font-weight:bold;
                    color:#111827;
                  "
                >
                  ₹${order.total}
                </td>
              </tr>
            </table>

          </div>

        </div>

        <!-- CTA -->
        <div style="
          text-align:center;
          margin:35px 0 25px;
        ">
          <a
            href="https://eshop.debasish.xyz/track-order"
            style="
              background:#6366f1;
              color:white;
              padding:14px 26px;
              text-decoration:none;
              border-radius:10px;
              font-weight:600;
              display:inline-block;
              box-shadow:0 6px 18px rgba(99,102,241,0.3);
            "
          >
            🔍 Track Orders
          </a>
        </div>

        <p style="
          color:#6b7280;
          font-size:13px;
          text-align:center;
          line-height:1.6;
        ">
          If this cancellation was not initiated by you,
          please contact support immediately.
        </p>

        <p style="
          text-align:center;
          margin-top:18px;
          color:#111827;
        ">
          — <b>EShop Team</b>
        </p>

      </div>

      <!-- FOOTER -->
      <div style="
        background:#f9fafb;
        padding:16px;
        text-align:center;
        font-size:12px;
        color:#9ca3af;
        border-top:1px solid #e5e7eb;
      ">
        © ${new Date().getFullYear()} EShop. All rights reserved.
      </div>

    </div>

  </div>
  `
);


    // ✅ RESPONSE
    res.json({
      success: true,
      message: "Order cancelled successfully & email sent",
      order,
    });

  } catch (error) {
    console.error("Cancel Order Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});
/* =============================
   SERVER START
============================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
