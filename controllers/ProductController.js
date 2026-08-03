import mongoose from "mongoose";
import Product from "../models/Product.js";
import slugify from "slugify";
import { nanoid } from "nanoid";
import Order from "../models/Order.js";
import Category from "../models/Category.js";
/* =====================================
   CREATE PRODUCT
===================================== */


export const createProduct = async (req, res) => {
  try {

    console.log("REQ BODY:", req.body);

    console.log("REQ FILES:", req.files);
    const {
      title,
      description,
      shortDescription,
      category,
      subCategory,
      tags,
      brand,
      price,
      originalPrice,
      discountPercentage,
      tax,
      shippingCharge,
      currency,
      stock,
      minimumOrderQuantity,
      maximumOrderQuantity,
      sizes,
      colors,
      sku,
      barcode,
      qrCode,
      weight,
      dimensions,
      material,
      warrantyInformation,
      returnPolicy,
      shippingInformation,
      thumbnail,
      videoUrl,
      featured,
      trending,
      bestSeller,
      isNewArrival,
      metaTitle,
      metaDescription,
      metaKeywords,
    } = req.body;

    /* =====================================
       VALIDATION
    ===================================== */

    if (
      !title?.trim() ||
      !description?.trim() ||
      !category?.trim() ||
      price === undefined ||
      price === null
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }
const categoryExists = await Category.findById(category);

if (!categoryExists) {
  return res.status(404).json({
    success: false,
    message: "Category not found",
  });
}

if (subCategory) {

  const subCategoryExists = await Category.findById(subCategory);

  if (!subCategoryExists) {
    return res.status(404).json({
      success: false,
      message: "Subcategory not found",
    });
  }

}
    /* =====================================
       ROLE CHECK
    ===================================== */

    if (
      !["seller", "admin"].includes(
        req.user.role
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only sellers or admins can create products",
      });
    }

    /* =====================================
       PARSE ARRAYS
    ===================================== */

 /* =====================================
   PARSE ARRAYS
===================================== */

const parsedTags =
  typeof tags === "string"
    ? JSON.parse(tags)
    : tags || [];

const parsedColors =
  typeof colors === "string"
    ? JSON.parse(colors)
    : colors || [];

const parsedSizes =
  typeof sizes === "string"
    ? JSON.parse(sizes)
    : sizes || [];

const parsedMetaKeywords =
  typeof metaKeywords === "string"
    ? JSON.parse(metaKeywords)
    : metaKeywords || [];

const parsedDimensions =
  typeof dimensions === "string"
    ? JSON.parse(dimensions)
    : dimensions || {};
    /* =====================================
       UPLOADED IMAGES
    ===================================== */

 
/* =====================================
   UPLOADED IMAGES
===================================== */

const uploadedImages =

  req.files?.images?.map(

    (file) => file.path

  ) || [];

/* =====================================
   UPLOADED VIDEOS
===================================== */

const uploadedVideos =

  req.files?.videos?.map(

    (file) => file.path

  ) || [];

console.log(
  "UPLOADED IMAGES:",
  uploadedImages
);

console.log(
  "UPLOADED VIDEOS:",
  uploadedVideos
);


    /* =====================================
       CREATE PRODUCT
    ===================================== */


const product =
  await Product.create({

    title,

    slug: `${slugify(title, {
      lower: true,
      strict: true,
    })}-${nanoid(5)}`,

    description,

    shortDescription,

    category,

    subCategory,

    tags: parsedTags,

    brand,

    price: Number(price),

    originalPrice:
      Number(originalPrice) || 0,

    discountPercentage:
      Number(
        discountPercentage
      ) || 0,

    tax: Number(tax) || 0,

    shippingCharge:
      Number(
        shippingCharge
      ) || 0,

    currency,

    stock:
      Number(stock) || 0,

    minimumOrderQuantity:
      Number(
        minimumOrderQuantity
      ) || 1,

    maximumOrderQuantity:
      Number(
        maximumOrderQuantity
      ) || 10,

    sizes: parsedSizes,

    colors: parsedColors,

    sku,

    barcode,

    qrCode,

    weight:
      Number(weight) || 0,

    dimensions,

    material,

    warrantyInformation,

    returnPolicy,

    shippingInformation,

    images: uploadedImages,

    videos: uploadedVideos,

    thumbnail,

    videoUrl,

    featured:
      featured === "true",

    trending:
      trending === "true",

    bestSeller:
      bestSeller === "true",

    isNewArrival:
      isNewArrival === "true",

    metaTitle,

    metaDescription,

    metaKeywords:
      parsedMetaKeywords,

    seller: req.user?._id,
  });
await Category.findByIdAndUpdate(
  category,
  {
    $inc: {
      productCount: 1,
    },
  }
);


    /* =====================================
       RESPONSE
    ===================================== */

    res.status(201).json({
      success: true,

      message:
        "Product created successfully",

      product,
    });

  } catch (error) {

    console.error(
      "Create Product Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


/* =====================================
   GET ALL PRODUCTS
===================================== */


export const getProducts =
async (req, res) => {

  try {

    /* =====================================
       PAGINATION
    ===================================== */

    const page =
      Number(req.query.page) || 1;

    const limit =
      Number(req.query.limit) || 20;

    const skip =
      (page - 1) * limit;

    /* =====================================
       FILTERS
    ===================================== */

    const query = {

      isDeleted: false,

      isActive: true,

    };

    /* =====================================
       CATEGORY FILTER
    ===================================== */

 if (req.query.category) {

  query.category = req.query.category;

}

    /* =====================================
       BRAND FILTER
    ===================================== */

    if (req.query.brand) {

      query.brand = {

        $regex:
          req.query.brand,

        $options: "i",

      };

    }

    /* =====================================
       SEARCH FILTER
    ===================================== */

    if (req.query.search) {

      query.title = {

        $regex:
          req.query.search,

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

      query.price = {};

      if (req.query.minPrice) {

        query.price.$gte =
          Number(
            req.query.minPrice
          );

      }

      if (req.query.maxPrice) {

        query.price.$lte =
          Number(
            req.query.maxPrice
          );

      }

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

   const products = await Product.find(query)
.populate(
  "category",
  "name slug image"
)
.populate(
  "subCategory",
  "name slug"
)
.populate(
  "seller",
  "firstName lastName email image"
)

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
        error.message,

    });

  }

};


/* =====================================
   GET SINGLE PRODUCT
===================================== */

export const getSingleProduct = async (req, res) => {
  try {
 const product = await Product.findById(req.params.id)
.populate(
    "category",
    "name slug image"
)
.populate(
    "subCategory",
    "name slug"
)
.populate(
    "seller",
    "firstName lastName email image"
);

    if (!product) {
      return res.status(404).json({
        success: false,

        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,

      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

/* =====================================
   UPDATE PRODUCT
===================================== */
export const updateProduct = async (req, res) => {
  try {

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    /* =====================================
       SELLER OWNERSHIP
    ===================================== */

    if (
      req.user.role === "seller" &&
      product.seller?.toString() !== req.user._id?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own products",
      });
    }

    /* =====================================
       CATEGORY COUNT UPDATE
    ===================================== */

    const oldCategory = product.category?.toString();
    const newCategory = req.body.category;

    if (
      newCategory &&
      oldCategory !== newCategory
    ) {

      // Decrease old category count
      await Category.findByIdAndUpdate(
        oldCategory,
        {
          $inc: {
            productCount: -1,
          },
        }
      );

      // Increase new category count
      await Category.findByIdAndUpdate(
        newCategory,
        {
          $inc: {
            productCount: 1,
          },
        }
      );

    }

    /* =====================================
       UPDATE PRODUCT
    ===================================== */

    const updatedProduct =
      await Product.findByIdAndUpdate(

        req.params.id,

        req.body,

        {
          new: true,
          runValidators: true,
        }

      )
      .populate("category", "name slug")
      .populate("subCategory", "name slug")
      .populate(
        "seller",
        "firstName lastName email image"
      );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

/* =====================================
   DELETE PRODUCT
===================================== */

export const deleteProduct = async (req, res) => {
  try {

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    /* =====================================
       SELLER OWNERSHIP
    ===================================== */

    if (
      req.user.role === "seller" &&
      product.seller?.toString() !== req.user._id?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own products",
      });
    }

    /* =====================================
       UPDATE CATEGORY COUNT
    ===================================== */

    await Category.findByIdAndUpdate(
      product.category,
      {
        $inc: {
          productCount: -1,
        },
      }
    );

    /* =====================================
       SOFT DELETE
    ===================================== */

    product.isDeleted = true;
    product.isActive = false;

    await product.save();

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
/* =====================================
   GET SELLER PRODUCTS
===================================== */

export const getSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({
      seller: req.user._id,
    }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,

      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

/* =====================================
   ADD PRODUCT REVIEW
===================================== */
export const addReview =async(req, res) => {

  try {

    console.log("\n========== ADD REVIEW ==========");

    /* =====================================
       USER
    ===================================== */

    const user = req.user;

    console.log("USER:", user);

    /* =====================================
       PRODUCT ID
    ===================================== */

    const productId = req.params.id;
console.log("PARAMS:", req.params);
console.log("PRODUCT ID:", req.params.id);
    console.log("PRODUCT ID:", productId);

    /* =====================================
       BODY
    ===================================== */

    const {
      rating,
      comment,
    } = req.body;

    console.log("RATING:", rating);

    console.log("COMMENT:", comment);

    /* =====================================
       FIND PRODUCT
    ===================================== */

    const product =
      await Product.findById(
        productId
      );

    console.log("FOUND PRODUCT:", product);

    /* =====================================
       PRODUCT NOT FOUND
    ===================================== */

    if (!product) {

      console.log("❌ PRODUCT NOT FOUND");

      return res.status(404).json({

        success: false,

        message:
          "Product not found",

      });

    }

    /* =====================================
       CHECK PURCHASE
    ===================================== */

    console.log(
      "CHECKING PURCHASE..."
    );

    console.log(
      "USER ID:",
      user._id.toString()
    );

    console.log(
      "PRODUCT ID:",
      productId
    );

    const hasPurchased =
      await Order.findOne({

        userId:
          user._id.toString(),

       status: { $in: [ "Processing", "Shipped", "Delivered", ], },
        items: {

          $elemMatch: {

         productId: new mongoose.Types.ObjectId( productId ),
          },

        },

      });

    console.log(
      "HAS PURCHASED:",
      hasPurchased
    );

    /* =====================================
       USER NOT PURCHASED
    ===================================== */

    if (!hasPurchased) {

      console.log(
        "❌ USER HAS NOT PURCHASED PRODUCT"
      );

      return res.status(403).json({

        success: false,

        message:
          "You must purchase this product first",

      });

    }

    /* =====================================
       CHECK ALREADY REVIEWED
    ===================================== */

    console.log(
      "CHECKING EXISTING REVIEW..."
    );

    const alreadyReviewed =
      product.reviews.find(

        (review) =>

          review.user.toString() ===
          user._id.toString()

      );

    console.log(
      "ALREADY REVIEWED:",
      alreadyReviewed
    );

    /* =====================================
       ALREADY REVIEWED
    ===================================== */

    if (alreadyReviewed) {

      console.log(
        "❌ USER ALREADY REVIEWED"
      );

      return res.status(400).json({

        success: false,

        message:
          "Already reviewed",

      });

    }

    /* =====================================
       VALIDATION
    ===================================== */

    console.log(
      "VALIDATING REVIEW..."
    );

    if (

      !rating ||

      rating < 1 ||

      rating > 5

    ) {

      console.log(
        "❌ INVALID RATING"
      );

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

      console.log(
        "❌ INVALID COMMENT"
      );

      return res.status(400).json({

        success: false,

        message:
          "Comment too short",

      });

    }

    /* =====================================
       REVIEW OBJECT
    ===================================== */

    console.log(
      "CREATING REVIEW OBJECT..."
    );

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

console.log(
  "REVIEW IMAGES:",
  reviewImages
);

console.log(
  "REVIEW VIDEOS:",
  reviewVideos
);

    const review = {

      user:
        user._id,

      rating:
        Number(rating),

      comment,

      reviewerName:
        `${user.firstName} ${user.lastName}`,

      reviewerEmail:
        user.email,

      reviewerImage:
        user.image,


images:
  reviewImages,

videos:
  reviewVideos,

verifiedPurchase:
  true,



    };

    console.log(
      "REVIEW OBJECT:",
      review
    );

    /* =====================================
       PUSH REVIEW
    ===================================== */

    console.log(
      "PUSHING REVIEW..."
    );

    product.reviews.push(
      review
    );

    /* =====================================
       TOTAL REVIEWS
    ===================================== */

    product.numReviews =
      product.reviews.length;

    console.log(
      "TOTAL REVIEWS:",
      product.numReviews
    );

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

    console.log(
      "NEW PRODUCT RATING:",
      product.rating
    );

    /* =====================================
       SAVE PRODUCT
    ===================================== */

    console.log(
      "SAVING PRODUCT..."
    );

    await product.save();

    console.log(
      "✅ REVIEW SAVED SUCCESSFULLY"
    );

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
        error.message,

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

    const userId = req.user._id;

    /* =====================================
       FIND PRODUCT
    ===================================== */

    const product = await Product.findById(productId);

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

      message: error.message,
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
        error.message,

    });

  }

};

