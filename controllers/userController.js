import User from "../models/User.js";
import bcrypt from "bcryptjs";

/* =========================================================
   CONSTANTS
========================================================= */

const SELLER_STATUSES = ["pending", "approved", "rejected", "suspended"];

const VERIFICATION_STATUSES = ["pending", "approved", "rejected"];

const SELLER_PLANS = ["Free", "Basic", "Pro", "Enterprise"];

/* =========================================================
   HELPERS
========================================================= */

const isAdmin = (req) => {
  return req.user?.role === "admin";
};

const isSeller = (user) => {
  return user?.role === "seller";
};

const isAccountInactive = (user) => {
  return Boolean(user?.isBlocked || user?.isDeleted);
};

/* =========================================================
   SAFE USER RESPONSE
========================================================= */

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    phone: user.phone || "",
    image: user.image || "",
    provider: user.provider || "credentials",
    role: user.role,
    sellerStatus: user.sellerStatus || null,

    isVerified: Boolean(user.isVerified),

    isEmailVerified: Boolean(user.isEmailVerified),

    isPhoneVerified: Boolean(user.isPhoneVerified),

    isBlocked: Boolean(user.isBlocked),

    isDeleted: Boolean(user.isDeleted),

    createdAt: user.createdAt,

    updatedAt: user.updatedAt,
  };
};

/* =========================================================
   SELLER KYC CHECK
========================================================= */

const checkRequiredSellerDocuments = (seller) => {
  const kyc = seller?.sellerInfo?.kyc;

  const hasAadhaar = Boolean(
    kyc?.aadhaar?.frontImage && kyc?.aadhaar?.backImage,
  );

  const hasPan = Boolean(kyc?.pan?.image);

  const hasBankProof = Boolean(kyc?.bankProof?.image);

  /*
    GST is optional here.

    If GST must be mandatory for
    your marketplace, change this
    accordingly.
  */

  return {
    hasAadhaar,
    hasPan,
    hasBankProof,

    complete: hasAadhaar && hasPan && hasBankProof,
  };
};

/* =========================================================
   VALIDATE SELLER
========================================================= */

const validateSellerForAction = (seller) => {
  if (!seller) {
    return {
      valid: false,
      status: 404,
      message: "Seller not found",
    };
  }

  if (!isSeller(seller)) {
    return {
      valid: false,
      status: 403,
      message: "Seller access only",
    };
  }

  if (seller.isDeleted) {
    return {
      valid: false,
      status: 403,
      message: "Seller account has been deleted",
    };
  }

  if (seller.isBlocked) {
    return {
      valid: false,
      status: 403,
      message: "Seller account is blocked",
    };
  }

  return {
    valid: true,
  };
};

/* =========================================================
   VALIDATE REASON
========================================================= */

const validateReason = (reason, fieldName = "Reason") => {
  if (typeof reason !== "string") {
    return false;
  }

  const value = reason.trim();

  return value.length >= 5 && value.length <= 1000;
};

/* =========================================================
   GET ALL USERS
========================================================= */

export const getUsers = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const requestedPage = Number(req.query.page);

    const page =
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

    const limit = 20;

    const skip = (page - 1) * limit;

    const users = await User.find({
      isDeleted: false,
    })
      .select(
        "-password " +
          "-otp " +
          "-otpExpiry " +
          "-resetPasswordOTP " +
          "-resetPasswordOTPExpiry " +
          "-sellerInfo.kyc",
      )
      .skip(skip)
      .limit(limit)
      .sort({
        createdAt: -1,
      })
      .lean();

    const totalUsers = await User.countDocuments({
      isDeleted: false,
    });

    return res.status(200).json({
      success: true,
      page,
      count: users.length,
      totalUsers,
      users,
    });
  } catch (error) {
    console.error("Get Users Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch users",
    });
  }
};

/* =========================================================
   UPDATE USER
========================================================= */

export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const { firstName, lastName, phone, image, role } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "User account is deleted",
      });
    }

    /* =====================================================
       BASIC USER FIELDS
    ===================================================== */

    if (firstName !== undefined) {
      if (
        typeof firstName !== "string" ||
        firstName.trim().length < 2 ||
        firstName.trim().length > 50
      ) {
        return res.status(400).json({
          success: false,
          message: "First name must be between 2 and 50 characters",
        });
      }

      user.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      if (
        typeof lastName !== "string" ||
        lastName.trim().length < 2 ||
        lastName.trim().length > 50
      ) {
        return res.status(400).json({
          success: false,
          message: "Last name must be between 2 and 50 characters",
        });
      }

      user.lastName = lastName.trim();
    }

    if (phone !== undefined) {
      if (
        typeof phone !== "string" ||
        phone.trim().length < 7 ||
        phone.trim().length > 20
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number",
        });
      }

      user.phone = phone.trim();
    }

    if (image !== undefined) {
      if (typeof image !== "string" || image.length > 2000) {
        return res.status(400).json({
          success: false,
          message: "Invalid profile image",
        });
      }

      user.image = image.trim();
    }

    /* =====================================================
       ROLE
       ONLY ADMIN
    ===================================================== */

    if (role !== undefined) {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message: "Only admin can change user role",
        });
      }

      const allowedRoles = ["user", "seller", "admin"];

      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user role",
        });
      }

      /*
        Prevent accidental
        admin privilege escalation.
      */

      if (role === "admin" && user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin role cannot be assigned through this endpoint",
        });
      }

      user.role = role;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Update User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update user",
    });
  }
};

/* =========================================================
   UPDATE USER PASSWORD
========================================================= */

export const updateUserPassword = async (req, res) => {
  try {
    const userId = req.params.id;

    const { password } = req.body;

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 128 characters",
      });
    }

    /*
        This endpoint should be protected
        by an admin-only route if an admin
        is changing another user's password.
      */

    if (!isAdmin(req) && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to change this password",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "User account is deleted",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    user.password = hashedPassword;

    /*
        Clear password-reset
        state after password change.
      */

    user.resetPasswordOTP = null;

    user.resetPasswordOTPExpiry = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Password Update Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update password",
    });
  }
};

/* =========================================================
   DELETE USER - ADMIN SOFT DELETE
========================================================= */

export const deleteUser = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const userId = req.params.id;

    if (String(req.user.id) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /*
        Soft delete.

        Do NOT physically delete users
        because orders, reviews, products,
        transactions and payments may
        reference this account.
      */

    user.isDeleted = true;
    user.deletedAt = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User account deactivated successfully",
    });
  } catch (error) {
    console.error("Delete User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete user",
    });
  }
};

/* =========================================================
   DELETE MY ACCOUNT
========================================================= */

export const deleteMyAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Account is already deactivated",
      });
    }

    user.isDeleted = true;

    user.deletedAt = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Your account has been deactivated successfully",
    });
  } catch (error) {
    console.error("Delete My Account Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to deactivate account",
    });
  }
};

/* =========================================================
   GET PENDING SELLERS
========================================================= */

export const getPendingSellers = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

 const sellers = await User.find({
  sellerStatus: "pending",
  isDeleted: false,
})
  .select(
    "-password " +
    "-otp " +
    "-otpExpiry " +
    "-resetPasswordOTP " +
    "-resetPasswordOTPExpiry"
  )
  .sort({
    sellerAppliedAt: -1,
  });
    return res.json({
      success: true,
      sellers,
    });
  } catch (error) {
    console.error("Get Pending Sellers Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch pending sellers",
    });
  }
};

/* =========================================================
   GET APPROVED SELLERS
========================================================= */

export const getApprovedSellers = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const sellers = await User.find({
      role: "seller",
      sellerStatus: "approved",
      isDeleted: false,
    })
      .select(
        "-password " +
          "-otp " +
          "-otpExpiry " +
          "-resetPasswordOTP " +
          "-resetPasswordOTPExpiry",
      )
      .sort({
        sellerApprovedAt: -1,
      });

    return res.json({
      success: true,
      sellers,
    });
  } catch (error) {
    console.error("Get Approved Sellers Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch approved sellers",
    });
  }
};

/* =========================================================
   GET REJECTED SELLERS
========================================================= */

export const getRejectedSellers = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const sellers = await User.find({
      role: "seller",
      sellerStatus: "rejected",
      isDeleted: false,
    })
      .select(
        "-password " +
          "-otp " +
          "-otpExpiry " +
          "-resetPasswordOTP " +
          "-resetPasswordOTPExpiry",
      )
      .sort({
        sellerRejectedAt: -1,
      });

    return res.json({
      success: true,
      sellers,
    });
  } catch (error) {
    console.error("Get Rejected Sellers Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch rejected sellers",
    });
  }
};

/* =========================================================
   GET SELLER DETAILS
========================================================= */

export const getSellerDetails = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const seller = await User.findById(req.params.id).select(
      "_id " +
        "firstName " +
        "lastName " +
        "email " +
        "phone " +
        "image " +
        "role " +
        "sellerStatus " +
        "sellerAppliedAt " +
        "sellerApprovedAt " +
        "sellerRejectedAt " +
        "sellerRejectedReason " +
        "sellerInfo.store " +
        "sellerInfo.business " +
        "sellerInfo.verification " +
        "sellerInfo.kyc",
    );

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    if (seller.role !== "seller") {
      return res.status(400).json({
        success: false,
        message: "User is not a seller",
      });
    }

    return res.json({
      success: true,
      seller,
    });
  } catch (error) {
    console.error("Get Seller Details Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch seller details",
    });
  }
};
/* =========================================================
   APPLY TO BECOME SELLER
========================================================= */

export const applySeller = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* =====================================
       ACCOUNT CHECKS
    ===================================== */

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "Deleted account cannot become a seller",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Blocked account cannot become a seller",
      });
    }

    /* =====================================
       ALREADY SELLER
    ===================================== */

    if (user.role === "seller" && user.sellerStatus === "approved") {
      return res.status(400).json({
        success: false,
        message: "You already have an approved seller account",
      });
    }

    /* =====================================
       APPLICATION ALREADY PENDING
    ===================================== */

    if (user.sellerStatus === "pending") {
      return res.status(400).json({
        success: false,
        message: "Your seller application is already under review",
      });
    }

    /* =====================================
       SUSPENDED SELLER
    ===================================== */

    if (user.sellerStatus === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Your seller account is suspended. Please contact support.",
      });
    }

    /* =====================================
       SELLER INFORMATION
    ===================================== */

    const { store = {}, business = {} } = req.body;

    /* =====================================
       BASIC VALIDATION
    ===================================== */

    const shopName = String(store.shopName || "").trim();

    if (!shopName) {
      return res.status(400).json({
        success: false,
        message: "Shop name is required",
      });
    }

    if (shopName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Shop name must be at least 2 characters",
      });
    }

    /* =====================================
       CREATE / UPDATE SELLER PROFILE
    ===================================== */

    if (!user.sellerInfo) {
      user.sellerInfo = {};
    }

    if (!user.sellerInfo.store) {
      user.sellerInfo.store = {};
    }

    if (!user.sellerInfo.business) {
      user.sellerInfo.business = {};
    }

    if (!user.sellerInfo.verification) {
      user.sellerInfo.verification = {};
    }

    /* STORE */

    user.sellerInfo.store.shopName = shopName;

    if (store.description !== undefined) {
      user.sellerInfo.store.description = String(store.description).trim();
    }

    if (store.website !== undefined) {
      user.sellerInfo.store.website = String(store.website).trim();
    }

    if (store.supportEmail !== undefined) {
      user.sellerInfo.store.supportEmail = String(store.supportEmail).trim();
    }

    if (store.supportPhone !== undefined) {
      user.sellerInfo.store.supportPhone = String(store.supportPhone).trim();
    }

    /* BUSINESS */

    if (business.businessType !== undefined) {
      user.sellerInfo.business.businessType = business.businessType;
    }

    if (business.ownerName !== undefined) {
      user.sellerInfo.business.ownerName = String(business.ownerName).trim();
    }

    if (business.registrationNumber !== undefined) {
      user.sellerInfo.business.registrationNumber = String(
        business.registrationNumber,
      ).trim();
    }

    /* =====================================
       SELLER APPLICATION
    ===================================== */

    user.sellerStatus = "pending";

    user.sellerAppliedAt = new Date();

    user.sellerApprovedAt = null;

    user.sellerRejectedAt = null;

    user.sellerRejectedReason = "";

    user.sellerInfo.verification.status = "pending";

    /* =====================================
       APPROVAL HISTORY
    ===================================== */

    if (!user.sellerInfo.approvalHistory) {
      user.sellerInfo.approvalHistory = [];
    }

    user.sellerInfo.approvalHistory.push({
      action: "applied",

      reason: "Seller application submitted",

      performedBy: user._id,

      date: new Date(),
    });

    await user.save();

    /* =====================================
       RESPONSE
    ===================================== */

    return res.status(201).json({
      success: true,

      message:
        "Seller application submitted successfully. Waiting for admin approval.",

      sellerStatus: user.sellerStatus,

      sellerAppliedAt: user.sellerAppliedAt,

      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Apply Seller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit seller application",
    });
  }
};
/* =========================================================
   COMPLETE SELLER PROFILE
========================================================= */

export const completeSellerProfile = async (req, res) => {
  try {
    const seller = await User.findById(req.user.id);

    const validation = validateSellerForAction(seller);

    if (!validation.valid) {
      return res.status(validation.status).json({
        success: false,
        message: validation.message,
      });
    }

    const store = req.body.store || {};

    const business = req.body.business || {};

    /* =====================================================
         STORE WHITELIST
      ===================================================== */

    const allowedStoreFields = [
      "shopName",
      "description",
      "website",
      "supportEmail",
      "supportPhone",
      "isOpen",
      "vacationMode",
    ];

    for (const field of allowedStoreFields) {
      if (store[field] !== undefined) {
        seller.sellerInfo.store[field] = store[field];
      }
    }

    /* =====================================================
         BUSINESS WHITELIST
      ===================================================== */

    const allowedBusinessFields = [
      "businessType",
      "ownerName",
      "registrationNumber",
    ];

    for (const field of allowedBusinessFields) {
      if (business[field] !== undefined) {
        seller.sellerInfo.business[field] = business[field];
      }
    }

    await seller.save();

    return res.status(200).json({
      success: true,
      message: "Seller profile completed successfully",
    });
  } catch (error) {
    console.error("Complete Seller Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to complete seller profile",
    });
  }
};

/* =========================================================
   UPLOAD SELLER DOCUMENTS
========================================================= */

export const uploadSellerDocuments = async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* =====================================
       ACCOUNT CHECK
    ===================================== */

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "Deleted account cannot upload seller documents",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Blocked account cannot upload seller documents",
      });
    }


    /* =====================================
       SELLER APPLICATION CHECK
    ===================================== */

    // A normal user is allowed to upload
    // documents only after applying.

    if (
      user.role === "user" &&
      !["pending", "rejected"].includes(user.sellerStatus)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Please apply to become a seller before uploading documents",
      });
    }


    // Already approved seller can optionally
    // re-upload documents.

    if (
      user.role === "seller" &&
      !["approved", "rejected", "pending"].includes(
        user.sellerStatus
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Seller account is not eligible for document upload",
      });
    }


    /* =====================================
       MAKE SURE KYC OBJECTS EXIST
    ===================================== */

    if (!user.sellerInfo) {
      user.sellerInfo = {};
    }

    if (!user.sellerInfo.store) {
      user.sellerInfo.store = {};
    }

    if (!user.sellerInfo.kyc) {
      user.sellerInfo.kyc = {};
    }

    if (!user.sellerInfo.kyc.aadhaar) {
      user.sellerInfo.kyc.aadhaar = {};
    }

    if (!user.sellerInfo.kyc.pan) {
      user.sellerInfo.kyc.pan = {};
    }

    if (!user.sellerInfo.kyc.gst) {
      user.sellerInfo.kyc.gst = {};
    }

    if (!user.sellerInfo.kyc.bankProof) {
      user.sellerInfo.kyc.bankProof = {};
    }

    if (!user.sellerInfo.verification) {
      user.sellerInfo.verification = {};
    }


    /* =====================================
       FILES
    ===================================== */

    const files = req.files || {};


    /* =====================================
       STORE LOGO
    ===================================== */

    if (files.shopLogo?.[0]) {

      user.sellerInfo.store.shopLogo =
        files.shopLogo[0].path;

    }


    /* =====================================
       STORE BANNER
    ===================================== */

    if (files.shopBanner?.[0]) {

      user.sellerInfo.store.shopBanner =
        files.shopBanner[0].path;

    }


    /* =====================================
       AADHAAR FRONT
    ===================================== */

    if (files.aadhaarFront?.[0]) {

      user.sellerInfo.kyc.aadhaar.frontImage =
        files.aadhaarFront[0].path;

    }


    /* =====================================
       AADHAAR BACK
    ===================================== */

    if (files.aadhaarBack?.[0]) {

      user.sellerInfo.kyc.aadhaar.backImage =
        files.aadhaarBack[0].path;

    }


    /* =====================================
       PAN
    ===================================== */

    if (files.panImage?.[0]) {

      user.sellerInfo.kyc.pan.image =
        files.panImage[0].path;

    }


    /* =====================================
       GST
    ===================================== */

    if (files.gstCertificate?.[0]) {

      user.sellerInfo.kyc.gst.certificate =
        files.gstCertificate[0].path;

    }


    /* =====================================
       BANK PROOF
    ===================================== */

    if (files.bankProof?.[0]) {

      user.sellerInfo.kyc.bankProof.image =
        files.bankProof[0].path;

    }


    /* =====================================
       CHECK REQUIRED DOCUMENTS
    ===================================== */

    const documents =
      checkRequiredSellerDocuments(user);


    if (!documents.complete) {

      return res.status(400).json({
        success: false,
        message:
          "Aadhaar front, Aadhaar back, PAN and bank proof are required",
        documents,
      });

    }


    /* =====================================
       SUBMISSION STATUS
    ===================================== */

    user.sellerStatus = "pending";

    user.sellerAppliedAt =
      user.sellerAppliedAt || new Date();

    user.sellerApprovedAt = null;

    user.sellerRejectedAt = null;

    user.sellerRejectedReason = "";

    user.sellerInfo.verification.status =
      "pending";


    /* =====================================
       APPROVAL HISTORY
    ===================================== */

    if (!user.sellerInfo.approvalHistory) {
      user.sellerInfo.approvalHistory = [];
    }


    /*
      IMPORTANT:
      Your schema previously rejected "applied".

      Therefore use only an action value
      that exists in your User schema.

      If your enum contains "submitted",
      use "submitted".
    */

    user.sellerInfo.approvalHistory.push({
      action: "applied",
      reason: "Seller documents submitted",
      performedBy: user._id,
      date: new Date(),
    });


    await user.save();


    /* =====================================
       RESPONSE
    ===================================== */

    return res.status(200).json({
      success: true,
      message:
        "Seller documents uploaded successfully. Waiting for admin approval.",

      sellerStatus:
        user.sellerStatus,

      documents,

      user: sanitizeUser(user),
    });

  } catch (error) {

    console.error(
      "Upload Seller Documents Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to upload seller documents",
      error: error.message,
    });
  }
};

/* =========================================================
   SUSPEND SELLER
========================================================= */

export const suspendSeller = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const seller = await User.findById(req.params.id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    if (seller.role !== "seller") {
      return res.status(400).json({
        success: false,
        message: "User is not a seller",
      });
    }

    const reason = String(req.body.reason || "").trim();

    if (!validateReason(reason)) {
      return res.status(400).json({
        success: false,
        message: "A valid suspension reason is required",
      });
    }

    seller.sellerStatus = "suspended";

    if (!seller.sellerInfo.approvalHistory) {
      seller.sellerInfo.approvalHistory = [];
    }

    seller.sellerInfo.approvalHistory.push({
      action: "suspended",

      reason,

      performedBy: req.user.id,

      date: new Date(),
    });

    await seller.save();

    return res.json({
      success: true,
      message: "Seller suspended successfully",
    });
  } catch (error) {
    console.error("Suspend Seller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to suspend seller",
    });
  }
};

/* =========================================================
   APPROVE SELLER
========================================================= */

export const approveSeller = async (req, res) => {
  try {

    // =====================================
    // ADMIN CHECK
    // =====================================

    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }


    // =====================================
    // FIND USER / SELLER APPLICATION
    // =====================================

    const seller = await User.findById(req.params.id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }


    // =====================================
    // ACCOUNT CHECK
    // =====================================

    if (seller.isBlocked || seller.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "User account is not active",
      });
    }


    // =====================================
    // APPLICATION MUST BE PENDING
    // =====================================

    if (seller.sellerStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          `Seller application is not pending. Current status: ${seller.sellerStatus}`,
      });
    }


    // =====================================
    // REQUIRED DOCUMENT CHECK
    // =====================================

    const documents =
      checkRequiredSellerDocuments(seller);

    if (!documents.complete) {
      return res.status(400).json({
        success: false,
        message:
          "Seller must upload Aadhaar front, Aadhaar back, PAN and bank proof before approval",
        documents,
      });
    }


    // =====================================
    // CHANGE USER → SELLER
    // =====================================

    seller.role = "seller";

    seller.sellerStatus = "approved";

    seller.sellerApprovedAt = new Date();

    seller.sellerRejectedAt = null;

    seller.sellerRejectedReason = "";


    // =====================================
    // VERIFICATION
    // =====================================

    if (!seller.sellerInfo.verification) {
      seller.sellerInfo.verification = {};
    }

    seller.sellerInfo.verification.status =
      "approved";

    seller.sellerInfo.verification.verifiedBy =
      req.user._id;

    seller.sellerInfo.verification.verifiedAt =
      new Date();


    // =====================================
    // APPROVAL HISTORY
    // =====================================

    if (!seller.sellerInfo.approvalHistory) {
      seller.sellerInfo.approvalHistory = [];
    }

    seller.sellerInfo.approvalHistory.push({
      action: "approved",
      reason: "Seller application approved",
      performedBy: req.user._id,
      date: new Date(),
    });


    // =====================================
    // SAVE
    // =====================================

    await seller.save();


    // =====================================
    // RESPONSE
    // =====================================

    return res.status(200).json({
      success: true,
      message: "Seller approved successfully",

      seller: {
        _id: seller._id,
        firstName: seller.firstName,
        lastName: seller.lastName,
        email: seller.email,

        role: seller.role,

        activeMode: seller.activeMode,

        sellerStatus:
          seller.sellerStatus,

        sellerApprovedAt:
          seller.sellerApprovedAt,
      },
    });

  } catch (error) {

    console.error(
      "Approve Seller Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to approve seller",
      error: error.message,
    });
  }
};
/* =========================================================
   UPDATE SELLER COMMISSION
========================================================= */

export const updateSellerCommission = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const seller = await User.findById(req.params.id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    if (seller.role !== "seller") {
      return res.status(400).json({
        success: false,
        message: "User is not a seller",
      });
    }

    const commissionRate = Number(req.body.commissionRate);

    if (
      !Number.isFinite(commissionRate) ||
      commissionRate < 0 ||
      commissionRate > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Commission rate must be between 0 and 100",
      });
    }

    seller.sellerInfo.subscription.commissionRate = commissionRate;

    await seller.save();

    return res.json({
      success: true,
      message: "Seller commission updated successfully",
      commissionRate,
    });
  } catch (error) {
    console.error("Update Seller Commission Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update seller commission",
    });
  }
};

/* =========================================================
   UPDATE SELLER PLAN
========================================================= */

export const updateSellerPlan = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const seller = await User.findById(req.params.id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    if (seller.role !== "seller") {
      return res.status(400).json({
        success: false,
        message: "User is not a seller",
      });
    }

    const plan = String(req.body.plan || "").trim();

    if (!SELLER_PLANS.includes(plan)) {
      return res.status(400).json({
        success: false,
        message: "Invalid seller plan",
        allowedPlans: SELLER_PLANS,
      });
    }

    seller.sellerInfo.subscription.plan = plan;

    await seller.save();

    return res.json({
      success: true,
      message: "Seller plan updated successfully",
      plan,
    });
  } catch (error) {
    console.error("Update Seller Plan Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update seller plan",
    });
  }
};

/* =========================================================
   VERIFY SELLER DOCUMENTS
========================================================= */

export const verifySellerDocuments = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const seller = await User.findById(req.params.id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

if (seller.sellerStatus !== "pending") {
  return res.status(400).json({
    success: false,
    message:
      `Seller application is not pending. Current status: ${seller.sellerStatus}`,
  });
}

    const documents = checkRequiredSellerDocuments(seller);

    if (!documents.complete) {
      return res.status(400).json({
        success: false,
        message: "Required seller documents are incomplete",
        documents,
      });
    }

    /*
        IMPORTANT:
        Use "approved", never "verified".
      */

    seller.sellerInfo.verification.status = "approved";

    seller.sellerInfo.verification.verifiedBy = req.user.id;

    seller.sellerInfo.verification.verifiedAt = new Date();

    seller.sellerStatus = "approved";

    seller.sellerApprovedAt = new Date();

    seller.sellerRejectedAt = null;

    seller.sellerRejectedReason = "";

    if (!seller.sellerInfo.approvalHistory) {
      seller.sellerInfo.approvalHistory = [];
    }

    seller.sellerInfo.approvalHistory.push({
      action: "approved",

      reason: "Documents Verified",

      performedBy: req.user._id,

      date: new Date(),
    });

    await seller.save();

    return res.json({
      success: true,
      message: "Seller documents verified and seller approved successfully",
    });
  } catch (error) {
    console.error("Verify Seller Documents Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify seller documents",
    });
  }
};

/* =========================================================
   REJECT SELLER
========================================================= */

export const rejectSeller = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const seller = await User.findById(req.params.id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    if (seller.role !== "seller") {
      return res.status(400).json({
        success: false,
        message: "User is not a seller",
      });
    }

    const reason = String(req.body.reason || "").trim();

    if (!validateReason(reason)) {
      return res.status(400).json({
        success: false,
        message: "A valid rejection reason is required",
      });
    }

    seller.sellerStatus = "rejected";

    seller.sellerRejectedAt = new Date();

    seller.sellerRejectedReason = reason;

    seller.sellerApprovedAt = null;

    seller.sellerInfo.verification.status = "rejected";

    if (!seller.sellerInfo.approvalHistory) {
      seller.sellerInfo.approvalHistory = [];
    }

    seller.sellerInfo.approvalHistory.push({
      action: "rejected",

      reason,

      performedBy: req.user.id,

      date: new Date(),
    });

    await seller.save();

    return res.json({
      success: true,
      message: "Seller rejected successfully",
    });
  } catch (error) {
    console.error("Reject Seller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reject seller",
    });
  }
};

/* =========================================================
   GET SELLER ANALYTICS
========================================================= */

export const getSellerAnalytics = async (req, res) => {
  try {
    let seller;

    /*
        Seller dashboard:
        ALWAYS use authenticated seller ID.

        Admin:
        may request a specific seller.
      */

    if (req.user.role === "seller") {
      seller = await User.findById(req.user.id);
    } else if (req.user.role === "admin") {
      seller = await User.findById(req.params.id);
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    if (seller.role !== "seller") {
      return res.status(400).json({
        success: false,
        message: "User is not a seller",
      });
    }

    if (seller.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "Seller account is deleted",
      });
    }

    return res.json({
      success: true,

      analytics: {
        totalProducts: seller.sellerInfo?.analytics?.totalProducts || 0,

        totalOrders: seller.sellerInfo?.analytics?.totalOrders || 0,

        totalRevenue: seller.sellerInfo?.analytics?.totalRevenue || 0,

        wallet: seller.sellerInfo?.wallet || {
          availableBalance: 0,
          pendingBalance: 0,
          lifetimeEarnings: 0,
        },
      },
    });
  } catch (error) {
    console.error("Get Seller Analytics Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch seller analytics",
    });
  }
};

/* =========================================================
   REACTIVATE SELLER
========================================================= */

export const reactivateSeller = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const seller = await User.findById(req.params.id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    if (seller.role !== "seller") {
      return res.status(400).json({
        success: false,
        message: "User is not a seller",
      });
    }

    if (seller.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "Deleted seller cannot be reactivated",
      });
    }

    if (seller.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Blocked seller cannot be reactivated",
      });
    }

    /*
        Re-check KYC before reactivation.
      */

    const documents = checkRequiredSellerDocuments(seller);

    if (!documents.complete) {
      return res.status(400).json({
        success: false,
        message:
          "Seller must have valid required documents before reactivation",
        documents,
      });
    }

    seller.sellerStatus = "approved";

    seller.sellerInfo.verification.status = "approved";

    seller.sellerApprovedAt = new Date();

    seller.sellerRejectedAt = null;

    seller.sellerRejectedReason = "";

    if (!seller.sellerInfo.approvalHistory) {
      seller.sellerInfo.approvalHistory = [];
    }

    seller.sellerInfo.approvalHistory.push({
      action: "reactivated",

      reason: "Seller Reactivated",

      performedBy: req.user._id,

      date: new Date(),
    });

    await seller.save();

    return res.json({
      success: true,
      message: "Seller reactivated successfully",
    });
  } catch (error) {
    console.error("Reactivate Seller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reactivate seller",
    });
  }
};
export const switchMode = async (req, res) => {
  try {
    const { mode } = req.body;

    if (!["customer", "seller"].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mode",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Seller mode requires approved seller account
    if (
      mode === "seller" &&
      (user.role !== "seller" || user.sellerStatus !== "approved")
    ) {
      return res.status(403).json({
        success: false,
        message: "Your seller account is not approved",
      });
    }

    user.activeMode = mode;

    await user.save();

    return res.status(200).json({
      success: true,
      message: `Switched to ${mode} mode`,
      mode: user.activeMode,
    });
  } catch (error) {
    console.error("Switch Mode Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
