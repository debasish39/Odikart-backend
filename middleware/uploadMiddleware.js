import multer from "multer";

import cloudinary from "../config/cloudinary.js";

import {
  CloudinaryStorage,
} from "multer-storage-cloudinary";

/* =====================================
   STORAGE
===================================== */

const storage =
  new CloudinaryStorage({

    cloudinary,

    params: async (
      req,
      file
    ) => {

      /* =====================================
         IMAGE
      ===================================== */

      if (
        file.fieldname === "images" ||

        file.fieldname === "image"
      ) {

        return {

          folder:
            "eshop/reviews/images",

          resource_type:
            "image",

          allowed_formats: [
            "jpg",
            "jpeg",
            "png",
            "webp",
          ],

          transformation: [
            {
              width: 800,
              height: 800,
              crop: "limit",
              quality: "auto",
            },
          ],
        };
      }

      /* =====================================
         VIDEO
      ===================================== */

      if (
        file.fieldname === "videos"
      ) {

        return {

          folder:
            "eshop/reviews/videos",

          resource_type:
            "video",

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

      return {

        folder:
          "eshop/profile",

        resource_type:
          "image",

        allowed_formats: [
          "jpg",
          "jpeg",
          "png",
          "webp",
        ],
      };
    },
  });

/* =====================================
   MULTER
===================================== */

const upload =
  multer({

    storage,

    limits: {

      fileSize:
        50 * 1024 * 1024,

    },

  });

export default upload;

