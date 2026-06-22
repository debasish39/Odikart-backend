import razorpay from "../utils/razorpay.js";
import Order from "../models/Order.js";
import crypto from "crypto";

/* =====================================
   CREATE RAZORPAY ORDER
===================================== */

export const createOrder =
async (

  req,
  res

) => {

  try {

    /* =====================================
       USER
    ===================================== */

    const user =
      req.user;

    /* =====================================
       AMOUNT
    ===================================== */

    const amount =
      Number(
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

        error:
          "Invalid amount value",

      });

    }

    /* =====================================
       CREATE ORDER
    ===================================== */

    const order =
      await razorpay.orders.create({

        amount:
          Math.round(
            amount * 100
          ),

        currency: "INR",

        receipt:
          `receipt_${Date.now()}`,

        notes: {

          userId:
            user._id.toString(),

          email:
            user.email,

          role:
            user.role,

        },

      });
console.log("================================");
console.log("RAZORPAY ORDER CREATED");
console.log("ORDER ID:", order.id);
console.log("AMOUNT:", order.amount);
console.log("CURRENCY:", order.currency);
console.log("================================");
    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      order,

    });

  } catch (error) {

    console.error(

      "Create Order Error:",

      error

    );

    res.status(500).json({

      success: false,

      error:
        error.message,

    });

  }

};


/* =====================================
   VERIFY PAYMENT
===================================== */

export const verifyPayment =
async (

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
       VALIDATION
    ===================================== */

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

          `${razorpay_order_id}|${razorpay_payment_id}`

        )

        .digest("hex");

    /* =====================================
       VERIFY SIGNATURE
    ===================================== */

    const isAuthentic =

      generatedSignature ===
      razorpay_signature;

    /* =====================================
       INVALID PAYMENT
    ===================================== */

   if (!isAuthentic) {

  return res.status(400).json({
    success: false,
    message: "Invalid payment signature",
  });

}

/* =====================================
   UPDATE ORDER
===================================== */

const order =
  await Order.findOne({

    razorpayOrderId:
      razorpay_order_id,

  });

if (order) {

  order.razorpayPaymentId =
    razorpay_payment_id;

  order.razorpaySignature =
    razorpay_signature;

  order.paymentStatus =
    "Paid";

  await order.save();

}
    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "Payment verified successfully",

      paymentId:
        razorpay_payment_id,

      orderId:
        razorpay_order_id,

    });

  } catch (error) {

    console.error(

      "Verify Payment Error:",

      error

    );

    res.status(500).json({

      success: false,

      message:
        "Verification failed",

      error:
        error.message,

    });

  }

};
