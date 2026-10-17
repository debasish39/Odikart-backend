
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import DeviceToken from "../models/DeviceToken.js";

// Change this import if your Firebase Admin file is in a different folder.
import { firebaseMessaging } from "../config/firebaseAdmin.js";

/**
 * Create an in-app website notification.
 * Preserves the existing behavior.
 */
export const createNotification = async ({
  userId,
  type = "system",
  title,
  message,
  orderId = null,
  link = "",
  isPromotional = false,
  createdBy = null,
}) => {
  if (!userId || !title || !message) {
    throw new Error("userId, title and message are required");
  }

  const user = await User.findById(userId).select(
    "notificationSettings isBlocked isDeleted"
  );

  if (
    !user ||
    user.isBlocked ||
    user.isDeleted ||
    user.notificationSettings?.inApp === false
  ) {
    return null;
  }

  return Notification.create({
    userId,
    type,
    title: String(title).trim(),
    message: String(message).trim(),
    orderId,
    link,
    isPromotional,
    createdBy,
  });
};

/**
 * Send a native Android push notification through Firebase Cloud Messaging.
 */
export const sendPushNotification = async ({
  userId,
  title,
  message,
  type = "system",
  orderId = null,
  link = "",
  isPromotional = false,
}) => {
  if (!userId || !title || !message) {
    throw new Error("userId, title and message are required");
  }

  const user = await User.findById(userId).select(
    "notificationSettings isBlocked isDeleted"
  );

  if (!user || user.isBlocked || user.isDeleted) {
    return { sent: 0, skipped: true };
  }

  const settings = user.notificationSettings;

  // Respect the customer's push notification preferences.
  if (settings?.push === false) {
    return { sent: 0, skipped: true };
  }

  // Respect the separate promotional push preference.
  if (isPromotional && settings?.promotionalPush === false) {
    return { sent: 0, skipped: true };
  }

  const devices = await DeviceToken.find({
    userId,
    platform: "android",
  }).select("_id token");

  if (!devices.length) {
    return { sent: 0, skipped: true };
  }

  const results = { sent: 0, failed: 0 };

  // FCM multicast requests support up to 500 tokens.
  for (let i = 0; i < devices.length; i += 500) {
    const batch = devices.slice(i, i + 500);

    try {
      const response = await firebaseMessaging.sendEachForMulticast({
        tokens: batch.map((device) => device.token),

        notification: {
          title: String(title).trim(),
          body: String(message).trim(),
        },

        data: {
          type: String(type),
          orderId: orderId ? String(orderId) : "",
          link: String(link || ""),
          isPromotional: String(Boolean(isPromotional)),
        },

        android: {
          priority: "high",
          notification: {
            channelId: isPromotional ? "offers" : "orders",
            sound: "default",
          },
        },
      });

      results.sent += response.successCount;
      results.failed += response.failureCount;

      // Remove tokens Firebase confirms are no longer valid.
      const invalidTokens = [];

      response.responses.forEach((item, index) => {
        const code = item.error?.code;

        if (
          !item.success &&
          [
            "messaging/invalid-registration-token",
            "messaging/registration-token-not-registered",
          ].includes(code)
        ) {
          invalidTokens.push(batch[index]._id);
        }
      });

      if (invalidTokens.length) {
        await DeviceToken.deleteMany({
          _id: { $in: invalidTokens },
        });
      }
    } catch (error) {
      results.failed += batch.length;
      console.error("FCM batch send failed:", error.message);
    }
  }

  console.log("📱 FCM delivery result:", results);

  return results;
};

/**
 * Create the website notification and attempt Android push delivery.
 * A push failure does not undo the saved website notification.
 */
export const createAndSendNotification = async (options) => {
  const {
    userId,
    type = "system",
    title,
    message,
    orderId = null,
    link = "",
    isPromotional = false,
    createdBy = null,
  } = options;

  const user = await User.findById(userId).select(
    "notificationSettings isBlocked isDeleted"
  );

  if (!user || user.isBlocked || user.isDeleted) {
    return null;
  }

  let notification = null;

  if (user.notificationSettings?.inApp !== false) {
    notification = await Notification.create({
      userId,
      type,
      title: String(title).trim(),
      message: String(message).trim(),
      orderId,
      link,
      isPromotional,
      createdBy,
    });
  }

  try {
    await sendPushNotification({
      userId,
      type,
      title,
      message,
      orderId,
      link,
      isPromotional,
    });
  } catch (error) {
    console.error("Push notification failed:", error.message);
  }

  return notification;
};

/**
 * Helper for order-related notifications.
 */
export const createOrderNotification = async ({
  userId,
  orderId,
  title,
  message,
  link = "",
}) => {
  return createAndSendNotification({
    userId,
    orderId,
    type: "order",
    title,
    message,
    link,
    isPromotional: false,
  });
};
