/**
 * The code includes functions for user authentication such as sending, resending, and verifying OTPs,
 * registering users, logging in with password or OTP, and retrieving user data.
 * @param req - The `req` parameter in the functions represents the HTTP request object, which contains
 * information about the incoming request such as the headers, parameters, body, etc.
 * @param res - The `res` parameter in the code snippets you provided stands for the response object in
 * Express.js. It is used to send a response back to the client making the HTTP request. The response
 * object has methods like `res.status()` to set the HTTP status code, `res.json()` to send a
 * @returns The code provided contains several functions related to user authentication and
 * verification.
 */
import User from "../models/User.js";

import bcrypt from "bcryptjs";

import generateOTP from "../utils/generateOTP.js";

import generateToken from "../utils/generateToken.js";

import sendEmailOTP from "../utils/sendEmailOTP.js";

/* =====================================
   RESEND OTP
===================================== */

export const resendOTP = async (

  req,
  res

) => {

  try {

    /* =====================================
       REQUEST DATA
    ===================================== */

    const { email } =
      req.body;

    /* =====================================
       VALIDATION
    ===================================== */

    if (!email) {

      return res.status(400).json({

        success: false,

        message:
          "Email is required",

      });

    }

    /* =====================================
       FIND USER
    ===================================== */

    const user =
      await User.findOne({

        email,

      });

    if (!user) {

      return res.status(404).json({

        success: false,

        message:
          "User not found",

      });

    }
if (user.isDeleted) {
  return res.status(403).json({
    success: false,
    message: "This account has been permanently deleted.",
  });
}
    /* =====================================
       CHECK VERIFIED
    ===================================== */

    if (user.isVerified) {

      return res.status(400).json({

        success: false,

        message:
          "User already verified",

      });

    }

    /* =====================================
       GENERATE NEW OTP
    ===================================== */

    const otp =
      generateOTP();

    const otpExpiry =
      new Date(

        Date.now() +
        5 * 60 * 1000

      );

    /* =====================================
       SAVE OTP
    ===================================== */

    user.otp = otp;

    user.otpExpiry =
      otpExpiry;

    await user.save();

    /* =====================================
       SEND EMAIL
    ===================================== */

    await sendEmailOTP(
      email,
      otp
    );

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "OTP resent successfully",

    });

  } catch (error) {

    console.error(
      "Resend OTP Error:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};


/* =====================================
   REGISTER USER
===================================== */

export const signup = async (

  req,
  res

) => {

  try {


const {

  firstName,

  lastName,

  email,

  password,

  phone,

  role,

} = req.body;


    /* =====================================
       CHECK EXISTING USER
    ===================================== */

    const existingUser =
      await User.findOne({

        email,

      });

    if (existingUser) {

      return res.status(400).json({

        success: false,

        message:
          "Email already exists",

      });

    }

    /* =====================================
       HASH PASSWORD
    ===================================== */

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    /* =====================================
       GENERATE OTP
    ===================================== */

    const otp =
      generateOTP();

    const otpExpiry =
      new Date(

        Date.now() +
        5 * 60 * 1000

      );

    /* =====================================
       CREATE USER
    ===================================== */

await User.create({

  firstName,

  lastName,

  email,

  password:
    hashedPassword,

  phone,

role:
  role === "admin"
    ? "admin"
    : role === "seller"
    ? "seller"
    : "user",
  otp,

  otpExpiry,

  isVerified:
    false,

});



    /* =====================================
       SEND EMAIL
    ===================================== */

    await sendEmailOTP(
      email,
      otp
    );

    res.status(201).json({

      success: true,

      message:
        "OTP sent to your email",
        otp,
        otpExpiry,

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};

/* =====================================
   VERIFY SIGNUP OTP
===================================== */

export const verifySignupOTP =
async (

  req,
  res

) => {

  try {

    const {

      email,

      otp,

    } = req.body;

    const user =
      await User.findOne({

        email,

      });

    if (!user) {

      return res.status(404).json({

        success: false,

        message:
          "User not found",

      });

    }
if (user.isDeleted) {
  return res.status(403).json({
    success: false,
    message: "This account has been permanently deleted.",
  });
}
if (String(user.otp) !== String(otp)){
      return res.status(400).json({

        success: false,

        message:
          "Invalid OTP",

      });

    }

    if (

      user.otpExpiry <
      Date.now()

    ) {

      return res.status(400).json({

        success: false,

        message:
          "OTP expired",

      });

    }

    /* =====================================
       VERIFY USER
    ===================================== */

    user.isVerified = true;

    user.otp = null;

    user.otpExpiry = null;

    await user.save();

    const token =
      generateToken(user)

    res.status(200).json({

      success: true,

      message:
        "Account Signup successfully",

      token,

      user,

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};

/* =====================================
   LOGIN WITH PASSWORD
===================================== */

export const signinWithPassword =
async (

  req,
  res

) => {

  try {

    const {

      email,

      password,

    } = req.body;

    const user =
      await User.findOne({

        email,

      });
if (!user) {
  return res.status(404).json({
    success: false,
    message: "User not found",
  });
}

if (user.isDeleted) {
  return res.status(403).json({
    success: false,
    message: "This account has been permanently deleted.",
  });
}

if (!user.isVerified) {
  return res.status(400).json({
    success: false,
    message: "Account not verified",
  });
}

    const isMatch =
      await bcrypt.compare(

        password,

        user.password

      );

    if (!isMatch) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid credentials",

      });

    }

    user.lastLogin =
      new Date();

    await user.save();

    const token =
      generateToken(user)

    res.status(200).json({

      success: true,

      message:
        "Login successful",

      token,

      user,

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};

/* =====================================
   SEND LOGIN OTP
===================================== */

export const sendLoginOTP =
async (

  req,
  res

) => {

  try {

    const { email } =
      req.body;

    const user =
      await User.findOne({

        email,

      });

    if (!user) {

      return res.status(404).json({

        success: false,

        message:
          "User not found",

      });

    }
if (user.isDeleted) {
  return res.status(403).json({
    success: false,
    message: "This account has been permanently deleted.",
  });
}
    const otp =
      generateOTP();

    const otpExpiry =
      new Date(

        Date.now() +
        5 * 60 * 1000

      );

    user.otp = otp;

    user.otpExpiry =
      otpExpiry;

    await user.save();

    await sendEmailOTP(
      email,
      otp
    );

    res.status(200).json({

      success: true,

      message:
        "Login OTP sent successfully",
        otp,
        otpExpiry,

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};

/* =====================================
   VERIFY LOGIN OTP
===================================== */

export const verifySigninOTP =
async (

  req,
  res

) => {

  try {

    const {

      email,

      otp,

    } = req.body;

    const user =
      await User.findOne({

        email,

      });

    if (!user) {

      return res.status(404).json({

        success: false,

        message:
          "User not found",

      });

    }
if (user.isDeleted) {
  return res.status(403).json({
    success: false,
    message: "This account has been permanently deleted.",
  });
}
    if (user.otp !== otp) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid OTP",

      });

    }

    if (

      user.otpExpiry <
      Date.now()

    ) {

      return res.status(400).json({

        success: false,

        message:
          "OTP expired",

      });

    }

    user.otp = null;

    user.otpExpiry = null;

    user.lastLogin =
      new Date();

    await user.save();

    const token =
      generateToken(user)

    res.status(200).json({

      success: true,

      message:
        "Login successful",

      token,

      user,

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};
/* =====================================
   CHANGE PASSWORD
===================================== */

export const changePassword =
async (

  req,
  res

) => {

  try {

    const {

      currentPassword,

      newPassword,

    } = req.body;
console.log(req.user);
    /* =====================================
       VALIDATION
    ===================================== */

    if (

      !currentPassword ||

      !newPassword

    ) {

      return res.status(400).json({

        success: false,

        message:
          "All fields are required",

      });

    }

    /* =====================================
       FIND USER
    ===================================== */

    const user =
      await User.findById(

        req.user._id

      );

    if (!user) {

      return res.status(404).json({

        success: false,

        message:
          "User not found",

      });

    }

    /* =====================================
       CHECK PASSWORD
    ===================================== */

    const isMatch =
      await bcrypt.compare(

        currentPassword,

        user.password

      );

    if (!isMatch) {

      return res.status(400).json({

        success: false,

        message:
          "Current password is incorrect",

      });

    }

    /* =====================================
       HASH PASSWORD
    ===================================== */

    const hashedPassword =
      await bcrypt.hash(

        newPassword,

        10

      );

    user.password =
      hashedPassword;

    await user.save();

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "Password changed successfully",

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};
/* =====================================
   FORGOT PASSWORD
===================================== */

export const forgotPassword =
async (

  req,
  res

) => {

  try {

    const { email } =
      req.body;

    /* =====================================
       FIND USER
    ===================================== */

    const user =
      await User.findOne({

        email,

      });

    if (!user) {

      return res.status(404).json({

        success: false,

        message:
          "User not found",

      });

    }

    /* =====================================
       GENERATE OTP
    ===================================== */

    const otp =
      generateOTP();

    const otpExpiry =
      new Date(

        Date.now() +
        5 * 60 * 1000

      );

    /* =====================================
       SAVE OTP
    ===================================== */

    user.resetPasswordOTP =
      otp;

    user.resetPasswordOTPExpiry =
      otpExpiry;

    await user.save();

    /* =====================================
       SEND EMAIL
    ===================================== */

    await sendEmailOTP(

      email,

      otp

    );

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "Password reset OTP sent",

      otp,
      otpExpiry,

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};

/* =====================================
   VERIFY RESET PASSWORD OTP
===================================== */

export const verifyResetPasswordOTP =
async (

  req,
  res

) => {

  try {

    const {

      email,

      otp,

    } = req.body;

    /* =====================================
       FIND USER
    ===================================== */

    const user =
      await User.findOne({

        email,

      });

    if (!user) {

      return res.status(404).json({

        success: false,

        message:
          "User not found",

      });

    }
if (user.isDeleted) {
  return res.status(403).json({
    success: false,
    message: "This account has been permanently deleted.",
  });
}
    /* =====================================
       OTP CHECK
    ===================================== */

    if (

      String(
        user.resetPasswordOTP
      ) !==
      String(otp)

    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid OTP",

      });

    }

    /* =====================================
       OTP EXPIRY
    ===================================== */

    if (

      user.resetPasswordOTPExpiry <
      Date.now()

    ) {

      return res.status(400).json({

        success: false,

        message:
          "OTP expired",

      });

    }

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "OTP verified successfully",

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};

/* =====================================
   RESET PASSWORD
===================================== */

export const resetPassword =
async (

  req,
  res

) => {

  try {

    const {

      email,

      otp,

      newPassword,

    } = req.body;

    /* =====================================
       FIND USER
    ===================================== */

    const user =
      await User.findOne({

        email,

      });

    if (!user) {

      return res.status(404).json({

        success: false,

        message:
          "User not found",

      });

    }
if (user.isDeleted) {
  return res.status(403).json({
    success: false,
    message: "This account has been permanently deleted.",
  });
}
    /* =====================================
       VERIFY OTP
    ===================================== */

    if (

      String(
        user.resetPasswordOTP
      ) !==
      String(otp)

    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid OTP",

      });

    }

    /* =====================================
       CHECK OTP EXPIRY
    ===================================== */

    if (

      user.resetPasswordOTPExpiry <
      Date.now()

    ) {

      return res.status(400).json({

        success: false,

        message:
          "OTP expired",

      });

    }

    /* =====================================
       HASH PASSWORD
    ===================================== */

    const hashedPassword =
      await bcrypt.hash(

        newPassword,

        10

      );

    /* =====================================
       UPDATE PASSWORD
    ===================================== */

    user.password =
      hashedPassword;

    user.resetPasswordOTP =
      null;

    user.resetPasswordOTPExpiry =
      null;

    await user.save();

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "Password reset successfully",

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};


export const resendLoginOTP = async (

  req,
  res

) => {

  try {

    /* =====================================
       EMAIL
    ===================================== */

    const { email } = req.body;

    /* =====================================
       VALIDATION
    ===================================== */

    if (!email) {

      return res.status(400).json({

        success: false,

        message: "Email is required",

      });

    }

    /* =====================================
       FIND USER
    ===================================== */

    const user = await User.findOne({

      email,

    });

    if (!user) {

      return res.status(404).json({

        success: false,

        message: "User not found",

      });

    }
if (user.isDeleted) {
  return res.status(403).json({
    success: false,
    message: "This account has been permanently deleted.",
  });
}
    /* =====================================
       ACCOUNT CHECK
    ===================================== */

    if (!user.isVerified) {

      return res.status(400).json({

        success: false,

        message: "Account not verified",

      });

    }

    /* =====================================
       CHECK EXISTING OTP
    ===================================== */

    // if (

    //   user.otp &&
    //   user.otpExpiry &&
    //   user.otpExpiry.getTime() > Date.now()

    // ) {

    //   return res.status(400).json({

    //     success: false,

    //     message:
    //       "OTP already sent. Please check your email.",

    //   });

    // }

    /* =====================================
       GENERATE NEW OTP
    ===================================== */

    const otp = generateOTP().toString();

    const otpExpiry = new Date(

      Date.now() + 5 * 60 * 1000

    );

    /* =====================================
       SAVE OTP
    ===================================== */

    user.otp = otp;

    user.otpExpiry = otpExpiry;

    await user.save();

    /* =====================================
       SEND EMAIL
    ===================================== */

    await sendEmailOTP(

      email,

      otp

    );

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "Login OTP resent successfully",
        otp,
        otpExpiry,

    });

  } catch (error) {

    console.error(

      "Resend Login OTP Error:",

      error

    );

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};
export const getUsers =
async (

  req,
  res

) => {

  try {

    const user =
      await User.find(
        
      );

    res.status(200).json({

      success: true,

      message:
        "User retrieved successfully",

      user,

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};
export const getMe =
async (req, res) => {

  try {

    res.status(200).json({

      success: true,

      user: req.user,

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};



/* =====================================
   UPDATE PROFILE
===================================== */

export const updateProfile =
async (req, res) => {

  try {

    const {

      firstName,

      lastName,

      phone,

    } = req.body;

    /* =====================================
       FIND USER
    ===================================== */

    const user =
      await User.findById(
        req.user._id
      );

    if (!user) {

      return res.status(404).json({

        success: false,

        message:
          "User not found",

      });

    }
if (user.isDeleted) {
  return res.status(403).json({
    success: false,
    message: "This account has been permanently deleted.",
  });
}
    /* =====================================
       UPDATE FIELDS
    ===================================== */

    user.firstName =
      firstName ||
      user.firstName;

    user.lastName =
      lastName ||
      user.lastName;

    user.phone =
      phone ||
      user.phone;

    /* =====================================
       PROFILE IMAGE
    ===================================== */

    if (req.file) {

      user.image =
        req.file.path;

    }

    /* =====================================
       SAVE USER
    ===================================== */

    await user.save();

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "Profile updated successfully",

      user,

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};
/* =====================================
   DELETE MY ACCOUNT
===================================== */

export const deleteMyAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Account is already deleted.",
      });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();

    // Optional: clear sensitive data
    user.otp = null;
    user.otpExpiry = null;
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpiry = null;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Your account has been permanently deleted.",
    });
  } catch (error) {
    console.error("Delete My Account Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
/* =====================================
   DELETE USER (ADMIN)
===================================== */

export const deleteUser = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access only.",
      });
    }

    const { id } = req.params;

    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "User is already deleted.",
      });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();

    // Optional: clear sensitive data
    user.otp = null;
    user.otpExpiry = null;
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpiry = null;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    console.error("Delete User Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};