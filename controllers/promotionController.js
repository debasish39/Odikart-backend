import Promotion from "../models/Promotion.js";
import User from "../models/User.js";

import { sendEmail } from "../utils/sendEmail.js";

import {
  promotionalEmailTemplate,
} from "../utils/promotionalEmailTemplate.js";


// =====================================================
// CREATE PROMOTION
// =====================================================

export const createPromotion = async (req, res) => {
  try {
    const {
      title,
      subject,
      message,
      couponCode,
      discount,
      targetAudience,
      scheduledAt,
    } = req.body;


    if (!title || !subject || !message) {
      return res.status(400).json({
        success: false,
        message:
          "Title, subject and message are required",
      });
    }


    const promotion = await Promotion.create({
      title,
      subject,
      message,

      couponCode:
        couponCode?.trim() || null,

      discount:
        Number(discount) || 0,

      targetAudience:
        targetAudience || "all",

      scheduledAt:
        scheduledAt || null,

      status:
        scheduledAt
          ? "scheduled"
          : "draft",
    });


    return res.status(201).json({
      success: true,
      message:
        "Promotion created successfully",

      promotion,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message:
        "Failed to create promotion",

      error: error.message,
    });
  }
};


// =====================================================
// GET ALL PROMOTIONS
// =====================================================

export const getPromotions = async (req, res) => {
  try {

    const promotions =
      await Promotion.find()
        .sort({
          createdAt: -1,
        });


    return res.status(200).json({
      success: true,
      promotions,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch promotions",

      error: error.message,
    });
  }
};


// =====================================================
// GET SINGLE PROMOTION
// =====================================================

export const getPromotionById = async (
  req,
  res
) => {
  try {

    const { id } = req.params;


    const promotion =
      await Promotion.findById(id);


    if (!promotion) {
      return res.status(404).json({
        success: false,
        message:
          "Promotion not found",
      });
    }


    return res.status(200).json({
      success: true,
      promotion,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch promotion",

      error: error.message,
    });
  }
};


// =====================================================
// SEND PROMOTION
// =====================================================

export const sendPromotion = async (
  req,
  res
) => {
  try {

    const { id } = req.params;


    const promotion =
      await Promotion.findById(id);


    if (!promotion) {
      return res.status(404).json({
        success: false,
        message:
          "Promotion not found",
      });
    }


    if (promotion.status === "sent") {
      return res.status(400).json({
        success: false,
        message:
          "This promotion has already been sent",
      });
    }


    // -------------------------------------------------
    // FIND ELIGIBLE USERS
    // -------------------------------------------------

    let userQuery = {
      role: "user",

      isBlocked: false,

      isDeleted: false,

      email: {
        $exists: true,
        $nin: [null, ""],
      },

      "notificationSettings.email": true,

      "notificationSettings.promotionalEmail":
        true,
    };


    // -------------------------------------------------
    // NEW USERS
    // -------------------------------------------------

    if (
      promotion.targetAudience ===
      "new_users"
    ) {

      const thirtyDaysAgo =
        new Date(
          Date.now() -
            30 *
              24 *
              60 *
              60 *
              1000
        );


      userQuery.createdAt = {
        $gte: thirtyDaysAgo,
      };
    }


    // -------------------------------------------------
    // GET USERS
    // -------------------------------------------------

    const users =
      await User.find(userQuery)
        .select(
          "firstName lastName email"
        );


    if (!users.length) {

      return res.status(400).json({
        success: false,
        message:
          "No eligible users found",
      });
    }


    // -------------------------------------------------
    // MARK AS SENDING
    // -------------------------------------------------

    promotion.status = "sending";

    promotion.totalRecipients =
      users.length;

    promotion.totalSent = 0;

    promotion.totalFailed = 0;

    await promotion.save();


    // -------------------------------------------------
    // SEND EMAILS
    // -------------------------------------------------

    let totalSent = 0;

    let totalFailed = 0;


    for (const user of users) {

      try {

        const userName =
          `${user.firstName || ""} ${
            user.lastName || ""
          }`.trim() || "there";


        const html =
          promotionalEmailTemplate({
            userName,

            title:
              promotion.title,

            message:
              promotion.message,

            couponCode:
              promotion.couponCode,

            discount:
              promotion.discount,
          });


        await sendEmail(
          user.email,
          promotion.subject,
          html
        );


        totalSent++;

      } catch {

        totalFailed++;
      }
    }


    // -------------------------------------------------
    // UPDATE CAMPAIGN
    // -------------------------------------------------

    promotion.totalSent =
      totalSent;

    promotion.totalFailed =
      totalFailed;

    promotion.status =
      totalSent > 0
        ? "sent"
        : "failed";

    promotion.sentAt =
      totalSent > 0
        ? new Date()
        : null;


    await promotion.save();


    return res.status(200).json({

      success: true,

      message:
        "Promotion campaign completed",

      statistics: {
        totalRecipients:
          users.length,

        totalSent,

        totalFailed,
      },

      promotion,
    });

  } catch (error) {

    return res.status(500).json({

      success: false,

      message:
        "Failed to send promotion",

      error: error.message,
    });
  }
};


// =====================================================
// DELETE PROMOTION
// =====================================================

export const deletePromotion = async (
  req,
  res
) => {
  try {

    const { id } = req.params;


    const promotion =
      await Promotion.findById(id);


    if (!promotion) {
      return res.status(404).json({
        success: false,
        message:
          "Promotion not found",
      });
    }


    if (
      promotion.status ===
      "sending"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete a campaign while it is sending",
      });
    }


    await Promotion.findByIdAndDelete(
      id
    );


    return res.status(200).json({
      success: true,
      message:
        "Promotion deleted successfully",
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete promotion",

      error: error.message,
    });
  }
};