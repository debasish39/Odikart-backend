import mongoose from "mongoose";

/* =====================================
   REVIEW SCHEMA
===================================== */

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reviewerName: {
      type: String,
      required: true,
      trim: true,
    },

    reviewerEmail: {
      type: String,
      required: true,
      trim: true,
    },

    reviewerImage: {
      type: String,
      default: "https://i.pravatar.cc/300",
    },

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

    verifiedPurchase: {
      type: Boolean,
      default: false,
    },

    isModerated: {
      type: Boolean,
      default: true,
    },

    moderationStatus: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
    },

    moderationReason: {
      type: String,
      default: "",
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    likesCount: {
      type: Number,
      default: 0,
    },

    sellerReply: {
      message: {
        type: String,
        default: "",
      },

      repliedAt: {
        type: Date,
        default: null,
      },

      seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    replies: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
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
  },
  {
    timestamps: true,
  },
);

/* =====================================
   PRODUCT SCHEMA
===================================== */

const productSchema = new mongoose.Schema(
  {
    /* =====================================
       BASIC INFORMATION
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
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    shortDescription: {
      type: String,
      default: "",
      trim: true,
    },

    /* =====================================
       CATEGORY
    ===================================== */

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    brand: {
      type: String,
      default: "",
      trim: true,
    },

    /* =====================================
   PRODUCT APPROVAL
===================================== */

    status: {
      type: String,

      enum: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "blocked",
        "suspended",
      ],

      default: "draft",
    },

    approvalHistory: [
      {
        action: {
          type: String,
          enum: [
            "submitted",
            "approved",
            "rejected",
            "suspended",
            "reactivated",
          ],
        },

        reason: {
          type: String,
          default: "",
        },

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

    rejectionReason: {
      type: String,
      default: "",
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    /* =====================================
       PRODUCT TYPE
    ===================================== */

    productType: {
      type: String,
      enum: ["simple", "variable"],
      default: "simple",
    },

    /* =====================================
       VARIANTS
    ===================================== */

    variants: [
      {
        sku: {
          type: String,
          required: true,
        },

        attributes: {
          type: Map,
          of: String,
          default: {},
        },

        price: {
          type: Number,
          required: true,
          min: 0,
        },

        originalPrice: {
          type: Number,
          default: 0,
          min: 0,
        },

        discountPercentage: {
          type: Number,
          default: 0,
          min: 0,
        },

        tax: {
          type: Number,
          default: 0,
          min: 0,
        },

        stock: {
          type: Number,
          default: 0,
          min: 0,
        },

        sold: {
          type: Number,
          default: 0,
          min: 0,
        },

        barcode: {
          type: String,
          default: "",
          trim: true,
        },

        weight: {
          type: Number,
          default: 0,
          min: 0,
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

        images: [
          {
            type: String,
          },
        ],

        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    /* =====================================
       DEFAULT PRODUCT PRICING
    ===================================== */

    currency: {
      type: String,
      default: "INR",
    },

    minimumOrderQuantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    maximumOrderQuantity: {
      type: Number,
      default: 10,
      min: 1,
    },

    /* =====================================
       PRODUCT MEDIA
    ===================================== */

    media: {
      thumbnail: {
        type: String,
        default: "",
      },

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
    },

    /* =====================================
       SHIPPING
    ===================================== */

    shipping: {
      freeShipping: {
        type: Boolean,
        default: false,
      },

      shippingCharge: {
        type: Number,
        default: 0,
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

    /* =====================================
       PRODUCT DETAILS
    ===================================== */

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
       RATINGS
    ===================================== */

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
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
      required: true,
    },

    /* =====================================
       PRODUCT FLAGS
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
       ANALYTICS
    ===================================== */

    analytics: {
      views: {
        type: Number,
        default: 0,
      },

      wishlist: {
        type: Number,
        default: 0,
      },

      cart: {
        type: Number,
        default: 0,
      },

      orders: {
        type: Number,
        default: 0,
      },

      sales: {
        type: Number,
        default: 0,
      },

      revenue: {
        type: Number,
        default: 0,
      },
    },

    /* =====================================
       APPROVAL HISTORY
    ===================================== */

    approvalHistory: [
      {
        action: {
          type: String,
          enum: ["submitted", "approved", "rejected", "blocked"],
        },

        reason: {
          type: String,
          default: "",
        },

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

    /* =====================================
       INVENTORY HISTORY
    ===================================== */

    inventoryHistory: [
      {
        variantSku: {
          type: String,
          default: "",
        },

        oldStock: {
          type: Number,
          default: 0,
        },

        newStock: {
          type: Number,
          default: 0,
        },

        action: {
          type: String,
          enum: ["initial", "restock", "sale", "return", "adjustment"],
        },

        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    /* =====================================
       QUESTIONS & ANSWERS
    ===================================== */

    questions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        question: {
          type: String,
          required: true,
        },

        answer: {
          type: String,
          default: "",
        },

        answeredBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        askedAt: {
          type: Date,
          default: Date.now,
        },

        answeredAt: {
          type: Date,
          default: null,
        },
      },
    ],

    /* =====================================
       RELATED PRODUCTS
    ===================================== */

    relatedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    /* =====================================
       OFFERS
    ===================================== */

    offer: {
      enabled: {
        type: Boolean,
        default: false,
      },

      discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage",
      },

      value: {
        type: Number,
        default: 0,
      },

      startDate: {
        type: Date,
        default: null,
      },

      endDate: {
        type: Date,
        default: null,
      },
    },

    /* =====================================
       SEO
    ===================================== */

    seo: {
      metaTitle: {
        type: String,
        default: "",
      },

      metaDescription: {
        type: String,
        default: "",
      },

      keywords: [
        {
          type: String,
        },
      ],

      canonicalUrl: {
        type: String,
        default: "",
      },

      ogImage: {
        type: String,
        default: "",
      },
    },

    /* =====================================
       AI
    ===================================== */

    ai: {
      generatedDescription: {
        type: String,
        default: "",
      },

      seoTitle: {
        type: String,
        default: "",
      },

      seoDescription: {
        type: String,
        default: "",
      },

      keywords: [
        {
          type: String,
        },
      ],
    },
  },

  {
    timestamps: true,
  },
);

/* =====================================
   AUTO GENERATE SLUG
===================================== */

productSchema.pre("save", async function () {
  if (this.title && this.isModified("title")) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  }
});

/* =====================================
   MODEL
===================================== */

const Product = mongoose.model("Product", productSchema);

export default Product;
