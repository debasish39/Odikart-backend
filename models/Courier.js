import mongoose from "mongoose";

const courierSchema = new mongoose.Schema(
  {
    /* =====================================================
       BASIC DETAILS
    ===================================================== */

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },

    photo: {
      type: String,
      default: "",
    },

    /* =====================================================
       VEHICLE
    ===================================================== */

    vehicleType: {
      type: String,
      enum: [
        "Bike",
        "Scooter",
        "Cycle",
        "Auto",
        "Car",
        "Van",
        "Other",
      ],
      default: "Bike",
    },

    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    /* =====================================================
       SERVICE AREA
    ===================================================== */

    serviceAreas: [
      {
        type: String,
        trim: true,
      },
    ],

    estimatedDeliveryMinutes: {
      type: Number,
      default: 30,
      min: 1,
    },

    /* =====================================================
       IDENTITY / VERIFICATION DOCUMENTS
    ===================================================== */

    documents: {
      /* ---------------------------------------------------
         AADHAAR
      --------------------------------------------------- */

      aadhaar: {
        documentUrl: {
          type: String,
          default: "",
        },

        documentNumber: {
          type: String,
          default: "",
          trim: true,
        },

        uploadedAt: {
          type: Date,
          default: null,
        },

        verified: {
          type: Boolean,
          default: false,
        },
      },

      /* ---------------------------------------------------
         DRIVING LICENCE
      --------------------------------------------------- */

      drivingLicense: {
        documentUrl: {
          type: String,
          default: "",
        },

        documentNumber: {
          type: String,
          default: "",
          trim: true,
          uppercase: true,
        },

        uploadedAt: {
          type: Date,
          default: null,
        },

        verified: {
          type: Boolean,
          default: false,
        },
      },
    },

    /* =====================================================
       VERIFICATION STATUS
    ===================================================== */

    verificationStatus: {
      type: String,
      enum: [
        "pending",
        "under_review",
        "verified",
        "rejected",
      ],
      default: "pending",
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* =====================================================
       REJECTION
    ===================================================== */

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* =====================================================
       VERIFICATION NOTES
    ===================================================== */

    verificationNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    /* =====================================================
       AVAILABILITY
    ===================================================== */

    status: {
      type: String,
      enum: [
        "available",
        "busy",
        "offline",
        "suspended",
      ],
      default: "offline",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    /* =====================================================
       CUSTOMER PRIVACY
    ===================================================== */

    showPhoneToCustomer: {
      type: Boolean,
      default: false,
    },

    /* =====================================================
       LIVE LOCATION
    ===================================================== */

    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },

    locationUpdatedAt: {
      type: Date,
      default: null,
    },

    isLocationSharing: {
      type: Boolean,
      default: false,
    },

    /* =====================================================
       DELIVERY STATISTICS
    ===================================================== */

    totalDeliveries: {
      type: Number,
      default: 0,
      min: 0,
    },

    successfulDeliveries: {
      type: Number,
      default: 0,
      min: 0,
    },

    rating: {
      type: Number,
      default: 5,
      min: 0,
      max: 5,
    },

    /* =====================================================
       ADMIN
    ===================================================== */

    joinedAt: {
      type: Date,
      default: Date.now,
    },

    adminNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
  },

  {
    timestamps: true,
  }
);


/* =========================================================
   GEO INDEX
========================================================= */

courierSchema.index({
  currentLocation: "2dsphere",
});


/* =========================================================
   VERIFICATION INDEX
========================================================= */

courierSchema.index({
  verificationStatus: 1,
});


courierSchema.index({
  status: 1,
});


/* =========================================================
   MODEL
========================================================= */

export default mongoose.model(
  "Courier",
  courierSchema
);