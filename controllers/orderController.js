import mongoose from "mongoose";
import Order from "../models/Order.js";
import razorpay from "../utils/razorpay.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendWhatsApp } from "../utils/sendWhatsApp.js";
import Coupon from "../models/Coupon.js";
import { generateOrderNumber }
from "../utils/generateOrderNumber.js";
import Courier from "../models/Courier.js";

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
/* =====================================
   APPLY COUPON
===================================== */

let couponCode = "";
let couponDiscount = 0;
let couponType = "";
let finalAmount = req.body.total;

if (req.body.couponCode) {

  const coupon = await Coupon.findOne({

    code: req.body.couponCode.toUpperCase(),

    isActive: true,

  });

  if (!coupon) {

    return res.status(400).json({

      success: false,

      message: "Invalid coupon",

    });

  }

if (
  coupon.expiryDate &&
  coupon.expiryDate < new Date()
) {
  return res.status(400).json({
    success: false,
    message: "Coupon expired",
  });
}
 if (req.body.subtotal < coupon.minOrderAmount) {

    return res.status(400).json({

      success: false,

      message:
        `Minimum order ₹${coupon.minOrderAmount} required`,

    });

  }

 if (
  coupon.usedBy.some(
    (id) =>
      id.toString() ===
      req.user._id.toString()
  )
) {
  return res.status(400).json({
    success: false,
    message: "Coupon already used",
  });
}

const subtotal = req.body.subtotal || 0;
const shipping = req.body.shippingCharge || 0;
const tax = req.body.tax || 0;

if (coupon.discountType === "PERCENTAGE") {

  couponDiscount =
    (subtotal * coupon.discountValue) / 100;

  if (coupon.maxDiscount > 0) {

    couponDiscount = Math.min(
      couponDiscount,
      coupon.maxDiscount
    );

  }

} else {

  couponDiscount = coupon.discountValue;

}

finalAmount = Math.max(
  0,
  subtotal + shipping + tax - couponDiscount
);

  couponCode = coupon.code;

  couponType =
    coupon.discountType;


}
const order = new Order({
    userId: req.user._id,
    orderNumber: generateOrderNumber(),

    fullname:
        req.body.fullname ||
        `${req.user.firstName} ${req.user.lastName}`,

    email:
        req.body.email ||
        req.user.email,

    phone:
        req.body.phone ||
        req.user.phone,

    deliveryAddress: {
        customer: {
            fullName:
                req.body.deliveryAddress.customer.fullName,

            phone:
                req.body.deliveryAddress.customer.phone,

            alternatePhone:
                req.body.deliveryAddress.customer.alternatePhone || "",

            email:
                req.body.deliveryAddress.customer.email ||
                req.user.email,
        },

        address: {
            addressLine1:
                req.body.deliveryAddress.address.addressLine1,

            addressLine2:
                req.body.deliveryAddress.address.addressLine2 || "",

            landmark:
                req.body.deliveryAddress.address.landmark || "",

            area:
                req.body.deliveryAddress.address.area,

            city:
                req.body.deliveryAddress.address.city,

            district:
                req.body.deliveryAddress.address.district,

            state:
                req.body.deliveryAddress.address.state,

            postalCode:
                req.body.deliveryAddress.address.postalCode,

            country:
                req.body.deliveryAddress.address.country || "India",
        },

        location:
            req.body.deliveryAddress.location || {},

        preference:
            req.body.deliveryAddress.preference || {},
    },

    pricing: {
        subtotal: req.body.subtotal,
        shippingCharge: req.body.shippingCharge || 0,
        tax: req.body.tax || 0,
        couponCode,
        couponDiscount,
        couponType,
        total: finalAmount,
    },

    payment: {
        method: req.body.paymentMethod || "COD",
        status: req.body.paymentStatus || "Pending",

        gateway: {
            orderId: req.body.razorpayOrderId || "",
            paymentId: req.body.razorpayPaymentId || "",
            signature: req.body.razorpaySignature || "",
        },
    },

    items: formattedItems,
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

const savedOrder = await order.save();
/* =====================================
   MARK COUPON USED
===================================== */

if (couponCode) {

  await Coupon.findOneAndUpdate(

    {

      code: couponCode,

    },

    {

      $addToSet: {

        usedBy:
          req.user._id,

      },

    }

  );

}
console.log("====================================");
console.log("ORDER SAVED");
console.log(
  "RAZORPAY ORDER ID:",
  order.payment.gateway.orderId
);
console.log(
  "RAZORPAY PAYMENT ID:",
  order.payment.gateway.paymentId
);
console.log(
  "RAZORPAY SIGNATURE:",
  order.payment.gateway.signature
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
      "🛒 Order Confirmed – Odikart",
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
    src="https://res.cloudinary.com/dqyltwn9z/image/upload/v1785478585/logo_shi1c4.png"
    alt="Odikart Logo"
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
    🛍️ Odikart
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
       Subtotal : ₹${order.pricing.subtotal}<br>
Coupon : ${order.pricing.couponCode || "None"}<br>
Discount : -₹${order.pricing.couponDiscount}<br>
Shipping : ₹${order.pricing.shippingCharge}<br>
Tax : ₹${order.pricing.tax}<br>
<hr>
<b>Grand Total : ₹${order.pricing.total}</b>
              </td>
            </tr>

            <tr>
              <td>💳 Payment</td>
              <td style="text-align:right;">
                ${order.payment.method} (${order.payment.status})
              </td>
            </tr>

            <tr>
              <td>📅 Order Date</td>
              <td style="text-align:right;">
                ${new Date(savedOrder.createdAt).toLocaleString()}
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
              <span>Subtotal : ₹${order.pricing.subtotal}<br>
Coupon : ${order.pricing.couponCode || "None"}<br>
Discount : -₹${order.pricing.couponDiscount}<br>
Shipping : ₹${order.pricing.shippingCharge}<br>
Tax : ₹${order.pricing.tax}<br>
<hr>
<b>Grand Total : ₹${order.pricing.total}</b></span>
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
           ${order.deliveryAddress.address.addressLine1}<br/>
${order.deliveryAddress.address.addressLine2 || ""}<br/>
${order.deliveryAddress.address.landmark || ""}<br/>
${order.deliveryAddress.address.area}<br/>
${order.deliveryAddress.address.city},
${order.deliveryAddress.address.district}<br/>
${order.deliveryAddress.address.state} -
${order.deliveryAddress.address.postalCode}<br/>
${order.deliveryAddress.address.country}
          </div>
        </div>

        <!-- CTA -->
        <div style="text-align:center;margin:30px 0;">
          <a href="https://odikart.in/track-order"
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
          ❤️ Thank you for choosing <b>Odikart</b>
        </p>

      </div>

      <!-- FOOTER -->
      <div style="background:#f3f4f6;padding:12px;text-align:center;font-size:12px;color:#888;">
        © ${new Date().getFullYear()} Odikart. All rights reserved.
      </div>

    </div>

  </div>
  `,
    );

    await sendWhatsApp(
      order.phone,

      `
             🛍️ *Odikart*
       

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
${new Date(savedOrder.createdAt).toLocaleString("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
})}

📦 *Order Status*  
🟢 ${order.status}

💳 *Payment Method*  
${order.payment.method}

💵 *Payment Status*  
🟢 ${order.payment.status}

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
💸Subtotal:
₹${order.pricing.subtotal}

Coupon:
${order.pricing.couponCode || "None"}

Discount:
-₹${order.pricing.couponDiscount}

Grand Total:
₹${order.pricing.total}

━━━━━━━━━━━━━━━━━━━
📍 *DELIVERY ADDRESS*
━━━━━━━━━━━━━━━━━━━

👤 ${order.deliveryAddress.customer.fullName}

📞 ${order.deliveryAddress.customer.phone}

🏠 ${order.deliveryAddress.address.addressLine1}

${order.deliveryAddress.address.addressLine2 || ""}

📍 ${order.deliveryAddress.address.area}

🏙 ${order.deliveryAddress.address.city}

🏛 ${order.deliveryAddress.address.district}

🗺 ${order.deliveryAddress.address.state}

📮 ${order.deliveryAddress.address.postalCode}

🇮🇳 ${order.deliveryAddress.address.country}
━━━━━━━━━━━━━━━━━━━
🚚 *SHIPPING UPDATE*
━━━━━━━━━━━━━━━━━━━

Your order is being prepared for shipment 📦

You’ll receive another update once your order has been shipped 🚛

━━━━━━━━━━━━━━━━━━━
🔍 *TRACK YOUR ORDER*
━━━━━━━━━━━━━━━━━━━

🌐
https://odikart.in/track-order

━━━━━━━━━━━━━━━━━━━
🆘 *CUSTOMER SUPPORT*
━━━━━━━━━━━━━━━━━━━

📧 Odikartcustomerinfo@gmail.com

━━━━━━━━━━━━━━━━━━━

❤️ Thank you for choosing *Odikart*

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


export const getSingleOrder = async (req, res) => {
  try {

    const { id } = req.params;

    const order = await Order.findById(id)

      .populate({
        path: "userId",
        select: "firstName lastName email phone image",
      })

      .populate({
        path: "sellerId",
        select: "firstName lastName email phone sellerInfo.shopName",
      })

     .populate({
  path: "shipping.courier",
  select:
    "name logo website trackingUrl customerCareNumber estimatedDeliveryDays",
})

      .populate({
        path: "items.productId",
        select:
          "title slug images price brand category stock",
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

      if (
      req.user.role !== "admin" &&
      order.userId._id.toString() !== req.user._id.toString() &&
      order.sellerId?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // 3. Return order
    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {

    console.error("Get Single Order Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
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

console.log("PAYMENT METHOD:", order.payment.method);
console.log("PAYMENT STATUS:", order.payment.status);
console.log("PAYMENT ID:", order.payment.gateway.paymentId);
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
  order.payment.method === "Razorpay" &&
  order.payment.status === "Paid" &&
  order.payment.gateway.paymentId
) {

  console.log("STARTING REFUND");

  const refund = await razorpay.payments.refund(
    order.payment.gateway.paymentId,
    {
      amount: Math.round(order.pricing.total * 100),
    }
  );

  console.log("REFUND SUCCESS:", refund);

  order.payment.status = "Refunded";

  order.refund.refundId = refund.id;
 order.refund.status =
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
      "❌ Order Cancelled – Odikart",
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
          src="https://res.cloudinary.com/dqyltwn9z/image/upload/v1785478585/logo_shi1c4.png"
          alt="Odikart Logo"
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
          order.payment.status === "Paid"
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
              <td align="right">Subtotal:
₹${order.pricing.subtotal}

Coupon:
${order.pricing.couponCode || "None"}

Discount:
-₹${order.pricing.couponDiscount}

Grand Total:
₹${order.pricing.total}</td>
            </tr>

            <tr>
              <td style="padding:8px 0;"><b>💳 Payment</b></td>
              <td align="right">
                ${order.payment.method} (${order.payment.status})
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
                  ₹${order.pricing.total}
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
            href="https://odikart.in/track-order"
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
          — <b>Odikart Team</b>
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
        © ${new Date().getFullYear()} Odikart. All rights reserved.
      </div>

    </div>

  </div>
  `,
    );
    await sendWhatsApp(
      updatedOrder.phone,

      `
             🛍️ *Odikart*
       

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
${order.payment.method}

💵 *Payment Status*  
${order.payment.status}

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
💸 ₹${order.pricing.total}

━━━━━━━━━━━━━━━━━━━
💳 *REFUND INFORMATION*
━━━━━━━━━━━━━━━━━━━

${
  order.payment.status === "Paid"
    ? `✅ Your refund has been initiated successfully.

⏳ Expected refund time:
5 - 7 business days.

💰 Refund Amount:
₹${order.pricing.total}`
    : `ℹ️ No payment was captured for this order.`
}

━━━━━━━━━━━━━━━━━━━
📍 *DELIVERY ADDRESS*
━━━━━━━━━━━━━━━━━━━

👤 ${order.deliveryAddress.customer.fullName}

📞 ${order.deliveryAddress.customer.phone}

🏠 ${order.deliveryAddress.address.addressLine1}

${order.deliveryAddress.address.addressLine2 || ""}

📍 ${order.deliveryAddress.address.area}

🏙 ${order.deliveryAddress.address.city}

🏛 ${order.deliveryAddress.address.district}

🗺 ${order.deliveryAddress.address.state}

📮 ${order.deliveryAddress.address.postalCode}

🇮🇳 ${order.deliveryAddress.address.country}

━━━━━━━━━━━━━━━━━━━
🆘 *CUSTOMER SUPPORT*
━━━━━━━━━━━━━━━━━━━

📧 Odikartcustomerinfo@gmail.com

🌐 Track Orders:
https://odikart.in/track-order

━━━━━━━━━━━━━━━━━━━

❤️ Thank you for shopping with *Odikart*

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
   console.error(error);
console.error(error.stack);

    res.status(500).json({
      success: false,

      message: "Server error",
    });
  }
};

/* =====================================
   ORDER STATUS FLOW
===================================== */

const ORDER_FLOW = {

  "Pending Payment": ["Confirmed", "Cancelled"],

  "Confirmed": ["Processing", "Cancelled"],

  "Processing": ["Packed", "Cancelled"],

  "Packed": ["Ready for Pickup"],

  "Ready for Pickup": ["Shipped"],

  "Shipped": ["In Transit"],

  "In Transit": ["Out for Delivery"],

  "Out for Delivery": ["Delivered"],

  "Delivered": [
    "Return Requested"
  ],

  "Return Requested": [
    "Return Approved",
    "Return Rejected"
  ],

  "Return Approved": [
    "Return Pickup Scheduled"
  ],

  "Return Pickup Scheduled": [
    "Return Picked Up"
  ],

  "Return Picked Up": [
    "Received by Admin"
  ],

  "Received by Admin": [
    "Inspection"
  ],

  "Inspection": [
    "Refund Processing",
    "Return Rejected"
  ],

  "Refund Processing": [
    "Refund Completed"
  ],

  "Refund Completed": [],

  "Return Rejected": [],

  "Cancelled": []

};

export const updateOrderStatus = async (req, res) => {
  try {

    const { orderId } = req.params;

    const { status, remark } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }
/* =====================================
   VALIDATE STATUS FLOW
===================================== */

const allowedStatus =
    ORDER_FLOW[order.status] || [];

if (!allowedStatus.includes(status)) {

    return res.status(400).json({
        success:false,
        message:`Cannot change status from ${order.status} to ${status}`
    });

}
if (
    status === "Confirmed" &&
    order.payment.method === "Razorpay" &&
    order.payment.status !== "Paid"
){

    return res.status(400).json({
        success:false,
        message:"Payment not completed"
    });

}
if(status==="Ready for Pickup"){

    if(order.status!=="Packed"){

        return res.status(400).json({
            success:false,
            message:"Order must be Packed first"
        });

    }

}
if(status==="Shipped"){

    if(!order.shipping.courier){

        return res.status(400).json({
            success:false,
            message:"Assign courier before shipping"
        });

    }

}
if(status==="Shipped"){

    if(!order.shipping.trackingNumber){

        return res.status(400).json({
            success:false,
            message:"Tracking number missing"
        });

    }

}
if(status==="Out for Delivery"){

    if(order.status!=="In Transit"){

        return res.status(400).json({
            success:false,
            message:"Order must be In Transit first"
        });

    }

}
if(status==="Delivered"){

    if(order.status!=="Out for Delivery"){

        return res.status(400).json({
            success:false,
            message:"Order must be Out for Delivery first"
        });

    }

    order.deliveredAt=new Date();

    if(order.payment.method==="COD"){

        order.payment.status="Paid";

    }

}
if(status==="Return Requested"){

    if(order.status!=="Delivered"){

        return res.status(400).json({
            success:false,
            message:"Only delivered orders can be returned"
        });

    }

}
if(status==="Refund Processing"){

    if(order.status!=="Returned"){

        return res.status(400).json({
            success:false,
            message:"Order must be Returned first"
        });

    }

}
const cancellable = [
    "Pending Payment",
    "Confirmed",
    "Processing",
    "Packed"
];

if(status==="Cancelled"){

    if(!cancellable.includes(order.status)){

        return res.status(400).json({
            success:false,
            message:"This order cannot be cancelled now"
        });

    }

}
    /* ==============================
       VALID ORDER STATUS
    ============================== */

    const validStatus = [
      "Pending Payment",
      "Confirmed",
      "Processing",
      "Packed",
      "Ready for Pickup",
      "Shipped",
      "In Transit",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
      "Return Requested",
      "Return Approved",
      "Returned",
      "Refund Processing",
      "Refund Completed",
    ];

    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    /* ==============================
       UPDATE STATUS
    ============================== */

    order.status = status;

    /* ==============================
       SPECIAL CASES
    ============================== */

    if (status === "Delivered") {
      order.deliveredAt = new Date();
    }

    if (status === "Cancelled") {
      order.cancelled = true;
      order.cancelledAt = new Date();
      order.cancelledBy = req.user.role;
    }

    if (status === "Returned") {
      order.returnedAt = new Date();
    }

    /* ==============================
       STATUS HISTORY
    ============================== */

    order.statusHistory.push({
      status,
      date: new Date(),
      updatedBy: req.user._id,
      remark: remark || "",
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

/* =====================================
   ASSIGN COURIER
===================================== */

export const assignCourier = async (req, res) => {
  try {

    const { orderId } = req.params;

    const {
      courierId,
      trackingNumber,
      estimatedDelivery,
    } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const courier = await Courier.findById(courierId);

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

order.shipping.courier = courier._id;

order.shipping.courierName = courier.name;

order.shipping.trackingNumber = trackingNumber;

order.shipping.trackingUrl =
  `${courier.trackingUrl}${trackingNumber}`;

order.shipping.estimatedDelivery =
  estimatedDelivery;

order.status = "Ready for Pickup";

order.statusHistory.push({
  status: "Ready for Pickup",
  updatedBy: req.user._id,
  remark: `Assigned to ${courier.name}`,
});

await order.save();
    res.status(200).json({
      success: true,
      message: "Courier assigned successfully",
      order,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

/* =====================================
   UPDATE TRACKING
===================================== */

export const updateTracking = async (req, res) => {

  try {

    const { orderId } = req.params;

    const {
      trackingNumber,
      trackingUrl,
    } = req.body;

    const order =
      await Order.findById(orderId);

    if (!order) {

      return res.status(404).json({
        success: false,
        message: "Order not found",
      });

    }

    order.shipping.trackingNumber =
      trackingNumber;

    order.shipping.trackingUrl =
      trackingUrl;

    await order.save();

    res.status(200).json({

      success: true,

      message:
        "Tracking updated successfully",

      order,

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};

/* =====================================
   CHANGE COURIER
===================================== */

export const changeCourier = async (req, res) => {

  try {

    const { orderId } = req.params;

    const {
      courierId,
      trackingNumber,
    } = req.body;

    const order =
      await Order.findById(orderId);

    if (!order) {

      return res.status(404).json({
        success: false,
        message: "Order not found",
      });

    }

    const courier =
      await Courier.findById(courierId);

    if (!courier) {

      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });

    }

    order.shipping.courier = courier._id;

    order.shipping.courierName = courier.name;

    order.shipping.trackingNumber =
      trackingNumber;

    order.shipping.trackingUrl =
      courier.trackingUrl +
      trackingNumber;

    order.statusHistory.push({

      status: order.status,

      updatedBy: req.user._id,

      remark:
        `Courier changed to ${courier.name}`,

    });

    await order.save();

    res.status(200).json({

      success: true,

      message:
        "Courier changed successfully",

      order,

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};

/* =====================================
   GET COURIER DETAILS OF ORDER
===================================== */

export const getCourierDetails =
async (req, res) => {

  try {

    const order =
      await Order.findById(req.params.orderId)
        .populate("courier");

    if (!order) {

      return res.status(404).json({
        success: false,
        message: "Order not found",
      });

    }

    res.status(200).json({

      success: true,

      courier: order.shipping.courier,

      trackingNumber:
        order.shipping.trackingNumber,

      trackingUrl:
        order.shipping.trackingUrl,

      estimatedDelivery:
        order.shipping.estimatedDelivery,

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};

export const requestReturn = async (req, res) => {
  try {

    const { orderId } = req.params;
    const { reason, comment } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    if (order.status !== "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Only delivered orders can be returned"
      });
    }

  order.status = "Return Requested";

order.returnDetails.requested = true;
order.returnDetails.requestedAt = new Date();
order.returnDetails.reason = reason;
order.returnDetails.customerComment = comment || "";
order.returnDetails.images = req.body.images || [];
order.returnDetails.videos = req.body.videos || [];
    order.statusHistory.push({
      status: "Return Requested",
      updatedBy: req.user._id,
      remark: comment
    });

    await order.save();

    res.json({
      success: true,
      message: "Return request submitted",
      order
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const approveReturn = async (req, res) => {

  try {

    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success:false,
        message:"Order not found"
      });
    }

    order.status = "Return Approved";

  order.returnDetails.approvedAt = new Date();
order.returnDetails.sellerRemark = req.body.remark || "";

    order.statusHistory.push({
      status:"Return Approved",
      updatedBy:req.user._id,
      remark:"Return Approved"
    });

    await order.save();

    res.json({
      success:true,
      message:"Return approved",
      order
    });

  } catch(error){

    res.status(500).json({
      success:false,
      message:error.message
    });

  }

};
export const rejectReturn = async (req,res)=>{

try{

const order=await Order.findById(req.params.orderId);

if(!order){

return res.status(404).json({
success:false,
message:"Order not found"
});

}

order.status="Delivered";

order.returnDetails.rejectedAt = new Date();
order.returnDetails.sellerRemark = req.body.remark || "";

order.statusHistory.push({

status:"Return Rejected",

updatedBy:req.user._id,

remark:req.body.remark

});

await order.save();

res.json({

success:true,

message:"Return rejected",

order

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

}
export const assignReturnCourier = async(req,res)=>{

try{

const{

courierId,

trackingNumber,

estimatedDelivery

}=req.body;

const order=await Order.findById(req.params.orderId)
.populate("courier");

if(!order){

return res.status(404).json({

success:false,

message:"Order not found"

});

}

const courier=await Courier.findById(courierId);

if(!courier){

return res.status(404).json({

success:false,

message:"Courier not found"

});

}

order.shipping.courier=courier._id;

order.shipping.courierName=courier.name;

order.shipping.trackingNumber=trackingNumber;

order.shipping.trackingUrl=
`${courier.trackingUrl}${trackingNumber}`;

order.shipping.estimatedDelivery=estimatedDelivery;

order.status="Return Pickup Scheduled";
order.returnDetails.pickupScheduledAt = new Date();
order.statusHistory.push({

status:"Return Pickup Scheduled",

updatedBy:req.user._id,

remark:"Courier Assigned"

});

await order.save();

res.json({

success:true,

message:"Courier assigned",

order

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

}
export const returnPickedUp = async(req,res)=>{

try{

const order=await Order.findById(req.params.orderId);

if(!order){

return res.status(404).json({

success:false,

message:"Order not found"

});

}

order.status="Return Picked Up";
order.returnDetails.pickedUpAt = new Date();
order.statusHistory.push({

status:"Return Picked Up",

updatedBy:req.user._id,

remark:"Courier picked the product"

});

await order.save();

res.json({

success:true,

message:"Pickup completed",

order

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

}
export const receiveReturnedProduct=async(req,res)=>{

try{

const order=await Order.findById(req.params.orderId);

if(!order){

return res.status(404).json({

success:false,

message:"Order not found"

});

}

order.status="Received by Admin";
order.returnDetails.receivedByAdminAt = new Date();
order.statusHistory.push({

status:"Received by Admin",

updatedBy:req.user._id,

remark:"Product received"

});

await order.save();

res.json({

success:true,

message:"Product received",

order

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

}
export const inspectReturnedProduct=async(req,res)=>{

try{

const{

inspectionStatus,

remark

}=req.body;

const order=await Order.findById(req.params.orderId);

if(!order){

return res.status(404).json({

success:false,

message:"Order not found"

});

}

if(inspectionStatus==="Passed"){

order.status = "Refund Processing";

order.returnDetails.refundStartedAt = new Date();

}else{

order.status="Return Rejected";

}

order.statusHistory.push({

status:order.status,

updatedBy:req.user._id,

remark

});

await order.save();

res.json({

success:true,

message:"Inspection completed",

order

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

}
export const completeRefund = async (req,res)=>{

try{

const order=await Order.findById(req.params.orderId);

if(!order){

return res.status(404).json({

success:false,

message:"Order not found"

});

}

if(order.status!=="Refund Processing"){

return res.status(400).json({

success:false,

message:"Refund not started"

});

}

if(order.payment.method==="Razorpay"){

const refund=await razorpay.payments.refund(

order.payment.gateway.paymentId,

{

amount:Math.round(order.pricing.total*100)

}

);

order.refund.refundId=refund.id;

}

order.payment.status="Refunded";

order.refund.status="Completed";

order.refund.amount=order.pricing.total;

order.refund.refundedAt=new Date();

order.status="Refund Completed";

order.statusHistory.push({

status:"Refund Completed",

updatedBy:req.user._id,

remark:"Refund transferred"

});

await order.save();

res.json({

success:true,

message:"Refund completed",

order

});

}catch(error){

res.status(500).json({

success:false,

message:error.message

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