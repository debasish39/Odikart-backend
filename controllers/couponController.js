import Coupon from "../models/Coupon.js";

export const createCoupon = async (req, res) => {
  try {

    const coupon = await Coupon.create(req.body);

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
export const getCoupons = async (req, res) => {
  try {

    const coupons = await Coupon.find().sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      count: coupons.length,
      coupons,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
export const getCouponById = async (req, res) => {
  try {

    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {

      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });

    }

    res.json({
      success: true,
      coupon,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
export const updateCoupon = async (req, res) => {
  try {

    const coupon = await Coupon.findByIdAndUpdate(

      req.params.id,

      req.body,

      {
        new: true,
        runValidators: true,
      }

    );

    if (!coupon) {

      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });

    }

    res.json({
      success: true,
      message: "Coupon updated",
      coupon,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
export const deleteCoupon = async (req, res) => {
  try {

    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {

      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });

    }

    await coupon.deleteOne();

    res.json({
      success: true,
      message: "Coupon deleted successfully",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
export const applyCoupon = async (req, res) => {

  try {

    const {

      code,

      total,

      userId,

    } = req.body;

    const coupon =
      await Coupon.findOne({

        code: code.toUpperCase(),

        isActive: true,

      });

    if (!coupon) {

      return res.status(404).json({
        success: false,
        message: "Invalid coupon",
      });

    }

    if (coupon.expiryDate < new Date()) {

      return res.status(400).json({
        success: false,
        message: "Coupon expired",
      });

    }

    if (total < coupon.minOrderAmount) {

      return res.status(400).json({
        success: false,
        message:
          `Minimum order ₹${coupon.minOrderAmount} required`,
      });

    }

    if (
      coupon.usedBy.includes(userId)
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

      discount =
        (total * coupon.discountValue) /
        100;

      if (
        coupon.maxDiscount > 0
      ) {

        discount = Math.min(
          discount,
          coupon.maxDiscount
        );

      }

    } else {

      discount =
        coupon.discountValue;

    }

    res.json({

      success: true,

      couponCode: coupon.code,

      discount,

      finalTotal:
        total - discount,

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};