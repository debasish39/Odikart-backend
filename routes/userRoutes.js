import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import {
  getUsers,
  updateUser,
  updateUserPassword,
  deleteUser,
  deleteMyAccount,
  approveSeller,
  rejectSeller,
  getSellerAnalytics,
  getPendingSellers,
  getApprovedSellers,
  getRejectedSellers,
  getSellerDetails,
  suspendSeller,
  reactivateSeller,
  updateSellerCommission,
  updateSellerPlan,
  verifySellerDocuments,
  completeSellerProfile,
  uploadSellerDocuments,

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
router.put(
  "/seller/complete-profile",
  authMiddleware,
  authorizeRoles("seller"),
  completeSellerProfile
);

router.put(
  "/seller/upload-documents",
  authMiddleware,
  authorizeRoles("seller"),
  upload.fields([
    { name: "shopLogo", maxCount: 1 },
    { name: "shopBanner", maxCount: 1 },
    { name: "aadhaarFront", maxCount: 1 },
    { name: "aadhaarBack", maxCount: 1 },
    { name: "panImage", maxCount: 1 },
    { name: "gstCertificate", maxCount: 1 },
    { name: "bankProof", maxCount: 1 }
  ]),
  uploadSellerDocuments
);
router.get("/admin/sellers/pending", authMiddleware, authorizeRoles("admin"), getPendingSellers);

router.get("/admin/sellers/approved", authMiddleware, authorizeRoles("admin"), getApprovedSellers);

router.get("/admin/sellers/rejected", authMiddleware, authorizeRoles("admin"), getRejectedSellers);

router.get("/admin/seller/:id", authMiddleware, authorizeRoles("admin"), getSellerDetails);

router.put("/admin/seller/:id/approve", authMiddleware, authorizeRoles("admin"), approveSeller);

router.put("/admin/seller/:id/reject", authMiddleware, authorizeRoles("admin"), rejectSeller);

router.put("/admin/seller/:id/suspend", authMiddleware, authorizeRoles("admin"), suspendSeller);

router.put("/admin/seller/:id/reactivate", authMiddleware, authorizeRoles("admin"), reactivateSeller);

router.put("/admin/seller/:id/commission", authMiddleware, authorizeRoles("admin"), updateSellerCommission);

router.put("/admin/seller/:id/plan", authMiddleware, authorizeRoles("admin"), updateSellerPlan);

router.put("/admin/seller/:id/verify-documents", authMiddleware, authorizeRoles("admin"), verifySellerDocuments);
/* =====================================
   DELETE MY ACCOUNT
===================================== */
router.delete(
  "/me",
  authMiddleware,
  deleteMyAccount
);
export default router;