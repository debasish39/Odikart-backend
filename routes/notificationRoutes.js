
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
} from "../controllers/notificationController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/*
 * IMPORTANT:
 * Mount this router in your server, for example:
 * app.use("/api/notifications", notificationRoutes);
 *
 * The admin CRUD controller functions check req.user.role === "admin".
 * Ensure authMiddleware sets req.user with the role property.
 */

/* =========================================================
   DEVICE REGISTRATION
========================================================= */

router.post("/register-device", authMiddleware, registerDevice);
router.delete("/unregister-device", authMiddleware, unregisterDevice);

/* =========================================================
   ADMIN CRUD
   Admin authorization is checked inside each controller.
========================================================= */

// Create a notification for one customer
router.post("/", authMiddleware, createNotification);

// List all notifications, optionally filtered/paginated
router.get("/admin/all", authMiddleware, getAllNotificationsForAdmin);

// Get one notification by ID
router.get("/admin/:id", authMiddleware, getNotificationById);

// Update notification details
router.patch("/admin/:id", authMiddleware, updateNotification);

// Delete any notification by ID
router.delete("/admin/:id", authMiddleware, deleteNotificationByAdmin);

/* =========================================================
   CUSTOMER NOTIFICATIONS
========================================================= */

router.get("/", authMiddleware, getMyNotifications);
router.get("/unread-count", authMiddleware, getUnreadCount);
router.patch("/read-all", authMiddleware, markAllAsRead);
router.patch("/:id/read", authMiddleware, markAsRead);
router.delete("/:id", authMiddleware, deleteNotification);

/* =========================================================
   CUSTOMER SETTINGS
========================================================= */

router.patch("/settings", authMiddleware, updateNotificationSettings);

/* =========================================================
   ADMIN SEND ACTIONS
========================================================= */

// Send a notification to a specific customer
router.post("/send", authMiddleware, sendNotificationToUser);

// Send a promotion to all eligible customers
router.post("/send-promotion", authMiddleware, sendPromotionToAllCustomers);

export default router;
