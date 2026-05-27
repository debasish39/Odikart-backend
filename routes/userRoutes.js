import express from "express";

import {
  getUsers,
  updateUser,updateUserPassword
} from "../controllers/userController.js";
import { adminGuard } from "../middleware/authMiddleware.js";
const router = express.Router();

/* =====================================
   USER ROUTES
===================================== */

router.get("/", getUsers);
// Update user
router.put(
  "/:id",
  adminGuard,
  updateUser
);
router.put(
  "/:id/password",
  adminGuard,
  updateUserPassword
);
export default router;