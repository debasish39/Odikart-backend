import mongoose from "mongoose";
import Product from "../models/Product.js";
import slugify from "slugify";
import { nanoid } from "nanoid";
import Order from "../models/Order.js";
import Category from "../models/Category.js";
import User from "../models/User.js";

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

export const createProduct = async (req, res) => {
  try {
    const sellerId = req.user.id;

    /* =====================================
       SELLER CHECK
    ===================================== */

    const seller = await User.findById(sellerId);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    if (seller.role !== "seller") {
      return res.status(403).json({
        success: false,
        message: "Only sellers can create products",
      });
    }

    if (seller.isBlocked || seller.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "Seller account is not active",
      });
    }

    if (
      seller.sellerStatus !== "approved" ||
      seller.sellerInfo?.verification?.status !== "approved"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Seller verification is not approved. Complete document verification before creating products.",
        sellerStatus: seller.sellerStatus,
        verificationStatus:
          seller.sellerInfo?.verification?.status || "pending",
      });
    }

    /* =====================================
       PRODUCT DATA
    ===================================== */

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

    const tags = parseJsonField(rawTags, []);
    const variants = parseJsonField(rawVariants, []);
    const shipping = parseJsonField(rawShipping, {});
    const seo = parseJsonField(rawSeo, {});
    const offer = parseJsonField(rawOffer, {});

    /* =====================================
       UPLOADED MEDIA
    ===================================== */

    const imageFiles = Array.isArray(req.files?.images)
      ? req.files.images
      : req.files?.images
        ? [req.files.images]
        : [];

    const videoFiles = Array.isArray(req.files?.videos)
      ? req.files.videos
      : req.files?.videos
        ? [req.files.videos]
        : [];

    const getFileUrl = (file) =>
      file?.path ||
      file?.secure_url ||
      file?.location ||
      file?.url ||
      "";

    const media = {
      images: imageFiles.map(getFileUrl).filter(Boolean),
      videos: videoFiles.map(getFileUrl).filter(Boolean),
    };
    /* =====================================
       VALIDATION
    ===================================== */

    if (
      typeof title !== "string" ||
      title.trim().length < 3 ||
      title.trim().length > 200
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product title must be between 3 and 200 characters",
      });
    }

    if (
      typeof description !== "string" ||
      description.trim().length < 10 ||
      description.trim().length > MAX_TEXT
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product description must be between 10 and 20000 characters",
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(category)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid category",
      });
    }

    /* =====================================
       VARIANT VALIDATION
    ===================================== */

    if (
      !variants ||
      !Array.isArray(variants) ||
      variants.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one product variant is required",
      });
    }

    /* =====================================
       CHECK SKU DUPLICATE
    ===================================== */

    const variantValidation =
      validateVariants(variants);

    if (!variantValidation.valid) {
      return res.status(400).json({
        success: false,
        message: variantValidation.message,
      });
    }

    const normalizedVariants =
      variantValidation.variants;

    const skus =
      normalizedVariants.map(
        (variant) => variant.sku
      );

    const existingProduct = await Product.findOne({
      "variants.sku": {
        $in: skus,
      },
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "One or more SKU already exist",
      });
    }

    /* =====================================
       CREATE PRODUCT
    ===================================== */
const product = await Product.create({
  title,
  description,
  shortDescription,

  category,
  subCategory: subCategory || null,

  tags: Array.isArray(tags)
    ? tags
    : [],

  brand: brand || "",

  productType:
    productType || "simple",

  variants: normalizedVariants,

  media,

  currency:
    currency || "INR",

  minimumOrderQuantity:
    minimumOrderQuantity || 1,

  maximumOrderQuantity:
    maximumOrderQuantity || 10,

  shipping,

  material,

  warrantyInformation,

  returnPolicy,

  shippingInformation,

  seller: sellerId,

  seo,

  offer,

  status: "pending",

  approvalHistory: [
    {
      action: "submitted",
      reason: "Product submitted for approval",
      performedBy: sellerId,
    },
  ],
});

    /* =====================================
       RESPONSE
    ===================================== */

    return res.status(201).json({
      success: true,
      message:
        "Product created and submitted for approval",
      product,
    });

  } catch (error) {
  console.error("=================================");
  console.error("CREATE PRODUCT ERROR");
  console.error(error);
  console.error("=================================");

  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate value already exists",
      keyPattern: error.keyPattern || null,
      keyValue: error.keyValue || null,
    });
  }

  if (error?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors)
        .map((err) => err.message)
        .join(", "),
    });
  }

  return res.status(500).json({
    success: false,
    message:
      typeof error?.message === "string"
        ? error.message
        : "Failed to create product",
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

      query.stock = {

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
       SORTING
    ===================================== */

    let sortOption = {

      createdAt: -1,

    };

    if (

      req.query.sort ===
      "low-high"

    ) {

      sortOption.price = 1;

    }

    if (

      req.query.sort ===
      "high-low"

    ) {

      sortOption.price = -1;

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
const products = await Product.find(query)
  .populate("category", "name slug image")
  .populate("subCategory", "name slug")
  .populate("seller", "firstName lastName email image")
  .sort(sortOption)
  .skip(skip)
  .limit(limit)
  .lean();
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
       INCREMENT VIEWS
    ===================================== */

    await Product.findByIdAndUpdate(
      id,
      {
        $inc: {
          "analytics.views": 1,
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
    const adminId = req.user.id;
    const { id } = req.params;

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

    if (product.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "Product is already approved",
      });
    }

    const productSeller =
      await User.findById(product.seller).select(
        "_id role sellerStatus isBlocked isDeleted sellerInfo.verification.status"
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
          "Product cannot be approved because the seller is not currently verified",
      });
    }

    product.status = "approved";

    product.rejectionReason = "";

    product.approvedAt = new Date();

    product.approvedBy = adminId;

    product.approvalHistory.push({
      action: "approved",
      reason: "Product approved by admin",
      performedBy: adminId,
    });

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product approved successfully",
      product,
    });

  } catch (error) {
    console.error("Approve Product Error:", error);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
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