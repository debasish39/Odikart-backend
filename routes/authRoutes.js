import express from "express";

import {
  signup,
  verifySignupOTP,
  verifySigninOTP,
  resendOTP,

  signinWithPassword,

  adminLogin,

  sendLoginOTP,
  resendLoginOTP,

  getUsers,

  changePassword,

  forgotPassword,
  verifyResetPasswordOTP,
  resetPassword,

  checkExistingAccount,

  getMe,
  updateProfile,
  deleteMyAccount,

  // =====================================
  // FIREBASE PHONE LOGIN
  // =====================================
  firebasePhoneLogin,
  completeProfile

} from "../controllers/authController.js";

import {
  authMiddleware,
} from "../middleware/authMiddleware.js";

import upload from "../middleware/uploadMiddleware.js";


const router =
  express.Router();


/* =========================================================
   SIGNUP
========================================================= */

router.post(
  "/signup",
  signup
);


/* =========================================================
   VERIFY SIGNUP OTP
========================================================= */

router.post(
  "/verify-signup-otp",
  verifySignupOTP
);


/* =========================================================
   PASSWORD SIGNIN
========================================================= */

router.post(
  "/signin-password",
  signinWithPassword
);


/* =========================================================
   FIREBASE PHONE LOGIN
========================================================= */

router.post(
  "/firebase-phone-login",
  firebasePhoneLogin
);

/* =========================================================
   COMPLETE CUSTOMER PHONE PROFILE
========================================================= */

router.post(
  "/complete-profile",
  authMiddleware,
  completeProfile
);
/* =========================================================
   ADMIN LOGIN
========================================================= */

router.post(
  "/admin-login",
  adminLogin
);


/* =========================================================
   LOGIN OTP
========================================================= */

router.post(
  "/signin-otp",
  sendLoginOTP
);


/* =========================================================
   VERIFY LOGIN OTP
========================================================= */

router.post(
  "/verify-signin-otp",
  verifySigninOTP
);


/* =========================================================
   RESEND SIGNUP OTP
========================================================= */

router.post(
  "/resend-otp",
  resendOTP
);


/* =========================================================
   CHECK EXISTING ACCOUNT
========================================================= */

router.get(
  "/check-account",
  checkExistingAccount
);


/* =========================================================
   RESEND LOGIN OTP
========================================================= */

router.post(
  "/resend-login-otp",
  resendLoginOTP
);


/* =========================================================
   GET USERS
========================================================= */

router.get(
  "/user",
  authMiddleware,
  getUsers
);


/* =========================================================
   CHANGE PASSWORD
========================================================= */

router.put(
  "/change-password",
  authMiddleware,
  changePassword
);


/* =========================================================
   FORGOT PASSWORD
========================================================= */

router.post(
  "/forgot-password",
  forgotPassword
);


/* =========================================================
   VERIFY RESET OTP
========================================================= */

router.post(
  "/verify-reset-otp",
  verifyResetPasswordOTP
);


/* =========================================================
   RESET PASSWORD
========================================================= */

router.put(
  "/reset-password",
  resetPassword
);


/* =========================================================
   GET CURRENT USER
========================================================= */

router.get(
  "/me",
  authMiddleware,
  getMe
);


/* =========================================================
   UPDATE PROFILE
========================================================= */

router.put(
  "/update-profile",
  authMiddleware,
  upload.single("image"),
  updateProfile
);


/* =========================================================
   DELETE MY ACCOUNT
========================================================= */

router.delete(
  "/delete-account",
  authMiddleware,
  deleteMyAccount
);


/* =========================================================
   FUTURE SELLER/PRODUCT ROUTES
========================================================= */

// router.post(
//   "/add-product",
//   protect,
//   authorizeRoles(
//     "seller",
//     "admin"
//   ),
//   addProduct
// );


export default router;