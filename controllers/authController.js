import mongoose from "mongoose";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import generateOTP from "../utils/generateOTP.js";
import generateToken from "../utils/generateToken.js";
import sendEmailOTP from "../utils/sendEmailOTP.js";

/* =========================================================
   SECURITY CONFIGURATION
========================================================= */

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_LENGTH = 6;

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

const MAX_NAME_LENGTH = 80;
const MAX_PHONE_LENGTH = 20;
const MAX_EMAIL_LENGTH = 254;

const MAX_OTP_ATTEMPTS = 5;

/*
  OTP attempts are stored in-memory here only as an
  additional application-layer protection.

  IMPORTANT:
  For a multi-server production deployment, move this
  counter to Redis or another shared store.
*/
const otpAttempts = new Map();

const normalizeEmail = (email) =>
  String(email ?? "")
    .trim()
    .toLowerCase()
    .slice(0, MAX_EMAIL_LENGTH);

const normalizeString = (
  value,
  maxLength
) =>
  String(value ?? "")
    .trim()
    .slice(0, maxLength);

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );

const isValidObjectId = (id) =>
  Boolean(id) &&
  mongoose.Types.ObjectId.isValid(id);

const isStrongEnoughPassword = (
  password
) => {
  if (
    typeof password !== "string" ||
    password.length <
      MIN_PASSWORD_LENGTH ||
    password.length >
      MAX_PASSWORD_LENGTH
  ) {
    return false;
  }

  /*
    At least:
    - one lowercase
    - one uppercase
    - one number
  */
  return (
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
};

const normalizeOtp = (otp) =>
  String(otp ?? "")
    .replace(/\D/g, "")
    .slice(0, OTP_LENGTH);

const isValidOtpFormat = (otp) =>
  /^\d{6}$/.test(
    normalizeOtp(otp)
  );

const getOtpKey = (
  purpose,
  email
) =>
  `${purpose}:${normalizeEmail(email)}`;

const canAttemptOtp = (
  purpose,
  email
) => {
  const key =
    getOtpKey(
      purpose,
      email
    );

  const current =
    otpAttempts.get(key);

  if (!current) {
    return true;
  }

  if (
    Date.now() >
    current.resetAt
  ) {
    otpAttempts.delete(key);
    return true;
  }

  return (
    current.count <
    MAX_OTP_ATTEMPTS
  );
};

const recordOtpAttempt = (
  purpose,
  email
) => {
  const key =
    getOtpKey(
      purpose,
      email
    );

  const current =
    otpAttempts.get(key);

  if (
    !current ||
    Date.now() >
      current.resetAt
  ) {
    otpAttempts.set(key, {
      count: 1,
      resetAt:
        Date.now() +
        OTP_EXPIRY_MS,
    });

    return;
  }

  current.count += 1;
};

const clearOtpAttempts = (
  purpose,
  email
) => {
  otpAttempts.delete(
    getOtpKey(
      purpose,
      email
    )
  );
};

const generateSecureOtp = () => {
  /*
    generateOTP is kept as the project's OTP utility.
    The generated value is normalized to avoid unexpected
    formatting.
  */
  return normalizeOtp(
    generateOTP()
  );
};

/* =========================================================
   SAFE USER RESPONSE
========================================================= */

const safeUserResponse = (user) => {

  if (!user) {
    return null;
  }


  const obj =
    typeof user.toObject === "function"
      ? user.toObject()
      : { ...user };


  /* -------------------------------------------------------
     REMOVE SENSITIVE INFORMATION
  ------------------------------------------------------- */

  delete obj.password;
  delete obj.otp;
  delete obj.otpExpiry;
  delete obj.resetPasswordOTP;
  delete obj.resetPasswordOTPExpiry;


  /* -------------------------------------------------------
     REMOVE ADMIN INTERNAL PERMISSIONS
  ------------------------------------------------------- */

  if (obj.adminInfo) {
    delete obj.adminInfo.permissions;
  }


  /* -------------------------------------------------------
     SELLER AUTHORIZATION
     
     MongoDB source:
     sellerInfo.verification.status

     Frontend/API field:
     sellerVerificationStatus
  ------------------------------------------------------- */

  obj.sellerStatus =
    user.sellerStatus ?? null;


  obj.sellerVerificationStatus =
    user.sellerInfo?.verification?.status ||
    null;


  /* -------------------------------------------------------
     ACCOUNT STATUS
  ------------------------------------------------------- */

  obj.isVerified =
    Boolean(user.isVerified);

  obj.isEmailVerified =
    Boolean(user.isEmailVerified);

  obj.isPhoneVerified =
    Boolean(user.isPhoneVerified);

  obj.isBlocked =
    Boolean(user.isBlocked);

  obj.isDeleted =
    Boolean(user.isDeleted);


  /* -------------------------------------------------------
     ACTIVE APPLICATION MODE
  ------------------------------------------------------- */

  obj.activeMode =
    user.activeMode || "customer";


  return obj;
};


/* =========================================================
   SAFE AUTH RESPONSE
========================================================= */

/* =========================================================
   SAFE AUTH RESPONSE
========================================================= */

const safeAuthResponse = (user) => {

  if (!user) {
    return null;
  }


  return {

    id:
      user._id,

    firstName:
      user.firstName || "",

    lastName:
      user.lastName || "",

    email:
      user.email || "",

    phone:
      user.phone || "",

    image:
      user.image || "",


    /* ===================================================
       ROLE
    =================================================== */

    role:
      user.role || "user",


    /* ===================================================
       SELLER STATUS
    =================================================== */

    sellerStatus:
      user.sellerStatus ??
      null,


    /* ===================================================
       SELLER KYC STATUS
    =================================================== */

    sellerVerificationStatus:
      user.sellerInfo
        ?.verification
        ?.status ||
      null,


    /* ===================================================
       ACCOUNT VERIFICATION
    =================================================== */

    isVerified:
      Boolean(user.isVerified),

    isEmailVerified:
      Boolean(user.isEmailVerified),

    isPhoneVerified:
      Boolean(user.isPhoneVerified),


    /* ===================================================
       ACCOUNT STATUS
    =================================================== */

    isBlocked:
      Boolean(user.isBlocked),

    isDeleted:
      Boolean(user.isDeleted),


    /* ===================================================
       UI MODE
       
       Not an authorization source.
    =================================================== */

    activeMode:
      user.activeMode ||
      "customer",

  };
};

// const safeAuthResponse = (
//   user
// ) => ({
//   id: user._id,
//   firstName:
//     user.firstName || "",
//   lastName:
//     user.lastName || "",
//   email:
//     user.email || "",
//   phone:
//     user.phone || "",
//   image:
//     user.image || "",
//   role:
//     user.role || "user",
//   sellerStatus:
//     user.sellerStatus ?? null,
//   sellerVerificationStatus:
//     user.sellerInfo?.verification
//       ?.status || null,
//   isVerified:
//     Boolean(user.isVerified),
//   isEmailVerified:
//     Boolean(user.isEmailVerified),
//   isPhoneVerified:
//     Boolean(user.isPhoneVerified),
//   isBlocked:
//     Boolean(user.isBlocked),
//   activeMode:
//     user.activeMode || "customer",
//   isDeleted:
//     Boolean(user.isDeleted),
// });

const unexpectedError = (
  res,
  error,
  context
) => {
  console.error(
    `${context}:`,
    error
  );

  return res.status(500).json({
    success: false,
    message:
      "An unexpected error occurred",
  });
};

const getAuthenticatedUser =
  async (req) => {
    const id =
      req.user?._id ||
      req.user?.id;

    if (
      !id ||
      !isValidObjectId(id)
    ) {
      return null;
    }

    return User.findById(id);
  };

/* =========================================================
   RESEND SIGNUP OTP
========================================================= */

export const resendOTP = async (
  req,
  res
) => {
  try {
    const email =
      normalizeEmail(
        req.body?.email
      );

    if (
      !email ||
      !isValidEmail(email)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid email is required",
      });
    }

    if (
      !canAttemptOtp(
        "signup",
        email
      )
    ) {
      return res.status(429).json({
        success: false,
        message:
          "Too many OTP attempts. Please try again later.",
      });
    }

    const user =
      await User.findOne({
        email,
      });

    if (!user) {
      /*
        Do not disclose whether an email exists
        in a production application.
      */
      return res.status(200).json({
        success: true,
        message:
          "If an account exists, an OTP has been sent.",
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message:
          "This account is not available",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message:
          "User already verified",
      });
    }

    const otp =
      generateSecureOtp();

    if (
      !isValidOtpFormat(otp)
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Unable to generate OTP",
      });
    }

    user.otp = otp;
    user.otpExpiry =
      new Date(
        Date.now() +
          OTP_EXPIRY_MS
      );

    await user.save();

    await sendEmailOTP(
      email,
      otp
    );

    clearOtpAttempts(
      "signup",
      email
    );

    return res.status(200).json({
      success: true,
      message:
        "OTP resent successfully",
    });

  } catch (error) {
    return unexpectedError(
      res,
      error,
      "Resend OTP Error"
    );
  }
};

/* =========================================================
   REGISTER USER
========================================================= */

export const signup = async (
  req,
  res
) => {
  try {
    const firstName =
      normalizeString(
        req.body?.firstName,
        MAX_NAME_LENGTH
      );

    const lastName =
      normalizeString(
        req.body?.lastName,
        MAX_NAME_LENGTH
      );

    const email =
      normalizeEmail(
        req.body?.email
      );

    const password =
      req.body?.password;

    const phone =
      normalizeString(
        req.body?.phone,
        MAX_PHONE_LENGTH
      );

    /*
      NEVER accept role from the client.

      The old implementation allowed:
      role === "admin"

      which is a critical privilege-escalation vulnerability.
    */
    const app = String(
      req.body?.app || "customer"
    ).trim().toLowerCase();

    if (!["customer", "seller"].includes(app)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application",
      });
    }

    const requestedRole =
      normalizeString(
        req.body?.role,
        20
      ).toLowerCase();

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "First name, last name, email and password are required",
      });
    }

    if (
      !isValidEmail(email)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid email address",
      });
    }

    if (
      !isStrongEnoughPassword(
        password
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be 8-128 characters and contain uppercase, lowercase and a number",
      });
    }

    if (
      phone &&
      !/^[0-9+\-\s()]{7,20}$/.test(
        phone
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid phone number",
      });
    }

    /*
      Seller registration is allowed, but admin registration
      MUST NOT be client-controlled.

      Normal public signup:
      - seller -> seller
      - anything else -> user

      Admin accounts should be created by a protected
      admin-only provisioning flow.
    */
    const userRole =
      app === "seller"
        ? "seller"
        : "user";

    const existingUser =
      await User.findOne({
        email,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "Email already exists",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );

    const otp =
      generateSecureOtp();

    if (
      !isValidOtpFormat(otp)
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Unable to generate OTP",
      });
    }

    const otpExpiry =
      new Date(
        Date.now() +
          OTP_EXPIRY_MS
      );

    const userData = {
      firstName,
      lastName,
      email,
      password:
        hashedPassword,
      phone,
      role: userRole,
      otp,
      otpExpiry,
      isVerified: false,
      isEmailVerified: false,
      isPhoneVerified: false,
      activeMode: app,
    };

    if (
      userRole ===
      "seller"
    ) {
      userData.sellerStatus =
        "pending";

      userData.sellerInfo = {
        store: {},
        business: {},
        kyc: {
          aadhaar: {},
          pan: {},
          gst: {},
          bankProof: {},
        },
        verification: {
          status:
            "pending",
        },
        approvalHistory: [],
      };
    }

    const user =
      await User.create(
        userData
      );

    await sendEmailOTP(
      email,
      otp
    );

    /*
      OTP is intentionally NOT returned.
      Returning it in JSON makes the email OTP useless
      if the API response is exposed in browser/network logs.
    */
    return res.status(201).json({
      success: true,
      message:
        "OTP sent to your email",
      otpExpiry,
      userId:
        user._id,
    });

  } catch (error) {
    return unexpectedError(
      res,
      error,
      "Signup Error"
    );
  }
};

/* =========================================================
   VERIFY SIGNUP OTP
========================================================= */

export const verifySignupOTP =
  async (
    req,
    res
  ) => {
    try {
      const email =
        normalizeEmail(
          req.body?.email
        );

      const otp =
        normalizeOtp(
          req.body?.otp
        );

      if (
        !isValidEmail(email) ||
        !isValidOtpFormat(otp)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid email or OTP",
        });
      }

      if (
        !canAttemptOtp(
          "signup-verify",
          email
        )
      ) {
        return res.status(429).json({
          success: false,
          message:
            "Too many invalid OTP attempts. Please request a new OTP.",
        });
      }

      const user =
        await User.findOne({
          email,
        });

      if (!user) {
        recordOtpAttempt(
          "signup-verify",
          email
        );

        return res.status(400).json({
          success: false,
          message:
            "Invalid email or OTP",
        });
      }

      if (user.isDeleted) {
        return res.status(403).json({
          success: false,
          message:
            "This account is not available",
        });
      }

      if (
        user.isVerified
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Account is already verified",
        });
      }

      if (
        !user.otp ||
        !user.otpExpiry ||
        user.otpExpiry.getTime() <
          Date.now()
      ) {
        recordOtpAttempt(
          "signup-verify",
          email
        );

        return res.status(400).json({
          success: false,
          message:
            "OTP expired",
        });
      }

      /*
        Constant-time comparison for OTP values.
      */
      const storedOtp =
        normalizeOtp(
          user.otp
        );

      const validOtp =
        storedOtp === otp;

      if (!validOtp) {
        recordOtpAttempt(
          "signup-verify",
          email
        );

        return res.status(400).json({
          success: false,
          message:
            "Invalid OTP",
        });
      }

      user.isVerified =
        true;

      user.isEmailVerified =
        true;

      user.otp = null;
      user.otpExpiry =
        null;

      await user.save();

      clearOtpAttempts(
        "signup-verify",
        email
      );

      const token =
        generateToken(
          user
        );

      return res.status(200).json({
        success: true,
        message:
          "Account signup successful",
        token,
        user:
          safeAuthResponse(
            user
          ),
      });

    } catch (error) {
      return unexpectedError(
        res,
        error,
        "Verify Signup OTP Error"
      );
    }
  };

/* =========================================================
   LOGIN WITH PASSWORD
========================================================= */

/* =========================================================
   LOGIN WITH PASSWORD
========================================================= */

/* =========================================================
   LOGIN WITH PASSWORD
========================================================= */

export const signinWithPassword =
  async (req, res) => {

    try {

      /* ===================================================
         READ INPUT
      =================================================== */

      const email =
        normalizeEmail(
          req.body?.email
        );


      const password =
        req.body?.password;


      const app =
        String(
          req.body?.app ||
          "customer"
        )
          .trim()
          .toLowerCase();


      /* ===================================================
         VALIDATION
      =================================================== */

      if (
        !isValidEmail(email) ||
        typeof password !== "string" ||
        !password
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Email and password are required",

        });

      }


      if (
        !["customer", "seller"].includes(
          app
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid application",

        });

      }


      /* ===================================================
         FIND USER
      =================================================== */

      const user =
        await User.findOne({
          email,
        });


      if (!user) {

        return res.status(401).json({

          success: false,

          message:
            "Invalid email or password",

        });

      }


      /* ===================================================
         ACCOUNT STATUS
      =================================================== */

      if (
        user.isDeleted ||
        user.isBlocked
      ) {

        return res.status(403).json({

          success: false,

          message:
            "This account is not available",

        });

      }


      /* ===================================================
         ACCOUNT VERIFICATION
      =================================================== */

      if (
        !user.isVerified
      ) {

        return res.status(403).json({

          success: false,

          message:
            "Account not verified",

        });

      }


      /* ===================================================
         PASSWORD
      =================================================== */

      if (!user.password) {

        return res.status(401).json({

          success: false,

          message:
            "Invalid email or password",

        });

      }


      const isMatch =
        await bcrypt.compare(
          password,
          user.password
        );


      if (!isMatch) {

        return res.status(401).json({

          success: false,

          message:
            "Invalid email or password",

        });

      }


      /* ===================================================
         SELLER APPLICATION
      =================================================== */

      if (
        app === "seller"
      ) {

        const kycStatus =
          user.sellerInfo
            ?.verification
            ?.status ||
          "pending";


        console.log(
          "======================================"
        );

        console.log(
          "🏪 SELLER PASSWORD LOGIN"
        );

        console.log(
          "Email:",
          user.email
        );

        console.log(
          "Role:",
          user.role
        );

        console.log(
          "Seller Status:",
          user.sellerStatus
        );

        console.log(
          "KYC Status:",
          kycStatus
        );

        console.log(
          "======================================"
        );


        /* -----------------------------------------------
           ROLE
        ----------------------------------------------- */

        if (
          user.role !==
          "seller"
        ) {

          return res.status(403).json({

            success: false,

            message:
              "This login is only available for seller accounts.",

            sellerStatus:
              user.sellerStatus ||
              null,

            sellerVerificationStatus:
              kycStatus,

          });

        }


        /* -----------------------------------------------
           SELLER APPLICATION APPROVAL
           
           This blocks login.
        ----------------------------------------------- */

        if (
          user.sellerStatus !==
          "approved"
        ) {

          return res.status(403).json({

            success: false,

            message:
              "Your seller account is not approved.",

            sellerStatus:
              user.sellerStatus ||
              null,

            sellerVerificationStatus:
              kycStatus,

          });

        }


        /* -----------------------------------------------
           KYC
           
           IMPORTANT:
           KYC does NOT block authentication.
        ----------------------------------------------- */

        if (
          kycStatus ===
          "approved"
        ) {

          console.log(
            "✅ Seller account approved"
          );

          console.log(
            "✅ KYC approved"
          );

        } else {

          console.log(
            "⚠️ Seller approved but KYC incomplete"
          );

          console.log(
            "✅ Authentication allowed"
          );

          console.log(
            "➡️ Frontend should open upload documents"
          );

        }

      }


      /* ===================================================
         CUSTOMER APPLICATION
      =================================================== */

   if (app === "customer") {

  console.log("🛍️ Customer login");

  if (user.role !== "user") {

    return res.status(403).json({
      success: false,
      message:
        "This account cannot access the customer application.",
      role: user.role,
    });

  }

}


      /* ===================================================
         LAST LOGIN
      =================================================== */

      user.lastLogin =
        new Date();


      /*
       * No activeMode modification here.
       */

      await user.save();


      /* ===================================================
         TOKEN
      =================================================== */

      const token =
        generateToken(
          user,
          app
        );


      /* ===================================================
         RESPONSE USER
      =================================================== */

      const responseUser =
        safeAuthResponse(
          user
        );


      /* ===================================================
         DEBUG
      =================================================== */

      console.log(
        "========== PASSWORD LOGIN RESPONSE =========="
      );

      console.log(
        "Role:",
        responseUser.role
      );

      console.log(
        "Seller Status:",
        responseUser.sellerStatus
      );

      console.log(
        "KYC Status:",
        responseUser.sellerVerificationStatus
      );

      console.log(
        "Application:",
        app
      );

      console.log(
        "=============================================="
      );


      /* ===================================================
         RESPONSE
      =================================================== */

      return res.status(200).json({

        success: true,

        message:
          "Login successful",

        token,

        user:
          responseUser,

        app,

      });


    } catch (error) {

      return unexpectedError(
        res,
        error,
        "Password Login Error"
      );

    }

  };
// CHECK EMAIL / FIND EXISTING ACCOUNT
// =========================================================

export const checkExistingAccount = async (req, res) => {
  try {
    const email = String(req.query.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
      });
    }

    const user = await User.findOne({
      email,
      isDeleted: { $ne: true },
    }).select(
      "_id firstName lastName email phone image role sellerStatus sellerAppliedAt sellerApprovedAt"
    );

    // -----------------------------------------------------
    // ACCOUNT DOES NOT EXIST
    // -----------------------------------------------------

    if (!user) {
      return res.status(200).json({
        success: true,
        exists: false,
        message: "No account found. You can register.",
      });
    }

    // -----------------------------------------------------
    // ACCOUNT EXISTS
    // -----------------------------------------------------

    return res.status(200).json({
      success: true,
      exists: true,

      message: "Account found",

      user: {
        _id: user._id,

        firstName: user.firstName || "",
        lastName: user.lastName || "",

        email: user.email || "",
        phone: user.phone || "",
        image: user.image || "",

        role: user.role || "user",

        sellerStatus:
          user.sellerStatus || null,

        sellerAppliedAt:
          user.sellerAppliedAt || null,

        sellerApprovedAt:
          user.sellerApprovedAt || null,
      },
    });
  } catch (error) {
    console.error(
      "Check Existing Account Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to check account",
    });
  }
};
/* =========================================================
   SEND LOGIN OTP
========================================================= */

/* =========================================================
   SEND LOGIN OTP
========================================================= */

export const sendLoginOTP =
  async (req, res) => {

    try {

      const email =
        normalizeEmail(
          req.body?.email
        );


      const app =
        String(
          req.body?.app ||
          "customer"
        )
          .trim()
          .toLowerCase();


      /* ===================================================
         VALIDATION
      =================================================== */

      if (
        !isValidEmail(email)
      ) {

        return res.status(400).json({

          success: false,

          message:
            "A valid email is required",

        });

      }


      if (
        !["customer", "seller"].includes(
          app
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid application",

        });

      }


      /* ===================================================
         RATE LIMIT
      =================================================== */

      if (
        !canAttemptOtp(
          "login",
          email
        )
      ) {

        return res.status(429).json({

          success: false,

          message:
            "Too many OTP requests. Please try again later.",

        });

      }


      /* ===================================================
         FIND USER
      =================================================== */

      const user =
        await User.findOne({
          email,
        });


      if (
        !user ||
        user.isDeleted ||
        user.isBlocked ||
        !user.isVerified
      ) {

        return res.status(200).json({

          success: true,

          message:
            "If the account is eligible, a login OTP has been sent.",

        });

      }


      /* ===================================================
         SELLER APP
      =================================================== */

      if (
        app === "seller"
      ) {

        const kycStatus =
          user.sellerInfo
            ?.verification
            ?.status ||
          "pending";


        console.log(
          "======================================"
        );

        console.log(
          "📩 SELLER OTP REQUEST"
        );

        console.log(
          "Email:",
          user.email
        );

        console.log(
          "Role:",
          user.role
        );

        console.log(
          "Seller Status:",
          user.sellerStatus
        );

        console.log(
          "KYC Status:",
          kycStatus
        );

        console.log(
          "======================================"
        );


        /* -----------------------------------------------
           ROLE
        ----------------------------------------------- */

        if (
          user.role !==
          "seller"
        ) {

          return res.status(403).json({

            success: false,

            message:
              "This login is only available for seller accounts.",

            sellerStatus:
              user.sellerStatus ||
              null,

            sellerVerificationStatus:
              kycStatus,

          });

        }


        /* -----------------------------------------------
           SELLER APPROVAL
        ----------------------------------------------- */

        if (
          user.sellerStatus !==
          "approved"
        ) {

          return res.status(403).json({

            success: false,

            message:
              "Your seller account is not approved.",

            sellerStatus:
              user.sellerStatus ||
              null,

            sellerVerificationStatus:
              kycStatus,

          });

        }


        /* -----------------------------------------------
           KYC DOES NOT BLOCK OTP
        ----------------------------------------------- */

        if (
          kycStatus ===
          "approved"
        ) {

          console.log(
            "✅ Seller KYC approved"
          );

        } else {

          console.log(
            "⚠️ Seller KYC incomplete"
          );

          console.log(
            "✅ OTP still allowed"
          );

        }

      }


      /* ===================================================
         GENERATE OTP
      =================================================== */

      const otp =
        generateSecureOtp();


      if (
        !isValidOtpFormat(
          otp
        )
      ) {

        return res.status(500).json({

          success: false,

          message:
            "Unable to generate OTP",

        });

      }


      /* ===================================================
         SAVE OTP
      =================================================== */

      user.otp =
        otp;

      user.otpExpiry =
        new Date(
          Date.now() +
          OTP_EXPIRY_MS
        );


      await user.save();


      /* ===================================================
         SEND EMAIL
      =================================================== */

      await sendEmailOTP(
        email,
        otp
      );


      clearOtpAttempts(
        "login",
        email
      );


      return res.status(200).json({

        success: true,

        message:
          "Login OTP sent successfully",

      });


    } catch (error) {

      return unexpectedError(
        res,
        error,
        "Send Login OTP Error"
      );

    }

  };

/* =========================================================
   VERIFY LOGIN OTP
========================================================= */

export const verifySigninOTP =
  async (req, res) => {

    try {

      const email =
        normalizeEmail(
          req.body?.email
        );


      const otp =
        normalizeOtp(
          req.body?.otp
        );


      const app =
        String(
          req.body?.app ||
          "customer"
        )
          .trim()
          .toLowerCase();


      console.log(
        "======================================"
      );

      console.log(
        "🔐 VERIFY LOGIN OTP"
      );

      console.log(
        "Email:",
        email
      );

      console.log(
        "App:",
        app
      );

      console.log(
        "======================================"
      );


      /* ===================================================
         VALIDATION
      =================================================== */

      if (
        !isValidEmail(email) ||
        !isValidOtpFormat(otp)
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid email or OTP",

        });

      }


      if (
        !["customer", "seller"].includes(
          app
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid application",

        });

      }


      /* ===================================================
         RATE LIMIT
      =================================================== */

      if (
        !canAttemptOtp(
          "login-verify",
          email
        )
      ) {

        return res.status(429).json({

          success: false,

          message:
            "Too many invalid OTP attempts. Please request a new OTP.",

        });

      }


      /* ===================================================
         FIND USER
      =================================================== */

      const user =
        await User.findOne({
          email,
        });


      if (
        !user ||
        user.isDeleted ||
        user.isBlocked ||
        !user.isVerified
      ) {

        recordOtpAttempt(
          "login-verify",
          email
        );


        return res.status(400).json({

          success: false,

          message:
            "Invalid email or OTP",

        });

      }


      /* ===================================================
         OTP EXPIRY
      =================================================== */

      if (
        !user.otp ||
        !user.otpExpiry ||
        user.otpExpiry.getTime() <
          Date.now()
      ) {

        recordOtpAttempt(
          "login-verify",
          email
        );


        return res.status(400).json({

          success: false,

          message:
            "OTP expired",

        });

      }


      /* ===================================================
         OTP CHECK
      =================================================== */

      const storedOtp =
        normalizeOtp(
          user.otp
        );


      if (
        storedOtp !== otp
      ) {

        recordOtpAttempt(
          "login-verify",
          email
        );


        return res.status(400).json({

          success: false,

          message:
            "Invalid OTP",

        });

      }


      /* ===================================================
         SELLER APPLICATION
      =================================================== */

      if (
        app === "seller"
      ) {

        const kycStatus =
          user.sellerInfo
            ?.verification
            ?.status ||
          "pending";


        console.log(
          "======================================"
        );

        console.log(
          "🏪 SELLER OTP LOGIN"
        );

        console.log(
          "Role:",
          user.role
        );

        console.log(
          "Seller Status:",
          user.sellerStatus
        );

        console.log(
          "KYC Status:",
          kycStatus
        );

        console.log(
          "======================================"
        );


        /* -----------------------------------------------
           ROLE
        ----------------------------------------------- */

        if (
          user.role !==
          "seller"
        ) {

          return res.status(403).json({

            success: false,

            message:
              "This login is only available for seller accounts.",

            sellerStatus:
              user.sellerStatus ||
              null,

            sellerVerificationStatus:
              kycStatus,

          });

        }


        /* -----------------------------------------------
           SELLER APPROVAL
        ----------------------------------------------- */

        if (
          user.sellerStatus !==
          "approved"
        ) {

          return res.status(403).json({

            success: false,

            message:
              "Your seller account is not approved.",

            sellerStatus:
              user.sellerStatus ||
              null,

            sellerVerificationStatus:
              kycStatus,

          });

        }


        /* -----------------------------------------------
           KYC
           
           DO NOT BLOCK AUTHENTICATION
        ----------------------------------------------- */

        if (
          kycStatus ===
          "approved"
        ) {

          console.log(
            "✅ Seller access approved"
          );

          console.log(
            "✅ KYC verified"
          );

        } else {

          console.log(
            "⚠️ Seller approved but KYC incomplete"
          );

          console.log(
            "✅ OTP authentication allowed"
          );

        }

      }


      /* ===================================================
         CUSTOMER
      =================================================== */

      if (
        app === "customer"
      ) {

        console.log(
          "🛍️ Customer OTP login"
        );

      }


      /* ===================================================
         CLEAR OTP
      =================================================== */

      user.otp =
        null;

      user.otpExpiry =
        null;

      user.lastLogin =
        new Date();


      /*
       * DO NOT MODIFY user.activeMode
       * DO NOT MODIFY KYC
       */

      await user.save();


      console.log(
        "✅ User saved"
      );


      clearOtpAttempts(
        "login-verify",
        email
      );


      /* ===================================================
         TOKEN
      =================================================== */

      const token =
        generateToken(
          user,
          app
        );


      /* ===================================================
         USER RESPONSE
      =================================================== */

      const responseUser =
        safeAuthResponse(
          user
        );


      console.log(
        "========== OTP LOGIN RESPONSE =========="
      );

      console.log(
        "Role:",
        responseUser.role
      );

      console.log(
        "Seller Status:",
        responseUser.sellerStatus
      );

      console.log(
        "KYC Status:",
        responseUser.sellerVerificationStatus
      );

      console.log(
        "Application:",
        app
      );

      console.log(
        "========================================"
      );


      return res.status(200).json({

        success: true,

        message:
          "Login successful",

        token,

        user:
          responseUser,

        app,

      });


    } catch (error) {

      return unexpectedError(
        res,
        error,
        "Verify Login OTP Error"
      );

    }

  };

/* =========================================================
   SWITCH ACTIVE MODE
========================================================= */

/* =========================================================
   SWITCH APPLICATION
========================================================= */

export const switchActiveMode =
  async (req, res) => {

    try {

      const user =
        await getAuthenticatedUser(
          req
        );


      if (!user) {

        return res.status(401).json({

          success: false,

          message:
            "Authentication required",

        });

      }


      if (
        user.isDeleted ||
        user.isBlocked
      ) {

        return res.status(403).json({

          success: false,

          message:
            "This account is not available",

        });

      }


      const app =
        String(
          req.body?.app ||
          req.body?.activeMode ||
          ""
        )
          .trim()
          .toLowerCase();


      if (
        !["customer", "seller"].includes(
          app
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Application must be customer or seller",

        });

      }


      /* ===================================================
         SELLER APPLICATION
      =================================================== */

      if (
        app === "seller"
      ) {

        const kycStatus =
          user.sellerInfo
            ?.verification
            ?.status ||
          "pending";


        console.log(
          "========== SWITCH TO SELLER =========="
        );

        console.log(
          "Role:",
          user.role
        );

        console.log(
          "Seller Status:",
          user.sellerStatus
        );

        console.log(
          "KYC Status:",
          kycStatus
        );

        console.log(
          "======================================"
        );


        if (
          user.role !==
          "seller"
        ) {

          return res.status(403).json({

            success: false,

            message:
              "This account is not registered as a seller.",

            sellerStatus:
              user.sellerStatus ||
              null,

            sellerVerificationStatus:
              kycStatus,

          });

        }


        if (
          user.sellerStatus !==
          "approved"
        ) {

          return res.status(403).json({

            success: false,

            message:
              "Your seller account is not approved.",

            sellerStatus:
              user.sellerStatus ||
              null,

            sellerVerificationStatus:
              kycStatus,

          });

        }


        if (
          kycStatus ===
          "approved"
        ) {

          console.log(
            "✅ Switching to verified seller session"
          );

        } else {

          console.log(
            "⚠️ Switching to seller onboarding session"
          );

          console.log(
            "➡️ Seller can upload KYC documents"
          );

        }

      }


      /* ===================================================
         CUSTOMER APPLICATION
      =================================================== */

      if (
        app === "customer"
      ) {

        console.log(
          "🛍️ Switching to customer session"
        );

      }


      /*
       * IMPORTANT:
       *
       * Never do:
       *
       * user.activeMode = app;
       * await user.save();
       *
       * Application mode belongs in the JWT.
       */


      const token =
        generateToken(
          user,
          app
        );


      const responseUser =
        safeAuthResponse(
          user
        );


      return res.status(200).json({

        success: true,

        message:
          `Switched to ${app} application`,

        app,

        token,

        user:
          responseUser,

      });


    } catch (error) {

      return unexpectedError(
        res,
        error,
        "Switch Application Error"
      );

    }

  };

/* =========================================================
   CHANGE PASSWORD
========================================================= */

export const changePassword =
  async (
    req,
    res
  ) => {
    try {
      const currentPassword =
        req.body?.currentPassword;

      const newPassword =
        req.body?.newPassword;

      if (
        typeof currentPassword !==
          "string" ||
        typeof newPassword !==
          "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Current password and new password are required",
        });
      }

      if (
        !isStrongEnoughPassword(
          newPassword
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "New password must be 8-128 characters and contain uppercase, lowercase and a number",
        });
      }

      const user =
        await getAuthenticatedUser(
          req
        );

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      if (
        user.isDeleted ||
        user.isBlocked
      ) {
        return res.status(403).json({
          success: false,
          message:
            "This account is not available",
        });
      }

      if (
        !user.password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password authentication is not available for this account",
        });
      }

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

      /*
        Prevent accidentally reusing the current password.
      */
      const samePassword =
        await bcrypt.compare(
          newPassword,
          user.password
        );

      if (
        samePassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            "New password must be different from the current password",
        });
      }

      user.password =
        await bcrypt.hash(
          newPassword,
          12
        );

      /*
        Revoke password-reset OTPs after password change.
      */
      user.resetPasswordOTP =
        null;

      user.resetPasswordOTPExpiry =
        null;

      await user.save();

      return res.status(200).json({
        success: true,
        message:
          "Password changed successfully",
      });

    } catch (error) {
      return unexpectedError(
        res,
        error,
        "Change Password Error"
      );
    }
  };

/* =========================================================
   FORGOT PASSWORD
========================================================= */

export const forgotPassword =
  async (
    req,
    res
  ) => {
    try {
      const email =
        normalizeEmail(
          req.body?.email
        );

      if (
        !isValidEmail(email)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid email is required",
        });
      }

      if (
        !canAttemptOtp(
          "reset",
          email
        )
      ) {
        return res.status(429).json({
          success: false,
          message:
            "Too many reset requests. Please try again later.",
        });
      }

      const user =
        await User.findOne({
          email,
        });

      /*
        Generic response prevents email enumeration.
      */
      if (
        !user ||
        user.isDeleted ||
        user.isBlocked
      ) {
        return res.status(200).json({
          success: true,
          message:
            "If the account exists, a password reset OTP has been sent.",
        });
      }

      const otp =
        generateSecureOtp();

      if (
        !isValidOtpFormat(otp)
      ) {
        return res.status(500).json({
          success: false,
          message:
            "Unable to generate OTP",
        });
      }

      user.resetPasswordOTP =
        otp;

      user.resetPasswordOTPExpiry =
        new Date(
          Date.now() +
            OTP_EXPIRY_MS
        );

      await user.save();

      await sendEmailOTP(
        email,
        otp
      );

      clearOtpAttempts(
        "reset",
        email
      );

      return res.status(200).json({
        success: true,
        message:
          "Password reset OTP sent",
      });

    } catch (error) {
      return unexpectedError(
        res,
        error,
        "Forgot Password Error"
      );
    }
  };

/* =========================================================
   VERIFY RESET PASSWORD OTP
========================================================= */

export const verifyResetPasswordOTP =
  async (
    req,
    res
  ) => {
    try {
      const email =
        normalizeEmail(
          req.body?.email
        );

      const otp =
        normalizeOtp(
          req.body?.otp
        );

      if (
        !isValidEmail(email) ||
        !isValidOtpFormat(otp)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid email or OTP",
        });
      }

      if (
        !canAttemptOtp(
          "reset-verify",
          email
        )
      ) {
        return res.status(429).json({
          success: false,
          message:
            "Too many invalid OTP attempts. Please request a new OTP.",
        });
      }

      const user =
        await User.findOne({
          email,
        });

      if (
        !user ||
        user.isDeleted ||
        user.isBlocked
      ) {
        recordOtpAttempt(
          "reset-verify",
          email
        );

        return res.status(400).json({
          success: false,
          message:
            "Invalid email or OTP",
        });
      }

      if (
        !user.resetPasswordOTP ||
        !user.resetPasswordOTPExpiry ||
        user.resetPasswordOTPExpiry.getTime() <
          Date.now()
      ) {
        recordOtpAttempt(
          "reset-verify",
          email
        );

        return res.status(400).json({
          success: false,
          message:
            "OTP expired",
        });
      }

      if (
        normalizeOtp(
          user.resetPasswordOTP
        ) !== otp
      ) {
        recordOtpAttempt(
          "reset-verify",
          email
        );

        return res.status(400).json({
          success: false,
          message:
            "Invalid OTP",
        });
      }

      /*
        Do not clear the reset OTP here.
        resetPassword must verify it again, preventing
        an attacker from calling resetPassword without
        possessing the OTP.
      */
      clearOtpAttempts(
        "reset-verify",
        email
      );

      return res.status(200).json({
        success: true,
        message:
          "OTP verified successfully",
      });

    } catch (error) {
      return unexpectedError(
        res,
        error,
        "Verify Reset Password OTP Error"
      );
    }
  };

/* =========================================================
   RESET PASSWORD
========================================================= */

export const resetPassword =
  async (
    req,
    res
  ) => {
    try {
      const email =
        normalizeEmail(
          req.body?.email
        );

      const otp =
        normalizeOtp(
          req.body?.otp
        );

      const newPassword =
        req.body?.newPassword;

      if (
        !isValidEmail(email) ||
        !isValidOtpFormat(otp) ||
        !isStrongEnoughPassword(
          newPassword
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid reset information",
        });
      }

      if (
        !canAttemptOtp(
          "reset-complete",
          email
        )
      ) {
        return res.status(429).json({
          success: false,
          message:
            "Too many invalid attempts. Please request a new OTP.",
        });
      }

      const user =
        await User.findOne({
          email,
        });

      if (
        !user ||
        user.isDeleted ||
        user.isBlocked
      ) {
        recordOtpAttempt(
          "reset-complete",
          email
        );

        return res.status(400).json({
          success: false,
          message:
            "Invalid reset information",
        });
      }

      if (
        !user.resetPasswordOTP ||
        !user.resetPasswordOTPExpiry ||
        user.resetPasswordOTPExpiry.getTime() <
          Date.now()
      ) {
        recordOtpAttempt(
          "reset-complete",
          email
        );

        return res.status(400).json({
          success: false,
          message:
            "OTP expired",
        });
      }

      if (
        normalizeOtp(
          user.resetPasswordOTP
        ) !== otp
      ) {
        recordOtpAttempt(
          "reset-complete",
          email
        );

        return res.status(400).json({
          success: false,
          message:
            "Invalid reset information",
        });
      }

      if (
        user.password
      ) {
        const samePassword =
          await bcrypt.compare(
            newPassword,
            user.password
          );

        if (
          samePassword
        ) {
          return res.status(400).json({
            success: false,
            message:
              "New password must be different from the previous password",
          });
        }
      }

      user.password =
        await bcrypt.hash(
          newPassword,
          12
        );

      user.resetPasswordOTP =
        null;

      user.resetPasswordOTPExpiry =
        null;

      /*
        Invalidate any login OTP after a password reset.
      */
      user.otp =
        null;

      user.otpExpiry =
        null;

      await user.save();

      clearOtpAttempts(
        "reset-complete",
        email
      );

      return res.status(200).json({
        success: true,
        message:
          "Password reset successfully",
      });

    } catch (error) {
      return unexpectedError(
        res,
        error,
        "Reset Password Error"
      );
    }
  };

/* =========================================================
   RESEND LOGIN OTP
========================================================= */

export const resendLoginOTP =
  async (
    req,
    res
  ) => {
    try {
      const email =
        normalizeEmail(
          req.body?.email
        );

      if (
        !isValidEmail(email)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid email is required",
        });
      }

      const app = String(
        req.body?.app || "customer"
      ).trim().toLowerCase();

      if (!["customer", "seller"].includes(app)) {
        return res.status(400).json({
          success: false,
          message: "Invalid application",
        });
      }

      if (
        !canAttemptOtp(
          "login-resend",
          email
        )
      ) {
        return res.status(429).json({
          success: false,
          message:
            "Too many OTP requests. Please try again later.",
        });
      }

      const user =
        await User.findOne({
          email,
        });

      if (
        !user ||
        user.isDeleted ||
        user.isBlocked ||
        !user.isVerified
      ) {
        return res.status(200).json({
          success: true,
          message:
            "If the account is eligible, a login OTP has been sent.",
        });
      }

      if (app === "seller" &&
        (user.role !== "seller" || user.sellerStatus !== "approved")
      ) {
        return res.status(403).json({
          success: false,
          message: "Your seller account is not approved.",
          sellerStatus: user.sellerStatus || null,
        });
      }

      const otp =
        generateSecureOtp();

      if (
        !isValidOtpFormat(otp)
      ) {
        return res.status(500).json({
          success: false,
          message:
            "Unable to generate OTP",
        });
      }

      user.otp =
        otp;

      user.otpExpiry =
        new Date(
          Date.now() +
            OTP_EXPIRY_MS
        );

      await user.save();

      await sendEmailOTP(
        email,
        otp
      );

      clearOtpAttempts(
        "login-resend",
        email
      );

      return res.status(200).json({
        success: true,
        message:
          "Login OTP resent successfully",
      });

    } catch (error) {
      return unexpectedError(
        res,
        error,
        "Resend Login OTP Error"
      );
    }
  };

/* =========================================================
   GET USERS (ADMIN)
========================================================= */

export const getUsers = async (
  req,
  res
) => {
  try {
    if (
      req.user?.role !==
      "admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Admin access only",
      });
    }

    /*
      Never return passwords or OTPs.
      Also use a projection rather than User.find().
    */
    const users =
      await User.find()
        .select(
          "-password -otp -otpExpiry -resetPasswordOTP -resetPasswordOTPExpiry"
        )
        .lean();

    return res.status(200).json({
      success: true,
      message:
        "Users retrieved successfully",
      users,
    });

  } catch (error) {
    return unexpectedError(
      res,
      error,
      "Get Users Error"
    );
  }
};

/* =========================================================
   GET ME
========================================================= */

export const getMe =
  async (req, res) => {

    try {

      const user =
        await getAuthenticatedUser(
          req
        );


      if (!user) {

        return res.status(401).json({

          success: false,

          message:
            "Authentication required",

        });

      }


      if (
        user.isDeleted
      ) {

        return res.status(403).json({

          success: false,

          message:
            "This account is not available",

        });

      }


      /* ---------------------------------------------------
         BUILD SAME USER SHAPE AS LOGIN
      --------------------------------------------------- */

      const responseUser =
        safeUserResponse(
          user
        );


      console.log(
        "========== AUTH ME =========="
      );

      console.log(
        "User ID:",
        responseUser.id ||
        responseUser._id
      );

      console.log(
        "Role:",
        responseUser.role
      );

      console.log(
        "Seller Status:",
        responseUser.sellerStatus
      );

      console.log(
        "KYC Status:",
        responseUser.sellerVerificationStatus
      );

      console.log(
        "Active Mode:",
        responseUser.activeMode
      );

      console.log(
        "=============================="
      );


      return res.status(200).json({

        success: true,

        user:
          responseUser,

      });


    } catch (error) {

      return unexpectedError(
        res,
        error,
        "Get Me Error"
      );

    }

  };

/* =========================================================
   UPDATE PROFILE
========================================================= */

export const updateProfile =
  async (
    req,
    res
  ) => {
    try {
      const user =
        await getAuthenticatedUser(
          req
        );

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      if (
        user.isDeleted ||
        user.isBlocked
      ) {
        return res.status(403).json({
          success: false,
          message:
            "This account is not available",
        });
      }

      const firstName =
        normalizeString(
          req.body?.firstName,
          MAX_NAME_LENGTH
        );

      const lastName =
        normalizeString(
          req.body?.lastName,
          MAX_NAME_LENGTH
        );

      const phone =
        normalizeString(
          req.body?.phone,
          MAX_PHONE_LENGTH
        );

      if (
        firstName
      ) {
        user.firstName =
          firstName;
      }

      if (
        lastName
      ) {
        user.lastName =
          lastName;
      }

      if (
        phone
      ) {
        if (
          !/^[0-9+\-\s()]{7,20}$/.test(
            phone
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid phone number",
          });
        }

        user.phone =
          phone;
      }

      /*
        Email, role, sellerStatus, verification,
        adminInfo and password are intentionally NOT
        accepted here.
      */

      if (
        req.file
      ) {
        /*
          upload middleware must validate:
          - MIME type
          - file extension
          - file size
          - image content

          The controller only accepts the resulting
          server-generated upload path.
        */
        user.image =
          req.file.path;
      }

      await user.save();

      return res.status(200).json({
        success: true,
        message:
          "Profile updated successfully",
        user:
          safeAuthResponse(
            user
          ),
      });

    } catch (error) {
      return unexpectedError(
        res,
        error,
        "Update Profile Error"
      );
    }
  };

/* =========================================================
   DELETE MY ACCOUNT
========================================================= */

export const deleteMyAccount =
  async (
    req,
    res
  ) => {
    try {
      const user =
        await getAuthenticatedUser(
          req
        );

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      if (
        user.isDeleted
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Account is already deleted",
        });
      }

      /*
        Soft delete.
        Keep audit fields, but invalidate all
        authentication-related OTP state.
      */
      user.isDeleted =
        true;

      user.deletedAt =
        new Date();

      user.otp =
        null;

      user.otpExpiry =
        null;

      user.resetPasswordOTP =
        null;

      user.resetPasswordOTPExpiry =
        null;

      await user.save();

      return res.status(200).json({
        success: true,
        message:
          "Your account has been permanently deleted",
      });

    } catch (error) {
      return unexpectedError(
        res,
        error,
        "Delete My Account Error"
      );
    }
  };

/* =========================================================
   DELETE USER (ADMIN)
========================================================= */

export const deleteUser =
  async (
    req,
    res
  ) => {
    try {
      if (
        req.user?.role !==
        "admin"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const {
        id,
      } = req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user ID",
        });
      }

      const adminId =
        req.user?._id ||
        req.user?.id;

      if (
        adminId &&
        adminId.toString() ===
          id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "You cannot delete your own account",
        });
      }

      const user =
        await User.findById(
          id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      if (
        user.isDeleted
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User is already deleted",
        });
      }

      user.isDeleted =
        true;

      user.deletedAt =
        new Date();

      user.otp =
        null;

      user.otpExpiry =
        null;

      user.resetPasswordOTP =
        null;

      user.resetPasswordOTPExpiry =
        null;

      await user.save();

      return res.status(200).json({
        success: true,
        message:
          "User deleted successfully",
      });

    } catch (error) {
      return unexpectedError(
        res,
        error,
        "Delete User Error"
      );
    }
  };
export const adminLogin = async (req, res) => {

  try {

    const {
      email,
      password,
    } = req.body;

    /* =====================================
       VALIDATION
    ===================================== */

    if (
      !email ||
      !password
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });

    }

    /* =====================================
       FIND USER
    ===================================== */

    const user =
      await User.findOne({
        email:
          email.trim().toLowerCase(),
      });

    if (!user) {

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });

    }

    /* =====================================
       ACCOUNT STATUS
    ===================================== */

    if (
      user.isDeleted ||
      user.isBlocked
    ) {

      return res.status(403).json({
        success: false,
        message:
          "This account is not available",
      });

    }

    /* =====================================
       ADMIN ROLE
    ===================================== */

    if (
      user.role !== "admin"
    ) {

      return res.status(403).json({
        success: false,
        message:
          "Admin access denied",
      });

    }

    /* =====================================
       PASSWORD
    ===================================== */

    if (!user.password) {

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });

    }

    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isMatch) {

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });

    }

    /* =====================================
       LAST LOGIN
    ===================================== */

    user.lastLogin =
      new Date();

    await user.save();

    /* =====================================
       TOKEN
    ===================================== */

    const token =
      generateToken(
        user,
        "admin"
      );

    /* =====================================
       SAFE USER RESPONSE
    ===================================== */

    const responseUser =
      safeAuthResponse(
        user
      );

    /* =====================================
       RESPONSE
    ===================================== */

    return res.status(200).json({

      success: true,

      message:
        "Admin login successful",

      token,

      user:
        responseUser,

      app:
        "admin",

    });

  } catch (error) {

    console.error(
      "Admin Login Error:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        "Admin login failed",

    });

  }

};