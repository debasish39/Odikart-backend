import razorpay from "../utils/razorpay.js";
import crypto from "crypto";
/* =====================================
   CREATE RAZORPAY ORDER
===================================== */

export const createOrder = async (
  req,
  res
) => {

  try {

    /* =====================================
       AMOUNT
    ===================================== */

    const amount = Number(
      req.body.amount
    );

    /* =====================================
       VALIDATION
    ===================================== */

    if (
      !amount ||
      isNaN(amount) ||
      amount <= 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid amount",

      });

    }

    /* =====================================
       OPTIONS
    ===================================== */

    const options = {

      amount:
        amount * 100,

      currency: "INR",

      receipt:
        `receipt_${Date.now()}`,

    };

    /* =====================================
       CREATE ORDER
    ===================================== */

    const order =
      await razorpay.orders.create(
        options
      );

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      order,

    });

  } catch (error) {

    console.error(
      "Razorpay Error:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        "Razorpay order failed",

      error: error.message,

    });

  }

};


/* =====================================
   VERIFY PAYMENT
===================================== */

export const verifyPayment = (
  req,
  res
) => {

  try {

    /* =====================================
       BODY DATA
    ===================================== */

    const {

      razorpay_order_id,

      razorpay_payment_id,

      razorpay_signature,

    } = req.body;

    /* =====================================
       GENERATE SIGNATURE
    ===================================== */

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_SECRET
        )

        .update(
          razorpay_order_id +
          "|" +
          razorpay_payment_id
        )

        .digest("hex");

    /* =====================================
       VERIFY SIGNATURE
    ===================================== */

    if (
      generatedSignature ===
      razorpay_signature
    ) {

      return res.status(200).json({

        success: true,

        message:
          "Payment verified successfully",

      });

    }

    /* =====================================
       INVALID SIGNATURE
    ===================================== */

    res.status(400).json({

      success: false,

      message:
        "Invalid payment signature",

    });

  } catch (error) {

    console.error(
      "Verify Error:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        "Verification failed",

      error: error.message,

    });

  }

};