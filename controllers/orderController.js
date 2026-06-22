import mongoose from "mongoose";
import Order from "../models/Order.js";
import razorpay from "../utils/razorpay.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendWhatsApp } from "../utils/sendWhatsApp.js";

/* =====================================
   SAVE ORDER
===================================== */

export const saveOrder = async (req, res) => {
  console.log("===================================="); console.log("SAVE ORDER ROUTE HIT"); console.log("REQ BODY:", req.body); console.log("USER:", req.user); console.log("====================================");
  try {
    /* =====================================
       CREATE ORDER
    ===================================== */
const formattedItems = req.body.items.map((item) => ({
  productId: new mongoose.Types.ObjectId(item.productId),

  title: item.title,

  image: item.image,

  price: item.price,

  quantity: item.quantity,
}));

console.log("====================================");
console.log("MAPPING ITEMS STARTED");

req.body.items.forEach((item, index) => {

  console.log(`RAW ITEM ${index + 1}`);

  console.log("FULL ITEM:", item);

  console.log("PRODUCT ID:", item.productId);

  console.log("TITLE:", item.title);

  console.log("PRICE:", item.price);

  console.log("QUANTITY:", item.quantity);

});

console.log("====================================");

console.log("====================================");
console.log("FORMATTED ITEMS:");

formattedItems.forEach((item, index) => {

  console.log(`FORMATTED ITEM ${index + 1}`);

  console.log("FULL ITEM:", item);

  console.log("PRODUCT ID:", item.productId);

  console.log("TITLE:", item.title);

  console.log("PRICE:", item.price);

  console.log("QUANTITY:", item.quantity);

});

console.log("====================================");



console.log("====================================");
console.log("SAVE ORDER API HIT");
console.log("REQ BODY:", req.body);
console.log("USER:", req.user);
console.log("ITEMS:", req.body.items);
console.log("====================================");


console.log("====================================");
console.log("RAZORPAY DATA RECEIVED");
console.log(
  "ORDER ID:",
  req.body.razorpayOrderId
);
console.log(
  "PAYMENT ID:",
  req.body.razorpayPaymentId
);
console.log(
  "SIGNATURE:",
  req.body.razorpaySignature
);
console.log("====================================");

const order = new Order({
  userId: req.user._id,

  fullname:
    req.body.fullname ||
    `${req.user.firstName} ${req.user.lastName}`,

  email:
    req.body.email ||
    req.user.email,

  phone:
    req.body.phone ||
    req.user.phone,

  deliveryAddress:
    req.body.deliveryAddress,

  total:
    req.body.total,

  paymentMethod:
    req.body.paymentMethod,

  paymentStatus:
    req.body.paymentStatus,

  razorpayOrderId:
    req.body.razorpayOrderId || "",

  razorpayPaymentId:
    req.body.razorpayPaymentId || "",

  razorpaySignature:
    req.body.razorpaySignature || "",

  items:
    formattedItems,
});


console.log("ORDER CREATED:", order);


console.log("SAVING ORDER...");


console.log("====================================");
console.log("ORDER BEFORE SAVE:");

console.log(order);

console.log("ORDER ITEMS:");

order.items.forEach((item, index) => {

  console.log(`ORDER ITEM ${index + 1}`);

  console.log("FULL ITEM:", item);

  console.log("PRODUCT ID:", item.productId);

  console.log("TITLE:", item.title);

  console.log("PRICE:", item.price);

  console.log("QUANTITY:", item.quantity);

});

console.log("====================================");

console.log(
  "RAZORPAY ORDER ID:",
  req.body.razorpayOrderId
);

console.log(
  "RAZORPAY PAYMENT ID:",
  req.body.razorpayPaymentId
);

console.log(
  "RAZORPAY SIGNATURE:",
  req.body.razorpaySignature
);
console.log("ORDER ITEMS RECEIVED");

req.body.items.forEach((item) => {

  console.log({
    productId: item.productId,
    title: item.title,
    image: item.image,
    price: item.price,
    quantity: item.quantity,
  });

});
await order.save();

console.log("====================================");
console.log("ORDER SAVED");
console.log(
  "RAZORPAY ORDER ID:",
  order.razorpayOrderId
);
console.log(
  "RAZORPAY PAYMENT ID:",
  order.razorpayPaymentId
);
console.log(
  "RAZORPAY SIGNATURE:",
  order.razorpaySignature
);
console.log("====================================");
console.log("====================================");
console.log("ORDER AFTER SAVE:");

console.log(order);

console.log("ORDER ITEMS AFTER SAVE:");

order.items.forEach((item, index) => {

  console.log(`SAVED ITEM ${index + 1}`);

  console.log("FULL ITEM:", item);

  console.log("PRODUCT ID:", item.productId);

  console.log("TITLE:", item.title);

  console.log("PRICE:", item.price);

  console.log("QUANTITY:", item.quantity);

});

console.log("====================================");


console.log("ORDER SAVED SUCCESSFULLY");
console.log("ORDER ID:", order._id);


    /* =====================================
       SEND EMAIL
    ===================================== */

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

        <h2 style="color:#111;font-size:18px;">Hi ${order.fullname},</h2>

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
                ? order.items
                    .map(
                      (item, index) => `
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
                `,
                    )
                    .join("")
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
  `,
    );

    await sendWhatsApp(
      order.phone,

      `
             🛍️ *EShop*
       

✨ *ORDER CONFIRMED SUCCESSFULLY* ✨

Hey *${order.fullname}* 👋

Thank you for shopping with us ❤️  
Your order has been placed successfully and is now being processed 🚚

━━━━━━━━━━━━━━━━━━━
📦 *ORDER SUMMARY*
━━━━━━━━━━━━━━━━━━━

🆔 *Order ID*  
${order._id}

📅 *Order Date*  
${new Date(order.createdAt).toLocaleString("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
})}

📦 *Order Status*  
🟢 ${order.status}

💳 *Payment Method*  
${order.paymentMethod}

💵 *Payment Status*  
🟢 ${order.paymentStatus}

━━━━━━━━━━━━━━━━━━━
🛒 *ITEMS ORDERED*
━━━━━━━━━━━━━━━━━━━

${order.items
  ?.map(
    (item, index) =>
      `🔹 *${index + 1}. ${item.title}*

   Qty      : ${item.quantity}
   Price    : ₹${item.price}
   Subtotal : ₹${item.price * item.quantity}`,
  )
  .join("\n\n")}

━━━━━━━━━━━━━━━━━━━
💰 *PAYMENT DETAILS*
━━━━━━━━━━━━━━━━━━━

🧾 *Grand Total*  
💸 ₹${order.total}

━━━━━━━━━━━━━━━━━━━
📍 *DELIVERY ADDRESS*
━━━━━━━━━━━━━━━━━━━

🏠 ${order.deliveryAddress?.street || ""}

🌍 ${order.deliveryAddress?.state || ""}
- ${order.deliveryAddress?.postcode || ""}

🇮🇳 ${order.deliveryAddress?.country || ""}

━━━━━━━━━━━━━━━━━━━
🚚 *SHIPPING UPDATE*
━━━━━━━━━━━━━━━━━━━

Your order is being prepared for shipment 📦

You’ll receive another update once your order has been shipped 🚛

━━━━━━━━━━━━━━━━━━━
🔍 *TRACK YOUR ORDER*
━━━━━━━━━━━━━━━━━━━

🌐
https://eshop.debasish.xyz/track-order

━━━━━━━━━━━━━━━━━━━
🆘 *CUSTOMER SUPPORT*
━━━━━━━━━━━━━━━━━━━

📧 eshopcustomerinfo@gmail.com

━━━━━━━━━━━━━━━━━━━

❤️ Thank you for choosing *EShop*

🛒 *Happy Shopping!*

━━━━━━━━━━━━━━━━━━━`,
    );

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(201).json({
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
};

/* =====================================
   GET ALL ORDERS
===================================== */

export const getOrders = async (req, res) => {
  try {
    /* =====================================
       FETCH ORDERS
    ===================================== */
if (

  req.user.role !==
  "admin"

) {

  return res.status(403).json({

    success: false,

    message:
      "Admin access only",

  });

}


    const orders = await Order.find()

      .sort({
        createdAt: -1,
      });

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({
      success: true,

      count: orders.length,

      orders,
    });
  } catch (error) {
    console.error("Fetch Orders Error:", error);

    res.status(500).json({
      success: false,

      error: error.message,
    });
  }
};

/* =====================================
   GET USER ORDERS
===================================== */

export const getUserOrders = async (req, res) => {
  try {
    /* =====================================
       USER ID
    ===================================== */

   
const userId =
  req.user._id;


    /* =====================================
       FETCH ORDERS
    ===================================== */

    const orders = await Order.find({
      userId,
    }).sort({
      createdAt: -1,
    });

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({
      success: true,

      count: orders.length,

      orders,
    });
  } catch (error) {
    console.error("Fetch User Orders Error:", error);

    res.status(500).json({
      success: false,

      error: "Failed to fetch user orders",
    });
  }
};
/* =====================================
   TRACK ORDER
===================================== */

export const trackOrder = async (req, res) => {
  try {
    /* =====================================
       FIND ORDER
    ===================================== */
    const order =
  await Order.findById(
    req.params.id
  );

    /* =====================================
       ORDER NOT FOUND
    ===================================== */

    if (!order) {
      return res.status(404).json({
        success: false,

        message: "Order not found",
      });
    }
if (

  order.userId.toString() !==
  req.user._id.toString() &&

  req.user.role !==
  "admin"

) {

  return res.status(403).json({

    success: false,

    message:
      "Not authorized",

  });

}


    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({
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
};

/* =====================================
   CANCEL ORDER
===================================== */

export const cancelOrder = async (req, res) => {
  try {
    /* =====================================
       FIND ORDER
    ===================================== */

    const order = await Order.findById(req.params.id);

console.log("====================================");
console.log("CANCEL ORDER API HIT");
console.log("ORDER:", order);
console.log("USER:", req.user);
console.log("====================================");

console.log("PAYMENT METHOD:", order.paymentMethod);
console.log("PAYMENT STATUS:", order.paymentStatus);
console.log("PAYMENT ID:", order.razorpayPaymentId);
    /* =====================================
       ORDER NOT FOUND
    ===================================== */

    if (!order) {
      return res.status(404).json({
        success: false,

        message: "Order not found",
      });
    }
  
console.log(
  "ORDER USER:",
  order.userId.toString()
);

console.log(
  "REQUEST USER:",
  req.user._id.toString()
);


if (

  order.userId.toString() !==
  req.user._id.toString() &&

  req.user.role !==
  "admin"

) {

  return res.status(403).json({

    success: false,

    message:
      "Not authorized",

  });

}


    /* =====================================
       ALREADY CANCELLED
    ===================================== */

    if (order.cancelled) {
      return res.status(400).json({
        success: false,

        message: "Order already cancelled",
      });
    }

    /* =====================================
       7 DAYS CHECK
    ===================================== */

    const now = new Date();

    const orderDate = new Date(order.createdAt);

    const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);

    if (diffDays > 7) {
      return res.status(400).json({
        success: false,

        message: "Cancellation period expired (7 days)",
      });
    }

    /* =====================================
       CANCEL ORDER
    ===================================== */

 console.log("UPDATING ORDER STATUS...");
if (
  order.paymentMethod === "Razorpay" &&
  order.paymentStatus === "Paid" &&
  order.razorpayPaymentId
) {

  console.log("STARTING REFUND");

  const refund = await razorpay.payments.refund(
    order.razorpayPaymentId,
    {
      amount: Math.round(order.total * 100),
    }
  );

  console.log("REFUND SUCCESS:", refund);

  order.paymentStatus = "Refunded";

  order.refundId = refund.id;
 order.refundStatus =
    "Completed";
   await order.save({
    validateBeforeSave: false,
  });
}
const updatedOrder = await Order.findByIdAndUpdate(
  req.params.id,
  {
    cancelled: true,

    cancelledAt: new Date(),

    status: "Cancelled",
  },
  {
    new: true,

    runValidators: false,
  }
);

console.log("UPDATED ORDER:", updatedOrder);

    /* =====================================
       SEND EMAIL
    ===================================== */

    await sendEmail(
      updatedOrder.email,
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
          Hi ${order.fullname},
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
                ? order.items
                    .map(
                      (item, index) => `
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
                `,
                    )
                    .join("")
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
  `,
    );
    await sendWhatsApp(
      updatedOrder.phone,

      `
             🛍️ *EShop*
       

❌ *ORDER CANCELLED SUCCESSFULLY*

Hi *${order.fullname}* 👋

Your order has been cancelled successfully.

We’re sorry to see this order cancelled 💔

━━━━━━━━━━━━━━━━━━━
📦 *ORDER DETAILS*
━━━━━━━━━━━━━━━━━━━

🆔 *Order ID*  
${order._id}

📅 *Cancelled On*  
${new Date().toLocaleString("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
})}

📦 *Order Status*  
🔴 Cancelled

💳 *Payment Method*  
${order.paymentMethod}

💵 *Payment Status*  
${order.paymentStatus}

━━━━━━━━━━━━━━━━━━━
🛒 *CANCELLED ITEMS*
━━━━━━━━━━━━━━━━━━━

${order.items
  ?.map(
    (item, index) =>
      `🔹 *${index + 1}. ${item.title}*

   Qty      : ${item.quantity}
   Price    : ₹${item.price}
   Subtotal : ₹${item.price * item.quantity}`,
  )
  .join("\n\n")}

━━━━━━━━━━━━━━━━━━━
💰 *ORDER SUMMARY*
━━━━━━━━━━━━━━━━━━━

🧾 *Total Amount*  
💸 ₹${order.total}

━━━━━━━━━━━━━━━━━━━
💳 *REFUND INFORMATION*
━━━━━━━━━━━━━━━━━━━

${
  order.paymentStatus === "Paid"
    ? `✅ Your refund has been initiated successfully.

⏳ Expected refund time:
5 - 7 business days.

💰 Refund Amount:
₹${order.total}`
    : `ℹ️ No payment was captured for this order.`
}

━━━━━━━━━━━━━━━━━━━
📍 *DELIVERY ADDRESS*
━━━━━━━━━━━━━━━━━━━

🏠 ${order.deliveryAddress?.street || ""}

🌍 ${order.deliveryAddress?.state || ""}
- ${order.deliveryAddress?.postcode || ""}

🇮🇳 ${order.deliveryAddress?.country || ""}

━━━━━━━━━━━━━━━━━━━
🆘 *CUSTOMER SUPPORT*
━━━━━━━━━━━━━━━━━━━

📧 eshopcustomerinfo@gmail.com

🌐 Track Orders:
https://eshop.debasish.xyz/track-order

━━━━━━━━━━━━━━━━━━━

❤️ Thank you for shopping with *EShop*

We hope to serve you again soon 🛒

━━━━━━━━━━━━━━━━━━━`,
    );

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({
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
};





/* =====================================
   SELLER PRODUCT ANALYTICS
===================================== */

export const getSellerAnalytics =
async (req, res) => {

  try {

    /* =====================================
       SELLER ID
    ===================================== */

    const sellerId =
      req.user._id;

    /* =====================================
       AGGREGATION
    ===================================== */

    const analytics =
      await Order.aggregate([

        /* =========================
           UNWIND ITEMS
        ========================= */

        {
          $unwind: "$items",
        },

        /* =========================
           LOOKUP PRODUCT
        ========================= */

        {
          $lookup: {
            from: "products",

            localField:
              "items.productId",

            foreignField: "_id",

            as: "product",
          },
        },

        /* =========================
           UNWIND PRODUCT
        ========================= */

        {
          $unwind: "$product",
        },

        /* =========================
           MATCH SELLER
        ========================= */

        {
          $match: {
            "product.sellerId":
              new mongoose.Types.ObjectId(
                sellerId
              ),
          },
        },

        /* =========================
           GROUP PRODUCTS
        ========================= */

        {
          $group: {

            _id:
              "$items.productId",

            title: {
              $first:
                "$items.title",
            },

            image: {
              $first:
                "$product.image",
            },

            price: {
              $first:
                "$items.price",
            },

            totalSold: {
              $sum:
                "$items.quantity",
            },

            totalRevenue: {
              $sum: {
                $multiply: [
                  "$items.price",
                  "$items.quantity",
                ],
              },
            },

            totalOrders: {
              $sum: 1,
            },
          },
        },

        /* =========================
           SORT
        ========================= */

        {
          $sort: {
            totalSold: -1,
          },
        },

      ]);

    /* =====================================
       TOTAL REVENUE
    ===================================== */

    const totalRevenue =
      analytics.reduce(

        (acc, item) =>
          acc + item.totalRevenue,

        0
      );

    /* =====================================
       TOTAL PRODUCTS SOLD
    ===================================== */

    const totalProductsSold =
      analytics.reduce(

        (acc, item) =>
          acc + item.totalSold,

        0
      );

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      totalRevenue,

      totalProductsSold,

      totalProducts:
        analytics.length,

      analytics,
    });

  } catch (error) {

    console.log(
      "SELLER ANALYTICS ERROR:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        "Failed to fetch analytics",
    });
  }
};

