import mongoose from "mongoose";

import Notification from "../models/Notification.js";
import User from "../models/User.js";
import DeviceToken from "../models/DeviceToken.js";
import {
  createAndSendNotification,
  createNotification,
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
   GET MY NOTIFICATIONS
========================================================= */

export const getMyNotifications = async (
  req,
  res
) => {
  try {
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
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const { title, message, link = "/" ,imageUrl="",} = req.body;

    if (
      !String(title || "").trim() ||
      !String(message || "").trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
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

      // Respect the customer's promotional preference for both
      // in-app and push promotions.
      if (settings.promotions === false) {
        result.skipped++;
        continue;
      }

      try {
        if (settings.inApp !== false) {
          const notification = await createNotification({
            userId: customer._id,
            type: "promotion",
            title: String(title).trim(),
            message: String(message).trim(),
            link: String(link).trim(),
            isPromotional: true,
            createdBy: getUserId(req),
          });

          if (notification) {
            result.inAppCreated++;
          }
        }

        const pushResult = await sendPushNotification({
          userId: customer._id,
          type: "promotion",
          title: String(title).trim(),
          message: String(message).trim(),
          link: String(link).trim(),
          isPromotional: true,
          imageUrl,
        });

        result.pushSent += pushResult.sent || 0;
        result.pushFailed += pushResult.failed || 0;

        if (pushResult.skipped) {
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
      ...result,
    });
  } catch (error) {
    console.error("Bulk Promotion Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process promotion",
    });
  }
};

