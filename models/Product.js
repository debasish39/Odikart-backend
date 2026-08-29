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
      index: true,
    },

    /* =====================================
       ECOMMERCE DISCOVERY FLAGS
    ===================================== */

    isFlashSale: {
      type: Boolean,
      default: false,
      index: true,
    },

    isDealOfTheDay: {
      type: Boolean,
      default: false,
      index: true,
    },

    isRecommended: {
      type: Boolean,
      default: false,
      index: true,
    },

    isPopular: {
      type: Boolean,
      default: false,
      index: true,
    },

    isAlmostSoldOut: {
      type: Boolean,
      default: false,
      index: true,
    },

    isLowStock: {
      type: Boolean,
      default: false,
      index: true,
    },

    badges: [
      {
        type: String,
        enum: [
          "trending",
          "best-seller",
          "new",
          "featured",
          "deal",
          "flash-sale",
          "popular",
          "low-stock",
          "almost-sold-out",
          "top-rated",
          "verified",
        ],
      },
    ],

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
      /* =====================================
         LIFETIME ANALYTICS
      ===================================== */

      views: {
        type: Number,
        default: 0,
        min: 0,
      },

      wishlist: {
        type: Number,
        default: 0,
        min: 0,
      },

      cart: {
        type: Number,
        default: 0,
        min: 0,
      },

      orders: {
        type: Number,
        default: 0,
        min: 0,
      },

      sales: {
        type: Number,
        default: 0,
        min: 0,
      },

      revenue: {
        type: Number,
        default: 0,
        min: 0,
      },

      /* =====================================
         RECENT ACTIVITY
         Used for TRENDING calculation
      ===================================== */

      recentViews: {
        type: Number,
        default: 0,
        min: 0,
      },

      recentWishlist: {
        type: Number,
        default: 0,
        min: 0,
      },

      recentCart: {
        type: Number,
        default: 0,
        min: 0,
      },

      recentSales: {
        type: Number,
        default: 0,
        min: 0,
      },

      recentOrders: {
        type: Number,
        default: 0,
        min: 0,
      },

      /* =====================================
         RANKING
      ===================================== */

      trendingScore: {
        type: Number,
        default: 0,
        min: 0,
      },

      popularityScore: {
        type: Number,
        default: 0,
        min: 0,
      },

      conversionRate: {
        type: Number,
        default: 0,
        min: 0,
      },

      /* =====================================
         PERFORMANCE DATES
      ===================================== */

      lastViewedAt: {
        type: Date,
        default: null,
      },

      lastSoldAt: {
        type: Date,
        default: null,
      },

      lastCartAddedAt: {
        type: Date,
        default: null,
      },

      lastWishlistedAt: {
        type: Date,
        default: null,
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

      maxQuantity: {
        type: Number,
        default: null,
        min: 1,
      },

      label: {
        type: String,
        default: "",
        trim: true,
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
   ECOMMERCE RANKING HELPERS
===================================== */

/*
  Calculates a score from recent customer activity,
  lifetime sales, ratings and reviews.
*/
productSchema.methods.calculateTrendingScore =
  function () {
    const analytics = this.analytics || {};

    return Number(
      (
        Number(analytics.recentSales || 0) * 10 +
        Number(analytics.recentOrders || 0) * 8 +
        Number(analytics.recentCart || 0) * 5 +
        Number(analytics.recentWishlist || 0) * 4 +
        Number(analytics.recentViews || 0) * 2 +
        Number(analytics.sales || 0) +
        Number(analytics.orders || 0) * 2 +
        Number(this.rating || 0) * 5 +
        Number(this.numReviews || 0)
      ).toFixed(2)
    );
  };

/*
  Updates convenience ecommerce flags.
  This is safe for existing products because all
  new fields have defaults.
*/
productSchema.methods.updateEcommerceFlags =
  function () {
    const now = new Date();

    const stockValues = Array.isArray(this.variants)
      ? this.variants
          .filter(
            (variant) =>
              variant &&
              variant.isActive !== false
          )
          .map(
            (variant) =>
              Number(variant.stock || 0)
          )
      : [];

    const totalStock = stockValues.length
      ? stockValues.reduce(
          (sum, value) => sum + value,
          0
        )
      : 0;

    this.isLowStock =
      totalStock > 0 &&
      totalStock <= 5;

    this.isAlmostSoldOut =
      totalStock > 0 &&
      totalStock <= 2;

    this.isPopular =
      Number(
        this.analytics?.popularityScore || 0
      ) >= 50;

    this.trending =
      Number(
        this.analytics?.trendingScore || 0
      ) >= 50;

    this.bestSeller =
      Number(
        this.analytics?.sales || 0
      ) >= 10;

    this.isNewArrival =
      !!this.createdAt &&
      this.createdAt >=
        new Date(
          now.getTime() -
            30 * 24 * 60 * 60 * 1000
        );

    this.isFlashSale =
      this.offer?.enabled === true &&
      !!this.offer?.startDate &&
      !!this.offer?.endDate &&
      this.offer.startDate <= now &&
      this.offer.endDate >= now;

    this.isDealOfTheDay =
      this.offer?.enabled === true &&
      this.isFlashSale &&
      Number(this.offer?.value || 0) > 0;

    this.badges = [];

    if (this.trending) {
      this.badges.push("trending");
    }

    if (this.bestSeller) {
      this.badges.push("best-seller");
    }

    if (this.isNewArrival) {
      this.badges.push("new");
    }

    if (this.featured) {
      this.badges.push("featured");
    }

    if (this.isFlashSale) {
      this.badges.push("flash-sale");
      this.badges.push("deal");
    }

    if (this.isPopular) {
      this.badges.push("popular");
    }

    if (this.isLowStock) {
      this.badges.push("low-stock");
    }

    if (this.isAlmostSoldOut) {
      this.badges.push(
        "almost-sold-out"
      );
    }

    if (
      Number(this.rating || 0) >= 4.5 &&
      Number(this.numReviews || 0) >= 10
    ) {
      this.badges.push("top-rated");
    }

    return this;
  };

/* =====================================
   AUTO UPDATE ECOMMERCE ANALYTICS
===================================== */

productSchema.pre(
  "save",
  function () {

    /* =====================================
       UPDATE ANALYTICS
    ===================================== */

    if (this.analytics) {

      this.analytics.trendingScore =
        this.calculateTrendingScore();


      this.analytics.popularityScore =
        Number(
          (
            Number(
              this.analytics.trendingScore || 0
            ) +

            Number(
              this.rating || 0
            ) * 5 +

            Number(
              this.numReviews || 0
            ) +

            Number(
              this.analytics.sales || 0
            ) * 2

          ).toFixed(2)
        );


      const views =
        Number(
          this.analytics.views || 0
        );


      const orders =
        Number(
          this.analytics.orders || 0
        );


      this.analytics.conversionRate =
        views > 0
          ? Number(
              (
                (orders / views) *
                100
              ).toFixed(2)
            )
          : 0;

    }


    /* =====================================
       UPDATE ECOMMERCE FLAGS
    ===================================== */

    this.updateEcommerceFlags();

  }
);



/* =====================================
   ECOMMERCE PERFORMANCE INDEXES
===================================== */

productSchema.index({
  status: 1,
  isActive: 1,
  isDeleted: 1,
  "analytics.trendingScore": -1,
});

productSchema.index({
  status: 1,
  isActive: 1,
  isDeleted: 1,
  "analytics.sales": -1,
});

productSchema.index({
  status: 1,
  isActive: 1,
  isDeleted: 1,
  rating: -1,
});

productSchema.index({
  status: 1,
  isActive: 1,
  isDeleted: 1,
  createdAt: -1,
});

productSchema.index({
  featured: 1,
  isActive: 1,
  isDeleted: 1,
});

productSchema.index({
  trending: 1,
  isActive: 1,
  isDeleted: 1,
});

productSchema.index({
  bestSeller: 1,
  isActive: 1,
  isDeleted: 1,
});

productSchema.index({
  isNewArrival: 1,
  isActive: 1,
  isDeleted: 1,
});

productSchema.index({
  isFlashSale: 1,
  isActive: 1,
  isDeleted: 1,
});

productSchema.index({
  isDealOfTheDay: 1,
  isActive: 1,
  isDeleted: 1,
});

productSchema.index({
  isPopular: 1,
  isActive: 1,
  isDeleted: 1,
});

/* =====================================
   AUTO GENERATE SLUG
===================================== */

productSchema.pre("save", function () {
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
