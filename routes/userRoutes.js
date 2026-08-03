import express from "express";

import {
  getUsers,
  updateUser,
  updateUserPassword,
  deleteUser,
  deleteMyAccount,
} from "../controllers/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
const router = express.Router();

/* =====================================
   USER ROUTES
===================================== */

router.get(

  "/users",

authMiddleware,
  authorizeRoles("admin"),

  getUsers

);

// Update user
router.put(
  "/user/:id",
  authMiddleware,
  updateUser
);
router.put(
  "/:id/password",
  authMiddleware,
  updateUserPassword
);
/* =====================================
   DELETE USER (ADMIN)
===================================== */
router.delete(
  "/user/:id",
  authMiddleware,
  authorizeRoles("admin"),
  deleteUser
);

/* =====================================
   DELETE MY ACCOUNT
===================================== */
router.delete(
  "/me",
  authMiddleware,
  deleteMyAccount
);
export default router;