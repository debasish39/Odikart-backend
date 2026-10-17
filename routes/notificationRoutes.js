import express from "express";

import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  updateNotificationSettings,
  sendNotificationToUser,
  registerDevice,
  unregisterDevice,
} from "../controllers/notificationController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/register-device",
  authMiddleware,
  registerDevice
);

router.delete(
  "/unregister-device",
  authMiddleware,
  unregisterDevice
);
/* =========================================================
   CUSTOMER
========================================================= */

router.get(
  "/",
  authMiddleware,
  getMyNotifications
);


router.get(
  "/unread-count",
  authMiddleware,
  getUnreadCount
);


router.patch(
  "/:id/read",
  authMiddleware,
  markAsRead
);


router.patch(
  "/read-all",
  authMiddleware,
  markAllAsRead
);


router.delete(
  "/:id",
  authMiddleware,
  deleteNotification
);


/* =========================================================
   SETTINGS
========================================================= */

router.patch(
  "/settings",
  authMiddleware,
  updateNotificationSettings
);


/* =========================================================
   ADMIN
========================================================= */

router.post(
  "/send",
  authMiddleware,
  sendNotificationToUser
);


export default router;