import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    // ============================================================
    // USER
    // ============================================================
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ============================================================
    // ADDRESS LABEL
    // ============================================================
    label: {
      type: String,
      enum: ["Home", "Work", "Other"],
      default: "Home",
    },

    // ============================================================
    // CONTACT DETAILS
    // ============================================================
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    alternatePhone: {
      type: String,
      default: "",
      trim: true,
    },

    // ============================================================
    // PHYSICAL ADDRESS
    // ============================================================

    // House / Flat number
    houseNumber: {
      type: String,
      default: "",
      trim: true,
    },

    // Apartment / Building / Complex name
    buildingName: {
      type: String,
      default: "",
      trim: true,
    },

    // Floor number
    floor: {
      type: String,
      default: "",
      trim: true,
    },

    // Street / Road name
    street: {
      type: String,
      default: "",
      trim: true,
    },

    // Existing address fields
    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },

    addressLine2: {
      type: String,
      default: "",
      trim: true,
    },

    // Nearby identifiable location
    landmark: {
      type: String,
      default: "",
      trim: true,
    },

    // Area / locality
    area: {
      type: String,
      required: true,
      trim: true,
    },

    // Village name - useful for rural deliveries
    village: {
      type: String,
      default: "",
      trim: true,
    },

    // ============================================================
    // POSTAL INFORMATION
    // ============================================================

    // Exact post office selected from PIN lookup
    postOffice: {
      type: String,
      default: "",
      trim: true,
    },

    // Administrative block
    block: {
      type: String,
      default: "",
      trim: true,
    },

    // City / Town
    city: {
      type: String,
      required: true,
      trim: true,
    },

    // District
    district: {
      type: String,
      required: true,
      trim: true,
    },

    // State
    state: {
      type: String,
      required: true,
      trim: true,
    },

    // Indian 6-digit PIN
    postalCode: {
      type: String,
      required: true,
      match: /^[1-9][0-9]{5}$/,
    },

    country: {
      type: String,
      default: "India",
      trim: true,
    },

    // ============================================================
    // DELIVERY INSTRUCTIONS
    // ============================================================

    deliveryInstructions: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    // ============================================================
    // GPS LOCATION
    // ============================================================
    // Optional for now.
    // Later we can add "Use my current location" in the app.

    location: {
      latitude: {
        type: Number,
        default: null,
      },

      longitude: {
        type: Number,
        default: null,
      },
    },

    // ============================================================
    // ADDRESS SETTINGS
    // ============================================================

    isDefault: {
      type: Boolean,
      default: false,
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model(
  "Address",
  addressSchema,
);