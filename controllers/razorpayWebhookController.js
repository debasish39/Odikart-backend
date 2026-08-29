import crypto from "crypto";

import Order from "../models/Order.js";


/* =========================================================
   VERIFY RAZORPAY WEBHOOK SIGNATURE
========================================================= */

const verifyWebhookSignature = (
  rawBody,
  receivedSignature
) => {

  const secret =
    process.env.RAZORPAY_WEBHOOK_SECRET;


  if (!secret) {

    throw new Error(
      "RAZORPAY_WEBHOOK_SECRET is not configured"
    );

  }


  if (!receivedSignature) {
    return false;
  }


  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(rawBody)
      .digest("hex");


  if (
    expectedSignature.length !==
    receivedSignature.length
  ) {
    return false;
  }


  return crypto.timingSafeEqual(
    Buffer.from(
      expectedSignature
    ),
    Buffer.from(
      receivedSignature
    )
  );

};


/* =========================================================
   HANDLE RAZORPAY WEBHOOK
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
          "❌ Webhook body is not raw Buffer"
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


      console.log(
        "Webhook signature received:",
        Boolean(signature)
      );


      /* ===================================================
         VERIFY SIGNATURE
      =================================================== */

      const isValid =
        verifyWebhookSignature(
          rawBody,
          signature
        );


      if (!isValid) {

        console.error(
          "❌ INVALID RAZORPAY WEBHOOK SIGNATURE"
        );


        return res.status(400).json({
          success: false,
          message:
            "Invalid webhook signature",
        });

      }


      console.log(
        "✅ Webhook signature verified"
      );


      /* ===================================================
         PARSE AFTER SIGNATURE VERIFICATION
      =================================================== */

      const payload =
        JSON.parse(
          rawBody.toString(
            "utf8"
          )
        );


      const event =
        payload?.event;


      const eventId =
        req.headers[
          "x-razorpay-event-id"
        ];


      console.log(
        "Event:",
        event
      );

      console.log(
        "Event ID:",
        eventId
      );


      /* ===================================================
         IMPORTANT:
         IDENTITY / IDEMPOTENCY
      =================================================== */

      if (!event) {

        return res.status(400).json({
          success: false,
          message:
            "Webhook event is missing",
        });

      }


      /*
       * For now we log eventId.
       *
       * A production implementation should persist
       * processed event IDs in a database collection.
       */


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


        const paymentId =
          payment?.id;


        const razorpayOrderId =
          payment?.order_id;


        const amount =
          Number(
            payment?.amount || 0
          );


        console.log(
          "========== PAYMENT CAPTURED =========="
        );

        console.log(
          "Payment ID:",
          paymentId
        );

        console.log(
          "Razorpay Order ID:",
          razorpayOrderId
        );

        console.log(
          "Amount:",
          amount
        );

        console.log(
          "======================================"
        );


        if (
          !paymentId ||
          !razorpayOrderId
        ) {

          return res.status(400).json({
            success: false,
            message:
              "Payment information missing",
          });

        }


        const order =
          await Order.findOne({
            "payment.gateway.orderId":
              razorpayOrderId,
          });


        if (!order) {

          console.warn(
            "⚠️ Local order not found for Razorpay order:",
            razorpayOrderId
          );


          /*
           * We still return 200.
           *
           * Razorpay successfully delivered the event.
           *
           * You can reconcile unmatched payments separately.
           */

          return res.status(200).json({
            success: true,
            message:
              "Webhook received; local order not found",
          });

        }


        /* =================================================
           IDEMPOTENT UPDATE
        ================================================= */

        const alreadyPaid =
          order.payment?.status ===
          "Paid";


        order.payment =
          order.payment || {};


        order.payment.gateway =
          order.payment.gateway || {};


        order.payment.gateway.orderId =
          razorpayOrderId;


        order.payment.gateway.paymentId =
          paymentId;


        order.payment.status =
          "Paid";


        order.payment.paymentDate =
          new Date();


        order.payment.transactionId =
          paymentId;


        /*
         * Only update payment state here.
         *
         * Your existing order status remains separate.
         */

        await order.save();


        console.log(
          alreadyPaid
            ? "ℹ️ Order was already paid; webhook reconciled"
            : "✅ Order payment marked Paid"
        );


        return res.status(200).json({
          success: true,
          message:
            "payment.captured processed",
        });

      }


      /* ===================================================
         ORDER PAID
      =================================================== */

      if (
        event ===
        "order.paid"
      ) {

        const orderEntity =
          payload?.payload
            ?.order
            ?.entity;


        const razorpayOrderId =
          orderEntity?.id;


        const payment =
          payload?.payload
            ?.payment
            ?.entity;


        const paymentId =
          payment?.id;


        console.log(
          "========== ORDER PAID =========="
        );

        console.log(
          "Razorpay Order ID:",
          razorpayOrderId
        );

        console.log(
          "Payment ID:",
          paymentId
        );

        console.log(
          "================================"
        );


        if (
          !razorpayOrderId
        ) {

          return res.status(400).json({
            success: false,
            message:
              "Razorpay order ID missing",
          });

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


          return res.status(200).json({
            success: true,
            message:
              "Webhook received; local order not found",
          });

        }


        order.payment =
          order.payment || {};


        order.payment.gateway =
          order.payment.gateway || {};


        order.payment.gateway.orderId =
          razorpayOrderId;


        if (
          paymentId
        ) {

          order.payment.gateway.paymentId =
            paymentId;

          order.payment.transactionId =
            paymentId;

        }


        order.payment.status =
          "Paid";


        order.payment.paymentDate =
          new Date();


        await order.save();


        console.log(
          "✅ Local order marked Paid from order.paid"
        );


        return res.status(200).json({
          success: true,
          message:
            "order.paid processed",
        });

      }


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
          "========== PAYMENT AUTHORIZED =========="
        );

        console.log(
          "Payment ID:",
          payment?.id
        );

        console.log(
          "Order ID:",
          payment?.order_id
        );

        console.log(
          "========================================"
        );


        /*
         * Don't mark the order Paid yet.
         *
         * payment.captured / order.paid is the
         * appropriate point for your Paid state.
         */


        return res.status(200).json({
          success: true,
          message:
            "payment.authorized received",
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


        const paymentId =
          payment?.id;


        const description =
          payment?.error_description ||
          payment?.error_reason ||
          "Payment failed";


        console.log(
          "========== PAYMENT FAILED =========="
        );

        console.log(
          "Order ID:",
          razorpayOrderId
        );

        console.log(
          "Payment ID:",
          paymentId
        );

        console.log(
          "Reason:",
          description
        );

        console.log(
          "===================================="
        );


        if (
          razorpayOrderId
        ) {

          const order =
            await Order.findOne({
              "payment.gateway.orderId":
                razorpayOrderId,
            });


          if (order) {

            order.payment =
              order.payment || {};


            order.payment.gateway =
              order.payment.gateway || {};


            order.payment.gateway.orderId =
              razorpayOrderId;


            if (
              paymentId
            ) {

              order.payment.gateway.paymentId =
                paymentId;

            }


            order.payment.status =
              "Failed";


            order.payment.paymentFailureReason =
              description;


            await order.save();


            console.log(
              "✅ Order payment marked Failed"
            );

          }

        }


        return res.status(200).json({
          success: true,
          message:
            "payment.failed processed",
        });

      }


      /* ===================================================
         UNKNOWN / UNUSED EVENT
      =================================================== */

      console.log(
        "ℹ️ Event received but not handled:",
        event
      );


      /*
       * Return 200 so Razorpay knows that the endpoint
       * successfully received the event.
       */

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