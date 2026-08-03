import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    /* =====================================
       BASIC INFORMATION
    ===================================== */

    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    logo: {
      type: String,
      default: "",
    },

    banner: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    /* =====================================
       CATEGORY
    ===================================== */

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    /* =====================================
       BRAND DETAILS
    ===================================== */

    website: {
      type: String,
      default: "",
    },

    country: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      lowercase: true,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    establishedYear: {
      type: Number,
      default: null,
    },

    /* =====================================
       STATUS
    ===================================== */

    featured: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    /* =====================================
       ANALYTICS
    ===================================== */

    productCount: {
      type: Number,
      default: 0,
    },

    totalSales: {
      type: Number,
      default: 0,
    },

    averageRating: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/* =====================================
   AUTO GENERATE SLUG
===================================== */

brandSchema.pre("save",async function () {

  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  }


});

export default mongoose.model("Brand", brandSchema);