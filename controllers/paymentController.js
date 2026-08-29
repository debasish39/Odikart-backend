import razorpay from "../utils/razorpay.js";
import Order from "../models/Order.js";
import crypto from "crypto";


/* =========================================================
   HELPERS
========================================================= */


/*
|--------------------------------------------------------------------------
| Safe HMAC comparison
|--------------------------------------------------------------------------
*/

const safeCompare = (
  expected,
  received
) => {

  if (
    !expected ||
    !received
  ) {
    return false;
  }


  if (
    expected.length !==
    received.length
  ) {
    return false;
  }


  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(received)
  );

};


/*
|--------------------------------------------------------------------------
| Verify Razorpay Checkout signature
|--------------------------------------------------------------------------
*/

const verifyPaymentSignature = (
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
) => {

  if (
    !process.env.RAZORPAY_SECRET
  ) {

    throw new Error(
      "RAZORPAY_SECRET is not configured"
    );

  }


  const generatedSignature =
    crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_SECRET
      )
      .update(
        `${razorpayOrderId}|${razorpayPaymentId}`
      )
      .digest("hex");


  return safeCompare(
    generatedSignature,
    razorpaySignature
  );

};


/*
|--------------------------------------------------------------------------
| Verify Razorpay webhook signature
|--------------------------------------------------------------------------
*/

const verifyWebhookSignature = (
  rawBody,
  razorpaySignature
) => {

  if (
    !process.env.RAZORPAY_WEBHOOK_SECRET
  ) {

    throw new Error(
      "RAZORPAY_WEBHOOK_SECRET is not configured"
    );

  }


  if (
    !rawBody ||
    !razorpaySignature
  ) {

    return false;

  }


  const generatedSignature =
    crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_WEBHOOK_SECRET
      )
      .update(rawBody)
      .digest("hex");


  return safeCompare(
    generatedSignature,
    razorpaySignature
  );

};


/*
|--------------------------------------------------------------------------
| Update local order as Paid
|--------------------------------------------------------------------------
*/

const markOrderPaid = async ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature = "",
  eventSource = "",
}) => {

  if (!razorpayOrderId) {

    console.warn(
      "⚠️ Cannot mark paid: Razorpay order ID missing"
    );

    return null;

  }


  const order =
    await Order.findOne({
      "payment.gateway.orderId":
        razorpayOrderId,
    });


  if (!order) {

    console.warn(
      "⚠️ Local order not found:",
      razorpayOrderId
    );

    return null;

  }


  order.payment =
    order.payment || {};


  order.payment.gateway =
    order.payment.gateway || {};


  order.payment.gateway.orderId =
    razorpayOrderId;


  if (
    razorpayPaymentId
  ) {

    order.payment.gateway.paymentId =
      razorpayPaymentId;

    order.payment.transactionId =
      razorpayPaymentId;

  }


  if (
    razorpaySignature
  ) {

    order.payment.gateway.signature =
      razorpaySignature;

  }


  order.payment.status =
    "Paid";


  order.payment.paymentDate =
    order.payment.paymentDate ||
    new Date();


  await order.save();


  console.log(
    "======================================"
  );

  console.log(
    "✅ LOCAL ORDER MARKED PAID"
  );

  console.log(
    "Order Mongo ID:",
    order._id
  );

  console.log(
    "Razorpay Order ID:",
    razorpayOrderId
  );

  console.log(
    "Razorpay Payment ID:",
    razorpayPaymentId
  );

  console.log(
    "Source:",
    eventSource
  );

  console.log(
    "======================================"
  );


  return order;

};


/*
|--------------------------------------------------------------------------
| Update local order as Failed
|--------------------------------------------------------------------------
*/

const markOrderFailed = async ({
  razorpayOrderId,
  razorpayPaymentId,
  reason = "",
}) => {

  if (!razorpayOrderId) {

    return null;

  }


  const order =
    await Order.findOne({
      "payment.gateway.orderId":
        razorpayOrderId,
    });


  if (!order) {

    console.warn(
      "⚠️ Local order not found for failed payment:",
      razorpayOrderId
    );

    return null;

  }


  order.payment =
    order.payment || {};


  order.payment.gateway =
    order.payment.gateway || {};


  order.payment.gateway.orderId =
    razorpayOrderId;


  if (
    razorpayPaymentId
  ) {

    order.payment.gateway.paymentId =
      razorpayPaymentId;

  }


  order.payment.status =
    "Failed";


  order.payment.paymentFailureReason =
    reason ||
    "Payment failed";


  await order.save();


  console.log(
    "❌ LOCAL ORDER MARKED FAILED:",
    order._id
  );


  return order;

};


/* =========================================================
   CREATE RAZORPAY ORDER
========================================================= */

export const createOrder =
  async (
    req,
    res
  ) => {

    try {

      console.log(
        "======================================"
      );

      console.log(
        "💳 CREATE RAZORPAY ORDER"
      );

      console.log(
        "User:",
        req.user?._id
      );

      console.log(
        "Email:",
        req.user?.email
      );

      console.log(
        "======================================"
      );


      /* ===================================================
         AUTH USER
      =================================================== */

      const user =
        req.user;


      if (!user) {

        return res.status(401).json({

          success: false,

          message:
            "Authentication required",

        });

      }


      /* ===================================================
         AMOUNT
      =================================================== */

      const amount =
        Number(
          req.body?.amount
        );


      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid amount value",

        });

      }


      /*
       * Razorpay uses paise.
       */

      const amountInPaise =
        Math.round(
          amount * 100
        );


      if (
        !Number.isSafeInteger(
          amountInPaise
        ) ||
        amountInPaise <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid payment amount",

        });

      }


      /* ===================================================
         RECEIPT
      =================================================== */

      const receipt =
        `odikart_${Date.now()}`;


      /* ===================================================
         CREATE RAZORPAY ORDER
      =================================================== */

      const order =
        await razorpay.orders.create({

          amount:
            amountInPaise,

          currency:
            "INR",

          receipt,

          notes: {

            userId:
              String(
                user._id
              ),

            email:
              user.email ||
              "",

            role:
              user.role ||
              "user",

          },

        });


      /* ===================================================
         LOG
      =================================================== */

      console.log(
        "======================================"
      );

      console.log(
        "✅ RAZORPAY ORDER CREATED"
      );

      console.log(
        "Razorpay Order ID:",
        order.id
      );

      console.log(
        "Amount:",
        order.amount
      );

      console.log(
        "Currency:",
        order.currency
      );

      console.log(
        "Receipt:",
        order.receipt
      );

      console.log(
        "======================================"
      );


      /* ===================================================
         RESPONSE
      =================================================== */

      return res.status(200).json({

        success: true,

        order,

      });


    } catch (error) {

      console.error(
        "======================================"
      );

      console.error(
        "❌ CREATE RAZORPAY ORDER ERROR"
      );

      console.error(
        error
      );

      console.error(
        "======================================"
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to create Razorpay order",

        error:
          error.message,

      });

    }

  };


/* =========================================================
   VERIFY PAYMENT
========================================================= */

export const verifyPayment =
  async (
    req,
    res
  ) => {

    try {

      console.log(
        "======================================"
      );

      console.log(
        "🔐 VERIFY RAZORPAY PAYMENT"
      );

      console.log(
        "User:",
        req.user?._id
      );

      console.log(
        "======================================"
      );


      /* ===================================================
         BODY
      =================================================== */

      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } =
        req.body || {};


      console.log(
        "Razorpay Order ID:",
        razorpay_order_id
      );

      console.log(
        "Razorpay Payment ID:",
        razorpay_payment_id
      );

      console.log(
        "Signature received:",
        Boolean(
          razorpay_signature
        )
      );


      /* ===================================================
         VALIDATION
      =================================================== */

      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Missing payment fields",

        });

      }


      /* ===================================================
         VERIFY CHECKOUT SIGNATURE
      =================================================== */

      const isAuthentic =
        verifyPaymentSignature(

          razorpay_order_id,

          razorpay_payment_id,

          razorpay_signature

        );


      console.log(
        "Signature valid:",
        isAuthentic
      );


      if (!isAuthentic) {

        console.error(
          "❌ INVALID PAYMENT SIGNATURE"
        );


        return res.status(400).json({

          success: false,

          message:
            "Invalid payment signature",

        });

      }


      console.log(
        "✅ PAYMENT SIGNATURE VERIFIED"
      );


      /* ===================================================
         FIND LOCAL ORDER
      =================================================== */

      const order =
        await Order.findOne({

          "payment.gateway.orderId":
            razorpay_order_id,

        });


      if (!order) {

        console.warn(
          "⚠️ LOCAL ORDER NOT FOUND DURING VERIFY"
        );

        console.warn(
          "Razorpay Order ID:",
          razorpay_order_id
        );


        /*
         * Payment may have succeeded before
         * the local order was created.
         *
         * Do not fabricate a local order here.
         */

        return res.status(200).json({

          success: true,

          verified: true,

          orderFound: false,

          message:
            "Payment verified, but local order was not found yet.",

          paymentId:
            razorpay_payment_id,

          orderId:
            razorpay_order_id,

        });

      }


      /* ===================================================
         AUTHORIZATION
         
         Make sure the authenticated user owns
         this local order.
      =================================================== */

      if (
        order.userId?.toString() !==
        req.user?._id?.toString()
      ) {

        console.error(
          "❌ PAYMENT ORDER OWNERSHIP MISMATCH"
        );


        return res.status(403).json({

          success: false,

          message:
            "You are not authorized to verify this order.",

        });

      }


      /* ===================================================
         UPDATE PAYMENT
      =================================================== */

      order.payment =
        order.payment || {};


      order.payment.gateway =
        order.payment.gateway || {};


      order.payment.gateway.orderId =
        razorpay_order_id;


      order.payment.gateway.paymentId =
        razorpay_payment_id;


      order.payment.gateway.signature =
        razorpay_signature;


      order.payment.status =
        "Paid";


      order.payment.transactionId =
        razorpay_payment_id;


      order.payment.paymentDate =
        new Date();


      await order.save();


      console.log(
        "======================================"
      );

      console.log(
        "✅ PAYMENT VERIFIED"
      );

      console.log(
        "Local Order:",
        order._id
      );

      console.log(
        "Payment Status:",
        order.payment.status
      );

      console.log(
        "======================================"
      );


      /* ===================================================
         RESPONSE
      =================================================== */

      return res.status(200).json({

        success: true,

        verified: true,

        orderFound: true,

        message:
          "Payment verified successfully",

        paymentId:
          razorpay_payment_id,

        orderId:
          razorpay_order_id,

        order: {

          id:
            order._id,

          paymentStatus:
            order.payment.status,

        },

      });


    } catch (error) {

      console.error(
        "======================================"
      );

      console.error(
        "❌ VERIFY PAYMENT ERROR"
      );

      console.error(
        error
      );

      console.error(
        "======================================"
      );


      return res.status(500).json({

        success: false,

        message:
          "Payment verification failed",

        error:
          error.message,

      });

    }

  };


/* =========================================================
   RAZORPAY WEBHOOK
========================================================= */

export const razorpayWebhook =
  async (
    req,
    res
  ) => {

    try {

      console.log(
        "\n======================================"
      );

      console.log(
        "🔔 RAZORPAY WEBHOOK RECEIVED"
      );

      console.log(
        "======================================"
      );


      /* ===================================================
         RAW BODY
      =================================================== */

      const rawBody =
        req.body;


      if (
        !Buffer.isBuffer(
          rawBody
        )
      ) {

        console.error(
          "❌ Webhook request body is not a Buffer"
        );

        return res.status(400).json({

          success: false,

          message:
            "Invalid webhook body",

        });

      }


      /* ===================================================
         SIGNATURE
      =================================================== */

      const signature =
        req.headers[
          "x-razorpay-signature"
        ];


      const eventId =
        req.headers[
          "x-razorpay-event-id"
        ];


      console.log(
        "Signature present:",
        Boolean(signature)
      );

      console.log(
        "Event ID:",
        eventId
      );


      /* ===================================================
         VERIFY SIGNATURE
      =================================================== */

      const valid =
        verifyWebhookSignature(
          rawBody,
          signature
        );


      if (!valid) {

        console.error(
          "❌ INVALID WEBHOOK SIGNATURE"
        );


        return res.status(400).json({

          success: false,

          message:
            "Invalid webhook signature",

        });

      }


      console.log(
        "✅ WEBHOOK SIGNATURE VERIFIED"
      );


      /* ===================================================
         PARSE BODY AFTER VERIFICATION
      =================================================== */

      let payload;


      try {

        payload =
          JSON.parse(
            rawBody.toString(
              "utf8"
            )
          );

      } catch (parseError) {

        console.error(
          "❌ WEBHOOK JSON PARSE ERROR:",
          parseError
        );

        return res.status(400).json({

          success: false,

          message:
            "Invalid webhook JSON",

        });

      }


      const event =
        payload?.event;


      console.log(
        "Razorpay Event:",
        event
      );


      /* ===================================================
         PAYMENT AUTHORIZED
      =================================================== */

      if (
        event ===
        "payment.authorized"
      ) {

        const payment =
          payload?.payload
            ?.payment
            ?.entity;


        console.log(
          "======================================"
        );

        console.log(
          "🔐 PAYMENT AUTHORIZED"
        );

        console.log(
          "Payment ID:",
          payment?.id
        );

        console.log(
          "Razorpay Order ID:",
          payment?.order_id
        );

        console.log(
          "Amount:",
          payment?.amount
        );

        console.log(
          "Status:",
          payment?.status
        );

        console.log(
          "======================================"
        );


        /*
         * Do not mark the local order as Paid yet.
         */

        return res.status(200).json({

          success: true,

          message:
            "payment.authorized received",

        });

      }


      /* ===================================================
         PAYMENT CAPTURED
      =================================================== */

      if (
        event ===
        "payment.captured"
      ) {

        const payment =
          payload?.payload
            ?.payment
            ?.entity;


        const razorpayOrderId =
          payment?.order_id;


        const razorpayPaymentId =
          payment?.id;


        console.log(
          "======================================"
        );

        console.log(
          "💰 PAYMENT CAPTURED"
        );

        console.log(
          "Payment ID:",
          razorpayPaymentId
        );

        console.log(
          "Order ID:",
          razorpayOrderId
        );

        console.log(
          "Amount:",
          payment?.amount
        );

        console.log(
          "======================================"
        );


        const order =
          await markOrderPaid({

            razorpayOrderId,

            razorpayPaymentId,

            eventSource:
              "payment.captured",

          });


        return res.status(200).json({

          success: true,

          processed:
            Boolean(order),

          message:
            order
              ? "payment.captured processed"
              : "payment.captured received",

        });

      }


      /* ===================================================
         ORDER PAID
      =================================================== */

      if (
        event ===
        "order.paid"
      ) {

        const razorpayOrder =
          payload?.payload
            ?.order
            ?.entity;


        const payment =
          payload?.payload
            ?.payment
            ?.entity;


        const razorpayOrderId =
          razorpayOrder?.id;


        const razorpayPaymentId =
          payment?.id;


        console.log(
          "======================================"
        );

        console.log(
          "✅ ORDER PAID"
        );

        console.log(
          "Order ID:",
          razorpayOrderId
        );

        console.log(
          "Payment ID:",
          razorpayPaymentId
        );

        console.log(
          "======================================"
        );


        const order =
          await markOrderPaid({

            razorpayOrderId,

            razorpayPaymentId,

            eventSource:
              "order.paid",

          });


        return res.status(200).json({

          success: true,

          processed:
            Boolean(order),

          message:
            order
              ? "order.paid processed"
              : "order.paid received",

        });

      }


      /* ===================================================
         PAYMENT FAILED
      =================================================== */

      if (
        event ===
        "payment.failed"
      ) {

        const payment =
          payload?.payload
            ?.payment
            ?.entity;


        const razorpayOrderId =
          payment?.order_id;


        const razorpayPaymentId =
          payment?.id;


        const reason =
          payment?.error_description ||
          payment?.error_reason ||
          "Payment failed";


        console.log(
          "======================================"
        );

        console.log(
          "❌ PAYMENT FAILED"
        );

        console.log(
          "Order ID:",
          razorpayOrderId
        );

        console.log(
          "Payment ID:",
          razorpayPaymentId
        );

        console.log(
          "Reason:",
          reason
        );

        console.log(
          "======================================"
        );


        const order =
          await markOrderFailed({

            razorpayOrderId,

            razorpayPaymentId,

            reason,

          });


        return res.status(200).json({

          success: true,

          processed:
            Boolean(order),

          message:
            order
              ? "payment.failed processed"
              : "payment.failed received",

        });

      }


      /* ===================================================
         UNKNOWN EVENT
      =================================================== */

      console.log(
        "ℹ️ UNHANDLED RAZORPAY EVENT:",
        event
      );


      return res.status(200).json({

        success: true,

        message:
          "Webhook received",

        event,

      });


    } catch (error) {

      console.error(
        "======================================"
      );

      console.error(
        "❌ RAZORPAY WEBHOOK ERROR"
      );

      console.error(
        error
      );

      console.error(
        "======================================"
      );


      return res.status(500).json({

        success: false,

        message:
          "Webhook processing failed",

      });

    }

  };