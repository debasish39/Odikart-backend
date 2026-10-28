
import User from "../models/User.js";
import { createAndSendNotification } from "./notificationService.js";

/**
 * Notify all admins about an important dashboard event.
 * Notification failures must not break the main business operation.
 */
export const notifyAdmins = async ({
  type = "system",
  title,
  message,
  link = "/admin/notifications",
  orderId = null,
  productId = null,
  couponId = null,
  createdBy = null,
}) => {
  if (!title?.trim() || !message?.trim()) {
    throw new Error("Notification title and message are required");
  }

  const admins = await User.find({ role: "admin" })
    .select("_id")
    .lean();

  const results = await Promise.allSettled(
    admins.map((admin) =>
      createAndSendNotification({
        userId: admin._id,
        type,
        title,
        message,
        link,
        orderId,
        productId,
        couponId,
        isPromotional: false,
        createdBy,
      })
    )
  );

  const summary = {
    totalAdmins: admins.length,
    succeeded: results.filter(
      (result) => result.status === "fulfilled"
    ).length,
    failed: results.filter(
      (result) => result.status === "rejected"
    ).length,
  };

  if (summary.failed > 0) {
    console.error("Some admin notifications failed:", summary);
  }

  return summary;
};

/**
 * Safe wrapper for use after an order or product operation succeeds.
 */
export const notifyAdminsSafely = async (options) => {
  try {
    return await notifyAdmins(options);
  } catch (error) {
    console.error("Admin notification error:", error.message);

    return {
      totalAdmins: 0,
      succeeded: 0,
      failed: 1,
    };
  }
};
