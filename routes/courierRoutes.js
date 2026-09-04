import express from "express";

import {
  createCourier,
  getCouriers,
  getCourierById,
  updateCourier,
  deleteCourier,
  enableCourier,

  uploadCourierDocuments,
  getCourierVerification,
  verifyCourier,
  rejectCourier,
  resubmitCourierVerification,

  setCourierAvailable,
  setCourierOffline,

  updateCourierLocation,
  startLocationSharing,
  stopLocationSharing,
  getCourierLocation,

  getVerificationQueue,

  suspendCourier,
  reactivateCourier,

  canCourierReceiveOrder,
} from "../controllers/courierController.js";

import {
  authMiddleware,
} from "../middleware/authMiddleware.js";

import authorizeRoles from "../middleware/roleMiddleware.js";

import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

/* =========================================================
   DEBUG MULTER UPLOAD
========================================================= */

const courierUpload = (req, res, next) => {
  console.log("\n");
  console.log("=================================================");
  console.log("[COURIER UPLOAD DEBUG] MULTER START");
  console.log("=================================================");

  console.log("[COURIER UPLOAD DEBUG] Content-Type:");
  console.log(req.headers["content-type"]);

  console.log("[COURIER UPLOAD DEBUG] Content-Length:");
  console.log(req.headers["content-length"]);

  console.log("[COURIER UPLOAD DEBUG] Before Multer body:");
  console.log(req.body);

  console.log("[COURIER UPLOAD DEBUG] Before Multer files:");
  console.log(req.files);

  upload.fields([
    {
      name: "photo",
      maxCount: 1,
    },
    {
      name: "aadhaar",
      maxCount: 1,
    },
    {
      name: "drivingLicense",
      maxCount: 1,
    },
  ])(req, res, (error) => {
    if (error) {
      console.error("\n");
      console.error("=================================================");
      console.error("[COURIER UPLOAD DEBUG] MULTER ERROR");
      console.error("=================================================");

      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
      console.error("Full error:", error);

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Courier file upload failed",
        uploadError: true,
        errorCode: error.code || null,
      });
    }

    console.log("\n");
    console.log("=================================================");
    console.log("[COURIER UPLOAD DEBUG] MULTER COMPLETE");
    console.log("=================================================");

    console.log("[COURIER UPLOAD DEBUG] Body:");
    console.log(req.body);

    console.log("[COURIER UPLOAD DEBUG] Files:");

    if (!req.files) {
      console.log("NO FILE OBJECT");
    } else {
      console.log(
        Object.keys(req.files)
      );

      Object.entries(req.files).forEach(
        ([fieldName, files]) => {
          console.log(
            `\n[COURIER UPLOAD DEBUG] Field: ${fieldName}`
          );

          console.log(
            "Count:",
            files?.length || 0
          );

          files?.forEach((file, index) => {
            console.log(
              `File ${index + 1}:`
            );

            console.log({
              fieldname: file.fieldname,
              originalname: file.originalname,
              encoding: file.encoding,
              mimetype: file.mimetype,
              size: file.size,
              destination: file.destination,
              filename: file.filename,
              path: file.path,
              location: file.location,
              secure_url: file.secure_url,
            });
          });
        }
      );
    }

    console.log("\n");
    console.log(
      "[COURIER UPLOAD DEBUG] Passing request to controller..."
    );

    next();
  });
};

/* =========================================================
   ADMIN COURIER MANAGEMENT
========================================================= */


/* =========================================================
   CREATE COURIER
========================================================= */

router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin"),
  courierUpload,
  createCourier
);


/* =========================================================
   GET ALL COURIERS
========================================================= */

router.get(
  "/",
  authMiddleware,
  authorizeRoles(
    "admin",
    "user",
    "seller"
  ),
  getCouriers
);


/* =========================================================
   VERIFICATION QUEUE
   IMPORTANT:
   THIS MUST COME BEFORE /:id
========================================================= */

router.get(
  "/verification/queue",
  authMiddleware,
  authorizeRoles("admin"),
  getVerificationQueue
);


/* =========================================================
   GET SINGLE COURIER
========================================================= */

router.get(
  "/:id",
  authMiddleware,
  authorizeRoles(
    "admin",
    "user",
    "seller"
  ),
  getCourierById
);


/* =========================================================
   UPDATE COURIER
========================================================= */

router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin"),
  courierUpload,
  updateCourier
);


/* =========================================================
   DISABLE COURIER
========================================================= */

router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin"),
  deleteCourier
);


/* =========================================================
   ENABLE COURIER
========================================================= */

router.put(
  "/:id/enable",
  authMiddleware,
  authorizeRoles("admin"),
  enableCourier
);


/* =========================================================
   VERIFICATION
========================================================= */


/*
  Upload verification documents.

  Fields:

  aadhaar
  drivingLicense

  Cycle:
    Aadhaar required
    Driving Licence NOT required
*/

router.post(
  "/:id/documents",
  authMiddleware,
  authorizeRoles(
    "admin",
    "courier"
  ),
  courierUpload,
  uploadCourierDocuments
);


/*
  Get verification details.
*/

router.get(
  "/:id/verification",
  authMiddleware,
  authorizeRoles("admin"),
  getCourierVerification
);


/*
  Approve courier.
*/

router.put(
  "/:id/verify",
  authMiddleware,
  authorizeRoles("admin"),
  verifyCourier
);


/*
  Reject courier.
*/

router.put(
  "/:id/reject",
  authMiddleware,
  authorizeRoles("admin"),
  rejectCourier
);


/*
  Resubmit verification.
*/

router.put(
  "/:id/resubmit-verification",
  authMiddleware,
  authorizeRoles(
    "admin",
    "courier"
  ),
  courierUpload,
  resubmitCourierVerification
);


/* =========================================================
   COURIER AVAILABILITY
========================================================= */


/*
  Courier goes online.
*/

router.put(
  "/availability/online",
  authMiddleware,
  authorizeRoles("courier"),
  setCourierAvailable
);


/*
  Courier goes offline.
*/

router.put(
  "/availability/offline",
  authMiddleware,
  authorizeRoles("courier"),
  setCourierOffline
);


/* =========================================================
   LIVE LOCATION
========================================================= */


/*
  Update GPS location.

  Body:

  {
    "latitude": 19.3150,
    "longitude": 84.7941
  }
*/

router.put(
  "/location",
  authMiddleware,
  authorizeRoles("courier"),
  updateCourierLocation
);


/*
  Start location sharing.
*/

router.put(
  "/location/start",
  authMiddleware,
  authorizeRoles("courier"),
  startLocationSharing
);


/*
  Stop location sharing.
*/

router.put(
  "/location/stop",
  authMiddleware,
  authorizeRoles("courier"),
  stopLocationSharing
);


/*
  Get courier location.

  Customer / Seller / Admin
*/

router.get(
  "/:courierId/location",
  authMiddleware,
  authorizeRoles(
    "user",
    "seller",
    "admin"
  ),
  getCourierLocation
);


/* =========================================================
   ADMIN COURIER CONTROL
========================================================= */


/*
  Suspend courier.
*/

router.put(
  "/:id/suspend",
  authMiddleware,
  authorizeRoles("admin"),
  suspendCourier
);


/*
  Reactivate courier.
*/

router.put(
  "/:id/reactivate",
  authMiddleware,
  authorizeRoles("admin"),
  reactivateCourier
);


/*
  Check order eligibility.
*/

router.get(
  "/:id/order-eligibility",
  authMiddleware,
  authorizeRoles("admin"),
  canCourierReceiveOrder
);


/* =========================================================
   EXPORT
========================================================= */

export default router;