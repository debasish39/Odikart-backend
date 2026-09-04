import mongoose from "mongoose";
import crypto from "crypto";

import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import Courier from "../models/Courier.js";

import razorpay from "../utils/razorpay.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendWhatsApp } from "../utils/sendWhatsApp.js";
import { generateOrderNumber } from "../utils/generateOrderNumber.js";
import { creditSellerWallet } from "../utils/walletService.js";
import { generateTrackingNumber } from "../utils/generateTrackingNumber.js";
/* =========================================================
   CUSTOM ORDER VALIDATION ERROR
========================================================= */

class OrderValidationError extends Error {
  constructor(message, code = "ORDER_VALIDATION_ERROR") {
    super(message);

    this.name = "OrderValidationError";
    this.code = code;
  }
}

/* =========================================================
   CONSTANTS
========================================================= */

const ORDER_FLOW = {
  "Pending Payment": ["Confirmed", "Cancelled"],

  Confirmed: ["Processing", "Cancelled"],

  Processing: ["Packed", "Cancelled"],

  Packed: ["Ready for Pickup", "Cancelled"],

  "Ready for Pickup": ["Shipped"],

  Shipped: ["In Transit"],

  "In Transit": ["Out for Delivery"],

  "Out for Delivery": ["Delivered"],

  Delivered: ["Return Requested"],

  "Return Requested": ["Return Approved", "Return Rejected"],

  "Return Approved": ["Return Pickup Scheduled"],

  "Return Pickup Scheduled": ["Return Picked Up"],

  "Return Picked Up": ["Received by Admin"],

  "Received by Admin": ["Inspection"],

  Inspection: ["Refund Processing", "Return Rejected"],

  "Refund Processing": ["Refund Completed"],

  "Refund Completed": [],

  "Return Rejected": [],

  Cancelled: [],
};

const CANCELLABLE_STATUSES = [
  "Pending Payment",
  "Confirmed",
  "Processing",
];

const COMMISSION_RATE = 10;

const TRACK_ORDER_URL = "https://odikart.in/track-order";

const ODiKART_LOGO =
  "https://res.cloudinary.com/dqyltwn9z/image/upload/v1785478585/logo_shi1c4.png";

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

const getFullName = (user) => {
  const firstName = String(user?.firstName || "").trim();
  const lastName = String(user?.lastName || "").trim();

  return `${firstName} ${lastName}`.trim();
};

const money = (value) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.round(number * 100) / 100;
};

const getSellerIdFromItem = (item) => {
  return item?.sellerId ? String(item.sellerId) : null;
};

const appendStatusHistory = (
  order,
  status,
  updatedBy,
  remark = "",
) => {
  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }

  order.statusHistory.push({
    status,
    date: new Date(),
    updatedBy,
    remark,
  });
};


/* =========================================================
   COURIER VERIFICATION HELPERS
========================================================= */

const isCourierVerified = (courier) => {
  return Boolean(
    courier &&
    courier.verificationStatus === "verified" &&
    courier.isActive === true &&
    courier.documents?.aadhaar?.documentUrl &&
    courier.documents?.drivingLicense?.documentUrl &&
    courier.documents?.aadhaar?.verified === true &&
    courier.documents?.drivingLicense?.verified === true
  );
};

const ACTIVE_COURIER_STATUSES = [
  "Ready for Pickup",
  "Shipped",
  "In Transit",
  "Out for Delivery",
];


/* =========================================================
   SAVE ORDER
========================================================= */

export const saveOrder = async (req, res) => {
  console.log("\n====================================");
  console.log("🛒 SAVE ORDER API HIT");
  console.log("====================================");

  let stockDeducted = [];

  try {
    /* =====================================================
       1. AUTHENTICATION
    ===================================================== */

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    /* =====================================================
       2. BASIC REQUEST VALIDATION
    ===================================================== */

    if (
      !Array.isArray(req.body?.items) ||
      req.body.items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one product is required",
      });
    }

    if (!req.body?.deliveryAddress?.address) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required",
      });
    }

    /* =====================================================
       3. DELIVERY ADDRESS
    ===================================================== */

    const address =
      req.body.deliveryAddress.address;

    const postalCode =
      String(address.postalCode || "").trim();

    if (!/^[1-9][0-9]{5}$/.test(postalCode)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PINCODE",
        message: "Please enter a valid 6-digit PIN code",
      });
    }

    /* =====================================================
       4. CUSTOMER
    ===================================================== */

    const customer =
      req.body.deliveryAddress.customer || {};

    const fullname =
      customer.fullName ||
      req.body.fullname ||
      `${req.user.firstName || ""} ${
        req.user.lastName || ""
      }`.trim();

    const email =
      customer.email ||
      req.body.email ||
      req.user.email;

    const phone =
      customer.phone ||
      req.body.phone ||
      req.user.phone;

    if (!fullname) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Customer email is required",
      });
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Customer phone is required",
      });
    }

    /* =====================================================
       5. PAYMENT METHOD
    ===================================================== */

    const paymentMethod =
      req.body.paymentMethod || "COD";

    if (
      !["COD", "Razorpay"].includes(
        paymentMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    /* =====================================================
       6. PREPARE ORDER ITEMS
    ===================================================== */

    const formattedItems = [];

    let subtotal = 0;
    let totalTax = 0;
    let totalShipping = 0;

    /* =====================================================
       7. PRODUCT VALIDATION
    ===================================================== */

    for (const item of req.body.items) {
      const productId = item.productId;

      const quantity =
        Number(item.quantity);

      const variantSku =
        String(item.variantSku || "").trim();

      /* -----------------------------------------------
         Product ID
      ------------------------------------------------ */

      if (
        !productId ||
        !mongoose.Types.ObjectId.isValid(productId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID",
        });
      }

      /* -----------------------------------------------
         Quantity
      ------------------------------------------------ */

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for product ${productId}`,
        });
      }

      /* -----------------------------------------------
         Variant
      ------------------------------------------------ */

      if (!variantSku) {
        return res.status(400).json({
          success: false,
          message:
            "Variant SKU is required for every product",
        });
      }

      /* -----------------------------------------------
         Get Product
      ------------------------------------------------ */

      const product =
        await Product.findOne({
          _id: productId,
          isDeleted: false,
          isActive: true,
          status: "approved",
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            `Product not found: ${productId}`,
        });
      }

      /* =================================================
         8. PRODUCT PIN SERVICEABILITY
      ================================================= */

      const allowedPincodes =
        product.shipping
          ?.serviceablePincodes || [];

      console.log("\n--------------------------------");
      console.log("📍 SERVICEABILITY CHECK");
      console.log("Product:", product.title);
      console.log("Customer PIN:", postalCode);
      console.log(
        "Allowed PINs:",
        allowedPincodes
      );

      /*
        EMPTY ARRAY
        = Product can be delivered everywhere
      */

      if (
        allowedPincodes.length > 0
      ) {
        const serviceable =
          allowedPincodes.some(
            (pin) =>
              String(pin).trim() ===
              postalCode
          );

        if (!serviceable) {
          console.log(
            "❌ PRODUCT NOT SERVICEABLE"
          );

          return res.status(400).json({
            success: false,

            code:
              "PINCODE_NOT_SERVICEABLE",

            productId:
              product._id,

            productName:
              product.title,

            postalCode,

            message:
              `${product.title} cannot be delivered to PIN code ${postalCode}`,
          });
        }
      }

      console.log(
        "✅ PRODUCT SERVICEABLE"
      );

      /* =================================================
         9. FIND VARIANT
      ================================================= */

      const variant =
        product.variants?.find(
          (v) =>
            String(v.sku).trim() ===
              variantSku &&
            v.isActive !== false
        );

      if (!variant) {
        return res.status(400).json({
          success: false,
          message:
            `Variant ${variantSku} not found for ${product.title}`,
        });
      }

      /* =================================================
         10. STOCK
      ================================================= */

      const availableStock =
        Number(variant.stock || 0);

      if (
        availableStock < quantity
      ) {
        return res.status(400).json({
          success: false,

          code: "INSUFFICIENT_STOCK",

          message:
            `${product.title} has only ${availableStock} item(s) available`,
        });
      }

      /* =================================================
         11. QUANTITY LIMIT
      ================================================= */

      const minimumQuantity =
        Number(
          product.minimumOrderQuantity || 1
        );

      const maximumQuantity =
        Number(
          product.maximumOrderQuantity || 10
        );

      if (
        quantity < minimumQuantity
      ) {
        return res.status(400).json({
          success: false,

          message:
            `Minimum quantity for ${product.title} is ${minimumQuantity}`,
        });
      }

      if (
        quantity > maximumQuantity
      ) {
        return res.status(400).json({
          success: false,

          message:
            `Maximum quantity for ${product.title} is ${maximumQuantity}`,
        });
      }


/* =================================================
   12. PRICE FROM DATABASE
================================================= */

const price =
  Number(variant.price || 0);

const itemSubtotal =
  price * quantity;


/* =================================================
   13. PRODUCT DISCOUNT
================================================= */

let productDiscount = 0;

const now = new Date();


// -------------------------------------------------
// VARIANT DISCOUNT
// -------------------------------------------------

let discountPercentage =
  Number(
    variant.discountPercentage || 0
  );


// -------------------------------------------------
// PRODUCT OFFER
// -------------------------------------------------

if (
  product.offer?.enabled === true
) {
  const started =
    !product.offer.startDate ||
    new Date(product.offer.startDate) <= now;

  const notExpired =
    !product.offer.endDate ||
    new Date(product.offer.endDate) >= now;

  if (
    started &&
    notExpired
  ) {
    const offerValue =
      Number(
        product.offer.value || 0
      );

    if (
      product.offer.discountType ===
      "percentage"
    ) {
      // Product offer overrides
      // variant percentage discount
      if (offerValue > 0) {
        discountPercentage =
          offerValue;
      }
    }

    if (
      product.offer.discountType ===
      "fixed"
    ) {
      productDiscount =
        offerValue * quantity;
    }
  }
}


// -------------------------------------------------
// PERCENTAGE DISCOUNT
// -------------------------------------------------

if (
  productDiscount === 0 &&
  discountPercentage > 0
) {
  productDiscount =
    (itemSubtotal * discountPercentage) /
    100;
}


// Never allow discount above price
productDiscount =
  Math.min(
    productDiscount,
    itemSubtotal
  );


// -------------------------------------------------
// FINAL ITEM SUBTOTAL AFTER DISCOUNT
// -------------------------------------------------

const finalItemSubtotal =
  itemSubtotal -
  productDiscount;


/* =================================================
   TAX
================================================= */

// IMPORTANT:
// Tax is calculated AFTER product discount.
//
// Example:
// ₹509 - 15% discount = ₹432.65
// ₹432.65 × 18% tax = ₹77.88

const taxRate =
  Number(variant.tax || 0);

const itemTax =
  (finalItemSubtotal * taxRate) /
  100;
      /* =================================================
         15. SHIPPING
      ================================================= */

      let shippingCharge = 0;

      if (
        product.shipping
          ?.freeShipping !== true
      ) {
        shippingCharge =
          Number(
            product.shipping
              ?.shippingCharge || 0
          );
      }

      /* =================================================
         16. ORDER ITEM
      ================================================= */

      formattedItems.push({
        productId:
          product._id,

        sellerId:
          product.seller,

        title:
          product.title,

        image:
          variant.images?.[0] ||
          product.media?.thumbnail ||
          product.media?.images?.[0] ||
          "",

        price,

        quantity,

        variantSku:
          variant.sku,

        tax:
          itemTax,

        discount:
          productDiscount,

        total:
          finalItemSubtotal +
          itemTax,
      });

      subtotal +=
        finalItemSubtotal;

      totalTax +=
        itemTax;

      totalShipping +=
        shippingCharge;
    }

    /* =====================================================
       17. ROUND VALUES
    ===================================================== */

    subtotal =
      Math.round(
        subtotal * 100
      ) / 100;

    totalTax =
      Math.round(
        totalTax * 100
      ) / 100;

    totalShipping =
      Math.round(
        totalShipping * 100
      ) / 100;

    /* =====================================================
       18. COUPON
    ===================================================== */

    let couponCode = "";
    let couponDiscount = 0;
    let couponType = "";

    if (req.body.couponCode) {
      couponCode =
        String(
          req.body.couponCode
        )
          .trim()
          .toUpperCase();

      const coupon =
        await Coupon.findOne({
          code: couponCode,
          isActive: true,
        });

      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: "Invalid coupon",
        });
      }

      /* -----------------------------------------------
         Expiry
      ------------------------------------------------ */

      if (
        coupon.expiryDate &&
        new Date(coupon.expiryDate) <
          new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "Coupon expired",
        });
      }

      /* -----------------------------------------------
         Minimum order
      ------------------------------------------------ */

      if (
        subtotal <
        Number(
          coupon.minOrderAmount || 0
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            `Minimum order ₹${coupon.minOrderAmount} required`,
        });
      }

      /* -----------------------------------------------
         Already used
      ------------------------------------------------ */

      if (
        Array.isArray(
          coupon.usedBy
        ) &&
        coupon.usedBy.some(
          (id) =>
            id.toString() ===
            req.user._id.toString()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Coupon already used",
        });
      }

      /* -----------------------------------------------
         Discount
      ------------------------------------------------ */

      if (
        coupon.discountType ===
        "PERCENTAGE"
      ) {
        couponDiscount =
          (subtotal *
            Number(
              coupon.discountValue || 0
            )) /
          100;

        if (
          Number(
            coupon.maxDiscount || 0
          ) > 0
        ) {
          couponDiscount =
            Math.min(
              couponDiscount,
              Number(
                coupon.maxDiscount
              )
            );
        }
      } else {
        couponDiscount =
          Number(
            coupon.discountValue || 0
          );
      }

      couponDiscount =
        Math.min(
          couponDiscount,
          subtotal
        );

      couponType =
        coupon.discountType;
    }

    /* =====================================================
       19. FINAL TOTAL
    ===================================================== */

    const finalAmount =
      Math.max(
        0,

        Math.round(
          (
            subtotal +
            totalShipping +
            totalTax -
            couponDiscount
          ) * 100
        ) / 100
      );

    /* =====================================================
       20. ORDER NUMBER
    ===================================================== */

    const orderNumber =
      await generateOrderNumber();

    /* =====================================================
       21. CANCELLATION
    ===================================================== */

    const cancelBefore =
      new Date();

    cancelBefore.setHours(
      cancelBefore.getHours() + 24
    );

    /* =====================================================
       22. INITIAL STATUS
    ===================================================== */

    const initialStatus =
      paymentMethod === "Razorpay"
        ? "Pending Payment"
        : "Confirmed";

    /* =====================================================
       23. CREATE ORDER
    ===================================================== */

    const order =
      new Order({
        userId:
          req.user._id,

        orderNumber,

        fullname,

        email,

        phone,

        deliveryAddress: {
          customer: {
            fullName:
              customer.fullName ||
              fullname,

            phone:
              customer.phone ||
              phone,

            alternatePhone:
              customer.alternatePhone ||
              "",

            email:
              customer.email ||
              email,
          },

          address: {
            addressLine1:
              address.addressLine1,

            addressLine2:
              address.addressLine2 ||
              "",

            landmark:
              address.landmark ||
              "",

            area:
              address.area,

            city:
              address.city,

            district:
              address.district,

            state:
              address.state,

            postalCode,

            country:
              address.country ||
              "India",
          },

          location:
            req.body.deliveryAddress
              .location || {},

          preference:
            req.body.deliveryAddress
              .preference || {},
        },

        pricing: {
          subtotal,

          shippingCharge:
            totalShipping,

          tax:
            totalTax,

          couponCode,

          couponDiscount,

          couponType,

          total:
            finalAmount,
        },

        payment: {
          method:
            paymentMethod,

          status:
            paymentMethod ===
            "Razorpay"
              ? "Pending"
              : "Pending",

          gateway: {
            orderId:
              req.body
                .razorpayOrderId ||
              "",

            paymentId:
              req.body
                .razorpayPaymentId ||
              "",

            signature:
              req.body
                .razorpaySignature ||
              "",
          },
        },

        status:
          initialStatus,

        statusHistory: [
          {
            status:
              initialStatus,

            date:
              new Date(),

            updatedBy:
              req.user._id,

            remark:
              paymentMethod ===
              "Razorpay"
                ? "Order created. Payment pending."
                : "COD order created.",
          },
        ],

        returnDetails: {
          requested: false,

          resolution:
            "Refund",

          reason: "",

          reasonType:
            "Other",

          customerComment:
            "",

          sellerRemark:
            "",

          adminRemark:
            "",

          inspectionStatus:
            "Pending",

          refundAmount:
            0,

          images: [],

          videos: [],
        },

        cancellation: {
          allowed: true,

          cancelBefore,

          cancelled: false,

          cancelledAt: null,

          cancelledBy: "",

          reason: "",
        },

        items:
          formattedItems,
      });

    /* =====================================================
       24. RAZORPAY ORDER
    ===================================================== */

    if (
      paymentMethod ===
      "Razorpay"
    ) {
      if (!razorpay) {
        return res.status(500).json({
          success: false,
          message:
            "Razorpay is not configured",
        });
      }

      const razorpayOrder =
        await razorpay.orders.create({
          amount:
            Math.round(
              finalAmount * 100
            ),

          currency:
            "INR",

          receipt:
            orderNumber,

          notes: {
            orderNumber,

            userId:
              req.user._id.toString(),
          },
        });

      order.payment.gateway.orderId =
        razorpayOrder.id;
    }

    /* =====================================================
       25. STOCK DEDUCTION
    ===================================================== */

    for (
      const item
      of formattedItems
    ) {
      const result =
        await Product.updateOne(
          {
            _id:
              item.productId,

            "variants.sku":
              item.variantSku,

            "variants.stock":
              {
                $gte:
                  item.quantity,
              },
          },

          {
            $inc: {
              "variants.$.stock":
                -item.quantity,

              "variants.$.sold":
                item.quantity,
            },
          }
        );

      if (
        result.matchedCount !== 1 ||
        result.modifiedCount !== 1
      ) {
        throw new Error(
          `Stock unavailable for ${item.title}`
        );
      }

      stockDeducted.push({
        productId:
          item.productId,

        variantSku:
          item.variantSku,

        quantity:
          item.quantity,
      });
    }

    /* =====================================================
       26. SAVE ORDER
    ===================================================== */

    const savedOrder =
      await order.save();

    /* =====================================================
       27. MARK COUPON USED
    ===================================================== */

    if (couponCode) {
      await Coupon.findOneAndUpdate(
        {
          code:
            couponCode,
        },

        {
          $addToSet: {
            usedBy:
              req.user._id,
          },
        }
      );
    }

    /* =====================================================
       28. RESPONSE
    ===================================================== */

    console.log(
      "✅ ORDER SAVED:",
      savedOrder.orderNumber
    );

    return res.status(201).json({
      success: true,

      message:
        paymentMethod ===
        "Razorpay"
          ? "Order created. Complete payment."
          : "Order placed successfully.",

      order:
        savedOrder,

      razorpay:
        paymentMethod ===
        "Razorpay"
          ? {
              orderId:
                savedOrder
                  .payment
                  .gateway
                  .orderId,

              amount:
                Math.round(
                  finalAmount *
                    100
                ),

              currency:
                "INR",
            }
          : null,
    });
  } catch (error) {
    console.error(
      "\n❌ SAVE ORDER ERROR"
    );

    console.error(
      error
    );

    /* =====================================================
       29. ROLLBACK STOCK
    ===================================================== */

    if (
      stockDeducted.length >
      0
    ) {
      console.log(
        "🔄 Rolling back stock..."
      );

      for (
        const item
        of stockDeducted
      ) {
        try {
          await Product.updateOne(
            {
              _id:
                item.productId,

              "variants.sku":
                item.variantSku,
            },

            {
              $inc: {
                "variants.$.stock":
                  item.quantity,

                "variants.$.sold":
                  -item.quantity,
              },
            }
          );
        } catch (
          rollbackError
        ) {
          console.error(
            "❌ STOCK ROLLBACK FAILED:",
            rollbackError
          );
        }
      }
    }

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Failed to save order",
    });
  }
};

/* =========================================================
   GET ALL ORDERS - ADMIN
========================================================= */

export const getOrders = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const orders = await Order.find()
      .sort({
        createdAt: -1,
      })
      .populate(
        "userId",
        "firstName lastName email phone image",
      )
      .populate(
        "items.productId",
        "title slug images thumbnail brand category",
      );

    return res.status(200).json({
      success: true,

      count: orders.length,

      orders,
    });
  } catch (error) {
    console.error(
      "Fetch Orders Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   GET USER ORDERS
========================================================= */

export const getUserOrders = async (
  req,
  res,
) => {
  try {
    const userId = req.user._id;

    const orders = await Order.find({
      userId,
    })
      .sort({
        createdAt: -1,
      })
      .populate(
        "items.productId",
        "title slug images thumbnail brand category",
      );

    return res.status(200).json({
      success: true,

      count: orders.length,

      orders,
    });
  } catch (error) {
    console.error(
      "Fetch User Orders Error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch user orders",
    });
  }
};

/* =========================================================
   GET SINGLE ORDER
========================================================= */

export const getSingleOrder = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(id)
      .populate({
        path: "userId",

        select:
          "firstName lastName email phone image",
      })
      .populate({
        path: "shipping.courier",

        select:
          "name phone photo vehicleType vehicleNumber serviceAreas estimatedDeliveryMinutes verificationStatus status isActive currentLocation locationUpdatedAt isLocationSharing rating totalDeliveries successfulDeliveries showPhoneToCustomer",
      })
      .populate({
        path: "items.productId",

        select:
          "title slug images thumbnail brand category variants",
      });

    if (!order) {
      return res.status(404).json({
        success: false,

        message: "Order not found",
      });
    }

    const userId =
      req.user._id.toString();

    const role = req.user.role;

    /* =====================================================
       ADMIN
    ===================================================== */

    if (role === "admin") {
      return res.status(200).json({
        success: true,

        order,
      });
    }

    /* =====================================================
       CUSTOMER
    ===================================================== */

    if (
      role === "user" &&
      order.userId?._id?.toString() ===
        userId
    ) {
      return res.status(200).json({
        success: true,

        order,
      });
    }

    /* =====================================================
       SELLER
    ===================================================== */

    if (role === "seller") {
      const sellerItems =
        order.items.filter(
          (item) =>
            item.sellerId?.toString() ===
            userId,
        );

      if (sellerItems.length === 0) {
        return res.status(403).json({
          success: false,

          message: "Access denied",
        });
      }

      const sellerTotal =
        sellerItems.reduce(
          (total, item) =>
            total +
            Number(item.price || 0) *
              Number(item.quantity || 0),
          0,
        );

      const sellerOrder = {
        ...order.toObject(),

        items: sellerItems,

        sellerTotal: money(
          sellerTotal,
        ),
      };

      return res.status(200).json({
        success: true,

        order: sellerOrder,
      });
    }

    return res.status(403).json({
      success: false,

      message: "Access denied",
    });
  } catch (error) {
    console.error(
      "Get Single Order Error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

/* =========================================================
   TRACK ORDER
========================================================= */

export const trackOrder = async (
  req,
  res,
) => {
  try {
    const orderNumber = String(
      req.params.orderNumber || "",
    ).trim();

    if (!orderNumber) {
      return res.status(400).json({
        success: false,

        message:
          "Odikart order number is required",
      });
    }

    const order =
      await Order.findOne({
        orderNumber,
      })
        .populate(
          "shipping.courier",
          "name phone photo vehicleType vehicleNumber serviceAreas estimatedDeliveryMinutes verificationStatus status isActive currentLocation locationUpdatedAt isLocationSharing rating totalDeliveries successfulDeliveries showPhoneToCustomer",
        )
        .populate(
          "items.productId",
          "title images thumbnail",
        );

    if (!order) {
      return res.status(404).json({
        success: false,

        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,

      order,
    });
  } catch (error) {
    console.error(
      "Track Order Error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message: "Server error",
    });
  }
};

/* =========================================================
   CANCEL ORDER
========================================================= */

export const cancelOrder = async (
  req,
  res,
) => {
  try {
    const order =
      await Order.findById(
        req.params.id,
      );

    if (!order) {
      return res.status(404).json({
        success: false,

        message: "Order not found",
      });
    }

    /* =====================================================
       AUTHORIZATION
    ===================================================== */

    if (
      order.userId.toString() !==
        req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,

        message: "Not authorized",
      });
    }

    /* =====================================================
       ALREADY CANCELLED
    ===================================================== */

    if (
      order.cancelled ||
      order.cancellation?.cancelled ||
      order.status === "Cancelled"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Order already cancelled",
      });
    }

    /* =====================================================
       STATUS CHECK
    ===================================================== */

    if (
      !CANCELLABLE_STATUSES.includes(
        order.status,
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          `Order cannot be cancelled after "${order.status}".`,
      });
    }

    /* =====================================================
       CANCELLATION TIME
    ===================================================== */

    if (
      order.cancellation?.cancelBefore &&
      new Date() >
        order.cancellation
          .cancelBefore
    ) {
      return res.status(400).json({
        success: false,

        message:
          `Cancellation was allowed only until ${order.cancellation.cancelBefore.toLocaleString(
            "en-IN",
          )}`,
      });
    }

    /* =====================================================
       RAZORPAY REFUND
    ===================================================== */

    let refundCreated = false;

    const paymentMethod =
      String(
        order.payment?.method || "",
      )
        .trim()
        .toLowerCase();

    if (
      paymentMethod === "razorpay" &&
      order.payment?.status === "Paid" &&
      order.payment?.gateway
        ?.paymentId
    ) {
      const refundAmount = Math.round(
        Number(
          order.pricing?.total || 0,
        ) * 100,
      );

      if (
        !Number.isInteger(
          refundAmount,
        ) ||
        refundAmount <= 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid refund amount",
        });
      }

      try {
        const refund =
          await razorpay.payments.refund(
            order.payment.gateway
              .paymentId,
            {
              amount:
                refundAmount,
            },
          );

        order.payment.status =
          "Refunded";

        if (!order.refund) {
          order.refund = {};
        }

        order.refund.refundId =
          refund.id;

        order.refund.status =
          "Completed";

        order.refund.amount =
          Number(
            order.pricing?.total ||
              0,
          );

        order.refund.refundedAt =
          new Date();

        refundCreated = true;
      } catch (refundError) {
        console.error(
          "Razorpay refund failed:",
          refundError,
        );

        const description =
          refundError?.error
            ?.description ||
          refundError?.description ||
          refundError?.message ||
          "Razorpay refund failed";

        return res.status(400).json({
          success: false,

          refundFailed: true,

          message:
            `Refund could not be processed: ${description}`,
        });
      }
    }

    /* =====================================================
       STOCK RESTORATION
    ===================================================== */

    if (
      order.stock?.restored === true
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Order stock has already been restored",
      });
    }

    const restoredItems = [];

    try {
      for (const item of order.items) {
        const quantity = Number(
          item.quantity || 0,
        );

        if (
          !item.productId ||
          quantity <= 0
        ) {
          continue;
        }

        const result =
          await Product.updateOne(
            {
              _id: item.productId,

              "variants.sku":
                item.variantSku,
            },

            {
              $inc: {
                "variants.$.stock":
                  quantity,

                "variants.$.sold":
                  -quantity,
              },
            },
          );

        if (
          result.matchedCount !== 1 ||
          result.modifiedCount !== 1
        ) {
          throw new Error(
            `Stock restoration failed for ${item.title} (${item.variantSku})`,
          );
        }

        restoredItems.push({
          productId:
            item.productId,

          variantSku:
            item.variantSku,

          quantity,
        });
      }
    } catch (stockError) {
      /*
        IMPORTANT:
        If refund has already happened but stock restoration
        fails, do NOT pretend the entire operation succeeded.
      */

      console.error(
        "Stock restoration failed:",
        stockError,
      );

      return res.status(500).json({
        success: false,

        refundCreated,

        stockRestorationFailed:
          true,

        message:
          "Payment refund was processed, but stock restoration failed. Please contact support immediately.",
      });
    }

    /* =====================================================
       MARK CANCELLED
    ===================================================== */

    const now = new Date();

    order.cancelled = true;

    order.cancelledAt = now;

    order.cancelledBy =
      req.user.role;

    order.status = "Cancelled";

    if (!order.cancellation) {
      order.cancellation = {};
    }

    order.cancellation.allowed =
      true;

    order.cancellation.cancelled =
      true;

    order.cancellation.cancelledAt =
      now;

    if (!order.stock) {
      order.stock = {};
    }

    order.stock.deducted = true;

    order.stock.restored = true;

    order.stock.restoredAt = now;

    appendStatusHistory(
      order,
      "Cancelled",
      req.user._id,
      "Order cancelled by customer/admin",
    );

    await order.save({
      validateBeforeSave: false,
    });

    /* =====================================================
       EMAIL
    ===================================================== */

    try {
      await sendEmail(
        order.email,
        "❌ Order Cancelled – Odikart",
        `
<!DOCTYPE html>
<html>
<body style="
margin:0;
padding:0;
background:#f4f6fb;
font-family:Arial,sans-serif;
">

<div style="
max-width:620px;
margin:30px auto;
background:white;
border-radius:16px;
overflow:hidden;
">

<div style="
background:linear-gradient(135deg,#ef4444,#dc2626);
padding:30px 20px;
text-align:center;
color:white;
">

<img
src="${ODiKART_LOGO}"
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

<h1 style="color:white;">
❌ Order Cancelled
</h1>

<p>
Your order has been cancelled successfully.
</p>

</div>

<div style="padding:25px;">

<h2>
Hi ${order.fullname},
</h2>

<p>
Your order has been cancelled successfully.
</p>

<div style="
background:#f9fafb;
padding:18px;
border-radius:10px;
">

<p>
<b>Order Number:</b>
${order.orderNumber}
</p>

<p>
<b>Order ID:</b>
${order._id}
</p>

<p>
<b>Amount:</b>
₹${order.pricing.total}
</p>

<p>
<b>Payment:</b>
${order.payment.method}
(${order.payment.status})
</p>

</div>

${
  refundCreated
    ? `
<div style="
background:#ecfdf5;
padding:15px;
margin-top:20px;
border-radius:10px;
color:#065f46;
">

💰 Refund of ₹${order.pricing.total}
has been initiated.

<br>

⏳ Expected refund time:
5–7 business days.

</div>
`
    : `
<div style="
background:#f8fafc;
padding:15px;
margin-top:20px;
border-radius:10px;
">

ℹ️ No online payment refund
is required for this order.

</div>
`
}

<h3>
🛒 Cancelled Items
</h3>

${order.items
  .map(
    (item) => `
<div style="
padding:12px;
border-bottom:1px solid #eee;
">

<b>${item.title}</b>

<br>

SKU:
${item.variantSku}

<br>

Quantity:
${item.quantity}

<br>

Subtotal:
₹${item.total}

</div>
`,
  )
  .join("")}

<div style="
text-align:center;
margin:30px 0;
">

<a
href="${TRACK_ORDER_URL}"
style="
background:#6366f1;
color:white;
padding:12px 24px;
text-decoration:none;
border-radius:8px;
"
>
🔍 Track Orders
</a>

</div>

<p style="text-align:center;">
— <b>Odikart Team</b>
</p>

</div>

</div>

</body>
</html>
`,
      );
    } catch (emailError) {
      console.error(
        "Cancellation email failed:",
        emailError.message,
      );
    }

    /* =====================================================
       WHATSAPP
    ===================================================== */

    try {
      await sendWhatsApp(
        order.phone,
        `
🛍️ *Odikart*

❌ *ORDER CANCELLED*

Hi *${order.fullname}* 👋

Your order has been cancelled successfully.

━━━━━━━━━━━━━━━━━━━
📦 *ORDER DETAILS*
━━━━━━━━━━━━━━━━━━━

🆔 Order Number:
${order.orderNumber}

🧾 Order ID:
${order._id}

📦 Status:
🔴 Cancelled

💳 Payment:
${order.payment.method}

💵 Payment Status:
${order.payment.status}

━━━━━━━━━━━━━━━━━━━
🛒 *CANCELLED ITEMS*
━━━━━━━━━━━━━━━━━━━

${order.items
  .map(
    (item, index) =>
      `🔹 *${index + 1}. ${item.title}*

SKU: ${item.variantSku}
Qty: ${item.quantity}
Price: ₹${item.price}
Subtotal: ₹${item.total}`,
  )
  .join("\n\n")}

━━━━━━━━━━━━━━━━━━━
💰 *REFUND*
━━━━━━━━━━━━━━━━━━━

${
  refundCreated
    ? `✅ Refund initiated.

Refund Amount:
₹${order.pricing.total}

Expected:
5–7 business days.`
    : `ℹ️ No online payment refund required.`
}

━━━━━━━━━━━━━━━━━━━
📦 *STOCK*
━━━━━━━━━━━━━━━━━━━

✅ Stock restored successfully.

━━━━━━━━━━━━━━━━━━━
🔍 *TRACK ORDER*
━━━━━━━━━━━━━━━━━━━

${TRACK_ORDER_URL}

━━━━━━━━━━━━━━━━━━━

❤️ Thank you for shopping with *Odikart*
`,
      );
    } catch (whatsappError) {
      console.error(
        "Cancellation WhatsApp failed:",
        whatsappError.message,
      );
    }

    return res.status(200).json({
      success: true,

      message:
        "Order cancelled successfully & stock restored",

      order,
    });
  } catch (error) {
    console.error(
      "Cancel Order Error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Order cancellation failed",
    });
  }
};

/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

export const updateOrderStatus = async (
  req,
  res,
) => {
  try {
    const { orderId } =
      req.params;

    const {
      status,
      remark,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(
        orderId,
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid order ID",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,

        message:
          "Status is required",
      });
    }

    const order =
      await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,

        message:
          "Order not found",
      });
    }

    const allowedStatuses =
      ORDER_FLOW[
        order.status
      ] || [];

    if (
      !allowedStatuses.includes(
        status,
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          `Cannot change status from ${order.status} to ${status}`,
      });
    }

    /* =====================================================
       PAYMENT CHECK
    ===================================================== */

    if (
      status === "Confirmed" &&
      order.payment?.method ===
        "Razorpay" &&
      order.payment?.status !==
        "Paid"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Payment not completed",
      });
    }

    /* =====================================================
       SHIPPED CHECK
    ===================================================== */

    if (status === "Shipped") {
      if (
        !order.shipping?.courier
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Assign courier before shipping",
        });
      }

      if (
        !order.shipping
          ?.trackingNumber
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Tracking number missing",
        });
      }
    }

    /* =====================================================
       RETURN REQUEST CHECK
    ===================================================== */

    if (
      status ===
        "Return Requested" &&
      order.status !== "Delivered"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Only delivered orders can be returned",
      });
    }

    /* =====================================================
       UPDATE
    ===================================================== */

    order.status = status;

    if (
      status === "Delivered"
    ) {
      order.deliveredAt =
        new Date();

      /*
        Delivery completed:
        release courier and stop live GPS.
      */
      if (order.shipping?.courier) {
        await Courier.findByIdAndUpdate(
          order.shipping.courier,
          {
            $set: {
              status: "available",
              isLocationSharing: false,
              locationUpdatedAt: new Date(),
            },
            $inc: {
              totalDeliveries: 1,
              successfulDeliveries: 1,
            },
          },
        );
      }
    }

    if (
      status === "Cancelled"
    ) {
      order.cancelled = true;

      order.cancelledAt =
        new Date();

      order.cancelledBy =
        req.user.role;

      /*
        Cancelled delivery:
        release courier and stop GPS.
      */
      if (order.shipping?.courier) {
        await Courier.findByIdAndUpdate(
          order.shipping.courier,
          {
            $set: {
              status: "available",
              isLocationSharing: false,
            },
          },
        );
      }
    }

    appendStatusHistory(
      order,
      status,
      req.user._id,
      remark || "",
    );

    await order.save();

    /* =====================================================
       SELLER WALLET
    ===================================================== */

    if (
      status === "Delivered"
    ) {
      try {
        await creditSellerWallet(
          order._id,
        );
      } catch (walletError) {
        /*
          Do not fail the delivery status because
          wallet processing has its own operation.
        */

        console.error(
          "Seller wallet credit failed:",
          walletError,
        );
      }
    }

    return res.status(200).json({
      success: true,

      message:
        "Order status updated successfully",

      order,
    });
  } catch (error) {
    console.error(
      "Update Order Status Error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Internal server error",
    });
  }
};

/* =========================================================
   ASSIGN COURIER
   ADMIN ONLY
========================================================= */

export const assignCourier = async (req, res) => {
  try {
    console.log("========================================");
    console.log("🚚 ASSIGN COURIER CONTROLLER");
    console.log("========================================");

    /* =====================================================
       1. ADMIN CHECK
    ===================================================== */

    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    /* =====================================================
       2. REQUEST DATA
    ===================================================== */

    const { orderId } = req.params;
    const { courierId, estimatedDelivery } = req.body || {};

    console.log("orderId:", orderId);
    console.log("courierId:", courierId);
    console.log("estimatedDelivery:", estimatedDelivery);

    /* =====================================================
       3. VALIDATE IDS
    ===================================================== */

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    if (!courierId) {
      return res.status(400).json({
        success: false,
        message: "Courier ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(courierId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid courier ID",
      });
    }

    /* =====================================================
       4. FIND ORDER
    ===================================================== */

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    console.log("Order:", order.orderNumber);
    console.log("Order status:", order.status);

    /* =====================================================
       5. ORDER STATUS
       Courier assignment is allowed only after packing.
    ===================================================== */

    if (order.status !== "Ready for Pickup") {
      return res.status(400).json({
        success: false,
        code: "ORDER_NOT_READY_FOR_PICKUP",
        message:
          `Courier can be assigned only when order status is "Ready for Pickup". Current status: ${order.status}`,
      });
    }

    /* =====================================================
       6. FIND COURIER
    ===================================================== */

    const courier = await Courier.findById(courierId);

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    console.log("Courier:", courier.name);
    console.log("Courier status:", courier.status);
    console.log(
      "Courier verification:",
      courier.verificationStatus
    );

    /* =====================================================
       7. COURIER VALIDATION
    ===================================================== */

    if (courier.isActive !== true) {
      return res.status(400).json({
        success: false,
        code: "COURIER_INACTIVE",
        message: "Courier is inactive",
      });
    }

    if (courier.verificationStatus !== "verified") {
      return res.status(400).json({
        success: false,
        code: "COURIER_NOT_VERIFIED",
        message: "Courier is not verified",
      });
    }

    if (courier.status === "suspended") {
      return res.status(400).json({
        success: false,
        code: "COURIER_SUSPENDED",
        message: "Courier is suspended",
      });
    }

    if (courier.status !== "available") {
      return res.status(400).json({
        success: false,
        code: "COURIER_NOT_AVAILABLE",
        message:
          `Courier is currently ${courier.status}. Only available couriers can be assigned.`,
      });
    }

    /* =====================================================
       8. ESTIMATED DELIVERY
    ===================================================== */

    let estimatedDate = null;

    if (estimatedDelivery) {
      const rawDate = String(estimatedDelivery).trim();

      /*
        Frontend normally sends YYYY-MM-DD.
        Parse it as a local date so the displayed date does
        not move backward because of UTC conversion.
      */
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        const [year, month, day] = rawDate
          .split("-")
          .map(Number);

        estimatedDate = new Date(
          year,
          month - 1,
          day,
          23,
          59,
          59
        );
      } else {
        estimatedDate = new Date(rawDate);
      }

      if (Number.isNaN(estimatedDate.getTime())) {
        return res.status(400).json({
          success: false,
          code: "INVALID_ESTIMATED_DELIVERY",
          message: "Invalid estimated delivery date",
        });
      }

      if (estimatedDate < new Date()) {
        return res.status(400).json({
          success: false,
          code: "ESTIMATED_DELIVERY_IN_PAST",
          message: "Estimated delivery cannot be in the past",
        });
      }
    }

    /* =====================================================
       9. GENERATE TRACKING NUMBER
       Backend owns outbound tracking generation.
    ===================================================== */

    const trackingNumber = order.orderNumber
      ? `ODK-TRK-${String(order.orderNumber).replace(/^ODK-/, "")}`
      : `ODK-TRK-${Date.now()}`;

    const trackingUrl =
      `${TRACK_ORDER_URL}/${encodeURIComponent(order.orderNumber || "")}`;

    console.log("Generated tracking:", trackingNumber);
    console.log("Tracking URL:", trackingUrl);

    /* =====================================================
       10. ENSURE SHIPPING OBJECT
    ===================================================== */

    if (!order.shipping) {
      order.shipping = {};
    }

    /* =====================================================
       11. ASSIGN COURIER TO ORDER
    ===================================================== */

    order.shipping.courier = courier._id;
    order.shipping.courierName = courier.name;
    order.shipping.trackingNumber = trackingNumber;
    order.shipping.trackingUrl = trackingUrl;

    if (estimatedDate) {
      order.shipping.estimatedDelivery = estimatedDate;
    }

    /*
      Customer live tracking starts only after courier
      assignment. The courier itself is marked busy.
    */
    order.shipping.assignedAt = new Date();

    /* =====================================================
       12. MOVE ORDER TO SHIPPED
       Ready for Pickup -> Shipped
    ===================================================== */

    order.status = "Shipped";

    /* =====================================================
       13. STATUS HISTORY
    ===================================================== */

    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: "Shipped",
      date: new Date(),
      updatedBy: req.user._id,
      changedBy: req.user._id,
      remark:
        `Courier assigned: ${courier.name}. Tracking: ${trackingNumber}`,
    });

    /* =====================================================
       14. SAVE ORDER
    ===================================================== */

    await order.save();

    /* =====================================================
       15. MAKE COURIER BUSY
       GPS sharing remains off until the courier app starts
       the delivery.
    ===================================================== */

    courier.status = "busy";
    courier.isLocationSharing = false;
    courier.locationUpdatedAt = null;

    await courier.save();

    console.log("========================================");
    console.log("✅ COURIER ASSIGNED SUCCESSFULLY");
    console.log("Courier:", courier.name);
    console.log("Tracking:", trackingNumber);
    console.log("Order status:", order.status);
    console.log("========================================");

    /* =====================================================
       16. RESPONSE
    ===================================================== */

    return res.status(200).json({
      success: true,
      message: "Courier assigned successfully",

      trackingNumber,
      trackingUrl,

      courier: {
        _id: courier._id,
        name: courier.name,
        phone: courier.phone,
        photo: courier.photo,
        vehicleType: courier.vehicleType,
        vehicleNumber: courier.vehicleNumber,
        serviceAreas: courier.serviceAreas,
        estimatedDeliveryMinutes:
          courier.estimatedDeliveryMinutes,
        status: courier.status,
        verificationStatus:
          courier.verificationStatus,
        isActive: courier.isActive,
      },

      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        shipping: order.shipping,
      },
    });
  } catch (error) {
    console.error("❌ ASSIGN COURIER ERROR");
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to assign courier",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};


/* =========================================================
   UPDATE TRACKING
   ADMIN ONLY
========================================================= */

export const updateTracking = async (
  req,
  res,
) => {
  try {
    const { orderId } = req.params;

    const {
      trackingNumber,
      trackingUrl,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order =
      await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        message:
          "Tracking number is required",
      });
    }

    if (!order.shipping) {
      order.shipping = {};
    }

    order.shipping.trackingNumber =
      String(trackingNumber).trim();

    /*
      Optional custom tracking URL.
      If omitted, use Odikart tracking page.
    */
    order.shipping.trackingUrl =
      trackingUrl ||
      `${TRACK_ORDER_URL}/${order.orderNumber}`;

    await order.save();

    return res.status(200).json({
      success: true,
      message:
        "Tracking updated successfully",
      order,
    });
  } catch (error) {
    console.error(
      "Update Tracking Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to update tracking",
    });
  }
};

/* =========================================================
   CHANGE COURIER
   ADMIN ONLY
========================================================= */

export const changeCourier = async (
  req,
  res,
) => {
  try {
    const { orderId } = req.params;

    const {
      courierId,
      trackingNumber,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(courierId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid courier ID",
      });
    }

    const order =
      await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found",
      });
    }

    const courier =
      await Courier.findById(
        courierId,
      );

    if (!courier) {
      return res.status(404).json({
        success: false,
        message:
          "Courier not found",
      });
    }

    if (!isCourierVerified(courier)) {
      return res.status(400).json({
        success: false,
        code: "COURIER_NOT_ELIGIBLE",
        message:
          "Selected courier must be active, available, and fully verified with Aadhaar and Driving Licence",
      });
    }

    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        message:
          "Tracking number is required",
      });
    }

    const previousCourierId =
      order.shipping?.courier;

    /*
      Release old courier.
    */
    if (
      previousCourierId &&
      previousCourierId.toString() !==
        courier._id.toString()
    ) {
      await Courier.findByIdAndUpdate(
        previousCourierId,
        {
          $set: {
            status: "available",
            isLocationSharing: false,
          },
        },
      );
    }

    if (!order.shipping) {
      order.shipping = {};
    }

    order.shipping.courier =
      courier._id;

    order.shipping.courierName =
      courier.name;

    order.shipping.trackingNumber =
      String(trackingNumber).trim();

    order.shipping.trackingUrl =
      `${TRACK_ORDER_URL}/${order.orderNumber}`;

    order.shipping.estimatedDelivery =
      courier.estimatedDeliveryMinutes ||
      order.shipping.estimatedDelivery ||
      null;

    appendStatusHistory(
      order,
      order.status,
      req.user._id,
      `Courier changed to ${courier.name}`,
    );

    courier.status = "busy";

    await courier.save();
    await order.save();

    const io = req.app.get("io");

    if (io) {
      io.to(`courier:${courier._id}`).emit(
        "order-assigned",
        {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
        },
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Courier changed successfully",
      order,
      courier: {
        _id: courier._id,
        name: courier.name,
        phone: courier.phone,
        vehicleType:
          courier.vehicleType,
        vehicleNumber:
          courier.vehicleNumber,
        status: courier.status,
      },
    });
  } catch (error) {
    console.error(
      "Change Courier Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to change courier",
    });
  }
};

/* =========================================================
   GET COURIER DETAILS
========================================================= */

export const getCourierDetails = async (
  req,
  res,
) => {
  try {
    const order =
      await Order.findById(
        req.params.orderId,
      ).populate({
        path: "shipping.courier",
        select:
          "name phone photo vehicleType vehicleNumber serviceAreas estimatedDeliveryMinutes verificationStatus status isActive currentLocation locationUpdatedAt isLocationSharing rating totalDeliveries successfulDeliveries showPhoneToCustomer",
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found",
      });
    }

    const courier =
      order.shipping?.courier;

    let safeCourier = null;

    if (courier) {
      safeCourier = {
        _id: courier._id,
        name: courier.name,
        photo:
          courier.photo || "",
        vehicleType:
          courier.vehicleType || "",
        vehicleNumber:
          courier.vehicleNumber || "",
        rating:
          courier.rating ?? 5,
        totalDeliveries:
          courier.totalDeliveries || 0,
        successfulDeliveries:
          courier.successfulDeliveries || 0,

        /*
          Phone is shown only if
          courier/admin settings allow it.
        */
        phone:
          courier.showPhoneToCustomer ===
          true
            ? courier.phone
            : undefined,

        currentLocation:
          courier.isLocationSharing ===
          true
            ? courier.currentLocation
            : null,

        locationUpdatedAt:
          courier.isLocationSharing ===
          true
            ? courier.locationUpdatedAt
            : null,

        isLocationSharing:
          courier.isLocationSharing ===
          true,
      };
    }

    return res.status(200).json({
      success: true,

      courier:
        safeCourier,

      trackingNumber:
        order.shipping
          ?.trackingNumber || "",

      trackingUrl:
        order.shipping
          ?.trackingUrl ||
        `${TRACK_ORDER_URL}/${order.orderNumber}`,

      estimatedDelivery:
        order.shipping
          ?.estimatedDelivery ||
        courier?.estimatedDeliveryMinutes ||
        null,

      orderStatus:
        order.status,
    });
  } catch (error) {
    console.error(
      "Get Courier Details Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to get courier details",
    });
  }
};

/* =========================================================
   REQUEST RETURN
========================================================= */

export const requestReturn = async (
  req,
  res,
) => {
  try {
    const {
      orderId,
    } = req.params;

    const {
      reason,
      comment,
      images,
      videos,
    } = req.body;

    const order =
      await Order.findById(
        orderId,
      );

    if (!order) {
      return res.status(404).json({
        success: false,

        message:
          "Order not found",
      });
    }

    if (
      order.userId.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,

        message:
          "Unauthorized",
      });
    }

    if (order.status !== "Delivered") {
      return res.status(400).json({
        success: false,

        message:
          "Only delivered orders can be returned",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,

        message:
          "Return reason is required",
      });
    }

    if (!order.returnDetails) {
      order.returnDetails = {};
    }

    order.status =
      "Return Requested";

    order.returnDetails.requested =
      true;

    order.returnDetails.requestedAt =
      new Date();

    order.returnDetails.reason =
      reason;

    order.returnDetails.customerComment =
      comment || "";

    order.returnDetails.images =
      Array.isArray(images)
        ? images
        : [];

    order.returnDetails.videos =
      Array.isArray(videos)
        ? videos
        : [];

    appendStatusHistory(
      order,
      "Return Requested",
      req.user._id,
      comment || reason,
    );

    await order.save();

    return res.status(200).json({
      success: true,

      message:
        "Return request submitted",

      order,
    });
  } catch (error) {
    console.error(
      "Request Return Error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        error.message,
    });
  }
};

/* =========================================================
   APPROVE RETURN
========================================================= */

export const approveReturn = async (
  req,
  res,
) => {
  try {
    const order =
      await Order.findById(
        req.params.orderId,
      );

    if (!order) {
      return res.status(404).json({
        success: false,

        message:
          "Order not found",
      });
    }

    if (
      order.status !==
      "Return Requested"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Order is not awaiting return approval",
      });
    }

    if (!order.returnDetails) {
      order.returnDetails = {};
    }

    order.status =
      "Return Approved";

    order.returnDetails.approvedAt =
      new Date();

    order.returnDetails.sellerRemark =
      req.body.remark || "";

    appendStatusHistory(
      order,
      "Return Approved",
      req.user._id,
      req.body.remark ||
        "Return Approved",
    );

    await order.save();

    return res.status(200).json({
      success: true,

      message:
        "Return approved",

      order,
    });
  } catch (error) {
    console.error(
      "Approve Return Error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        error.message,
    });
  }
};

/* =========================================================
   REJECT RETURN
========================================================= */

export const rejectReturn = async (
  req,
  res,
) => {
  try {
    const order =
      await Order.findById(
        req.params.orderId,
      );

    if (!order) {
      return res.status(404).json({
        success: false,

        message:
          "Order not found",
      });
    }

    if (
      order.status !==
      "Return Requested"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Order is not awaiting return approval",
      });
    }

    if (!order.returnDetails) {
      order.returnDetails = {};
    }

    /*
      IMPORTANT FIX:
      Previously you set:
      order.status = "Delivered"

      while history said:
      "Return Rejected"

      That creates inconsistent order state.

      Now actual status is Return Rejected.
    */

    order.status =
      "Return Rejected";

    order.returnDetails.rejectedAt =
      new Date();

    order.returnDetails.sellerRemark =
      req.body.remark || "";

    appendStatusHistory(
      order,
      "Return Rejected",
      req.user._id,
      req.body.remark ||
        "Return Rejected",
    );

    await order.save();

    return res.status(200).json({
      success: true,

      message:
        "Return rejected",

      order,
    });
  } catch (error) {
    console.error(
      "Reject Return Error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        error.message,
    });
  }
};

/* =========================================================
   ASSIGN RETURN COURIER
========================================================= */

export const assignReturnCourier =
  async (req, res) => {
    try {
      const {
        courierId,
        trackingNumber,
        estimatedDelivery,
      } = req.body;

      const order =
        await Order.findById(
          req.params.orderId,
        );

      if (!order) {
        return res.status(404).json({
          success: false,

          message:
            "Order not found",
        });
      }

      if (
        order.status !==
        "Return Approved"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Return must be approved before scheduling pickup",
        });
      }

      const courier =
        await Courier.findById(
          courierId,
        );

      if (!courier) {
        return res.status(404).json({
          success: false,

          message:
            "Courier not found",
        });
      }

      if (!trackingNumber) {
        return res.status(400).json({
          success: false,

          message:
            "Tracking number is required",
        });
      }

      if (!order.shipping) {
        order.shipping = {};
      }

      if (!order.returnDetails) {
        order.returnDetails = {};
      }

      order.shipping.courier =
        courier._id;

      order.shipping.courierName =
        courier.name;

      order.shipping.trackingNumber =
        trackingNumber;

      order.shipping.trackingUrl =
        `${courier.trackingUrl || ""}${trackingNumber}`;

      order.shipping.estimatedDelivery =
        estimatedDelivery;

      order.status =
        "Return Pickup Scheduled";

      order.returnDetails
        .pickupScheduledAt =
        new Date();

      appendStatusHistory(
        order,
        "Return Pickup Scheduled",
        req.user._id,
        "Courier Assigned",
      );

      await order.save();

      return res.status(200).json({
        success: true,

        message:
          "Return courier assigned",

        order,
      });
    } catch (error) {
      console.error(
        "Assign Return Courier Error:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          error.message,
      });
    }
  };

/* =========================================================
   RETURN PICKED UP
========================================================= */

export const returnPickedUp =
  async (req, res) => {
    try {
      const order =
        await Order.findById(
          req.params.orderId,
        );

      if (!order) {
        return res.status(404).json({
          success: false,

          message:
            "Order not found",
        });
      }

      if (
        order.status !==
        "Return Pickup Scheduled"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Return pickup has not been scheduled",
        });
      }

      if (!order.returnDetails) {
        order.returnDetails = {};
      }

      order.status =
        "Return Picked Up";

      order.returnDetails.pickedUpAt =
        new Date();

      appendStatusHistory(
        order,
        "Return Picked Up",
        req.user._id,
        "Courier picked the product",
      );

      await order.save();

      return res.status(200).json({
        success: true,

        message:
          "Return pickup completed",

        order,
      });
    } catch (error) {
      console.error(
        "Return Pickup Error:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          error.message,
      });
    }
  };

/* =========================================================
   RECEIVE RETURNED PRODUCT
========================================================= */

export const receiveReturnedProduct =
  async (req, res) => {
    try {
      const order =
        await Order.findById(
          req.params.orderId,
        );

      if (!order) {
        return res.status(404).json({
          success: false,

          message:
            "Order not found",
        });
      }

      if (
        order.status !==
        "Return Picked Up"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Return has not been picked up",
        });
      }

      if (!order.returnDetails) {
        order.returnDetails = {};
      }

      order.status =
        "Received by Admin";

      order.returnDetails
        .receivedByAdminAt =
        new Date();

      appendStatusHistory(
        order,
        "Received by Admin",
        req.user._id,
        "Product received",
      );

      await order.save();

      return res.status(200).json({
        success: true,

        message:
          "Product received",

        order,
      });
    } catch (error) {
      console.error(
        "Receive Returned Product Error:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          error.message,
      });
    }
  };

/* =========================================================
   INSPECT RETURNED PRODUCT
========================================================= */

export const inspectReturnedProduct =
  async (req, res) => {
    try {
      const {
        inspectionStatus,
        remark,
      } = req.body;

      const order =
        await Order.findById(
          req.params.orderId,
        );

      if (!order) {
        return res.status(404).json({
          success: false,

          message:
            "Order not found",
        });
      }

      if (
        order.status !==
        "Received by Admin"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Returned product must be received before inspection",
        });
      }

      if (
        ![
          "Passed",
          "Failed",
        ].includes(
          inspectionStatus,
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Inspection status must be Passed or Failed",
        });
      }

      if (!order.returnDetails) {
        order.returnDetails = {};
      }

      if (
        inspectionStatus ===
        "Passed"
      ) {
        order.status =
          "Refund Processing";

        order.returnDetails
          .refundStartedAt =
          new Date();
      } else {
        order.status =
          "Return Rejected";
      }

      appendStatusHistory(
        order,
        order.status,
        req.user._id,
        remark || "",
      );

      await order.save();

      return res.status(200).json({
        success: true,

        message:
          "Inspection completed",

        order,
      });
    } catch (error) {
      console.error(
        "Inspect Returned Product Error:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          error.message,
      });
    }
  };

/* =========================================================
   COMPLETE REFUND
========================================================= */

export const completeRefund =
  async (req, res) => {
    try {
      const order =
        await Order.findById(
          req.params.orderId,
        );

      if (!order) {
        return res.status(404).json({
          success: false,

          message:
            "Order not found",
        });
      }

      if (
        order.status !==
        "Refund Processing"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Refund not started",
        });
      }

      if (!order.refund) {
        order.refund = {};
      }

      /* ===================================================
         RAZORPAY REFUND
      =================================================== */

      if (
        order.payment?.method ===
        "Razorpay"
      ) {
        if (
          !order.payment
            ?.gateway?.paymentId
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Razorpay payment ID missing",
          });
        }

        /*
          Prevent duplicate refund.
        */

        if (
          order.payment.status ===
          "Refunded"
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Payment has already been refunded",
          });
        }

        const refund =
          await razorpay.payments.refund(
            order.payment.gateway
              .paymentId,
            {
              amount:
                Math.round(
                  Number(
                    order.pricing
                      .total || 0,
                  ) * 100,
                ),
            },
          );

        order.refund.refundId =
          refund.id;
      }

      /* ===================================================
         MARK REFUND COMPLETED
      =================================================== */

      order.payment.status =
        "Refunded";

      order.refund.status =
        "Completed";

      order.refund.amount =
        Number(
          order.pricing?.total || 0,
        );

      order.refund.refundedAt =
        new Date();

      order.status =
        "Refund Completed";

      appendStatusHistory(
        order,
        "Refund Completed",
        req.user._id,
        "Refund transferred",
      );

      await order.save();

      return res.status(200).json({
        success: true,

        message:
          "Refund completed",

        order,
      });
    } catch (error) {
      console.error(
        "Complete Refund Error:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          error.message ||
          "Refund failed",
      });
    }
  };

/* =========================================================
   SELLER ANALYTICS
========================================================= */

export const getSellerAnalytics =
  async (req, res) => {
    try {
      const sellerId =
        req.user._id;

      if (
        !mongoose.Types.ObjectId.isValid(
          sellerId,
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid seller ID",
        });
      }

      /* ===================================================
         FIND SELLER ORDERS
      =================================================== */

      const orders =
        await Order.find({
          "items.sellerId":
            sellerId,
        }).lean();

      /* ===================================================
         SELLER ITEMS
      =================================================== */

      const sellerItems = [];

      orders.forEach(
        (order) => {
          const items =
            order.items.filter(
              (item) =>
                item.sellerId?.toString() ===
                sellerId.toString(),
            );

          items.forEach(
            (item) => {
              sellerItems.push({
                ...item,

                orderId:
                  order._id,

                orderNumber:
                  order.orderNumber,

                orderStatus:
                  order.status,

                createdAt:
                  order.createdAt,
              });
            },
          );
        },
      );

      /* ===================================================
         BASIC COUNTS
      =================================================== */

      const totalOrders =
        new Set(
          sellerItems.map(
            (item) =>
              item.orderId.toString(),
          ),
        ).size;

      const totalProducts =
        await Product.countDocuments({
          seller: sellerId,

          isDeleted: false,
        });

      /* ===================================================
         STATUS COUNTS
      =================================================== */

      const statusCounts = {
        pending: 0,

        confirmed: 0,

        processing: 0,

        packed: 0,

        shipped: 0,

        delivered: 0,

        cancelled: 0,

        returned: 0,
      };

      sellerItems.forEach(
        (item) => {
          switch (
            item.orderStatus
          ) {
            case "Pending Payment":
              statusCounts.pending++;
              break;

            case "Confirmed":
              statusCounts.confirmed++;
              break;

            case "Processing":
              statusCounts.processing++;
              break;

            case "Packed":
              statusCounts.packed++;
              break;

            case "Ready for Pickup":
            case "Shipped":
            case "In Transit":
            case "Out for Delivery":
              statusCounts.shipped++;
              break;

            case "Delivered":
              statusCounts.delivered++;
              break;

            case "Cancelled":
              statusCounts.cancelled++;
              break;

            case "Return Requested":
            case "Return Approved":
            case "Return Pickup Scheduled":
            case "Return Picked Up":
            case "Received by Admin":
            case "Inspection":
            case "Refund Processing":
            case "Refund Completed":
            case "Return Rejected":
              statusCounts.returned++;
              break;
          }
        },
      );

      /* ===================================================
         SALES
      =================================================== */

      let totalSales = 0;

      sellerItems.forEach(
        (item) => {
          const excludedStatuses = [
            "Cancelled",
            "Return Rejected",
            "Refund Completed",
          ];

          if (
            !excludedStatuses.includes(
              item.orderStatus,
            )
          ) {
            totalSales +=
              Number(item.price || 0) *
              Number(item.quantity || 0);
          }
        },
      );

      totalSales = money(
        totalSales,
      );

      /* ===================================================
         COMMISSION
      =================================================== */

      const commission =
        money(
          (totalSales *
            COMMISSION_RATE) /
            100,
        );

      const sellerRevenue =
        money(
          totalSales -
            commission,
        );

      /* ===================================================
         LOW STOCK
      =================================================== */

      const lowStockProducts =
        await Product.find({
          seller: sellerId,

          isDeleted: false,

          "variants.stock": {
            $lte: 5,
          },
        })
          .select(
            "title variants",
          )
          .lean();

      /* ===================================================
         OUT OF STOCK
      =================================================== */

      const outOfStockProducts =
        await Product.find({
          seller: sellerId,

          isDeleted: false,

          variants: {
            $elemMatch: {
              stock: 0,
            },
          },
        })
          .select(
            "title variants",
          )
          .lean();

      return res.status(200).json({
        success: true,

        analytics: {
          overview: {
            totalProducts,

            totalOrders,

            totalSales,

            totalRevenue:
              sellerRevenue,

            commission,

            commissionRate:
              COMMISSION_RATE,
          },

          orders: {
            pending:
              statusCounts.pending,

            confirmed:
              statusCounts.confirmed,

            processing:
              statusCounts.processing,

            packed:
              statusCounts.packed,

            shipped:
              statusCounts.shipped,

            delivered:
              statusCounts.delivered,

            cancelled:
              statusCounts.cancelled,

            returned:
              statusCounts.returned,
          },

          inventory: {
            lowStock:
              lowStockProducts.length,

            outOfStock:
              outOfStockProducts.length,
          },
        },
      });
    } catch (error) {
      console.error(
        "Seller Analytics Error:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          error.message,
      });
    }
  };

/* =========================================================
   GET SELLER ORDERS
========================================================= */

export const getSellerOrders =
  async (req, res) => {
    try {
      const sellerId =
        req.user._id;

      const orders =
        await Order.find({
          "items.sellerId":
            sellerId,
        })
          .populate(
            "userId",
            "firstName lastName email phone",
          )
          .populate(
            "items.productId",
            "title slug images thumbnail seller",
          )
          .sort({
            createdAt: -1,
          });

      const sellerOrders =
        orders.map(
          (order) => {
            const sellerItems =
              order.items.filter(
                (item) =>
                  item.sellerId?.toString() ===
                  sellerId.toString(),
              );

            const sellerTotal =
              sellerItems.reduce(
                (total, item) =>
                  total +
                  Number(
                    item.price || 0,
                  ) *
                    Number(
                      item.quantity ||
                        0,
                    ),
                0,
              );

            return {
              _id: order._id,

              orderNumber:
                order.orderNumber,

              userId:
                order.userId,

              items:
                sellerItems,

              status:
                order.status,

              paymentStatus:
                order.payment?.status ||
                "Unknown",

              paymentMethod:
                order.payment?.method ||
                "Unknown",

              totalAmount:
                money(sellerTotal),

              shippingAddress:
                order
                  .deliveryAddress
                  ?.address || null,

              deliveryCustomer:
                order
                  .deliveryAddress
                  ?.customer || null,

              shipping:
                order.shipping ||
                null,

              createdAt:
                order.createdAt,

              updatedAt:
                order.updatedAt,
            };
          },
        );

      return res.status(200).json({
        success: true,

        count:
          sellerOrders.length,

        orders:
          sellerOrders,
      });
    } catch (error) {
      console.error(
        "Get Seller Orders Error:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          error.message,
      });
    }
  };