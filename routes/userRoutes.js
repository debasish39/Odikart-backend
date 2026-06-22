import express from "express";

import {
  getUsers,
  updateUser,updateUserPassword
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

export default router;