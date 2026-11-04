import express from "express";
import multer from "multer";

import {
  getPublicBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  updateBannerStatus,
  reorderBanners,
  deleteBanner,
  trackBannerClick,
  trackBannerImpression,
} from "../controllers/bannerController.js";

// IMPORTANT:
// Replace this import with the actual admin-protection middleware used by
// your existing admin routes. Example only:
// import { protectAdmin } from "../middleware/adminAuth.js";
//
// The middleware must verify the admin JWT and reject non-admin users.
// Do not expose admin routes without this protection.
import { protectAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8 MB per image
    files: 2,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// Public routes
router.get("/", getPublicBanners);
router.post("/:id/click", trackBannerClick);
router.post("/:id/impression", trackBannerImpression);

// Admin routes — all protected
router.get("/admin", protectAdmin, getAllBanners);

router.post(
  "/admin",
  protectAdmin,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "mobileImage", maxCount: 1 },
  ]),
  createBanner
);

router.put(
  "/admin/:id",
  protectAdmin,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "mobileImage", maxCount: 1 },
  ]),
  updateBanner
);

router.patch("/admin/reorder", protectAdmin, reorderBanners);
router.patch("/admin/:id/status", protectAdmin, updateBannerStatus);
router.delete("/admin/:id", protectAdmin, deleteBanner);

export default router;
