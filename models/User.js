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

      default: "https://i.pravatar.cc/300",
    },

    /* =====================================
       AUTH PROVIDER
    ===================================== */

    provider: {
      type: String,

      enum: ["credentials", "google", "github", "facebook"],

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
      enum: ["user", "seller", "admin"],
      default: "user",
    },
activeMode: {
  type: String,
  enum: ["customer", "seller"],
  default: "customer",
},
    sellerStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected", "suspended"],
      default: "none",
    },

    sellerAppliedAt: {
      type: Date,
      default: null,
    },

    sellerApprovedAt: {
      type: Date,
      default: null,
    },

    sellerRejectedAt: {
      type: Date,
      default: null,
    },

    sellerRejectedReason: {
      type: String,
      default: "",
    },
    /* =====================================
   SELLER INFORMATION
===================================== */

    sellerInfo: {
      store: {
        shopName: {
          type: String,
          default: "",
          trim: true,
        },

        shopSlug: {
          type: String,
          unique: true,
          sparse: true,
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
        metaTitle: String,
        metaDescription: String,
        keywords: [String],
        description: {
          type: String,
          default: "",
        },

        address: {
          street: String,

          city: String,

          state: String,

          postcode: String,

          country: String,
        },
        website: {
          type: String,
          default: "",
        },

        supportEmail: {
          type: String,
          default: "",
        },

        supportPhone: {
          type: String,
          default: "",
        },

        isOpen: {
          type: Boolean,
          default: true,
        },

        vacationMode: {
          type: Boolean,
          default: false,
        },
      },
      business: {
        businessType: {
          type: String,

          enum: [
            "Individual",
            "Proprietorship",
            "Partnership",
            "LLP",
            "Private Limited",
          ],
        },

        ownerName: String,

        gstNumber: String,

        panNumber: String,

        registrationNumber: String,
      },
      analytics: {
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

        totalReturns: {
          type: Number,
          default: 0,
        },

        totalCancelled: {
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

        followers: {
          type: Number,
          default: 0,
        },
      },
      subscription: {
        plan: {
          type: String,
          enum: ["Free", "Silver", "Gold", "Platinum"],
          default: "Free",
        },

        commissionRate: {
          type: Number,
          default: 10,
        },

        startedAt: {
          type: Date,
          default: Date.now,
        },

        expiresAt: {
          type: Date,
          default: null,
        },

        maxProducts: {
          type: Number,
          default: 100,
        },
      },
      wallet: {
        availableBalance: {
          type: Number,
          default: 0,
        },

        pendingBalance: {
          type: Number,
          default: 0,
        },

        lifetimeEarnings: {
          type: Number,
          default: 0,
        },

        lastSettlement: {
          type: Date,
          default: null,
        },
      },
      approvalHistory: [
        {
          action: {
            type: String,
            enum: [
              "applied",
              "verified",
              "approved",
              "rejected",
              "suspended",
              "reactivated",
            ],
          },

          reason: String,

          performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },

          date: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      storeRating: {
        average: {
          type: Number,
          default: 0,
        },

        totalRatings: {
          type: Number,
          default: 0,
        },
      },
      shipping: {
        freeShipping: {
          type: Boolean,
          default: false,
        },

        processingTime: {
          type: Number,
          default: 2,
        },

        returnDays: {
          type: Number,
          default: 7,
        },
      },
      notificationSettings: {
        email: {
          type: Boolean,
          default: true,
        },

        sms: {
          type: Boolean,
          default: true,
        },

        push: {
          type: Boolean,
          default: true,
        },
      },
      verification: {
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },

        verifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        verifiedAt: Date,

        rejectionReason: {
          type: String,
          default: "",
        },
      },
      badges: [
        {
          type: String,

          enum: [
            "Trusted",

            "Top Seller",

            "Fast Shipping",

            "Premium",

            "Verified",
          ],
        },
      ],
      kyc: {
        aadhaar: {
          number: String,

          frontImage: String,

          backImage: String,
        },

        pan: {
          number: String,

          image: String,
        },

        gst: {
          number: String,

          certificate: String,
        },

        bankProof: {
          image: String,
        },
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
  },
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
const User = mongoose.model("User", userSchema);

export default User;
