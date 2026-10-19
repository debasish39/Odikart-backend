
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import DeviceToken from "../models/DeviceToken.js";
import { firebaseMessaging } from "../config/firebaseAdmin.js";

const MARKETING_TYPES = new Set([
  "promotion",
  "price_drop",
  "wishlist_offer",
  "new_product",
  "flash_sale",
  "coupon",
  "cart_reminder",
  "offer",
  "announcement",
]);

// Maps notification types to optional per-type user settings.
// These settings are respected when present and not false.
const TYPE_PREFERENCES = {
  promotion: "promotions",
  price_drop: "priceDropAlerts",
  wishlist_offer: "wishlistOffers",
  new_product: "newProductAlerts",
  flash_sale: "flashSaleAlerts",
  order_update: "orderUpdates",
  order: "orderUpdates",
  delivery: "orderUpdates",
  coupon: "couponAlerts",
  cart_reminder: "cartReminders",
  wishlist: "wishlistOffers",
};

const ANDROID_CHANNELS = {
  promotion: "offers",
  price_drop: "offers",
  wishlist_offer: "offers",
  new_product: "offers",
  flash_sale: "offers",
  coupon: "offers",
  cart_reminder: "offers",
  offer: "offers",
  announcement: "offers",
  order: "orders",
  order_update: "orders",
  delivery: "orders",
  account: "general",
  system: "general",
  wishlist: "general",
};

const cleanText = (value) => String(value ?? "").trim();

const isMarketingNotification = (type, explicitValue) =>
  Boolean(explicitValue) || MARKETING_TYPES.has(type);

const isPreferenceDisabled = (user, type, isPromotional) => {
  const settings = user.notificationSettings || {};

  if (settings.push === false) return true;

  if (
    isPromotional &&
    settings.promotionalPush === false
  ) {
    return true;
  }

  const preference = TYPE_PREFERENCES[type];

  if (preference && settings[preference] === false) {
    return true;
  }

  return false;
};

const getActiveUser = async (userId) => {
  if (!userId) return null;

  return User.findById(userId).select(
    "notificationSettings isBlocked isDeleted"
  );
};

const isEligibleUser = (user) =>
  Boolean(user && !user.isBlocked && !user.isDeleted);

const createNotificationRecord = async ({
  userId,
  type,
  title,
  message,
  orderId = null,
  productId = null,
  couponId = null,
  link = "",
  isPromotional,
  createdBy = null,
}) => {
  return Notification.create({
    userId,
    type,
    title: cleanText(title),
    message: cleanText(message),
    orderId,
    productId,
    couponId,
    link: cleanText(link),
    isPromotional,
    createdBy,
  });
};

/**
 * Create an in-app notification only.
 */
export const createNotification = async ({
  userId,
  type = "system",
  title,
  message,
  orderId = null,
  productId = null,
  couponId = null,
  link = "",
  isPromotional = false,
  createdBy = null,
}) => {
  if (!userId || !cleanText(title) || !cleanText(message)) {
    throw new Error("userId, title and message are required");
  }

  const user = await getActiveUser(userId);

  if (
    !isEligibleUser(user) ||
    user.notificationSettings?.inApp === false
  ) {
    return null;
  }

  const promotional = isMarketingNotification(type, isPromotional);

  return createNotificationRecord({
    userId,
    type,
    title,
    message,
    orderId,
    productId,
    couponId,
    link,
    isPromotional: promotional,
    createdBy,
  });
};

/**
 * Send native Android push through Firebase Cloud Messaging.
 */
export const sendPushNotification = async ({
  userId,
  title,
  message,
  type = "system",
  orderId = null,
  productId = null,
  couponId = null,
  link = "",
  isPromotional = false,
  imageUrl = "",

}) => {
  if (!userId || !cleanText(title) || !cleanText(message)) {
    throw new Error("userId, title and message are required");
  }

  const user = await getActiveUser(userId);

  if (!isEligibleUser(user)) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const promotional = isMarketingNotification(type, isPromotional);

  if (isPreferenceDisabled(user, type, promotional)) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const devices = await DeviceToken.find({
    userId,
    platform: "android",
  }).select("_id token");

  if (!devices.length) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const results = { sent: 0, failed: 0 };

  for (let i = 0; i < devices.length; i += 500) {
    const batch = devices.slice(i, i + 500);

    try {
      const response =
        await firebaseMessaging.sendEachForMulticast({
          tokens: batch.map((device) => device.token),
notification: {
  title: cleanText(title),
  body: cleanText(message),
  ...(typeof imageUrl === "string" &&
  /^https:\/\/\S+$/i.test(imageUrl.trim())
    ? { imageUrl: imageUrl.trim() }
    : {}),
},
          data: {
            type: String(type),
            orderId: orderId ? String(orderId) : "",
            productId: productId ? String(productId) : "",
            couponId: couponId ? String(couponId) : "",
            link: cleanText(link),
            isPromotional: String(promotional),
          },

          android: {
            priority: "high",
            notification: {
              channelId: ANDROID_CHANNELS[type] || "general",
              sound: "default",
            },
          },
        });

      results.sent += response.successCount;
      results.failed += response.failureCount;

      const invalidTokenIds = [];

      response.responses.forEach((item, index) => {
        const code = item.error?.code;

        if (
          !item.success &&
          [
            "messaging/invalid-registration-token",
            "messaging/registration-token-not-registered",
          ].includes(code)
        ) {
          invalidTokenIds.push(batch[index]._id);
        }
      });

      if (invalidTokenIds.length) {
        await DeviceToken.deleteMany({
          _id: { $in: invalidTokenIds },
        });
      }
    } catch (error) {
      results.failed += batch.length;
      console.error("FCM batch send failed:", error.message);
    }
  }

  console.log("📱 FCM delivery result:", {
    type,
    ...results,
  });

  return results;
};

/**
 * Create the in-app notification and attempt push delivery.
 * Push failures do not remove the saved in-app notification.
 */
export const createAndSendNotification = async (options) => {
  const {
    userId,
    type = "system",
    title,
    message,
    orderId = null,
    productId = null,
    couponId = null,
    link = "",
    isPromotional = false,
    createdBy = null,
    imageUrl = "",
  } = options;

  if (!userId || !cleanText(title) || !cleanText(message)) {
    throw new Error("userId, title and message are required");
  }

  const user = await getActiveUser(userId);

  if (!isEligibleUser(user)) {
    return null;
  }

  const promotional = isMarketingNotification(type, isPromotional);

  let notification = null;

  if (user.notificationSettings?.inApp !== false) {
    notification = await createNotificationRecord({
      userId,
      type,
      title,
      message,
      orderId,
      productId,
      couponId,
      link,
      isPromotional: promotional,
      createdBy,
    });
  }

  try {
    await sendPushNotification({
      userId,
      title,
      message,
      type,
      orderId,
      productId,
      couponId,
      link,
      isPromotional: promotional,
      imageUrl,
    });
  } catch (error) {
    console.error("Push notification failed:", error.message);
  }

  return notification;
};

/**
 * Backward-compatible helper for existing order notifications.
 * Keeps type "order" so existing frontend filters continue to work.
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
