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
      minlength: 6,

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

/* =====================================
   SELLER INFORMATION
===================================== */

sellerInfo: {

  /* Store Details */

  shopName: {
    type: String,
    default: "",
    trim: true,
  },

  shopSlug: {
    type: String,
    default: "",
    lowercase: true,
    trim: true,
  },

  shopLogo: {
    type: String,
    default: "",
  },

  shopBanner: {
    type: String,
    default: "",
  },

  description: {
    type: String,
    default: "",
  },

  /* Business Details */

  businessType: {
    type: String,
    enum: [
      "",
      "Individual",
      "Proprietorship",
      "Partnership",
      "Private Limited",
      "LLP",
      "Other",
    ],
    default: "",
  },

  ownerName: {
    type: String,
    default: "",
  },

  gstNumber: {
    type: String,
    default: "",
    uppercase: true,
  },

  panNumber: {
    type: String,
    default: "",
    uppercase: true,
  },

  businessRegistrationNumber: {
    type: String,
    default: "",
  },

  /* Contact */

  businessEmail: {
    type: String,
    default: "",
    lowercase: true,
  },

  businessPhone: {
    type: String,
    default: "",
  },

  website: {
    type: String,
    default: "",
  },

  /* Business Address */

  businessAddress: {

    street: String,

    city: String,

    state: String,

    postcode: String,

    country: String,

  },

  /* Bank Details */

  bankDetails: {

    accountHolderName: {
      type: String,
      default: "",
    },

    bankName: {
      type: String,
      default: "",
    },

    accountNumber: {
      type: String,
      default: "",
    },

    ifscCode: {
      type: String,
      default: "",
    },

    upiId: {
      type: String,
      default: "",
    },

  },

  /* Seller Performance */

  totalProducts: {
    type: Number,
    default: 0,
  },

  totalOrders: {
    type: Number,
    default: 0,
  },

  totalSales: {
    type: Number,
    default: 0,
  },

  totalRevenue: {
    type: Number,
    default: 0,
  },

  averageRating: {
    type: Number,
    default: 0,
  },

  totalReviews: {
    type: Number,
    default: 0,
  },

  /* Verification */

  isSellerVerified: {
    type: Boolean,
    default: false,
  },

  verifiedAt: {
    type: Date,
    default: null,
  },

  verificationDocuments: [

    {

      name: String,

      url: String,

    },

  ],

  /* Subscription */

  sellerPlan: {
    type: String,
    enum: [
      "Free",
      "Silver",
      "Gold",
      "Platinum",
    ],
    default: "Free",
  },

  commissionRate: {
    type: Number,
    default: 10,
  },

  /* Seller Status */

  isActive: {
    type: Boolean,
    default: true,
  },

  isSuspended: {
    type: Boolean,
    default: false,
  },

  joinedAt: {
    type: Date,
    default: Date.now,
  },

},

/* =====================================
   ADMIN INFO
===================================== */

adminInfo: {

  permissions: [

    {

      type: String,

      enum: [

        "manage_users",

        "manage_sellers",

        "manage_products",

        "manage_orders",

        "manage_categories",

        "manage_coupons",

        "manage_reviews",

        "manage_payments",

        "manage_banners",

        "manage_reports",

      ],

    },

  ],

  designation: {
    type: String,
    default: "",
  },

},





    /* =====================================
       ACCOUNT STATUS
    ===================================== */

    isBlocked: {

      type: Boolean,

      default: false,

    },
/* =====================================
   ACCOUNT DELETION
===================================== */

isDeleted: {
  type: Boolean,
  default: false,
},

deletedAt: {
  type: Date,
  default: null,
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
