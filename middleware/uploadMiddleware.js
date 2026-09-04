import multer from "multer";
import cloudinary from "../config/cloudinary.js";

import {
  CloudinaryStorage,
} from "multer-storage-cloudinary";

/* =====================================
   CLOUDINARY STORAGE
===================================== */

const storage = new CloudinaryStorage({
  cloudinary,

  params: async (req, file) => {

    /* =====================================
       PRODUCT IMAGES
    ===================================== */

    if (
      file.fieldname === "images" ||
      file.fieldname === "image"
    ) {
      return {
        folder: "eshop/products/images",
        resource_type: "image",
        allowed_formats: [
          "jpg",
          "jpeg",
          "png",
          "webp",
        ],
      };
    }


    /* =====================================
       PRODUCT VIDEOS
    ===================================== */

    if (file.fieldname === "videos") {
      return {
        folder: "eshop/products/videos",
        resource_type: "video",
        allowed_formats: [
          "mp4",
          "mov",
          "webm",
        ],
      };
    }


    /* =====================================
       PROFILE IMAGE
    ===================================== */

    if (file.fieldname === "profile") {
      return {
        folder: "eshop/profile",
        resource_type: "image",
        allowed_formats: [
          "jpg",
          "jpeg",
          "png",
          "webp",
        ],
      };
    }


    /* =====================================
       SELLER SHOP LOGO
    ===================================== */

    if (file.fieldname === "shopLogo") {
      return {
        folder: "eshop/seller/shopLogo",
        resource_type: "image",
        allowed_formats: [
          "jpg",
          "jpeg",
          "png",
          "webp",
        ],
      };
    }


    /* =====================================
       SELLER SHOP BANNER
    ===================================== */

    if (file.fieldname === "shopBanner") {
      return {
        folder: "eshop/seller/shopBanner",
        resource_type: "image",
        allowed_formats: [
          "jpg",
          "jpeg",
          "png",
          "webp",
        ],
      };
    }


    /* =====================================
       SELLER AADHAAR
    ===================================== */

    if (
      file.fieldname === "aadhaarFront" ||
      file.fieldname === "aadhaarBack"
    ) {
      return {
        folder: "eshop/seller/kyc/aadhaar",
        resource_type: "image",
        allowed_formats: [
          "jpg",
          "jpeg",
          "png",
          "webp",
        ],
      };
    }


    /* =====================================
       SELLER PAN
    ===================================== */

    if (file.fieldname === "panImage") {
      return {
        folder: "eshop/seller/kyc/pan",
        resource_type: "image",
        allowed_formats: [
          "jpg",
          "jpeg",
          "png",
          "webp",
        ],
      };
    }


    /* =====================================
       SELLER GST
    ===================================== */

    if (file.fieldname === "gstCertificate") {
      return {
        folder: "eshop/seller/kyc/gst",
        resource_type: "image",
        allowed_formats: [
          "jpg",
          "jpeg",
          "png",
          "webp",
        ],
      };
    }


    /* =====================================
       SELLER BANK PROOF
    ===================================== */

    if (file.fieldname === "bankProof") {
      return {
        folder: "eshop/seller/kyc/bank",
        resource_type: "image",
        allowed_formats: [
          "jpg",
          "jpeg",
          "png",
          "webp",
        ],
      };
    }


    /* =====================================
       COURIER AADHAAR
    ===================================== */

    if (file.fieldname === "aadhaar") {
      return {
        folder: "eshop/courier/kyc/aadhaar",
        resource_type: "image",
        allowed_formats: [
          "jpg",
          "jpeg",
          "png",
          "webp",
        ],
      };
    }


    /* =====================================
       COURIER DRIVING LICENCE
    ===================================== */

    if (file.fieldname === "drivingLicense") {
      return {
        folder: "eshop/courier/kyc/driving-license",
        resource_type: "image",
        allowed_formats: [
          "jpg",
          "jpeg",
          "png",
          "webp",
        ],
      };
    }


    /* =====================================
       DEFAULT / MISC FILE
    ===================================== */

    return {
      folder: "eshop/misc",
      resource_type: "auto",
    };
  },
});


/* =====================================
   MULTER CONFIGURATION
===================================== */

const upload = multer({

  storage,

  limits: {
    fileSize: 50 * 1024 * 1024,
  },

});


/* =====================================
   EXPORT
===================================== */

export default upload;