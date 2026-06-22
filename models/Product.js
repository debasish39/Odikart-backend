import mongoose from "mongoose";

/* =====================================
   REVIEW SCHEMA
===================================== */

const reviewSchema =
new mongoose.Schema({

  /* =====================================
     REVIEW USER
  ===================================== */

  user: {

    type:
      mongoose.Schema.Types.ObjectId,

    ref: "User",

    required: true,

  },

  reviewerName: {

    type: String,

    required: true,

  },

  reviewerEmail: {

    type: String,

    required: true,

  },

  reviewerImage: {

    type: String,

    default:
      "https://i.pravatar.cc/300",

  },

  /* =====================================
     REVIEW CONTENT
  ===================================== */

  rating: {

    type: Number,

    required: true,

    min: 1,

    max: 5,

  },

  comment: {

    type: String,

    required: true,

    trim: true,

  },

  /* =====================================
     REVIEW MEDIA
  ===================================== */

  images: [

    {

      type: String,

    },

  ],

  videos: [

    {

      type: String,

    },

  ],

  /* =====================================
     VERIFIED PURCHASE
  ===================================== */

  verifiedPurchase: {

    type: Boolean,

    default: false,

  },

  /* =====================================
     AI MODERATION
  ===================================== */

  isModerated: {

    type: Boolean,

    default: true,

  },

  moderationStatus: {

    type: String,

    enum: [

      "approved",

      "pending",

      "rejected",

    ],

    default: "approved",

  },

  moderationReason: {

    type: String,

    default: "",

  },

  /* =====================================
     REVIEW LIKES
  ===================================== */

  likes: [

    {

      type:
        mongoose.Schema.Types.ObjectId,

      ref: "User",

    },

  ],

  likesCount: {

    type: Number,

    default: 0,

  },

  /* =====================================
     SELLER RESPONSE
  ===================================== */

  sellerReply: {

    message: String,

    repliedAt: Date,

    seller: {

      type:
        mongoose.Schema.Types.ObjectId,

      ref: "User",

    },

  },

  /* =====================================
     REVIEW REPLIES
  ===================================== */

  replies: [

    {

      user: {

        type:
          mongoose.Schema.Types.ObjectId,

        ref: "User",

      },

      name: String,

      image: String,

      message: String,

      createdAt: {

        type: Date,

        default: Date.now,

      },

    },

  ],

  /* =====================================
     DATE
  ===================================== */

  createdAt: {

    type: Date,

    default: Date.now,

  },

});



/* =====================================
   PRODUCT SCHEMA
===================================== */

const productSchema = new mongoose.Schema(
  {
    /* =====================================
       BASIC INFO
    ===================================== */

    title: {
      type: String,

      required: true,

      trim: true,
    },

    slug: {
      type: String,

      unique: true,

      lowercase: true,
    },

    description: {
      type: String,

      required: true,
    },

    shortDescription: {
      type: String,

      default: "",
    },

    /* =====================================
       CATEGORY
    ===================================== */

    category: {
      type: String,

      required: true,
    },

    subCategory: {
      type: String,

      default: "",
    },

    tags: [
      {
        type: String,
      },
    ],

    /* =====================================
       BRAND
    ===================================== */

    brand: {
      type: String,

      default: "",
    },

    /* =====================================
       PRICING
    ===================================== */

    price: {
      type: Number,

      required: true,
    },

    originalPrice: {
      type: Number,

      default: 0,
    },

    discountPercentage: {
      type: Number,

      default: 0,
    },

    tax: {
      type: Number,

      default: 0,
    },

    shippingCharge: {
      type: Number,

      default: 0,
    },

    currency: {
      type: String,

      default: "INR",
    },

    /* =====================================
       STOCK
    ===================================== */

    stock: {
      type: Number,

      default: 0,
    },

    sold: {
      type: Number,

      default: 0,
    },

    minimumOrderQuantity: {
      type: Number,

      default: 1,
    },

    maximumOrderQuantity: {
      type: Number,

      default: 10,
    },

    inStock: {
      type: Boolean,

      default: true,
    },

    availabilityStatus: {
      type: String,

      default: "In Stock",
    },

    /* =====================================
       SIZE & COLORS
    ===================================== */

    /* =====================================
   SIZE VARIANTS
===================================== */

    sizes: [
      {
        label: {
          type: String,

          required: true,

          trim: true,
        },

        stock: {
          type: Number,

          default: 0,
        },

        price: {
          type: Number,

          default: 0,
        },

        sku: {
          type: String,

          default: "",
        },
      },
    ],

    colors: [
      {
        type: String,
      },
    ],

    /* =====================================
       PRODUCT DETAILS
    ===================================== */

    sku: {
      type: String,

      unique: true,
    },

    barcode: {
      type: String,

      default: "",
    },

    qrCode: {
      type: String,

      default: "",
    },

    weight: {
      type: Number,

      default: 0,
    },

    dimensions: {
      width: {
        type: Number,

        default: 0,
      },

      height: {
        type: Number,

        default: 0,
      },

      depth: {
        type: Number,

        default: 0,
      },
    },

    material: {
      type: String,

      default: "",
    },

    warrantyInformation: {
      type: String,

      default: "",
    },

    returnPolicy: {
      type: String,

      default: "",
    },

    shippingInformation: {
      type: String,

      default: "",
    },

    /* =====================================
       PRODUCT MEDIA
    ===================================== */

    images: [
      {
        type: String,
      },
    ],

    thumbnail: {
      type: String,

      default: "",
    },

    videoUrl: {
      type: String,

      default: "",
    },

    /* =====================================
       RATINGS
    ===================================== */

    rating: {
      type: Number,

      default: 0,
    },

    numReviews: {
      type: Number,

      default: 0,
    },

    reviews: [reviewSchema],

    /* =====================================
       SELLER
    ===================================== */

    seller: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",
    },

    /* =====================================
       FLAGS
    ===================================== */

    featured: {
      type: Boolean,

      default: false,
    },

    trending: {
      type: Boolean,

      default: false,
    },

    bestSeller: {
      type: Boolean,

      default: false,
    },

    isNewArrival: {
      type: Boolean,

      default: false,
    },

    isActive: {
      type: Boolean,

      default: true,
    },

    isDeleted: {
      type: Boolean,

      default: false,
    },

    /* =====================================
       SEO
    ===================================== */

    metaTitle: {
      type: String,

      default: "",
    },

    metaDescription: {
      type: String,

      default: "",
    },

    metaKeywords: [
      {
        type: String,
      },
    ],
  },

  {
    timestamps: true,
  },
);

/* =====================================
   AUTO GENERATE SLUG
===================================== */

/* =====================================
   AUTO GENERATE SLUG
===================================== */

productSchema.pre(
  "save",

  async function () {
    if (this.title) {
      this.slug = this.title

        .toLowerCase()

        .trim()

        .replace(/\s+/g, "-")

        .replace(/[^\w-]+/g, "");
    }
  },
);

const Product = mongoose.model(
  "Product",

  productSchema,
);

export default Product;
