import mongoose from "mongoose";
import Product from "../models/Product.js";
import slugify from "slugify";
import { nanoid } from "nanoid";
import Order from "../models/Order.js";
import Category from "../models/Category.js";
import User from "../models/User.js";
import RecentlyViewed from "../models/RecentlyViewed.js";


/* =====================================
   RECENTLY VIEWED PRODUCTS
   COOKIE BASED - NO AUTH REQUIRED
===================================== */

/*
  We use a visitorId cookie instead of req.user.

  This means:
  - Logged-in users can use it
  - Guest users can use it
  - No Bearer token is required
  - Each browser gets its own recently viewed history
*/

const RECENT_COOKIE_NAME = "recentVisitorId";

const getOrCreateVisitorId = (req, res) => {
  console.log("\n========================================");
  console.log("🍪 RECENTLY VIEWED COOKIE CHECK");
  console.log("========================================");

  console.log("🍪 Request URL:", req.originalUrl);
  console.log("🍪 Request method:", req.method);

  console.log(
    "🍪 All cookies:",
    req.cookies
  );

  let visitorId =
    req.cookies?.[RECENT_COOKIE_NAME];

  console.log(
    "🍪 Existing visitorId:",
    visitorId || "NOT FOUND"
  );

  if (!visitorId) {
    visitorId = nanoid(32);

    console.log(
      "🆕 Creating new visitorId:",
      visitorId
    );

    res.cookie(
      RECENT_COOKIE_NAME,
      visitorId,
      {
        httpOnly: true,

        // localhost = false
        // production HTTPS = true
        secure:
          process.env.NODE_ENV ===
          "production",

        // Works for localhost frontend/backend
        sameSite: "lax",

        maxAge:
          1000 *
          60 *
          60 *
          24 *
          365,

        path: "/",
      }
    );

    console.log(
      "🍪 Cookie created successfully"
    );
  }

  console.log(
    "🍪 FINAL visitorId:",
    visitorId
  );

  console.log("========================================");

  return visitorId;
};


/* =====================================
   ADD RECENTLY VIEWED
   POST /products/recently-viewed/:productId
===================================== */

export const addRecentlyViewed = async (
  req,
  res
) => {
  console.log("\n");
  console.log(
    "========================================"
  );
  console.log(
    "🟠 ADD RECENTLY VIEWED REQUEST"
  );
  console.log(
    "========================================"
  );

  try {
    const { productId } =
      req.params;

    console.log(
      "🟠 Product ID:",
      productId
    );

    console.log(
      "🟠 Authorization header:",
      req.headers.authorization
        ? "PRESENT"
        : "NOT PRESENT"
    );

    console.log(
      "🟠 Cookies:",
      req.cookies
    );

    /* =====================================
       VALIDATE PRODUCT ID
    ===================================== */

    if (
      !isValidObjectId(productId)
    ) {
      console.error(
        "❌ Invalid product ID:",
        productId
      );

      return res.status(400).json({
        success: false,
        message:
          "Invalid product ID",
      });
    }

    console.log(
      "✅ Product ID is valid"
    );

    /* =====================================
       FIND PRODUCT
    ===================================== */

    const product =
      await Product.findOne({
        _id: productId,
        ...PUBLIC_PRODUCT_QUERY,
      }).select("_id title");

    console.log(
      "🟠 Product found:",
      Boolean(product)
    );

    if (!product) {
      console.error(
        "❌ Product not found"
      );

      return res.status(404).json({
        success: false,
        message:
          "Product not found",
      });
    }

    console.log(
      "✅ Product:",
      product.title
    );

    /* =====================================
       GET COOKIE VISITOR ID
    ===================================== */

    const visitorId =
      getOrCreateVisitorId(
        req,
        res
      );

    console.log(
      "🟠 Using visitorId:",
      visitorId
    );

    /* =====================================
       SAVE / UPDATE
    ===================================== */

    const record =
      await RecentlyViewed.findOneAndUpdate(
        {
          visitorId,
          product: productId,
        },

        {
          $set: {
            viewedAt:
              new Date(),
          },

          $setOnInsert: {
            visitorId,
            product:
              productId,
          },
        },

        {
          upsert: true,
          new: true,
          setDefaultsOnInsert:
            true,
        }
      );

    console.log(
      "✅ Recently viewed saved"
    );

    console.log(
      "Record ID:",
      record?._id
    );

    console.log(
      "Visitor ID:",
      record?.visitorId
    );

    console.log(
      "Product ID:",
      record?.product
    );

    console.log(
      "Viewed At:",
      record?.viewedAt
    );

    console.log(
      "========================================"
    );

    return res.status(200).json({
      success: true,
      message:
        "Recently viewed updated",
    });

  } catch (error) {

    console.error(
      "\n❌ ADD RECENTLY VIEWED ERROR"
    );

    console.error(
      "Error:",
      error
    );

    console.error(
      "Message:",
      error?.message
    );

    console.error(
      "Stack:",
      error?.stack
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update recently viewed",
      error:
        error?.message,
    });
  }
};


/* =====================================
   GET RECENTLY VIEWED
   GET /products/recently-viewed
===================================== */

export const getRecentlyViewed = async (
  req,
  res
) => {

  console.log("\n");
  console.log(
    "========================================"
  );
  console.log(
    "🔵 GET RECENTLY VIEWED REQUEST"
  );
  console.log(
    "========================================"
  );

  try {

    console.log(
      "🔵 URL:",
      req.originalUrl
    );

    console.log(
      "🔵 Method:",
      req.method
    );

    console.log(
      "🔵 Authorization:",
      req.headers.authorization
        ? "PRESENT"
        : "NOT PRESENT"
    );

    console.log(
      "🔵 Cookies:",
      req.cookies
    );

    /* =====================================
       GET VISITOR ID
    ===================================== */

    const visitorId =
      getOrCreateVisitorId(
        req,
        res
      );

    console.log(
      "🔵 Visitor ID:",
      visitorId
    );

    /* =====================================
       LIMIT
    ===================================== */

    const limit =
      normalizeLimit(
        req.query.limit,
        20
      );

    console.log(
      "🔵 Limit:",
      limit
    );

    /* =====================================
       FIND RECENTLY VIEWED
    ===================================== */

    const records =
      await RecentlyViewed.find({
        visitorId,
      })
        .sort({
          viewedAt: -1,
        })
        .limit(limit)
        .populate({
          path: "product",

          match: {
            ...PUBLIC_PRODUCT_QUERY,
          },

          populate: [
            {
              path: "category",
              select:
                "name slug image",
            },

            {
              path: "subCategory",
              select:
                "name slug",
            },

            {
              path: "seller",
              select:
                "firstName lastName image sellerInfo.store.shopName sellerStatus",
            },
          ],
        })
        .lean();

    console.log(
      "🔵 MongoDB records:",
      records.length
    );

    console.log(
      "🔵 Records:",
      records
    );

    /* =====================================
       BUILD PRODUCTS
    ===================================== */

    const products =
      records
        .filter(
          (record) =>
            record.product
        )
        .map(
          (record) => ({
            ...record.product,

            recentlyViewedAt:
              record.viewedAt,
          })
        );

    console.log(
      "🟢 Final products:",
      products.length
    );

    console.log(
      "🟢 Products:",
      products
    );

    console.log(
      "========================================"
    );

    return res.status(200).json({
      success: true,

      count:
        products.length,

      products,
    });

  } catch (error) {

    console.error(
      "\n❌ GET RECENTLY VIEWED ERROR"
    );

    console.error(
      "Error:",
      error
    );

    console.error(
      "Message:",
      error?.message
    );

    console.error(
      "Stack:",
      error?.stack
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to load recently viewed products",

      error:
        error?.message,
    });
  }
};


/* =====================================
   REMOVE ONE
   DELETE /products/recently-viewed/:productId
===================================== */

export const removeRecentlyViewed =
  async (
    req,
    res
  ) => {

    console.log("\n");
    console.log(
      "========================================"
    );
    console.log(
      "🟡 REMOVE RECENTLY VIEWED"
    );
    console.log(
      "========================================"
    );

    try {

      const { productId } =
        req.params;

      console.log(
        "🟡 Product ID:",
        productId
      );

      if (
        !isValidObjectId(
          productId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID",
        });
      }

      const visitorId =
        getOrCreateVisitorId(
          req,
          res
        );

      console.log(
        "🟡 Visitor ID:",
        visitorId
      );

      const result =
        await RecentlyViewed.deleteOne(
          {
            visitorId,
            product:
              productId,
          }
        );

      console.log(
        "🟢 Delete result:",
        result
      );

      return res.status(200).json({
        success: true,

        message:
          "Product removed from recently viewed",
      });

    } catch (error) {

      console.error(
        "❌ REMOVE RECENTLY VIEWED ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to remove recently viewed product",

        error:
          error?.message,
      });
    }
  };


/* =====================================
   CLEAR ALL
   DELETE /products/recently-viewed
===================================== */

export const clearRecentlyViewed =
  async (
    req,
    res
  ) => {

    console.log("\n");
    console.log(
      "========================================"
    );
    console.log(
      "🔴 CLEAR RECENTLY VIEWED"
    );
    console.log(
      "========================================"
    );

    try {

      const visitorId =
        getOrCreateVisitorId(
          req,
          res
        );

      console.log(
        "🔴 Visitor ID:",
        visitorId
      );

      const result =
        await RecentlyViewed.deleteMany(
          {
            visitorId,
          }
        );

      console.log(
        "🟢 Clear result:",
        result
      );

      return res.status(200).json({
        success: true,

        message:
          "Recently viewed history cleared",
      });

    } catch (error) {

      console.error(
        "❌ CLEAR RECENTLY VIEWED ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to clear recently viewed",

        error:
          error?.message,
      });
    }
  };

/* =====================================
   CREATE PRODUCT
===================================== */


/* =====================================
   SECURITY HELPERS
===================================== */

const MAX_PAGE_SIZE = 100;
const MAX_TEXT = 20000;
const MAX_COMMENT = 2000;
const MAX_REASON = 1000;
const MAX_VARIANTS = 100;
const MAX_STOCK = 100000000;

const isValidObjectId = (id) =>
  Boolean(id) && mongoose.Types.ObjectId.isValid(id);

const getUserId = (req) =>
  req.user?._id || req.user?.id;

const cleanString = (value, maxLength = MAX_TEXT) => {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
};

const escapeRegex = (value) =>
  cleanString(value, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseJsonField = (value, fallback) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const getPagination = (req) => {
  const requestedPage = Number(req.query.page);
  const requestedLimit = Number(req.query.limit);

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const limit =
    Number.isInteger(requestedLimit) &&
    requestedLimit > 0 &&
    requestedLimit <= MAX_PAGE_SIZE
      ? requestedLimit
      : 20;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const requireAdmin = (req, res) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Admin access only",
    });
    return false;
  }

  return true;
};

const getApprovedSeller = async (req, res) => {
  const sellerId = getUserId(req);

  if (!sellerId || !isValidObjectId(sellerId)) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return null;
  }

  const seller = await User.findById(sellerId).select(
    "_id role sellerStatus isBlocked isDeleted sellerInfo.verification.status"
  );

  if (!seller) {
    res.status(404).json({
      success: false,
      message: "Seller not found",
    });
    return null;
  }

  if (seller.role !== "seller") {
    res.status(403).json({
      success: false,
      message: "Seller access only",
    });
    return null;
  }

  if (seller.isBlocked || seller.isDeleted) {
    res.status(403).json({
      success: false,
      message: "Seller account is not active",
    });
    return null;
  }

  /*
    Both values must be approved.

    This is important for OdiKart:
    sellerStatus alone must never be trusted as proof
    that KYC/verification was approved.
  */
  if (
    seller.sellerStatus !== "approved" ||
    seller.sellerInfo?.verification?.status !== "approved"
  ) {
    res.status(403).json({
      success: false,
      message:
        "Seller verification is not approved. Complete document verification before managing products.",
      sellerStatus: seller.sellerStatus,
      verificationStatus:
        seller.sellerInfo?.verification?.status || "pending",
    });
    return null;
  }

  return seller;
};

const validateVariants = (variants) => {
  if (!Array.isArray(variants) || variants.length === 0) {
    return {
      valid: false,
      message: "At least one product variant is required",
    };
  }

  if (variants.length > MAX_VARIANTS) {
    return {
      valid: false,
      message: `A product cannot contain more than ${MAX_VARIANTS} variants`,
    };
  }

  const seenSkus = new Set();
  const normalized = [];

  for (const variant of variants) {
    const sku = cleanString(variant?.sku, 100);

    if (!sku) {
      return {
        valid: false,
        message: "Every variant must have a SKU",
      };
    }

    if (seenSkus.has(sku)) {
      return {
        valid: false,
        message: "Duplicate SKU values are not allowed",
      };
    }

    seenSkus.add(sku);

    const price = Number(variant?.price);
    const originalPrice = Number(variant?.originalPrice || 0);
    const stock = Number(variant?.stock);
    const weight = Number(variant?.weight || 0);

    if (!Number.isFinite(price) || price < 0) {
      return {
        valid: false,
        message: `Invalid price for SKU ${sku}`,
      };
    }

    if (
      !Number.isInteger(stock) ||
      stock < 0 ||
      stock > MAX_STOCK
    ) {
      return {
        valid: false,
        message: `Invalid stock for SKU ${sku}`,
      };
    }

    if (!Number.isFinite(originalPrice) || originalPrice < 0) {
      return {
        valid: false,
        message: `Invalid original price for SKU ${sku}`,
      };
    }

    if (!Number.isFinite(weight) || weight < 0) {
      return {
        valid: false,
        message: `Invalid weight for SKU ${sku}`,
      };
    }

    normalized.push({
      ...variant,
      sku,
      price,
      originalPrice,
      stock,
      weight,
      isActive: variant?.isActive !== false,
    });
  }

  return {
    valid: true,
    variants: normalized,
  };
};

/* =====================================
   ECOMMERCE DISCOVERY HELPERS
===================================== */

const PUBLIC_PRODUCT_QUERY = {
  isDeleted: false,
  isActive: true,
  status: "approved",
};

const DISCOVERY_LIMIT = 20;

const normalizeLimit = (value, fallback = DISCOVERY_LIMIT) => {
  const number = Number(value);

  if (
    !Number.isInteger(number) ||
    number <= 0
  ) {
    return fallback;
  }

  return Math.min(number, MAX_PAGE_SIZE);
};

const getDiscoveryCategory = async (value) => {
  if (!value) {
    return null;
  }

  const normalized = cleanString(value, 100);

  if (
    isValidObjectId(normalized)
  ) {
    return new mongoose.Types.ObjectId(
      normalized
    );
  }

  const category =
    await Category.findOne({
      name: {
        $regex: `^${escapeRegex(
          normalized
        )}$`,
        $options: "i",
      },
    }).select("_id");

  return category?._id || null;
};

const getActiveVariantStockExpression = () => ({
  $sum: {
    $map: {
      input: {
        $filter: {
          input: "$variants",
          as: "variant",
          cond: {
            $ne: [
              "$$variant.isActive",
              false,
            ],
          },
        },
      },
      as: "variant",
      in: {
        $ifNull: [
          "$$variant.stock",
          0,
        ],
      },
    },
  },
});

const getDiscoverySort = (type) => {
  switch (type) {
    case "trending":
      return {
        "analytics.trendingScore": -1,
        rating: -1,
        numReviews: -1,
        createdAt: -1,
      };

    case "bestSeller":
      return {
        "analytics.sales": -1,
        "analytics.orders": -1,
        rating: -1,
        createdAt: -1,
      };

    case "popular":
      return {
        "analytics.popularityScore": -1,
        "analytics.views": -1,
        rating: -1,
      };

    case "topRated":
      return {
        rating: -1,
        numReviews: -1,
        "analytics.sales": -1,
      };

    case "newArrival":
      return {
        createdAt: -1,
        rating: -1,
      };

    case "featured":
      return {
        featured: -1,
        "analytics.trendingScore": -1,
        rating: -1,
      };

    case "recommended":
      return {
        "analytics.popularityScore": -1,
        "analytics.trendingScore": -1,
        rating: -1,
        numReviews: -1,
      };

    case "deal":
    case "flashSale":
      return {
        "offer.value": -1,
        "analytics.trendingScore": -1,
        rating: -1,
      };

    case "lowStock":
      return {
        stockCount: 1,
        "analytics.sales": -1,
        rating: -1,
      };

    default:
      return {
        "analytics.trendingScore": -1,
        rating: -1,
        createdAt: -1,
      };
  }
};

const getDiscoveryProducts = async ({
  type,
  req,
  extraQuery = {},
}) => {
  const limit = normalizeLimit(
    req.query.limit
  );

  const query = {
    ...PUBLIC_PRODUCT_QUERY,
    ...extraQuery,
  };

  if (req.query.category) {
    const categoryId =
      await getDiscoveryCategory(
        req.query.category
      );

    if (!categoryId) {
      return {
        products: [],
        total: 0,
        limit,
      };
    }

    query.category = categoryId;
  }

  if (req.query.brand) {
    query.brand = {
      $regex: escapeRegex(
        req.query.brand
      ),
      $options: "i",
    };
  }

  if (req.query.search) {
    query.title = {
      $regex: escapeRegex(
        req.query.search
      ),
      $options: "i",
    };
  }

  const pipeline = [
    {
      $match: query,
    },
    {
      $addFields: {
        stockCount:
          getActiveVariantStockExpression(),
      },
    },
  ];

  if (
    type === "lowStock"
  ) {
    pipeline.push({
      $match: {
        stockCount: {
          $gt: 0,
          $lte: 5,
        },
      },
    });
  }

  if (
    type === "flashSale"
  ) {
    const now = new Date();

    pipeline.push({
      $match: {
        "offer.enabled": true,
        "offer.startDate": {
          $lte: now,
        },
        "offer.endDate": {
          $gte: now,
        },
      },
    });
  }

  if (
    type === "deal"
  ) {
    const now = new Date();

    pipeline.push({
      $match: {
        "offer.enabled": true,
        "offer.startDate": {
          $lte: now,
        },
        "offer.endDate": {
          $gte: now,
        },
        "offer.value": {
          $gt: 0,
        },
      },
    });
  }

  pipeline.push(
    {
      $sort: getDiscoverySort(type),
    },
    {
      $limit: limit,
    }
  );

  const products =
    await Product.aggregate(
      pipeline
    );

  return {
    products,
    total: products.length,
    limit,
  };
};

/* =====================================
   DISCOVERY ENDPOINTS
===================================== */

/*
  GET /products/trending
*/
export const getTrendingProducts =
  async (req, res) => {
    try {
      const result =
        await getDiscoveryProducts({
          type: "trending",
          req,
        });

      return res.status(200).json({
        success: true,
        type: "trending",
        count: result.products.length,
        products: result.products,
      });
    } catch (error) {
      console.error(
        "Get Trending Products Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load trending products",
      });
    }
  };

/*
  GET /products/best-sellers
*/
export const getBestSellerProducts =
  async (req, res) => {
    try {
      const result =
        await getDiscoveryProducts({
          type: "bestSeller",
          req,
        });

      return res.status(200).json({
        success: true,
        type: "bestSeller",
        count: result.products.length,
        products: result.products,
      });
    } catch (error) {
      console.error(
        "Get Best Seller Products Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load best seller products",
      });
    }
  };

/*
  GET /products/popular
*/
export const getPopularProducts =
  async (req, res) => {
    try {
      const result =
        await getDiscoveryProducts({
          type: "popular",
          req,
        });

      return res.status(200).json({
        success: true,
        type: "popular",
        count: result.products.length,
        products: result.products,
      });
    } catch (error) {
      console.error(
        "Get Popular Products Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load popular products",
      });
    }
  };

/*
  GET /products/top-rated
*/
export const getTopRatedProducts =
  async (req, res) => {
    try {
      const result =
        await getDiscoveryProducts({
          type: "topRated",
          req,
        });

      return res.status(200).json({
        success: true,
        type: "topRated",
        count: result.products.length,
        products: result.products,
      });
    } catch (error) {
      console.error(
        "Get Top Rated Products Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load top rated products",
      });
    }
  };

/*
  GET /products/new-arrivals
*/
export const getNewArrivalProducts =
  async (req, res) => {
    try {
      const result =
        await getDiscoveryProducts({
          type: "newArrival",
          req,
        });

      return res.status(200).json({
        success: true,
        type: "newArrival",
        count: result.products.length,
        products: result.products,
      });
    } catch (error) {
      console.error(
        "Get New Arrival Products Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load new arrivals",
      });
    }
  };

/*
  GET /products/featured
*/
export const getFeaturedProducts =
  async (req, res) => {
    try {
      const result =
        await getDiscoveryProducts({
          type: "featured",
          req,
          extraQuery: {
            featured: true,
          },
        });

      return res.status(200).json({
        success: true,
        type: "featured",
        count: result.products.length,
        products: result.products,
      });
    } catch (error) {
      console.error(
        "Get Featured Products Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load featured products",
      });
    }
  };

/*
  GET /products/recommended
  Supports category/brand/search context.
*/
export const getRecommendedProducts =
  async (req, res) => {
    try {
      const excludeId =
        req.query.excludeId;

      const extraQuery = {};

      if (
        excludeId &&
        isValidObjectId(excludeId)
      ) {
        extraQuery._id = {
          $ne: new mongoose.Types.ObjectId(
            excludeId
          ),
        };
      }

      const result =
        await getDiscoveryProducts({
          type: "recommended",
          req,
          extraQuery,
        });

      return res.status(200).json({
        success: true,
        type: "recommended",
        count: result.products.length,
        products: result.products,
      });
    } catch (error) {
      console.error(
        "Get Recommended Products Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load recommended products",
      });
    }
  };

/*
  GET /products/flash-sales
*/
export const getFlashSaleProducts =
  async (req, res) => {
    try {
      const result =
        await getDiscoveryProducts({
          type: "flashSale",
          req,
        });

      return res.status(200).json({
        success: true,
        type: "flashSale",
        count: result.products.length,
        products: result.products,
      });
    } catch (error) {
      console.error(
        "Get Flash Sale Products Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load flash sale products",
      });
    }
  };

/*
  GET /products/deals
*/
export const getDealProducts =
  async (req, res) => {
    try {
      const result =
        await getDiscoveryProducts({
          type: "deal",
          req,
        });

      return res.status(200).json({
        success: true,
        type: "deal",
        count: result.products.length,
        products: result.products,
      });
    } catch (error) {
      console.error(
        "Get Deal Products Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load deals",
      });
    }
  };

/*
  GET /products/low-stock
*/
export const getLowStockProducts =
  async (req, res) => {
    try {
      const result =
        await getDiscoveryProducts({
          type: "lowStock",
          req,
        });

      return res.status(200).json({
        success: true,
        type: "lowStock",
        count: result.products.length,
        products: result.products,
      });
    } catch (error) {
      console.error(
        "Get Low Stock Products Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load low stock products",
      });
    }
  };

/*
  Records a product event from the frontend.
  event:
    view | wishlist | cart | sale | order

  Use this for events that are not already
  incremented by your cart/order controllers.
*/
export const trackProductEvent =
  async (req, res) => {
    try {
      const { id } = req.params;
      const event =
        cleanString(
          req.body?.event,
          30
        ).toLowerCase();

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID",
        });
      }

      const allowedEvents = new Set([
        "view",
        "wishlist",
        "cart",
        "sale",
        "order",
      ]);

      if (
        !allowedEvents.has(event)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product event",
        });
      }

      const now = new Date();

      const incrementMap = {
        view: {
          "analytics.views": 1,
          "analytics.recentViews": 1,
        },
        wishlist: {
          "analytics.wishlist": 1,
          "analytics.recentWishlist": 1,
        },
        cart: {
          "analytics.cart": 1,
          "analytics.recentCart": 1,
        },
        sale: {
          "analytics.sales": 1,
          "analytics.recentSales": 1,
        },
        order: {
          "analytics.orders": 1,
          "analytics.recentOrders": 1,
        },
      };

      const timestampMap = {
        view: {
          "analytics.lastViewedAt": now,
        },
        wishlist: {
          "analytics.lastWishlistedAt": now,
        },
        cart: {
          "analytics.lastCartAddedAt": now,
        },
        sale: {
          "analytics.lastSoldAt": now,
        },
        order: {
          "analytics.lastSoldAt": now,
        },
      };

      const product =
        await Product.findOneAndUpdate(
          {
            _id: id,
            ...PUBLIC_PRODUCT_QUERY,
          },
          {
            $inc:
              incrementMap[event],
            $set:
              timestampMap[event],
          },
          {
            new: true,
          }
        ).select(
          "_id title analytics rating numReviews"
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      /*
        Recalculate score immediately so a view/cart/
        wishlist can influence the next trending query.
      */
      const analytics =
        product.analytics || {};

      const trendingScore =
        Number(
          (
            Number(
              analytics.recentSales || 0
            ) * 10 +
            Number(
              analytics.recentOrders || 0
            ) * 8 +
            Number(
              analytics.recentCart || 0
            ) * 5 +
            Number(
              analytics.recentWishlist || 0
            ) * 4 +
            Number(
              analytics.recentViews || 0
            ) * 2 +
            Number(
              analytics.sales || 0
            ) +
            Number(
              analytics.orders || 0
            ) * 2 +
            Number(
              product.rating || 0
            ) * 5 +
            Number(
              product.numReviews || 0
            )
          ).toFixed(2)
        );

      const popularityScore =
        Number(
          (
            trendingScore +
            Number(
              product.rating || 0
            ) * 5 +
            Number(
              product.numReviews || 0
            ) +
            Number(
              analytics.sales || 0
            ) * 2
          ).toFixed(2)
        );

      await Product.updateOne(
        {
          _id: id,
        },
        {
          $set: {
            "analytics.trendingScore":
              trendingScore,
            "analytics.popularityScore":
              popularityScore,
            "analytics.conversionRate":
              Number(
                analytics.views || 0
              ) > 0
                  ? Number(
                      (
                        (Number(
                          analytics.orders ||
                            0
                        ) /
                          Number(
                            analytics.views ||
                              0
                          )) *
                        100
                      ).toFixed(2)
                    )
                  : 0,
          },
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Product event recorded",
        event,
      });
    } catch (error) {
      console.error(
        "Track Product Event Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to record product event",
      });
    }
  };

/* =====================================
   CREATE PRODUCT
===================================== */

export const createProduct = async (req, res) => {
  const requestId =
    `PRODUCT-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  const startedAt = Date.now();

  console.log("\n");
  console.log("==================================================");
  console.log(`🚀 ${requestId} CREATE PRODUCT REQUEST START`);
  console.log("==================================================");

  try {

    /* =====================================================
       1. REQUEST INFORMATION
    ===================================================== */

    console.log("\n========== 1. REQUEST ==========");

    console.log("Request ID:", requestId);
    console.log("Method:", req.method);
    console.log("URL:", req.originalUrl);
    console.log("Content-Type:", req.headers["content-type"]);
    console.log(
      "Authorization exists:",
      Boolean(req.headers.authorization)
    );

    console.log(
      "Authorization prefix:",
      req.headers.authorization
        ? req.headers.authorization.slice(0, 25) + "..."
        : null
    );


    /* =====================================================
       2. AUTH USER
    ===================================================== */

    console.log("\n========== 2. AUTH USER ==========");

    console.log(
      "req.user:",
      req.user
    );

    console.log(
      "req.user.id:",
      req.user?.id
    );

    console.log(
      "req.user._id:",
      req.user?._id
    );

    console.log(
      "req.user.role:",
      req.user?.role
    );


    const sellerId =
      req.user?._id ||
      req.user?.id;


    console.log(
      "Resolved sellerId:",
      sellerId
    );


    /* =====================================================
       3. SELLER ID VALIDATION
    ===================================================== */

    console.log(
      "\n========== 3. SELLER ID VALIDATION =========="
    );


    if (
      !sellerId ||
      !mongoose.Types.ObjectId.isValid(
        sellerId
      )
    ) {

      console.error(
        "❌ INVALID SELLER ID"
      );

      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
        debug: {
          requestId,
          sellerId:
            sellerId || null,
        },
      });

    }


    console.log(
      "✅ Seller ID valid:",
      sellerId
    );


    /* =====================================================
       4. DATABASE SELLER LOOKUP
    ===================================================== */

    console.log(
      "\n========== 4. DATABASE SELLER =========="
    );


    const seller =
      await User.findById(
        sellerId
      ).select(
        `
        _id
        firstName
        lastName
        email
        role
        sellerStatus
        isBlocked
        isDeleted
        sellerInfo.verification.status
        sellerInfo.store.shopName
        `
      );


    console.log(
      "Seller found:",
      Boolean(seller)
    );


    if (!seller) {

      console.error(
        "❌ SELLER NOT FOUND"
      );

      return res.status(404).json({
        success: false,
        message:
          "Seller not found",
        debug: {
          requestId,
          sellerId,
        },
      });

    }


    console.log(
      "Seller ID:",
      seller._id
    );

    console.log(
      "Seller email:",
      seller.email
    );

    console.log(
      "Seller role:",
      seller.role
    );

    console.log(
      "Seller status:",
      seller.sellerStatus
    );

    console.log(
      "KYC status:",
      seller.sellerInfo
        ?.verification
        ?.status
    );

    console.log(
      "Blocked:",
      seller.isBlocked
    );

    console.log(
      "Deleted:",
      seller.isDeleted
    );


    /* =====================================================
       5. SELLER AUTHORIZATION
    ===================================================== */

    console.log(
      "\n========== 5. SELLER AUTHORIZATION =========="
    );


    const roleApproved =
      seller.role === "seller";

    const sellerApproved =
      seller.sellerStatus ===
      "approved";

    const kycApproved =
      seller.sellerInfo
        ?.verification
        ?.status ===
      "approved";


    console.log(
      "Role approved:",
      roleApproved
    );

    console.log(
      "Seller approved:",
      sellerApproved
    );

    console.log(
      "KYC approved:",
      kycApproved
    );


    if (!roleApproved) {

      console.error(
        "❌ ROLE CHECK FAILED"
      );

      return res.status(403).json({
        success: false,
        message:
          "Only sellers can create products",
        debug: {
          requestId,
          role:
            seller.role || null,
        },
      });

    }


    if (
      seller.isBlocked ||
      seller.isDeleted
    ) {

      console.error(
        "❌ ACCOUNT STATUS CHECK FAILED"
      );

      return res.status(403).json({
        success: false,
        message:
          "Seller account is not active",
        debug: {
          requestId,
          isBlocked:
            seller.isBlocked,
          isDeleted:
            seller.isDeleted,
        },
      });

    }


    if (!sellerApproved) {

      console.error(
        "❌ SELLER APPROVAL FAILED"
      );

      return res.status(403).json({
        success: false,
        message:
          "Seller account is not approved",
        debug: {
          requestId,
          sellerStatus:
            seller.sellerStatus,
        },
      });

    }


    if (!kycApproved) {

      console.error(
        "❌ KYC APPROVAL FAILED"
      );

      return res.status(403).json({
        success: false,
        message:
          "Seller KYC verification is not approved",
        debug: {
          requestId,
          verificationStatus:
            seller.sellerInfo
              ?.verification
              ?.status ||
            "pending",
        },
      });

    }


    console.log(
      "✅ SELLER AUTHORIZATION PASSED"
    );


    /* =====================================================
       6. REQUEST BODY
    ===================================================== */

    console.log(
      "\n========== 6. REQUEST BODY =========="
    );


    console.log(
      "Body keys:",
      Object.keys(
        req.body || {}
      )
    );


    console.log(
      "Full body:",
      req.body
    );


    /* =====================================================
       7. REQUEST FILES
    ===================================================== */

    console.log(
      "\n========== 7. REQUEST FILES =========="
    );


    console.log(
      "req.files exists:",
      Boolean(req.files)
    );


    console.log(
      "req.files:",
      req.files
    );


    /* =====================================================
       8. EXTRACT PRODUCT DATA
    ===================================================== */

    console.log(
      "\n========== 8. PRODUCT DATA =========="
    );


    const {
      title,
      description,
      shortDescription,
      category,
      subCategory,
      tags: rawTags,
      brand,
      productType,
      variants: rawVariants,
      currency,
      minimumOrderQuantity,
      maximumOrderQuantity,
      shipping: rawShipping,
      material,
      warrantyInformation,
      returnPolicy,
      shippingInformation,
      seo: rawSeo,
      offer: rawOffer,
    } = req.body;


    console.log(
      "Title:",
      title
    );

    console.log(
      "Description length:",
      description?.length
    );

    console.log(
      "Category:",
      category
    );

    console.log(
      "SubCategory:",
      subCategory
    );

    console.log(
      "Brand:",
      brand
    );

    console.log(
      "Product type:",
      productType
    );

    console.log(
      "Currency:",
      currency
    );


    /* =====================================================
       9. PARSE JSON FIELDS
    ===================================================== */

    console.log(
      "\n========== 9. PARSE JSON =========="
    );


    let tags;
    let variants;
    let shipping;
    let seo;
    let offer;


    try {

      tags =
        parseJsonField(
          rawTags,
          []
        );

      variants =
        parseJsonField(
          rawVariants,
          []
        );

      shipping =
        parseJsonField(
          rawShipping,
          {}
        );

      seo =
        parseJsonField(
          rawSeo,
          {}
        );

      offer =
        parseJsonField(
          rawOffer,
          {}
        );


      console.log(
        "Tags:",
        tags
      );

      console.log(
        "Variants:",
        variants
      );

      console.log(
        "Shipping:",
        shipping
      );

      console.log(
        "SEO:",
        seo
      );

      console.log(
        "Offer:",
        offer
      );


    } catch (parseError) {

      console.error(
        "❌ JSON PARSE ERROR"
      );

      console.error(
        parseError
      );

      return res.status(400).json({
        success: false,
        message:
          "Invalid JSON product data",
        debug: {
          requestId,
          error:
            parseError?.message,
        },
      });

    }


    /* =====================================================
       10. MEDIA FILES
    ===================================================== */

    console.log(
      "\n========== 10. MEDIA =========="
    );


    const imageFiles =
      Array.isArray(
        req.files?.images
      )
        ? req.files.images
        : req.files?.images
        ? [req.files.images]
        : [];


    const videoFiles =
      Array.isArray(
        req.files?.videos
      )
        ? req.files.videos
        : req.files?.videos
        ? [req.files.videos]
        : [];


    console.log(
      "Image count:",
      imageFiles.length
    );

    console.log(
      "Video count:",
      videoFiles.length
    );


    imageFiles.forEach(
      (file, index) => {

        console.log(
          `Image ${index + 1}:`,
          {
            fieldname:
              file?.fieldname,
            originalname:
              file?.originalname,
            mimetype:
              file?.mimetype,
            size:
              file?.size,
            path:
              file?.path,
            secure_url:
              file?.secure_url,
            location:
              file?.location,
          }
        );

      }
    );


    videoFiles.forEach(
      (file, index) => {

        console.log(
          `Video ${index + 1}:`,
          {
            fieldname:
              file?.fieldname,
            originalname:
              file?.originalname,
            mimetype:
              file?.mimetype,
            size:
              file?.size,
            path:
              file?.path,
            secure_url:
              file?.secure_url,
            location:
              file?.location,
          }
        );

      }
    );


    const getFileUrl =
      (file) =>
        file?.path ||
        file?.secure_url ||
        file?.location ||
        file?.url ||
        "";


    const media = {

      images:
        imageFiles
          .map(getFileUrl)
          .filter(Boolean),

      videos:
        videoFiles
          .map(getFileUrl)
          .filter(Boolean),

    };


    console.log(
      "Final media:",
      media
    );


    /* =====================================================
       11. BASIC VALIDATION
    ===================================================== */

    console.log(
      "\n========== 11. BASIC VALIDATION =========="
    );


    if (
      typeof title !== "string" ||
      title.trim().length < 3 ||
      title.trim().length > 200
    ) {

      console.error(
        "❌ TITLE VALIDATION FAILED"
      );

      return res.status(400).json({
        success: false,
        message:
          "Product title must be between 3 and 200 characters",
        debug: {
          requestId,
          title,
        },
      });

    }


    if (
      typeof description !== "string" ||
      description.trim().length < 10 ||
      description.trim().length > MAX_TEXT
    ) {

      console.error(
        "❌ DESCRIPTION VALIDATION FAILED"
      );

      return res.status(400).json({
        success: false,
        message:
          "Product description must be between 10 and 20000 characters",
        debug: {
          requestId,
          descriptionLength:
            description?.length || 0,
        },
      });

    }


    if (!category) {

      console.error(
        "❌ CATEGORY MISSING"
      );

      return res.status(400).json({
        success: false,
        message:
          "Category is required",
        debug: {
          requestId,
        },
      });

    }


    if (
      !mongoose.Types.ObjectId.isValid(
        category
      )
    ) {

      console.error(
        "❌ CATEGORY ID INVALID"
      );

      return res.status(400).json({
        success: false,
        message:
          "Invalid category",
        debug: {
          requestId,
          category,
        },
      });

    }


    /* =====================================================
       12. VARIANT VALIDATION
    ===================================================== */

    console.log(
      "\n========== 12. VARIANT VALIDATION =========="
    );


    console.log(
      "Variant count:",
      Array.isArray(variants)
        ? variants.length
        : "NOT ARRAY"
    );


    if (
      !Array.isArray(variants) ||
      variants.length === 0
    ) {

      console.error(
        "❌ VARIANTS INVALID"
      );

      return res.status(400).json({
        success: false,
        message:
          "At least one product variant is required",
        debug: {
          requestId,
          variants,
        },
      });

    }


    const variantValidation =
      validateVariants(
        variants
      );


    console.log(
      "Variant validation:",
      variantValidation
    );


    if (
      !variantValidation.valid
    ) {

      console.error(
        "❌ VARIANT VALIDATION FAILED"
      );

      return res.status(400).json({
        success: false,
        message:
          variantValidation.message,
        debug: {
          requestId,
          variants,
        },
      });

    }


    const normalizedVariants =
      variantValidation.variants;


    console.log(
      "✅ Normalized variants:",
      normalizedVariants
    );


    /* =====================================================
       13. SKU DUPLICATE CHECK
    ===================================================== */

    console.log(
      "\n========== 13. SKU CHECK =========="
    );


    const skus =
      normalizedVariants.map(
        (variant) =>
          variant.sku
      );


    console.log(
      "SKUs:",
      skus
    );


    try {

      const existingProduct =
        await Product.findOne({
          "variants.sku": {
            $in: skus,
          },
        });


      console.log(
        "Existing product:",
        existingProduct?._id ||
        null
      );


      if (
        existingProduct
      ) {

        console.error(
          "❌ DUPLICATE SKU"
        );

        return res.status(409).json({

          success: false,

          message:
            "One or more SKU already exist",

          debug: {
            requestId,
            skus,
            existingProductId:
              existingProduct._id,
          },

        });

      }

    } catch (skuError) {

      console.error(
        "❌ SKU DATABASE CHECK ERROR"
      );

      console.error(
        skuError
      );

      throw skuError;

    }


    /* =====================================================
       14. PRODUCT OBJECT
    ===================================================== */

    console.log(
      "\n========== 14. BUILD PRODUCT =========="
    );


    const productData = {

      title:
        title.trim(),

      description:
        description.trim(),

      shortDescription:
        shortDescription || "",


      category,

      subCategory:
        subCategory || null,


      tags:
        Array.isArray(tags)
          ? tags
          : [],


      brand:
        brand || "",


      productType:
        productType || "simple",


      variants:
        normalizedVariants,


      media,


      currency:
        currency || "INR",


      minimumOrderQuantity:
        Number(
          minimumOrderQuantity || 1
        ),


      maximumOrderQuantity:
        Number(
          maximumOrderQuantity || 10
        ),


      shipping,

      material,

      warrantyInformation,

      returnPolicy,

      shippingInformation,


      seller:
        sellerId,


      seo,

      offer,


      status:
        "pending",


      approvalHistory: [

        {
          action:
            "submitted",

          reason:
            "Product submitted for approval",

          performedBy:
            sellerId,
        },

      ],

    };


    console.log(
      "Product data before MongoDB:",
      JSON.stringify(
        productData,
        null,
        2
      )
    );


    /* =====================================================
       15. MONGOOSE CREATE
    ===================================================== */

    console.log(
      "\n========== 15. MONGOOSE CREATE =========="
    );


    let product;


    try {

      product =
        await Product.create(
          productData
        );


      console.log(
        "✅ PRODUCT CREATED"
      );

      console.log(
        "Product ID:",
        product?._id
      );


    } catch (
      mongooseError
    ) {

      console.error(
        "❌ MONGOOSE CREATE FAILED"
      );

      console.error(
        "Name:",
        mongooseError?.name
      );

      console.error(
        "Message:",
        mongooseError?.message
      );

      console.error(
        "Code:",
        mongooseError?.code
      );

      console.error(
        "Errors:",
        mongooseError?.errors
      );

      console.error(
        "Key pattern:",
        mongooseError?.keyPattern
      );

      console.error(
        "Key value:",
        mongooseError?.keyValue
      );

      console.error(
        "Stack:",
        mongooseError?.stack
      );


      if (
        mongooseError?.name ===
        "ValidationError"
      ) {

        const validationErrors =
          Object.fromEntries(
            Object.entries(
              mongooseError.errors || {}
            ).map(
              ([field, value]) => [
                field,
                value?.message ||
                  String(value),
              ]
            )
          );


        return res.status(400).json({

          success: false,

          message:
            "Product validation failed",

          debug: {
            requestId,
            validationErrors,
          },

        });

      }


      if (
        mongooseError?.code ===
        11000
      ) {

        return res.status(409).json({

          success: false,

          message:
            "Duplicate product data",

          debug: {
            requestId,
            keyPattern:
              mongooseError.keyPattern ||
              null,
            keyValue:
              mongooseError.keyValue ||
              null,
          },

        });

      }


      throw mongooseError;

    }


    /* =====================================================
       16. SUCCESS
    ===================================================== */

    const duration =
      Date.now() -
      startedAt;


    console.log(
      "\n=================================================="
    );

    console.log(
      `✅ ${requestId} CREATE PRODUCT SUCCESS`
    );

    console.log(
      "Product ID:",
      product._id
    );

    console.log(
      "Seller ID:",
      sellerId
    );

    console.log(
      "Status:",
      product.status
    );

    console.log(
      "Duration:",
      `${duration}ms`
    );

    console.log(
      "=================================================="
    );


    return res.status(201).json({

      success:
        true,

      message:
        "Product created and submitted for approval",

      product,

      debug: {
        requestId,
        duration,
      },

    });


  } catch (error) {

    /* =====================================================
       17. FINAL GLOBAL CREATE ERROR
    ===================================================== */

    const duration =
      Date.now() -
      startedAt;


    console.error(
      "\n=================================================="
    );

    console.error(
      `🔥 ${requestId} CREATE PRODUCT FAILED`
    );

    console.error(
      "Duration:",
      `${duration}ms`
    );

    console.error(
      "Error name:",
      error?.name
    );

    console.error(
      "Error message:",
      error?.message
    );

    console.error(
      "Error code:",
      error?.code
    );

    console.error(
      "Error keyPattern:",
      error?.keyPattern
    );

    console.error(
      "Error keyValue:",
      error?.keyValue
    );

    console.error(
      "Error errors:",
      error?.errors
    );

    console.error(
      "Error stack:",
      error?.stack
    );

    console.error(
      "Full error:",
      error
    );

    console.error(
      "=================================================="
    );


    /* =====================================================
       DUPLICATE
    ===================================================== */

    if (
      error?.code === 11000
    ) {

      return res.status(409).json({

        success:
          false,

        message:
          "Duplicate value already exists",

        debug: {
          requestId,

          keyPattern:
            error.keyPattern ||
            null,

          keyValue:
            error.keyValue ||
            null,

        },

      });

    }


    /* =====================================================
       MONGOOSE VALIDATION
    ===================================================== */

    if (
      error?.name ===
      "ValidationError"
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "Product validation failed",

        debug: {

          requestId,

          errors:
            Object.fromEntries(
              Object.entries(
                error.errors || {}
              ).map(
                ([field, value]) => [
                  field,
                  value?.message ||
                    String(value),
                ]
              )
            ),

        },

      });

    }


    /* =====================================================
       CAST ERROR
    ===================================================== */

    if (
      error?.name ===
      "CastError"
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          `Invalid ${error.path}`,

        debug: {

          requestId,

          path:
            error.path,

          value:
            error.value,

        },

      });

    }


    /* =====================================================
       FINAL 500
    ===================================================== */

    return res.status(500).json({

      success:
        false,

      message:
        typeof error?.message ===
        "string"

          ? error.message

          : "Failed to create product",

      debug: {

        requestId,

        errorName:
          error?.name ||
          null,

        errorCode:
          error?.code ||
          null,

        stack:
          process.env.NODE_ENV ===
          "development"

            ? error?.stack

            : undefined,

      },

    });

  }

};

/* =====================================
   GET ALL PRODUCTS
===================================== */


export const getProducts = async (req, res) => {
  try {

    /* =====================================
       PAGINATION
    ===================================== */

    const {
      page,
      limit,
      skip,
    } = getPagination(req);

    /* =====================================
       FILTERS
    ===================================== */

   const query = {
  isDeleted: false,
  isActive: true,
  status: "approved"
};

 /* =====================================
   CATEGORY FILTER
===================================== */

if (req.query.category) {

  let value = req.query.category;

  // Handle category sent as an array
  if (Array.isArray(value)) {
    value = value[0];
  }

  // Convert to string and trim
  value = String(value).trim();

  if (mongoose.Types.ObjectId.isValid(value)) {
    query.category = new mongoose.Types.ObjectId(value);
  } else {
    const category = await Category.findOne({
      name: { $regex: `^${value}$`, $options: "i" },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    query.category = category._id;
  }
}
    /* =====================================
       BRAND FILTER
    ===================================== */

    if (req.query.brand) {

      query.brand = {
        $regex: escapeRegex(req.query.brand),
        $options: "i",
      };

    }

    /* =====================================
       SEARCH FILTER
    ===================================== */

    if (req.query.search) {

      query.title = {
        $regex: escapeRegex(req.query.search),
        $options: "i",
      };

    }

    /* =====================================
       PRICE FILTER
    ===================================== */

    if (

      req.query.minPrice ||

      req.query.maxPrice

    ) {

      const minPrice =
        req.query.minPrice !== undefined
          ? Number(req.query.minPrice)
          : undefined;

      const maxPrice =
        req.query.maxPrice !== undefined
          ? Number(req.query.maxPrice)
          : undefined;

      if (
        minPrice !== undefined &&
        (!Number.isFinite(minPrice) || minPrice < 0)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid minimum price",
        });
      }

      if (
        maxPrice !== undefined &&
        (!Number.isFinite(maxPrice) || maxPrice < 0)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid maximum price",
        });
      }

      if (
        minPrice !== undefined &&
        maxPrice !== undefined &&
        minPrice > maxPrice
      ) {
        return res.status(400).json({
          success: false,
          message: "Minimum price cannot exceed maximum price",
        });
      }

      query.variants = {
        $elemMatch: {
          ...(minPrice !== undefined
            ? { price: { $gte: minPrice } }
            : {}),
          ...(maxPrice !== undefined
            ? { price: { $lte: maxPrice } }
            : {}),
        },
      };

    }

    /* =====================================
       STOCK FILTER
    ===================================== */

    if (

      req.query.inStock ===
      "true"

    ) {

      query["variants.stock"] = {
        $gt: 0,
      };

    }

    /* =====================================
       FEATURED FILTER
    ===================================== */

    if (

      req.query.featured ===
      "true"

    ) {

      query.featured = true;

    }

    /* =====================================
       TRENDING FILTER
    ===================================== */

    if (

      req.query.trending ===
      "true"

    ) {

      query.trending = true;

    }

    /* =====================================
       BEST SELLER FILTER
    ===================================== */

    if (

      req.query.bestSeller ===
      "true"

    ) {

      query.bestSeller = true;

    }

    /* =====================================
       NEW ARRIVAL FILTER
    ===================================== */

    if (

      req.query.isNewArrival ===
      "true"

    ) {

      query.isNewArrival = true;

    }

    /* =====================================
       POPULAR FILTER
    ===================================== */

    if (
      req.query.popular ===
      "true"
    ) {
      query.isPopular = true;
    }

    /* =====================================
       RECOMMENDED FILTER
    ===================================== */

    if (
      req.query.recommended ===
      "true"
    ) {
      query.isRecommended = true;
    }

    /* =====================================
       FLASH SALE FILTER
    ===================================== */

    if (
      req.query.flashSale ===
      "true"
    ) {
      const now = new Date();

      query["offer.enabled"] = true;
      query["offer.startDate"] = {
        $lte: now,
      };
      query["offer.endDate"] = {
        $gte: now,
      };
    }

    /* =====================================
       DEAL FILTER
    ===================================== */

    if (
      req.query.deal ===
      "true"
    ) {
      const now = new Date();

      query["offer.enabled"] = true;
      query["offer.startDate"] = {
        $lte: now,
      };
      query["offer.endDate"] = {
        $gte: now,
      };
      query["offer.value"] = {
        $gt: 0,
      };
    }

    /* =====================================
       LOW STOCK FILTER
    ===================================== */

    if (
      req.query.lowStock ===
      "true"
    ) {
      query["variants.stock"] = {
        $gt: 0,
        $lte: 5,
      };
    }

    /* =====================================
       SORTING
    ===================================== */

    let sortOption = {

      createdAt: -1,

    };

    if (

      req.query.sort ===
      "low-high"

    ) {

      sortOption["variants.price"] = 1;

    }

    if (

      req.query.sort ===
      "high-low"

    ) {

      sortOption["variants.price"] = -1;

    }

    if (

      req.query.sort ===
      "rating"

    ) {

      sortOption.rating = -1;

    }

    if (

      req.query.sort ===
      "newest"

    ) {

      sortOption.createdAt = -1;

    }

    if (
      req.query.sort ===
      "trending"
    ) {
      sortOption = {
        "analytics.trendingScore": -1,
        rating: -1,
        createdAt: -1,
      };
    }

    if (
      req.query.sort ===
      "best-selling"
    ) {
      sortOption = {
        "analytics.sales": -1,
        "analytics.orders": -1,
        rating: -1,
      };
    }

    if (
      req.query.sort ===
      "popular"
    ) {
      sortOption = {
        "analytics.popularityScore": -1,
        "analytics.views": -1,
        rating: -1,
      };
    }

    /* =====================================
       FETCH PRODUCTS
    ===================================== */

//    const products = await Product.find(query)
// .populate(
//   "category",
//   "name slug image"
// )
// .populate(
//   "subCategory",
//   "name slug"
// )
// .populate(
//   "seller",
//   "firstName lastName email image"
// )

//       .sort(sortOption)

//       .skip(skip)

//       .limit(limit)

//       .lean();
console.log(
  "======================================"
);

console.log(
  "🛍️ CUSTOMER PRODUCTS QUERY"
);

console.log(
  "Query:",
  query
);

console.log(
  "======================================"
);
const products = await Product.find(query)
  .populate("category", "name slug image")
  .populate("subCategory", "name slug")
  .populate("seller", "firstName lastName email image")
  .sort(sortOption)
  .skip(skip)
  .limit(limit)
  .lean();
  console.log(
  "✅ CUSTOMER PRODUCTS FOUND:",
  products.length
);

products.forEach(
  (product) => {

    console.log(
      "Customer product:",
      {
        id:
          product._id,

        title:
          product.title,

        status:
          product.status,

        isActive:
          product.isActive,

        isDeleted:
          product.isDeleted,
      }
    );

  }
);
    /* =====================================
       TOTAL
    ===================================== */

    const total =
      await Product.countDocuments(
        query
      );

    /* =====================================
       TOTAL PAGES
    ===================================== */

    const totalPages =
      Math.ceil(
        total / limit
      );

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      total,

      totalPages,

      currentPage: page,

      limit,

      products,

      discovery: {
        supports: [
          "trending",
          "best-seller",
          "popular",
          "top-rated",
          "new-arrival",
          "featured",
          "recommended",
          "flash-sale",
          "deal",
          "low-stock",
        ],
      },

    });

  } catch (error) {

    console.error(

      "Get Products Error:",

      error

    );

    res.status(500).json({

      success: false,

      message:
        "An unexpected error occurred",

    });

  }

};


/* =====================================
   GET SINGLE PRODUCT
===================================== */

export const getProduct = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product =
      await Product.findOne({
        _id: id,
        isDeleted: false,
        isActive: true,
        status: "approved",
      })
        .populate(
          "category",
          "name"
        )
        .populate(
          "subCategory",
          "name"
        )
        .populate(
          "seller",
          "firstName lastName image sellerInfo.store.shopName sellerStatus"
        );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    /* =====================================
       RECENTLY VIEWED
    ===================================== */

    /*
      getProduct is public, so only save a recently-viewed
      record when a logged-in user is available.

      This does NOT change the public product response.
    */
    const viewerId = getUserId(req);

    if (
      viewerId &&
      isValidObjectId(viewerId)
    ) {
      try {
        await RecentlyViewed.findOneAndUpdate(
          {
            user: viewerId,
            product: id,
          },
          {
            $set: {
              viewedAt: new Date(),
            },
            $setOnInsert: {
              user: viewerId,
              product: id,
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );
      } catch (recentError) {
        /*
          Recently-viewed tracking must never make
          the product page fail.
        */
        console.error(
          "Recently Viewed Tracking Error:",
          recentError?.message || recentError
        );
      }
    }

    /* =====================================
       INCREMENT VIEWS
    ===================================== */

    /*
      Update lifetime + recent view analytics.
      The response still returns the product fetched above.
    */
    await Product.findByIdAndUpdate(
      id,
      {
        $inc: {
          "analytics.views": 1,
          "analytics.recentViews": 1,
        },
        $set: {
          "analytics.lastViewedAt":
            new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      product,
    });

  } catch (error) {
    console.error(
      "Get Product Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};

/* =====================================
   UPDATE PRODUCT
===================================== */

export const updateProduct = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.params;

    const seller = await getApprovedSeller(req, res);

    if (!seller) {
      return;
    }

    // =====================================
    // VALIDATE PRODUCT ID
    // =====================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    // =====================================
    // FIND PRODUCT
    // =====================================

    const product = await Product.findOne({
      _id: id,
      seller: sellerId,
      isDeleted: false,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found or you do not own this product",
      });
    }

    // =====================================
    // BASIC PRODUCT FIELDS
    // =====================================

    const allowedFields = [
      "title",
      "description",
      "shortDescription",
      "category",
      "subCategory",
      "tags",
      "brand",
      "productType",
      "currency",
      "minimumOrderQuantity",
      "maximumOrderQuantity",
      "shipping",
      "material",
      "warrantyInformation",
      "returnPolicy",
      "shippingInformation",
      "seo",
      "offer",
      "media",
    ];

    for (const field of allowedFields) {
      if (req.body[field] === undefined) {
        continue;
      }

      if (
        [
          "shipping",
          "seo",
          "offer",
          "media",
        ].includes(field)
      ) {
        product[field] = parseJsonField(
          req.body[field],
          product[field] || {}
        );
      } else if (field === "tags") {
        const incomingTags =
          parseJsonField(req.body[field], []);

        product[field] = Array.isArray(incomingTags)
          ? incomingTags
              .map((tag) => cleanString(tag, 50))
              .filter(Boolean)
              .slice(0, 50)
          : [];
      } else {
        product[field] = req.body[field];
      }
    }

    if (product.category) {
      if (!isValidObjectId(product.category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        });
      }
    }

    if (
      product.title &&
      (
        product.title.trim().length < 3 ||
        product.title.trim().length > 200
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product title must be between 3 and 200 characters",
      });
    }

    if (
      product.description &&
      (
        product.description.trim().length < 10 ||
        product.description.trim().length > MAX_TEXT
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product description must be between 10 and 20000 characters",
      });
    }

    // =====================================
    // UPDATE VARIANTS SAFELY
    // =====================================

    if (req.body.variants !== undefined) {
      const incomingVariants =
        parseJsonField(
          req.body.variants,
          []
        );

      const variantValidation =
        validateVariants(incomingVariants);

      if (!variantValidation.valid) {
        return res.status(400).json({
          success: false,
          message: variantValidation.message,
        });
      }

      /*
        Check the entire SKU set against other products.
        Existing SKUs belonging to this product are allowed.
      */
      const incomingSkus =
        variantValidation.variants.map(
          (variant) => variant.sku
        );

      const duplicateProduct =
        await Product.findOne({
          _id: { $ne: product._id },
          "variants.sku": {
            $in: incomingSkus,
          },
          isDeleted: false,
        }).select("_id");

      if (duplicateProduct) {
        return res.status(409).json({
          success: false,
          message:
            "One or more SKU already exist on another product",
        });
      }

      product.variants =
        variantValidation.variants;
    }

    // =====================================
    // RESUBMIT FOR APPROVAL
    // =====================================

    product.seller = sellerId;
    product.isDeleted = false;
    product.isActive = true;
    if (
      !["draft", "rejected", "pending"].includes(
        product.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product cannot be submitted in its current status",
      });
    }

    product.status = "pending";

    product.approvalHistory.push({
      action: "submitted",
      reason: "Product updated and resubmitted",
      performedBy: sellerId,
    });

    // =====================================
    // SAVE
    // =====================================

    await product.save();

    // =====================================
    // RESPONSE
    // =====================================

    return res.status(200).json({
      success: true,
      message:
        "Product updated and submitted for approval",
      product,
    });

  } catch (error) {
    console.error(
      "Update Product Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};
/* =====================================
   DELETE PRODUCT
===================================== */

export const deleteProduct = async (
  req,
  res
) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.params;

    const seller = await getApprovedSeller(req, res);

    if (!seller) {
      return;
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product =
      await Product.findOne({
        _id: id,
        seller: sellerId,
        isDeleted: false,
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found",
      });
    }

    product.isDeleted = true;
    product.isActive = false;

    await product.save();

    return res.status(200).json({
      success: true,
      message:
        "Product deleted successfully",
    });

  } catch (error) {
    console.error(
      "Delete Product Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};

/* =====================================
   GET SELLER PRODUCTS
===================================== */

export const getSellerProducts = async (
  req,
  res
) => {
  try {
    const seller = await getApprovedSeller(req, res);

    if (!seller) {
      return;
    }

    const sellerId = getUserId(req);

    const products = await Product.find({
      seller: sellerId,
      isDeleted: false,
    })
      .populate(
        "category",
        "name"
      )
      .populate(
        "subCategory",
        "name"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });

  } catch (error) {
    console.error(
      "Get Seller Products Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};
/* =====================================
   UPDATE VARIANT STOCK
===================================== */

export const updateVariantStock = async (
  req,
  res
) => {
  try {
    const seller = await getApprovedSeller(req, res);

    if (!seller) {
      return;
    }

    const sellerId = getUserId(req);

    const {
      productId,
      variantSku,
      stock,
    } = req.body;

    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const normalizedSku =
      cleanString(variantSku, 100);

    const numericStock = Number(stock);
    if (
      stock === undefined ||
      !Number.isInteger(numericStock) ||
      numericStock < 0 ||
      numericStock > MAX_STOCK
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid stock is required",
      });
    }

    const product =
      await Product.findOne({
        _id: productId,
        seller: sellerId,
        isDeleted: false,
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found",
      });
    }

    const variant =
      product.variants.find(
        (item) =>
          item.sku === variantSku
      );

    if (!variant) {
      return res.status(404).json({
        success: false,
        message:
          "Variant not found",
      });
    }

    const oldStock =
      variant.stock;

    variant.stock = numericStock;

    /* =====================================
       INVENTORY HISTORY
    ===================================== */

    let action = "adjustment";

    if (stock > oldStock) {
      action = "restock";
    }

    if (stock < oldStock) {
      action = "adjustment";
    }

    product.inventoryHistory.push({
      variantSku: normalizedSku,
      oldStock,
      newStock: numericStock,
      action,
      updatedBy: sellerId,
    });

    await product.save();

    return res.status(200).json({
      success: true,
      message:
        "Stock updated successfully",
      variant,
    });

  } catch (error) {
    console.error(
      "Update Stock Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};
/* =====================================
   SUBMIT PRODUCT
===================================== */

export const submitProduct = async (
  req,
  res
) => {
  try {
    const seller = await getApprovedSeller(req, res);

    if (!seller) {
      return;
    }

    const sellerId = getUserId(req);

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product =
      await Product.findOne({
        _id: req.params.id,
        seller: sellerId,
        isDeleted: false,
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found",
      });
    }

    product.status = "pending";

    product.approvalHistory.push({
      action: "submitted",
      reason:
        "Seller submitted product for approval",
      performedBy: sellerId,
    });

    await product.save();

    return res.status(200).json({
      success: true,
      message:
        "Product submitted for admin approval",
      product,
    });

  } catch (error) {
    console.error(
      "Submit Product Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};
/* =====================================
   ADD PRODUCT REVIEW
===================================== */
export const addReview =async(req, res) => {

  try {

    /* =====================================
       USER
    ===================================== */

    const user = req.user;

    /* =====================================
       PRODUCT ID
    ===================================== */

    const productId = req.params.id;


    /* =====================================
       BODY
    ===================================== */

    const {
      rating,
      comment,
    } = req.body;

    /* =====================================
       FIND PRODUCT
    ===================================== */

    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product =
      await Product.findOne({
        _id: productId,
        isDeleted: false,
        isActive: true,
        status: "approved",
      });

    /* =====================================
       PRODUCT NOT FOUND
    ===================================== */

    if (!product) {

      return res.status(404).json({

        success: false,

        message:
          "Product not found",

      });

    }

    /* =====================================
       CHECK PURCHASE
    ===================================== */

    const hasPurchased =
      await Order.findOne({

        userId:
          user._id.toString(),

       status: "Delivered",
        items: {

          $elemMatch: {

         productId: new mongoose.Types.ObjectId( productId ),
          },

        },

      });

    /* =====================================
       USER NOT PURCHASED
    ===================================== */

    if (!hasPurchased) {

      return res.status(403).json({

        success: false,

        message:
          "You must purchase this product first",

      });

    }

    /* =====================================
       CHECK ALREADY REVIEWED
    ===================================== */

    const alreadyReviewed =
      product.reviews.find(

        (review) =>

          review.user.toString() ===
          user._id.toString()

      );

    /* =====================================
       ALREADY REVIEWED
    ===================================== */

    if (alreadyReviewed) {

      return res.status(400).json({

        success: false,

        message:
          "Already reviewed",

      });

    }

    /* =====================================
       VALIDATION
    ===================================== */

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Rating must be between 1 and 5",

      });

    }

    if (

      !comment ||

      comment.trim().length < 3

    ) {

      return res.status(400).json({

        success: false,

        message:
          "Comment too short",

      });

    }

    /* =====================================
       REVIEW OBJECT
    ===================================== */

/* =====================================
   REVIEW IMAGES
===================================== */

const reviewImages =

  req.files?.images?.map(

    (file) => file.path

  ) || [];

/* =====================================
   REVIEW VIDEOS
===================================== */

const reviewVideos =

  req.files?.videos?.map(

    (file) => file.path

  ) || [];

    const review = {

      user:
        user._id,

      rating:
        numericRating,

      comment:
        cleanString(comment, MAX_COMMENT),

      reviewerName:
        `${user.firstName} ${user.lastName}`,

      reviewerEmail:
        undefined,

      reviewerImage:
        user.image,


images:
  reviewImages,

videos:
  reviewVideos,

verifiedPurchase:
  true,


    };

    /* =====================================
       PUSH REVIEW
    ===================================== */

    product.reviews.push(
      review
    );

    /* =====================================
       TOTAL REVIEWS
    ===================================== */

    product.numReviews =
      product.reviews.length;

    /* =====================================
       CALCULATE RATING
    ===================================== */

    product.rating = Number(

      (

        product.reviews.reduce(

          (acc, item) =>

            acc + item.rating,

          0

        ) /

        product.reviews.length

      ).toFixed(1)

    );

    /* =====================================
       SAVE PRODUCT
    ===================================== */

    await product.save();

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(201).json({

      success: true,

      message:
        "Review added successfully",

      reviews:
        product.reviews,

    });

  } catch (error) {

    console.error(
      "\n❌ ADD REVIEW ERROR:"
    );

    console.error(error);

    res.status(500).json({

      success: false,

      message:
        "An unexpected error occurred",

    });

  }

};


export const toggleReviewLike = async (req, res) => {
  try {
    /* =====================================
       PARAMS
    ===================================== */

    const {
      productId,

      reviewId,
    } = req.params;

    /* =====================================
       USER
    ===================================== */

    const userId = getUserId(req);

    if (
      !isValidObjectId(productId) ||
      !isValidObjectId(reviewId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product or review ID",
      });
    }

    /* =====================================
       FIND PRODUCT
    ===================================== */

    const product =
      await Product.findOne({
        _id: productId,
        isDeleted: false,
        isActive: true,
        status: "approved",
      });

    /* =====================================
       PRODUCT NOT FOUND
    ===================================== */

    if (!product) {
      return res.status(404).json({
        success: false,

        message: "Product not found",
      });
    }

    /* =====================================
       FIND REVIEW
    ===================================== */

    const review = product.reviews.id(reviewId);

    /* =====================================
       REVIEW NOT FOUND
    ===================================== */

    if (!review) {
      return res.status(404).json({
        success: false,

        message: "Review not found",
      });
    }

    /* =====================================
       CHECK LIKE
    ===================================== */

    const alreadyLiked = review.likes.some(
      (id) => id.toString() === userId.toString(),
    );

    /* =====================================
       REMOVE LIKE
    ===================================== */

    if (alreadyLiked) {
      review.likes.pull(userId);
    } else {

    /* =====================================
       ADD LIKE
    ===================================== */
      review.likes.push(userId);
    }

    /* =====================================
       UPDATE COUNT
    ===================================== */

    review.likesCount = review.likes.length;

    /* =====================================
       SAVE
    ===================================== */

    await product.save();

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({
      success: true,

      message: alreadyLiked ? "Review unliked" : "Review liked",

      likes: review.likesCount,
    });
  } catch (error) {
    console.error(
      "Toggle Review Like Error:",

      error,
    );

    res.status(500).json({
      success: false,

      message: "An unexpected error occurred",
    });
  }
};

/* =====================================
   DELETE REVIEW
===================================== */

export const deleteReview =
async (

  req,
  res

) => {

  try {

    /* =====================================
       PARAMS
    ===================================== */

    const {

      productId,

      reviewId,

    } = req.params;

    /* =====================================
       USER
    ===================================== */

    const user =
      req.user;

    if (
      !isValidObjectId(productId) ||
      !isValidObjectId(reviewId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product or review ID",
      });
    }

    /* =====================================
       FIND PRODUCT
    ===================================== */

    const product =
      await Product.findById(

        productId

      );

    /* =====================================
       PRODUCT NOT FOUND
    ===================================== */

    if (!product) {

      return res.status(404).json({

        success: false,

        message:
          "Product not found",

      });

    }

    /* =====================================
       FIND REVIEW
    ===================================== */

    const review =
      product.reviews.id(
        reviewId
      );

    /* =====================================
       REVIEW NOT FOUND
    ===================================== */

    if (!review) {

      return res.status(404).json({

        success: false,

        message:
          "Review not found",

      });

    }

    /* =====================================
       OWNERSHIP CHECK
    ===================================== */

    const isOwner =

      review.user.toString() ===
      user._id.toString();

    const isAdmin =

      user.role ===
      "admin";

    if (

      !isOwner &&

      !isAdmin

    ) {

      return res.status(403).json({

        success: false,

        message:
          "Not authorized to delete this review",

      });

    }

    /* =====================================
       REMOVE REVIEW
    ===================================== */

    product.reviews.pull(
      reviewId
    );

    /* =====================================
       UPDATE REVIEW COUNT
    ===================================== */

    product.numReviews =
      product.reviews.length;

    /* =====================================
       RECALCULATE RATING
    ===================================== */

    if (

      product.reviews.length === 0

    ) {

      product.rating = 0;

    } else {

      product.rating = Number(

        (

          product.reviews.reduce(

            (acc, item) =>

              item.rating + acc,

            0

          ) /

          product.reviews.length

        ).toFixed(1)

      );

    }

    /* =====================================
       SAVE
    ===================================== */

    await product.save();

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "Review deleted successfully",

      reviews:
        product.reviews,

    });

  } catch (error) {

    console.error(

      "Delete Review Error:",

      error

    );

    res.status(500).json({

      success: false,

      message:
        "An unexpected error occurred",

    });

  }

};

/* =====================================
   GET PENDING PRODUCTS
===================================== */

export const getPendingProducts = async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }


  try {
    const products = await Product.find({
      status: "pending",
      isDeleted: false,
    })
      .populate("seller", "firstName lastName email image sellerInfo.store")
      .populate("category", "name slug")
      .populate("subCategory", "name slug")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });

  } catch (error) {
    console.error("Get Pending Products Error:", error);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};
/* =====================================
   APPROVE PRODUCT
===================================== */
export const approveProduct = async (req, res) => {

  if (!requireAdmin(req, res)) {
    return;
  }

  try {

    const adminId =
      req.user.id;

    const { id } =
      req.params;


    /* =====================================
       VALIDATE PRODUCT ID
    ===================================== */

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {

      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });

    }


    /* =====================================
       FIND PRODUCT
    ===================================== */

    const product =
      await Product.findOne({
        _id: id,
        isDeleted: false,
      });


    if (!product) {

      return res.status(404).json({
        success: false,
        message: "Product not found",
      });

    }


    /* =====================================
       ALREADY APPROVED
    ===================================== */

    if (
      product.status === "approved"
    ) {

      return res.status(400).json({
        success: false,
        message: "Product is already approved",
      });

    }


    /* =====================================
       VERIFY SELLER
    ===================================== */

    const productSeller =
      await User.findById(
        product.seller
      ).select(
        `
        _id
        role
        sellerStatus
        isBlocked
        isDeleted
        sellerInfo.verification.status
        `
      );


    if (
      !productSeller ||
      productSeller.role !== "seller" ||
      productSeller.isBlocked ||
      productSeller.isDeleted ||
      productSeller.sellerStatus !== "approved" ||
      productSeller.sellerInfo?.verification?.status !== "approved"
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Product cannot be approved because the seller is not currently verified.",

        sellerStatus:
          productSeller?.sellerStatus ||
          null,

        verificationStatus:
          productSeller
            ?.sellerInfo
            ?.verification
            ?.status ||
          null,

      });

    }


    /* =====================================
       APPROVE PRODUCT
    ===================================== */

    product.status =
      "approved";


    /*
     * IMPORTANT:
     * Make approved products visible
     * to customers.
     */

    product.isActive =
      true;


    product.isDeleted =
      false;


    product.rejectionReason =
      "";


    product.approvedAt =
      new Date();


    product.approvedBy =
      adminId;


    /* =====================================
       APPROVAL HISTORY
    ===================================== */

    product.approvalHistory.push({

      action:
        "approved",

      reason:
        "Product approved by admin",

      performedBy:
        adminId,

    });


    /* =====================================
       SAVE
    ===================================== */

    await product.save();


    console.log(
      "======================================"
    );

    console.log(
      "✅ PRODUCT APPROVED"
    );

    console.log(
      "Product ID:",
      product._id
    );

    console.log(
      "Status:",
      product.status
    );

    console.log(
      "isActive:",
      product.isActive
    );

    console.log(
      "isDeleted:",
      product.isDeleted
    );

    console.log(
      "======================================"
    );


    /* =====================================
       RESPONSE
    ===================================== */

    return res.status(200).json({

      success:
        true,

      message:
        "Product approved successfully",

      product,

    });


  } catch (error) {

    console.error(
      "❌ Approve Product Error:",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        error.message ||
        "An unexpected error occurred",

    });

  }

};
/* =====================================
   REJECT PRODUCT
===================================== */

export const rejectProduct = async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }


  try {
    const adminId = req.user.id;
    const { id } = req.params;

    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const normalizedReason =
      cleanString(reason, MAX_REASON);

    if (
      normalizedReason.length < 3
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid rejection reason is required",
      });
    }

    const product = await Product.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.status = "rejected";

    product.rejectionReason =
      normalizedReason;

    product.approvalHistory.push({
      action: "rejected",
      reason: normalizedReason,
      performedBy: adminId,
    });

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product rejected successfully",
      product,
    });

  } catch (error) {
    console.error("Reject Product Error:", error);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};
/* =====================================
   BLOCK PRODUCT
===================================== */

export const blockProduct = async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }


  try {
    const adminId = req.user.id;
    const { id } = req.params;

    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const blockReason =
      cleanString(
        reason || "Product blocked by admin",
        MAX_REASON
      );

    product.status = "blocked";

    product.isActive = false;

    product.rejectionReason =
      blockReason;

    product.approvalHistory.push({
      action: "blocked",
      reason: blockReason,
      performedBy: adminId,
    });

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product blocked successfully",
      product,
    });

  } catch (error) {
    console.error("Block Product Error:", error);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
    });
  }
};
/* =====================================
   RESET RECENT PRODUCT ANALYTICS
===================================== */

/*
  Call this from a protected cron/admin route once
  per day or week, depending on your desired trend window.

  It keeps lifetime analytics while clearing only
  recent activity used for Trending.
*/
export const resetRecentProductAnalytics =
  async (req, res) => {
    try {
      if (!requireAdmin(req, res)) {
        return;
      }

      await Product.updateMany(
        {
          isDeleted: false,
        },
        {
          $set: {
            "analytics.recentViews": 0,
            "analytics.recentWishlist": 0,
            "analytics.recentCart": 0,
            "analytics.recentSales": 0,
            "analytics.recentOrders": 0,
          },
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Recent product analytics reset successfully",
      });
    } catch (error) {
      console.error(
        "Reset Recent Product Analytics Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to reset recent analytics",
      });
    }
  };

/* =====================================
   GET ADMIN PRODUCTS
===================================== */

export const getAdminProducts = async (req, res) => {
  try {

    /* =====================================
       ADMIN CHECK
    ===================================== */

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }


    /* =====================================
       PAGINATION
    ===================================== */

    const {
      page,
      limit,
      skip,
    } = getPagination(req);


    /* =====================================
       FILTERS
    ===================================== */

    const {
      status,
      search,
      seller,
      category,
    } = req.query;


    const query = {
      isDeleted: false,
    };


    /* =====================================
       STATUS FILTER
    ===================================== */

    if (status) {
      const allowedStatuses = [
        "draft",
        "pending",
        "approved",
        "rejected",
        "blocked",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product status",
        });
      }

      query.status = status;
    }


    /* =====================================
       SEARCH PRODUCT
    ===================================== */

    if (search) {

      query.title = {
        $regex: escapeRegex(search),
        $options: "i",
      };

    }


    /* =====================================
       SELLER FILTER
    ===================================== */

    if (seller) {
      if (!isValidObjectId(seller)) {
        return res.status(400).json({
          success: false,
          message: "Invalid seller ID",
        });
      }

      query.seller = seller;
    }


    /* =====================================
       CATEGORY FILTER
    ===================================== */

    if (category) {
      if (!isValidObjectId(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      query.category = category;
    }


    /* =====================================
       GET PRODUCTS
    ===================================== */

    const products =
      await Product.find(query)

        .populate(
          "seller",
          "firstName lastName email image role sellerStatus sellerInfo.store.shopName sellerInfo.verification"
        )

        .populate(
          "category",
          "name slug"
        )

        .populate(
          "subCategory",
          "name slug"
        )

        .populate(
          "approvedBy",
          "firstName lastName email"
        )

        .populate(
          "approvalHistory.performedBy",
          "firstName lastName email"
        )

        .skip(skip)

        .limit(limit)

        .sort({
          createdAt: -1,
        });


    /* =====================================
       TOTAL PRODUCTS
    ===================================== */

    const totalProducts =
      await Product.countDocuments(query);


    /* =====================================
       STATUS COUNTS
    ===================================== */

    const [
      pendingProducts,
      approvedProducts,
      rejectedProducts,
      blockedProducts,
      draftProducts,
    ] = await Promise.all([

      Product.countDocuments({
        isDeleted: false,
        status: "pending",
      }),

      Product.countDocuments({
        isDeleted: false,
        status: "approved",
      }),

      Product.countDocuments({
        isDeleted: false,
        status: "rejected",
      }),

      Product.countDocuments({
        isDeleted: false,
        status: "blocked",
      }),

      Product.countDocuments({
        isDeleted: false,
        status: "draft",
      }),

    ]);


    /* =====================================
       RESPONSE
    ===================================== */

    return res.status(200).json({

      success: true,

      page,

      limit,

      count:
        products.length,

      totalProducts,

      totalPages:
        Math.ceil(
          totalProducts / limit
        ),

      statusCounts: {

        pending:
          pendingProducts,

        approved:
          approvedProducts,

        rejected:
          rejectedProducts,

        blocked:
          blockedProducts,

        draft:
          draftProducts,

      },

      products,

    });


  } catch (error) {

    console.error(
      "Get Admin Products Error:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        "An unexpected error occurred",

    });

  }
};