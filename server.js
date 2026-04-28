/* eslint-env node */
import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import { Clerk } from "@clerk/clerk-sdk-node";

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

  phone: String,

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

 const formattedUsers = users.map(user => ({
  id: user.id,

  // 🔥 ALL emails
  emails: user.emailAddresses.map(e => e.emailAddress),

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
  }catch (error) {
  console.error("ERROR DETAILS:", error.errors);

  if (error.errors?.[0]?.code === "form_identifier_exists") {
    return res.status(400).json({
      success: false,
      error: "Email already exists"
    });
  }

  if (error.errors?.[0]?.code === "form_verification_needed") {
    return res.status(400).json({
      success: false,
      error: "Email must be verified before setting as primary"
    });
  }

  res.status(500).json({
    success: false,
    error: error.message
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
/* =============================
   SERVER START
============================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
