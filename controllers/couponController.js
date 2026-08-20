import mongoose from "mongoose";
import Coupon from "../models/Coupon.js";

/* =========================================================
   SECURITY / VALIDATION HELPERS
========================================================= */

const MAX_CODE_LENGTH = 50;
const MAX_DISCOUNT = 100000000;
const MAX_ORDER_TOTAL = 1000000000;

const normalizeCode = (code) =>
  String(code ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, MAX_CODE_LENGTH);

const isValidObjectId = (id) =>
  Boolean(id) &&
  mongoose.Types.ObjectId.isValid(id);

const toFiniteNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

const getAuthenticatedUserId = (
  req
) =>
  req.user?._id ||
  req.user?.id ||
  null;

const isAdmin = (req) =>
  req.user?.role === "admin";

const safeError = (
  res,
  error,
  context
) => {
  console.error(
    `${context}:`,
    error
  );

  /*
    Do not expose MongoDB, validation,
    schema or internal server details.
  */
  return res.status(500).json({
    success: false,
    message:
      "An unexpected error occurred",
  });
};

/*
  Only allow known coupon fields.

  This prevents mass-assignment attacks such as:
  {
    isActive: true,
    usedBy: [...],
    createdBy: "...",
    discountValue: ...
  }
  being blindly written from req.body.
*/
const buildCouponPayload = (
  body = {}
) => {
  const payload = {};

  if (
    body.code !== undefined
  ) {
    payload.code =
      normalizeCode(
        body.code
      );
  }

  if (
    body.discountType !==
    undefined
  ) {
    payload.discountType =
      String(
        body.discountType
      )
        .trim()
        .toUpperCase();
  }

  if (
    body.discountValue !==
    undefined
  ) {
    payload.discountValue =
      toFiniteNumber(
        body.discountValue
      );
  }

  if (
    body.maxDiscount !==
    undefined
  ) {
    payload.maxDiscount =
      toFiniteNumber(
        body.maxDiscount
      );
  }

  if (
    body.minOrderAmount !==
    undefined
  ) {
    payload.minOrderAmount =
      toFiniteNumber(
        body.minOrderAmount
      );
  }

  if (
    body.expiryDate !==
    undefined
  ) {
    payload.expiryDate =
      new Date(
        body.expiryDate
      );
  }

  if (
    body.isActive !==
    undefined
  ) {
    payload.isActive =
      Boolean(
        body.isActive
      );
  }

  /*
    Do NOT accept usedBy from client.
    Coupon usage must be controlled by the
    server during successful checkout/order
    creation.
  */

  return payload;
};

const validateCouponPayload = (
  payload,
  isUpdate = false
) => {
  if (
    !isUpdate ||
    payload.code !==
      undefined
  ) {
    if (
      !payload.code ||
      !/^[A-Z0-9_-]{3,50}$/.test(
        payload.code
      )
    ) {
      return "Coupon code must contain 3-50 letters, numbers, _ or -";
    }
  }

  if (
    payload.discountType !==
      undefined &&
    ![
      "PERCENTAGE",
      "FIXED",
    ].includes(
      payload.discountType
    )
  ) {
    return "Invalid discount type";
  }

  if (
    payload.discountValue !==
      undefined
  ) {
    if (
      payload.discountValue <=
        0 ||
      payload.discountValue >
        MAX_DISCOUNT
    ) {
      return "Invalid discount value";
    }

    if (
      payload.discountType ===
        "PERCENTAGE" &&
      payload.discountValue >
        100
    ) {
      return "Percentage discount cannot exceed 100%";
    }
  }

  if (
    payload.maxDiscount !==
      undefined
  ) {
    if (
      payload.maxDiscount <
        0 ||
      payload.maxDiscount >
        MAX_DISCOUNT
    ) {
      return "Invalid maximum discount";
    }
  }

  if (
    payload.minOrderAmount !==
      undefined
  ) {
    if (
      payload.minOrderAmount <
        0 ||
      payload.minOrderAmount >
        MAX_ORDER_TOTAL
    ) {
      return "Invalid minimum order amount";
    }
  }

  if (
    payload.expiryDate !==
      undefined
  ) {
    if (
      Number.isNaN(
        payload.expiryDate.getTime()
      )
    ) {
      return "Invalid expiry date";
    }
  }

  return null;
};

/* =========================================================
   CREATE COUPON
   ADMIN ONLY
========================================================= */

export const createCoupon =
  async (
    req,
    res
  ) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const payload =
        buildCouponPayload(
          req.body
        );

      const validationError =
        validateCouponPayload(
          payload
        );

      if (
        validationError
      ) {
        return res.status(400).json({
          success: false,
          message:
            validationError,
        });
      }

      if (
        payload.expiryDate &&
        payload.expiryDate <=
          new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Coupon expiry date must be in the future",
        });
      }

      /*
        Prevent duplicate coupon codes.
        This should also be backed by a unique index
        in the Coupon schema.
      */
      const existingCoupon =
        await Coupon.findOne({
          code:
            payload.code,
        }).select("_id");

      if (existingCoupon) {
        return res.status(409).json({
          success: false,
          message:
            "Coupon code already exists",
        });
      }

      const coupon =
        await Coupon.create(
          payload
        );

      return res.status(201).json({
        success: true,
        message:
          "Coupon created successfully",
        coupon,
      });

    } catch (error) {
      /*
        Duplicate-key race condition.
      */
      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Coupon code already exists",
        });
      }

      return safeError(
        res,
        error,
        "Create Coupon Error"
      );
    }
  };

/* =========================================================
   GET COUPONS
   ADMIN ONLY
========================================================= */

export const getCoupons =
  async (
    req,
    res
  ) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const coupons =
        await Coupon.find()
          .select(
            "-usedBy"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      return res.status(200).json({
        success: true,
        count:
          coupons.length,
        coupons,
      });

    } catch (error) {
      return safeError(
        res,
        error,
        "Get Coupons Error"
      );
    }
  };

/* =========================================================
   GET COUPON BY ID
   ADMIN ONLY
========================================================= */

export const getCouponById =
  async (
    req,
    res
  ) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const {
        id,
      } = req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid coupon ID",
        });
      }

      const coupon =
        await Coupon.findById(
          id
        )
          .select(
            "-usedBy"
          )
          .lean();

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message:
            "Coupon not found",
        });
      }

      return res.status(200).json({
        success: true,
        coupon,
      });

    } catch (error) {
      return safeError(
        res,
        error,
        "Get Coupon Error"
      );
    }
  };

/* =========================================================
   UPDATE COUPON
   ADMIN ONLY
========================================================= */

export const updateCoupon =
  async (
    req,
    res
  ) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const {
        id,
      } = req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid coupon ID",
        });
      }

      const payload =
        buildCouponPayload(
          req.body
        );

      const validationError =
        validateCouponPayload(
          payload,
          true
        );

      if (
        validationError
      ) {
        return res.status(400).json({
          success: false,
          message:
            validationError,
        });
      }

      if (
        payload.expiryDate &&
        payload.expiryDate <=
          new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Coupon expiry date must be in the future",
        });
      }

      if (
        payload.code
      ) {
        const duplicate =
          await Coupon.findOne({
            code:
              payload.code,
            _id: {
              $ne: id,
            },
          }).select("_id");

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              "Coupon code already exists",
          });
        }
      }

      /*
        Do not allow an update to overwrite usedBy.
        Usage history is immutable from the admin
        update endpoint.
      */
      const coupon =
        await Coupon.findByIdAndUpdate(
          id,
          {
            $set: payload,
          },
          {
            new: true,
            runValidators: true,
            context: "query",
          }
        );

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message:
            "Coupon not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Coupon updated successfully",
        coupon,
      });

    } catch (error) {
      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Coupon code already exists",
        });
      }

      return safeError(
        res,
        error,
        "Update Coupon Error"
      );
    }
  };

/* =========================================================
   DELETE COUPON
   ADMIN ONLY
========================================================= */

export const deleteCoupon =
  async (
    req,
    res
  ) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const {
        id,
      } = req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid coupon ID",
        });
      }

      const coupon =
        await Coupon.findById(
          id
        );

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message:
            "Coupon not found",
        });
      }

      await coupon.deleteOne();

      return res.status(200).json({
        success: true,
        message:
          "Coupon deleted successfully",
      });

    } catch (error) {
      return safeError(
        res,
        error,
        "Delete Coupon Error"
      );
    }
  };

/* =========================================================
   APPLY COUPON
   AUTHENTICATED CUSTOMER
========================================================= */

export const applyCoupon =
  async (
    req,
    res
  ) => {
    try {
      const authenticatedUserId =
        getAuthenticatedUserId(
          req
        );

      if (
        !authenticatedUserId ||
        !isValidObjectId(
          authenticatedUserId
        )
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      /*
        SECURITY:
        Never trust userId from req.body.
        Always use the authenticated user's ID.
      */
      const userId =
        authenticatedUserId;

      const code =
        normalizeCode(
          req.body?.code
        );

      const total =
        toFiniteNumber(
          req.body?.total
        );

      if (
        !code ||
        !total ||
        total <= 0 ||
        total >
          MAX_ORDER_TOTAL
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid coupon code and order total are required",
        });
      }

      const coupon =
        await Coupon.findOne({
          code,
          isActive:
            true,
        });

      if (!coupon) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid coupon",
        });
      }

      if (
        !coupon.expiryDate ||
        coupon.expiryDate <=
          new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Coupon expired",
        });
      }

      const minOrder =
        Number(
          coupon.minOrderAmount ||
            0
        );

      if (
        total <
        minOrder
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Minimum order ₹${minOrder} required`,
        });
      }

      /*
        usedBy is only checked here.
        It should be marked as used atomically
        after the order/payment succeeds.
      */
      const alreadyUsed =
        Array.isArray(
          coupon.usedBy
        ) &&
        coupon.usedBy.some(
          (id) =>
            id?.toString() ===
            userId.toString()
        );

      if (
        alreadyUsed
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Coupon already used",
        });
      }

      let discount = 0;

      if (
        coupon.discountType ===
        "PERCENTAGE"
      ) {
        const percentage =
          Math.min(
            100,
            Math.max(
              0,
              Number(
                coupon.discountValue
              )
            )
          );

        discount =
          (total *
            percentage) /
          100;

        const maxDiscount =
          Number(
            coupon.maxDiscount ||
              0
          );

        if (
          maxDiscount >
          0
        ) {
          discount =
            Math.min(
              discount,
              maxDiscount
            );
        }

      } else if (
        coupon.discountType ===
        "FIXED"
      ) {
        discount =
          Number(
            coupon.discountValue
          );
      } else {
        return res.status(400).json({
          success: false,
          message:
            "Invalid coupon configuration",
        });
      }

      /*
        Never allow discount to exceed order total.
      */
      discount =
        Math.max(
          0,
          Math.min(
            discount,
            total
          )
        );

      const finalTotal =
        Math.max(
          0,
          total -
            discount
        );

      return res.status(200).json({
        success: true,
        couponCode:
          coupon.code,
        discount,
        finalTotal,
      });

    } catch (error) {
      return safeError(
        res,
        error,
        "Apply Coupon Error"
      );
    }
  };
