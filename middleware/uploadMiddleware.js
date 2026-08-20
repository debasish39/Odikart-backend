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
params: async (req, file) => {

  // ==========================
  // PRODUCT IMAGES
  // ==========================

  if (
    file.fieldname === "images" ||
    file.fieldname === "image"
  ) {

    return {
      folder: "eshop/products/images",
      resource_type: "image",
      allowed_formats: ["jpg","jpeg","png","webp"]
    };

  }

  // ==========================
  // PRODUCT VIDEOS
  // ==========================

  if(file.fieldname==="videos"){

    return{

      folder:"eshop/products/videos",

      resource_type:"video",

      allowed_formats:[
        "mp4",
        "mov",
        "webm"
      ]

    }

  }

  // ==========================
  // PROFILE IMAGE
  // ==========================

  if(file.fieldname==="profile"){

    return{

      folder:"eshop/profile",

      resource_type:"image"

    }

  }

  // ==========================
  // SHOP LOGO
  // ==========================

  if(file.fieldname==="shopLogo"){

    return{

      folder:"eshop/seller/shopLogo",

      resource_type:"image"

    }

  }

  // ==========================
  // SHOP BANNER
  // ==========================

  if(file.fieldname==="shopBanner"){

    return{

      folder:"eshop/seller/shopBanner",

      resource_type:"image"

    }

  }

  // ==========================
  // AADHAAR
  // ==========================

  if(
      file.fieldname==="aadhaarFront" ||
      file.fieldname==="aadhaarBack"
  ){

    return{

      folder:"eshop/seller/kyc/aadhaar",

      resource_type:"image"

    }

  }

  // ==========================
  // PAN
  // ==========================

  if(file.fieldname==="panImage"){

    return{

      folder:"eshop/seller/kyc/pan",

      resource_type:"image"

    }

  }

  // ==========================
  // GST
  // ==========================

  if(file.fieldname==="gstCertificate"){

    return{

      folder:"eshop/seller/kyc/gst",

      resource_type:"image"

    }

  }

  // ==========================
  // BANK
  // ==========================

  if(file.fieldname==="bankProof"){

    return{

      folder:"eshop/seller/kyc/bank",

      resource_type:"image"

    }

  }

  return{

    folder:"eshop/misc",

    resource_type:"auto"

  }

}
   
  
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

