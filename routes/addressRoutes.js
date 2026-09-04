import express from "express";

import {
  addAddress,
  getMyAddresses,
  updateAddress,
  deleteAddress,
  getUserAddressesForAdmin
} from "../controllers/addressController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
const router =
  express.Router();

router.post(
  "/",
  authMiddleware,
  addAddress,
);

router.get(
  "/",
  authMiddleware,
  getMyAddresses,
);

router.put(
  "/:id",
  authMiddleware,
  updateAddress,
);

router.delete(
  "/:id",
  authMiddleware,
  deleteAddress,
);
router.get(
  "/users/:userId/addresses",
  authMiddleware,
  authorizeRoles("admin"),
  getUserAddressesForAdmin
);
export default router;