import User from "../models/User.js";


/* =====================================
   GET SELLER SETTINGS
===================================== */

export const getSellerSettings = async (
  req,
  res
) => {

  try {

    console.log("=================================");
    console.log("⚙️ GET SELLER SETTINGS");
    console.log("Seller:", req.user._id);
    console.log("=================================");


    const seller = await User.findById(
      req.user._id
    ).select(
      "-password -otp -otpExpiry -resetPasswordOTP -resetPasswordOTPExpiry"
    );


    if (!seller) {

      return res.status(404).json({

        success: false,

        message:
          "Seller not found",

      });

    }


    if (seller.role !== "seller") {

      return res.status(403).json({

        success: false,

        message:
          "Seller access only",

      });

    }


    return res.status(200).json({

      success: true,

      settings: {

        /* =========================
           PROFILE
        ========================= */

        profile: {

          firstName:
            seller.firstName || "",

          lastName:
            seller.lastName || "",

          username:
            seller.username || "",

          email:
            seller.email || "",

          phone:
            seller.phone || "",

          image:
            seller.image || "",

        },


        /* =========================
           STORE
        ========================= */

        store:
          seller.sellerInfo?.store || {},


        /* =========================
           BUSINESS
        ========================= */

        business:
          seller.sellerInfo?.business || {},


        /* =========================
           SHIPPING
        ========================= */

        shipping:
          seller.sellerInfo?.shipping || {},


        /* =========================
           NOTIFICATIONS
        ========================= */

        notifications:
          seller.sellerInfo
            ?.notificationSettings || {},


        /* =========================
           SOCIAL
        ========================= */

        socialLinks:
          seller.socialLinks || {},


        /* =========================
           SUBSCRIPTION
        ========================= */

        subscription:
          seller.sellerInfo
            ?.subscription || {},


        /* =========================
           VERIFICATION
        ========================= */

        verification: {

          sellerStatus:
            seller.sellerStatus,

          sellerAppliedAt:
            seller.sellerAppliedAt,

          sellerApprovedAt:
            seller.sellerApprovedAt,

          sellerRejectedAt:
            seller.sellerRejectedAt,

          sellerRejectedReason:
            seller.sellerRejectedReason,

          verification:
            seller.sellerInfo
              ?.verification || {},

        },


        /* =========================
           WALLET
        ========================= */

        wallet:
          seller.sellerInfo?.wallet || {},


        /* =========================
           ANALYTICS
        ========================= */

        analytics:
          seller.sellerInfo?.analytics || {},


        /* =========================
           STORE RATING
        ========================= */

        storeRating:
          seller.sellerInfo?.storeRating || {},


        /* =========================
           BADGES
        ========================= */

        badges:
          seller.sellerInfo?.badges || [],


        /* =========================
           ACCOUNT
        ========================= */

        account: {

          isBlocked:
            seller.isBlocked,

          isDeleted:
            seller.isDeleted,

          lastLogin:
            seller.lastLogin,

          createdAt:
            seller.createdAt,

          updatedAt:
            seller.updatedAt,

        },

      },

    });

  } catch (error) {

    console.error(
      "❌ GET SELLER SETTINGS ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};
/* =====================================
   UPDATE SELLER SETTINGS
===================================== */

export const updateSellerSettings = async (
  req,
  res
) => {

  try {

    const seller =
      await User.findById(
        req.user._id
      );


    if (!seller) {

      return res.status(404).json({

        success: false,

        message:
          "Seller not found",

      });

    }


    if (
      seller.role !== "seller"
    ) {

      return res.status(403).json({

        success: false,

        message:
          "Seller access only",

      });

    }


    const {
      profile,
      store,
      business,
      shipping,
      notifications,
      socialLinks,
    } = req.body;


    /* =====================================
       PROFILE
    ===================================== */

    if (profile) {

      if (
        profile.firstName !== undefined
      ) {

        seller.firstName =
          profile.firstName;

      }


      if (
        profile.lastName !== undefined
      ) {

        seller.lastName =
          profile.lastName;

      }


      if (
        profile.phone !== undefined
      ) {

        seller.phone =
          profile.phone;

      }


      if (
        profile.image !== undefined
      ) {

        seller.image =
          profile.image;

      }

    }


    /* =====================================
       STORE
    ===================================== */

    if (store) {

      const allowedStoreFields = [

        "shopName",

        "description",

        "website",

        "supportEmail",

        "supportPhone",

        "isOpen",

        "vacationMode",

      ];


      allowedStoreFields.forEach(
        (field) => {

          if (
            store[field] !== undefined
          ) {

            seller.sellerInfo.store[field] =
              store[field];

          }

        }
      );

    }


    /* =====================================
       STORE ADDRESS
    ===================================== */

    if (
      store?.address
    ) {

      seller.sellerInfo.store.address = {

        ...seller.sellerInfo.store.address,

        ...store.address,

      };

    }


    /* =====================================
       BUSINESS
    ===================================== */

    if (business) {

      const allowedBusinessFields = [

        "businessType",

        "ownerName",

        "registrationNumber",

      ];


      allowedBusinessFields.forEach(
        (field) => {

          if (
            business[field] !== undefined
          ) {

            seller.sellerInfo.business[field] =
              business[field];

          }

        }
      );

    }


    /* =====================================
       SHIPPING
    ===================================== */

    if (shipping) {

      if (
        shipping.freeShipping !== undefined
      ) {

        seller.sellerInfo.shipping
          .freeShipping =
          Boolean(
            shipping.freeShipping
          );

      }


      if (
        shipping.processingTime !== undefined
      ) {

        seller.sellerInfo.shipping
          .processingTime =
          Number(
            shipping.processingTime
          );

      }


      if (
        shipping.returnDays !== undefined
      ) {

        seller.sellerInfo.shipping
          .returnDays =
          Number(
            shipping.returnDays
          );

      }

    }


    /* =====================================
       NOTIFICATIONS
    ===================================== */

    if (notifications) {

      if (
        notifications.email !== undefined
      ) {

        seller.sellerInfo
          .notificationSettings.email =
          Boolean(
            notifications.email
          );

      }


      if (
        notifications.sms !== undefined
      ) {

        seller.sellerInfo
          .notificationSettings.sms =
          Boolean(
            notifications.sms
          );

      }


      if (
        notifications.push !== undefined
      ) {

        seller.sellerInfo
          .notificationSettings.push =
          Boolean(
            notifications.push
          );

      }

    }


    /* =====================================
       SOCIAL LINKS
    ===================================== */

    if (socialLinks) {

      seller.socialLinks = {

        ...seller.socialLinks,

        ...socialLinks,

      };

    }


    await seller.save();


    return res.status(200).json({

      success: true,

      message:
        "Seller settings updated successfully",

      settings: {

        profile: {

          firstName:
            seller.firstName,

          lastName:
            seller.lastName,

          phone:
            seller.phone,

          image:
            seller.image,

        },

        store:
          seller.sellerInfo.store,

        business:
          seller.sellerInfo.business,

        shipping:
          seller.sellerInfo.shipping,

        notifications:
          seller.sellerInfo
            .notificationSettings,

        socialLinks:
          seller.socialLinks,

      },

    });

  } catch (error) {

    console.error(
      "❌ UPDATE SELLER SETTINGS ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};