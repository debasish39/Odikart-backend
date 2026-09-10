import Notification from "../models/Notification.js";
import User from "../models/User.js";

/**
 * Create an in-app website notification.
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

  console.log("🔥 CREATE NOTIFICATION CALLED", {
    userId,
    title,
    message,
    orderId,
  });

  // Find customer
  const user = await User.findById(userId).select(
    "notificationSettings isBlocked isDeleted"
  );

  console.log("👤 NOTIFICATION USER:", user);

  if (!user) {
    console.log("❌ NOTIFICATION FAILED: USER NOT FOUND", userId);
    return null;
  }

  if (user.isBlocked) {
    console.log("❌ NOTIFICATION BLOCKED: USER IS BLOCKED", userId);
    return null;
  }

  if (user.isDeleted) {
    console.log("❌ NOTIFICATION BLOCKED: USER IS DELETED", userId);
    return null;
  }

  console.log(
    "⚙️ NOTIFICATION SETTINGS:",
    user.notificationSettings
  );

  // Website / in-app notification preference
  if (user.notificationSettings?.inApp === false) {
    console.log(
      "🔕 IN-APP NOTIFICATION DISABLED FOR USER:",
      userId
    );

    return null;
  }

  console.log("🔥 ABOUT TO CREATE MONGODB NOTIFICATION");

  const notification = await Notification.create({
    userId,
    type,
    title: String(title).trim(),
    message: String(message).trim(),
    orderId,
    link,
    isPromotional,
    createdBy,
  });

  console.log(
    "✅ MONGODB NOTIFICATION CREATED:",
    notification._id
  );

  return notification;
};

/**
 * Helper for order-related website notifications.
 */
export const createOrderNotification = async ({
  userId,
  orderId,
  title,
  message,
  link = "",
}) => {
  console.log("📦 CREATE ORDER NOTIFICATION", {
    userId,
    orderId,
    title,
    message,
    link,
  });

  return createNotification({
    userId,
    orderId,
    type: "order",
    title,
    message,
    link,
    isPromotional: false,
  });
};