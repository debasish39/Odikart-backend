import express from "express";

import {
  signup,
  verifySignupOTP,
  verifySigninOTP,
  resendOTP,
 signinWithPassword,
 sendLoginOTP,resendLoginOTP,getUsers,changePassword, forgotPassword, verifyResetPasswordOTP, resetPassword,getMe,updateProfile
} from "../controllers/authController.js";
import {authMiddleware} from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
const router = express.Router();


router.post(
  "/signup",
  signup
);

router.post(
  "/verify-signup-otp",
  verifySignupOTP
);

router.post(
  "/signin-password",
  signinWithPassword
);

router.post(
  "/signin-otp",
  sendLoginOTP
);

router.post(
  "/verify-signin-otp",
  verifySigninOTP
);

router.post(
  "/resend-otp",
  resendOTP
);

router.post(

  "/resend-login-otp",

  resendLoginOTP

);
router.get(
  "/user",
  authMiddleware,
  getUsers
);
/* =====================================
   CHANGE PASSWORD
===================================== */

router.put(

  "/change-password",

  authMiddleware,

  changePassword

);

/* =====================================
   FORGOT PASSWORD
===================================== */

router.post(

  "/forgot-password",

  forgotPassword

);

/* =====================================
   VERIFY RESET OTP
===================================== */

router.post(

  "/verify-reset-otp",

  verifyResetPasswordOTP

);

/* =====================================
   RESET PASSWORD
===================================== */

router.put(

  "/reset-password",

  resetPassword

);
router.get(
  "/me",
  authMiddleware,
  getMe
);
router.put(
  "/update-profile",
  authMiddleware,
  upload.single("image"),
  updateProfile
)
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