import razorpay from "../utils/razorpay.js";
import crypto from "crypto";
/* =====================================
   CREATE RAZORPAY ORDER
===================================== */

export const createOrder = async (req, res) => {
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