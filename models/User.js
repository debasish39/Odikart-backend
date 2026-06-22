import mongoose from "mongoose";

const userSchema = new mongoose.Schema(

  {

    /* =====================================
       BASIC INFO
    ===================================== */

    firstName: {

      type: String,

      required: true,

      trim: true,

    },

    lastName: {

      type: String,

      default: "",

      trim: true,

    },

    username: {

      type: String,

      unique: true,

      sparse: true,

      trim: true,

    },

    email: {

      type: String,

      required: true,

      unique: true,

      lowercase: true,

      trim: true,

    },

    password: {

      type: String,

      required: true,

    },

    /* =====================================
       PHONE
    ===================================== */

    phone: {

      type: String,

      default: "",

    },

    /* =====================================
       PROFILE IMAGE
    ===================================== */

    image: {

      type: String,

      default:
        "https://i.pravatar.cc/300",

    },

    /* =====================================
       AUTH PROVIDER
    ===================================== */

    provider: {

      type: String,

      enum: [

        "credentials",

        "google",

        "github",

        "facebook",

      ],

      default: "credentials",

    },

    /* =====================================
       OTP
    ===================================== */

    otp: {

      type: String,

      default: null,

    },

    otpExpiry: {

      type: Date,

      default: null,

    },

    /* =====================================
       VERIFICATION
    ===================================== */

    isVerified: {

      type: Boolean,

      default: false,

    },

    isEmailVerified: {

      type: Boolean,

      default: false,

    },

    isPhoneVerified: {

      type: Boolean,

      default: false,

    },

    /* =====================================
       ROLE
    ===================================== */

  

role: {
  type: String,
  enum: [
    "user",
    "seller",
    "admin",
  ],
  default: "user",
},

/* =====================================
   SELLER INFO
===================================== */

sellerInfo: {

  shopName: {
    type: String,
    default: "",
  },

  shopLogo: {
    type: String,
    default: "",
  },

  gstNumber: {
    type: String,
    default: "",
  },

  businessAddress: {
    type: String,
    default: "",
  },

  isSellerVerified: {
    type: Boolean,
    default: false,
  },

},

/* =====================================
   ADMIN INFO
===================================== */

adminInfo: {

  permissions: [{
    type: String,
  }],

},





    /* =====================================
       ACCOUNT STATUS
    ===================================== */

    isBlocked: {

      type: Boolean,

      default: false,

    },

    blockedAt: {

      type: Date,

      default: null,

    },

    /* =====================================
       LOGIN TRACKING
    ===================================== */

    lastLogin: {

      type: Date,

      default: null,

    },

    /* =====================================
       PASSWORD RESET
    ===================================== */

    resetPasswordOTP: {

      type: String,

      default: null,

    },

    resetPasswordOTPExpiry: {

      type: Date,

      default: null,

    },

    /* =====================================
       ADDRESS
    ===================================== */

    address: {

      street: String,

      city: String,

      state: String,

      postcode: String,

      country: String,

    },

    /* =====================================
       SOCIAL LINKS
    ===================================== */

    socialLinks: {

      instagram: String,

      twitter: String,

      linkedin: String,

      github: String,

      website: String,

    },

  },

  {

    timestamps: true,

  }

);
userSchema.set("toJSON", {
  transform: (doc, ret) => {

    const formatDate = (date) => {
      if (!date) return null;

      return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(date));
    };

    ret.createdAt = formatDate(ret.createdAt);
    ret.updatedAt = formatDate(ret.updatedAt);
    ret.lastLogin = formatDate(ret.lastLogin);

    return ret;
  },
});
const User = mongoose.model(
  "User",
  userSchema
);

export default User;
