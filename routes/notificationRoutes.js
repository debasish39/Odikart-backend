import express from "express";

import {
  // Admin CRUD
  createNotification,
  getAllNotificationsForAdmin,
  getNotificationById,
  updateNotification,
  deleteNotificationByAdmin,

  // Customer notification actions
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  updateNotificationSettings,
  sendNotificationToUser,
  sendPromotionToAllCustomers,
  registerDevice,
  unregisterDevice,
  uploadNotificationImage,
} from "../controllers/notificationController.js";

import {
  uploadNotificationImageMiddleware,
} from "../middleware/notificationImageUpload.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/*
 * Mount in your server:
 * app.use("/api/notifications", router);
 *
 * Admin-only controller actions must validate the user's role.
 * authMiddleware must populate req.user.
 */

/* =========================================================
   DEVICE REGISTRATION
========================================================= */

router.post("/register-device", authMiddleware, registerDevice);
router.delete("/unregister-device", authMiddleware, unregisterDevice);

/* =========================================================
   ADMIN CRUD
========================================================= */

// Create a notification
router.post("/", authMiddleware, createNotification);

// Upload notification image to Cloudinary
router.post(
  "/upload-image",
  authMiddleware,
  uploadNotificationImageMiddleware,
  uploadNotificationImage
);

// List all notifications
router.get("/admin/all", authMiddleware, getAllNotificationsForAdmin);

// Get one notification
router.get("/admin/:id", authMiddleware, getNotificationById);

// Update notification
router.patch("/admin/:id", authMiddleware, updateNotification);

// Delete notification
router.delete("/admin/:id", authMiddleware, deleteNotificationByAdmin);

/* =========================================================
   ADMIN SEND ACTIONS
========================================================= */

router.post("/send", authMiddleware, sendNotificationToUser);

router.post(
  "/send-promotion",
  authMiddleware,
  sendPromotionToAllCustomers
);

/* =========================================================
   CUSTOMER NOTIFICATIONS
========================================================= */

router.get("/unread-count", authMiddleware, getUnreadCount);

router.patch("/read-all", authMiddleware, markAllAsRead);

router.patch("/:id/read", authMiddleware, markAsRead);

router.get("/", authMiddleware, getMyNotifications);

router.delete("/:id", authMiddleware, deleteNotification);

/* =========================================================
   CUSTOMER SETTINGS
========================================================= */

router.patch("/settings", authMiddleware, updateNotificationSettings);

export default router;
