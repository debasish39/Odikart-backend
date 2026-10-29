

import mongoose from "mongoose";

import Notification from "../models/Notification.js";
import User from "../models/User.js";
import DeviceToken from "../models/DeviceToken.js";
import { Readable } from "node:stream";
import cloudinary from "../config/cloudinary.js";
import {
  createAndSendNotification,
  createNotification as createInAppNotification,
  sendPushNotification,
} from "../utils/notificationService.js";


/* =========================================================
   HELPERS
========================================================= */

const getUserId = (req) => {
  return req.user?._id || req.user?.id;
};


const isAdmin = (req) => {
  return req.user?.role === "admin";
};

/* =========================================================
   NOTIFICATION DEBUGGING
   Enable with DEBUG_NOTIFICATIONS=true in backend .env.
   Never log authorization headers, tokens, or message contents.
========================================================= */

const notificationDebugEnabled =
  process.env.DEBUG_NOTIFICATIONS === "true";

const debugNotification = (label, req, extra = {}) => {
  if (!notificationDebugEnabled) return;

  console.log("[NOTIFICATIONS DEBUG]", {
    label,
    method: req?.method,
    path: req?.originalUrl || req?.url,
    userId: String(getUserId(req) || ""),
    role: req?.user?.role || "unknown",
    params: req?.params || {},
    query: req?.query || {},
    bodyKeys: Object.keys(req?.body || {}),
    ...extra,
  });
};

const notificationError = (label, error, req) => {
  console.error(`[NOTIFICATIONS ERROR] ${label}`, {
    path: req?.originalUrl || req?.url,
    method: req?.method,
    userId: String(getUserId(req) || ""),
    role: req?.user?.role || "unknown",
    name: error?.name,
    message: error?.message,
    stack: error?.stack,
  });
};

const debugErrorResponse = (res, error, fallbackMessage, status = 500) => {
  const response = {
    success: false,
    message: fallbackMessage,
  };

  // Include diagnostic detail only in non-production environments.
  if (process.env.NODE_ENV !== "production") {
    response.debug = {
      name: error?.name || "Error",
      message: error?.message || "Unknown error",
    };
  }

  return res.status(status).json(response);
};


/* =========================================================
   GET MY NOTIFICATIONS
========================================================= */

export const getMyNotifications = async (
  req,
  res
) => {
  try {
    debugNotification("getMyNotifications", req);
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findById(userId)
      .select("notificationSettings isBlocked isDeleted")
      .lean();

    if (!user || user.isBlocked || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User account is unavailable",
      });
    }

    // If the customer disabled website/in-app notifications,
    // hide all existing notifications from the website as well.
    if (user.notificationSettings?.inApp === false) {
      return res.json({
        success: true,
        notifications: [],
        unreadCount: 0,
        notificationsEnabled: false,
      });
    }

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 30,
        1
      ),
      100
    );

    const notifications =
      await Notification.find({
        userId,
      })
        .sort({
          createdAt: -1,
        })
        .limit(limit)
        .lean();

    const unreadCount =
      await Notification.countDocuments({
        userId,
        isRead: false,
      });

    return res.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error(
      "Get Notifications Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch notifications",
    });
  }
};


/* =========================================================
   GET UNREAD COUNT
========================================================= */

export const getUnreadCount = async (
  req,
  res
) => {
  try {
    debugNotification("getUnreadCount", req);
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findById(userId)
      .select("notificationSettings isBlocked isDeleted")
      .lean();

    if (!user || user.isBlocked || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User account is unavailable",
      });
    }

    // When website notifications are disabled, the unread badge
    // must immediately become zero.
    if (user.notificationSettings?.inApp === false) {
      return res.json({
        success: true,
        unreadCount: 0,
        notificationsEnabled: false,
      });
    }

    const unreadCount =
      await Notification.countDocuments({
        userId,
        isRead: false,
      });

    return res.json({
      success: true,
      unreadCount,
      notificationsEnabled: true,
    });
  } catch (error) {
    console.error(
      "Unread Count Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch unread count",
    });
  }
};


/* =========================================================
   MARK ONE AS READ
========================================================= */

export const markAsRead = async (
  req,
  res
) => {
  try {
    debugNotification("markAsRead", req);
    const userId = getUserId(req);

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid notification ID",
      });
    }

    const notification =
      await Notification.findOneAndUpdate(
        {
          _id: id,
          userId,
        },

        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        },

        {
          new: true,
        }
      );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message:
          "Notification not found",
      });
    }

    return res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error(
      "Mark Notification Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to mark notification",
    });
  }
};


/* =========================================================
   MARK ALL AS READ
========================================================= */

export const markAllAsRead = async (
  req,
  res
) => {
  try {
    debugNotification("markAllAsRead", req);
    const userId = getUserId(req);

    await Notification.updateMany(
      {
        userId,
        isRead: false,
      },

      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return res.json({
      success: true,
      message:
        "All notifications marked as read",
    });
  } catch (error) {
    console.error(
      "Mark All Notifications Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to mark notifications",
    });
  }
};


/* =========================================================
   DELETE NOTIFICATION
========================================================= */

export const deleteNotification = async (
  req,
  res
) => {
  try {
    debugNotification("deleteNotification", req);
    const userId = getUserId(req);

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid notification ID",
      });
    }

    const deleted =
      await Notification.findOneAndDelete({
        _id: id,
        userId,
      });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message:
          "Notification not found",
      });
    }

    return res.json({
      success: true,
      message:
        "Notification deleted",
    });
  } catch (error) {
    console.error(
      "Delete Notification Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete notification",
    });
  }
};


/* =========================================================
   UPDATE NOTIFICATION SETTINGS
========================================================= */

export const updateNotificationSettings =
  async (req, res) => {
    try {
    debugNotification("updateNotificationSettings", req);
      const userId = getUserId(req);

      const allowed = [
        "inApp",
        "email",
        "sms",
        "push",
        "promotionalEmail",
        "promotionalSms",
        "promotionalPush",
      ];

      const incoming =
        req.body?.notificationSettings ??
        req.body;

      const update = {};

      for (const key of allowed) {
        if (
          typeof incoming?.[key] ===
          "boolean"
        ) {
          update[
            `notificationSettings.${key}`
          ] = incoming[key];
        }
      }

      if (!Object.keys(update).length) {
        return res.status(400).json({
          success: false,
          message:
            "No valid notification settings supplied",
        });
      }

      const user =
        await User.findByIdAndUpdate(
          userId,
          {
            $set: update,
          },
          {
            new: true,
            runValidators: true,
          }
        ).select(
          "notificationSettings"
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.json({
        success: true,
        message: "Notification settings updated successfully",
        notificationSettings:
          user.notificationSettings,
        notificationsEnabled:
          user.notificationSettings?.inApp !== false,
      });
    } catch (error) {
      console.error(
        "Notification Settings Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update notification settings",
      });
    }
  };


/* =========================================================
   ADMIN SEND NOTIFICATION
========================================================= */

export const sendNotificationToUser =
  async (req, res) => {
    try {
    debugNotification("sendNotificationToUser", req);
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

const {
  userId,
  title,
  message,
  type = "announcement",
  link = "",
  orderId = null,
  isPromotional = false,
  imageUrl = "",
} = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          userId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid userId is required",
        });
      }

      if (
        !String(title || "").trim() ||
        !String(message || "").trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Title and message are required",
        });
      }

      const user =
        await User.findById(userId).select(
          "_id role isBlocked isDeleted notificationSettings"
        );

      if (
        !user ||
        user.role !== "user"
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Customer not found",
        });
      }

      if (
        user.isBlocked ||
        user.isDeleted
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Customer account is unavailable",
        });
      }


const notification = await createAndSendNotification({
  userId,
  title: String(title).trim(),
  message: String(message).trim(),
  type,
  link,
  orderId,
  isPromotional,
  imageUrl: String(imageUrl || "").trim(),
  createdBy: getUserId(req),
});

return res.status(201).json({
  success: true,
  message: notification
    ? "Notification sent"
    : "Notification processed; in-app notification was not created",
  notification,
});

    } catch (error) {
      console.error(
        "Send Notification Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to send notification",
      });
    }
  };
  /* =========================================================
   REGISTER ANDROID DEVICE FOR PUSH NOTIFICATIONS
========================================================= */

export const registerDevice = async (req, res) => {
  try {
    debugNotification("registerDevice", req);
    const userId = getUserId(req);
    const { token, platform = "android" } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      typeof token !== "string" ||
      !token.trim() ||
      platform !== "android"
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid Android device token is required",
      });
    }

    const user = await User.findById(userId)
      .select("_id role isBlocked isDeleted")
      .lean();

    if (!user || user.isBlocked || user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "User account is unavailable",
      });
    }

    const device = await DeviceToken.findOneAndUpdate(
      { token: token.trim() },
      {
        $set: {
          userId,
          token: token.trim(),
          platform: "android",
          lastSeenAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Android device registered successfully",
      deviceId: device._id,
    });
  } catch (error) {
    console.error("Register Android Device Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to register Android device",
    });
  }
};


/* =========================================================
   UNREGISTER ANDROID DEVICE
========================================================= */

export const unregisterDevice = async (req, res) => {
  try {
    debugNotification("unregisterDevice", req);
    const userId = getUserId(req);
    const { token } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (typeof token !== "string" || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: "Device token is required",
      });
    }

    await DeviceToken.deleteOne({
      userId,
      token: token.trim(),
    });

    return res.status(200).json({
      success: true,
      message: "Android device unregistered successfully",
    });
  } catch (error) {
    console.error("Unregister Android Device Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to unregister Android device",
    });
  }
};


/* =========================================================
   ADMIN SEND PROMOTION TO ALL CUSTOMERS
========================================================= */



export const sendPromotionToAllCustomers = async (req, res) => {
  try {
    debugNotification("sendPromotionToAllCustomers", req);

    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const {
      title,
      message = "",
      link = "/",
      imageUrl = "",
    } = req.body || {};

    const cleanTitle = String(title || "").trim();
    const cleanMessage = String(message || "").trim();
    const cleanLink = String(link || "/").trim();
    const cleanImageUrl = String(imageUrl || "").trim();

    // Only the title is mandatory.
    if (!cleanTitle) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // If the admin leaves the message empty, use a fallback.
    // This helps when the Notification schema requires a message.
    const finalMessage =
      cleanMessage || "Tap to view this offer.";

    // If supplied, the image must be a valid HTTPS URL.
    if (cleanImageUrl) {
      let parsedImageUrl;

      try {
        parsedImageUrl = new URL(cleanImageUrl);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid image URL",
        });
      }

      if (parsedImageUrl.protocol !== "https:") {
        return res.status(400).json({
          success: false,
          message: "Image URL must use HTTPS",
        });
      }
    }

    const customers = await User.find({
      role: "user",
      isBlocked: { $ne: true },
      isDeleted: { $ne: true },
    })
      .select("_id notificationSettings")
      .lean();

    const result = {
      totalCustomers: customers.length,
      skipped: 0,
      inAppCreated: 0,
      pushSent: 0,
      pushFailed: 0,
      pushSkipped: 0,
      errors: 0,
    };

    for (const customer of customers) {
      const settings = customer.notificationSettings || {};

      // Respect promotional preferences.
      if (settings.promotions === false) {
        result.skipped++;
        continue;
      }

      try {
        // Create the in-app notification when enabled.
        if (settings.inApp !== false) {
          const notification = await createInAppNotification({
            userId: customer._id,
            type: "promotion",
            title: cleanTitle,
            message: finalMessage,
            link: cleanLink,
            imageUrl: cleanImageUrl,
            isPromotional: true,
            createdBy: getUserId(req),
          });

          if (notification) {
            result.inAppCreated++;
          }
        }

        // Send push notification to registered devices.
        const pushResult = await sendPushNotification({
          userId: customer._id,
          type: "promotion",
          title: cleanTitle,
          message: finalMessage,
          link: cleanLink,
          imageUrl: cleanImageUrl,
          isPromotional: true,
        });

        result.pushSent += pushResult?.sent || 0;
        result.pushFailed += pushResult?.failed || 0;

        if (pushResult?.skipped) {
          result.pushSkipped++;
        }
      } catch (error) {
        result.errors++;

        console.error(
          "Promotion processing failed for customer:",
          String(customer._id),
          error?.message || error
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Promotion processing completed",
      imageIncluded: Boolean(cleanImageUrl),
      ...result,
    });
  } catch (error) {
    notificationError(
      "sendPromotionToAllCustomers",
      error,
      req
    );

    return debugErrorResponse(
      res,
      error,
      "Failed to process promotion",
      500
    );
  }
};

/* =========================================================
   ADMIN CRUD HELPERS
   These endpoints are intended for admin-only routes.
========================================================= */

const validateNotificationId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const getNotificationPayload = (body = {}) => {
  const payload = {};

  if (typeof body.title === "string" && body.title.trim()) {
    payload.title = body.title.trim();
  }

  if (typeof body.message === "string" && body.message.trim()) {
    payload.message = body.message.trim();
  }

  if (typeof body.type === "string" && body.type.trim()) {
    payload.type = body.type.trim();
  }

  if (typeof body.link === "string") {
    payload.link = body.link.trim();
  }

  if (typeof body.isPromotional === "boolean") {
    payload.isPromotional = body.isPromotional;
  }
  if (typeof body.imageUrl === "string") {
    payload.imageUrl = body.imageUrl.trim();
  }
  return payload;
};

/* =========================================================
   ADMIN: CREATE NOTIFICATION FOR ONE CUSTOMER
   POST /api/notifications
========================================================= */

export const createNotification = async (req, res) => {
  try {
    debugNotification("createNotification", req);
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const {
      userId,
      title,
      message,
      type = "announcement",
      link = "",
      orderId = null,
      isPromotional = false,
      imageUrl = "",
    } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "A valid userId is required",
      });
    }

    if (!String(title || "").trim() || !String(message || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    const customer = await User.findById(userId)
      .select("_id role isBlocked isDeleted notificationSettings")
      .lean();

    if (!customer || customer.role !== "user") {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (customer.isBlocked || customer.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Customer account is unavailable",
      });
    }

    const notification = await createAndSendNotification({
      userId: customer._id,
      title: String(title).trim(),
      message: String(message).trim(),
      type,
      link: String(link || "").trim(),
      orderId,
      isPromotional: Boolean(isPromotional),
      imageUrl: String(imageUrl || "").trim(),
      createdBy: getUserId(req),
    });

    return res.status(201).json({
      success: true,
      message: notification
        ? "Notification created and processed"
        : "Notification processed; no in-app notification was created",
      notification: notification || null,
    });
  } catch (error) {
    notificationError("createNotification", error, req);
    return debugErrorResponse(res, error, "Failed to create notification", 500);
  }
};

/* =========================================================
   ADMIN: GET ALL NOTIFICATIONS
   GET /api/notifications/admin/all
========================================================= */

export const getAllNotificationsForAdmin = async (req, res) => {
  try {
    debugNotification("getAllNotificationsForAdmin", req);
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.userId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid userId",
        });
      }
      filter.userId = req.query.userId;
    }

    if (req.query.type) {
      filter.type = String(req.query.type);
    }

    if (req.query.isRead === "true") filter.isRead = true;
    if (req.query.isRead === "false") filter.isRead = false;

    if (req.query.isPromotional === "true") filter.isPromotional = true;
    if (req.query.isPromotional === "false") filter.isPromotional = false;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    notificationError("getAllNotificationsForAdmin", error, req);
    return debugErrorResponse(res, error, "Failed to fetch notifications", 500);
  }
};

/* =========================================================
   ADMIN: GET ONE NOTIFICATION
   GET /api/notifications/admin/:id
========================================================= */

export const getNotificationById = async (req, res) => {
  try {
    debugNotification("getNotificationById", req);
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const { id } = req.params;

    if (!validateNotificationId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findById(id).lean();

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    notificationError("getNotificationById", error, req);
    return debugErrorResponse(res, error, "Failed to fetch notification", 500);
  }
};

/* =========================================================
   ADMIN: UPDATE NOTIFICATION DETAILS
   PATCH /api/notifications/admin/:id
========================================================= */

export const updateNotification = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const { id } = req.params;

    if (!validateNotificationId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const update = getNotificationPayload(req.body);

    if (typeof req.body?.isRead === "boolean") {
      update.isRead = req.body.isRead;
      update.readAt = req.body.isRead ? new Date() : null;
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({
        success: false,
        message: "No valid notification fields supplied",
      });
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification updated successfully",
      notification,
    });
  } catch (error) {
    notificationError("updateNotification", error, req);
    return debugErrorResponse(
      res,
      error,
      error?.name === "ValidationError" ? error.message : "Failed to update notification",
      error?.name === "ValidationError" ? 400 : 500
    );
  }
};

/* =========================================================
   ADMIN: DELETE ANY NOTIFICATION
   DELETE /api/notifications/admin/:id
========================================================= */

export const deleteNotificationByAdmin = async (req, res) => {
  try {
    debugNotification("deleteNotificationByAdmin", req);
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const { id } = req.params;

    if (!validateNotificationId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      deletedId: id,
    });
  } catch (error) {
    notificationError("deleteNotificationByAdmin", error, req);
    return debugErrorResponse(res, error, "Failed to delete notification", 500);
  }
};
export const uploadNotificationImage = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Please select an image to upload",
      });
    }

    // Verify actual image contents instead of trusting the MIME type alone.
    const buffer = req.file.buffer;

    const isJpeg =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    const isPng =
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      );

    const isWebp =
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP";

    if (!isJpeg && !isPng && !isWebp) {
      return res.status(400).json({
        success: false,
        message: "The selected file is not a supported image",
      });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "odikart/notifications",
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (!result?.secure_url) {
            reject(new Error("Cloudinary did not return an image URL"));
          } else {
            resolve(result);
          }
        }
      );

      Readable.from([buffer]).pipe(stream);
    });

    return res.status(201).json({
      success: true,
      message: "Notification image uploaded successfully",
      imageUrl: uploadResult.secure_url,
      image: {
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
      },
    });
  } catch (error) {
    console.error("Notification Image Upload Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to upload notification image",
    });
  }
};