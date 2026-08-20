import mongoose from "mongoose";
import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";

/*
|--------------------------------------------------------------------------
| SAVE / UPDATE WISHLIST
|--------------------------------------------------------------------------
|
| Optional endpoint.
|
| Recommended frontend flow uses:
| POST /api/wishlist/add
|
| instead of sending the complete wishlist from the client.
|--------------------------------------------------------------------------
*/

export const saveWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { items } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID required",
      });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "Items must be an array",
      });
    }

    let wishlist = await Wishlist.findOne({
      userId,
    });

    if (wishlist) {
      wishlist.items = items;
      await wishlist.save();
    } else {
      wishlist = new Wishlist({
        userId,
        items,
      });

      await wishlist.save();
    }

    return res.status(200).json({
      success: true,
      message: "Wishlist saved",
      wishlist,
    });
  } catch (error) {
    console.error(
      "Wishlist Save Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to save wishlist",
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET USER WISHLIST
|--------------------------------------------------------------------------
*/

export const getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    const wishlist = await Wishlist.findOne({
      userId,
    }).populate(
      "items.productId",
      "title media variants productType status isActive seller rating numReviews"
    );

    /*
    |--------------------------------------------------------------------------
    | EMPTY WISHLIST
    |--------------------------------------------------------------------------
    */

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        items: [],
        wishlist: null,
      });
    }

    return res.status(200).json({
      success: true,
      items: wishlist.items,
      wishlist,
    });
  } catch (error) {
    console.error(
      "Fetch Wishlist Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist",
    });
  }
};


/*
|--------------------------------------------------------------------------
| ADD ITEM TO WISHLIST
|--------------------------------------------------------------------------
|
| Frontend sends:
|
| {
|   productId: "..."
| }
|
| Backend gets:
| - title
| - price
| - image
|
| directly from Product.
|--------------------------------------------------------------------------
*/

export const addToWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    const { productId } = req.body;

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID required",
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        productId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | FIND PRODUCT
    |--------------------------------------------------------------------------
    */

    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
      isActive: true,
      status: "approved",
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found or unavailable",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ACTIVE VARIANTS
    |--------------------------------------------------------------------------
    */

    const activeVariants =
      Array.isArray(product.variants)
        ? product.variants.filter(
            (variant) =>
              variant?.isActive !== false
          )
        : [];

    /*
    |--------------------------------------------------------------------------
    | GET WISHLIST PRICE
    |--------------------------------------------------------------------------
    |
    | Simple product:
    |   first variant price
    |
    | Variable product:
    |   lowest active variant price
    |--------------------------------------------------------------------------
    */

    let price = 0;

    if (activeVariants.length > 0) {
      const prices = activeVariants
        .map((variant) =>
          Number(variant.price)
        )
        .filter(
          (value) =>
            !Number.isNaN(value) &&
            value >= 0
        );

      if (prices.length > 0) {
        price = Math.min(...prices);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | GET PRODUCT IMAGE
    |--------------------------------------------------------------------------
    */

    let image = "";

    /*
    |--------------------------------------------------------------------------
    | 1. Product thumbnail
    |--------------------------------------------------------------------------
    */

    if (product.media?.thumbnail) {
      image = product.media.thumbnail;
    }

    /*
    |--------------------------------------------------------------------------
    | 2. Product media image
    |--------------------------------------------------------------------------
    */

    else if (
      Array.isArray(
        product.media?.images
      ) &&
      product.media.images.length > 0
    ) {
      image = product.media.images[0];
    }

    /*
    |--------------------------------------------------------------------------
    | 3. Variant image
    |--------------------------------------------------------------------------
    */

    else {
      const variantWithImage =
        activeVariants.find(
          (variant) =>
            Array.isArray(
              variant.images
            ) &&
            variant.images.length > 0
        );

      if (variantWithImage) {
        image =
          variantWithImage.images[0];
      }
    }

    /*
    |--------------------------------------------------------------------------
    | FIND WISHLIST
    |--------------------------------------------------------------------------
    */

    let wishlist = await Wishlist.findOne({
      userId,
    });

    /*
    |--------------------------------------------------------------------------
    | CREATE WISHLIST
    |--------------------------------------------------------------------------
    */

    if (!wishlist) {
      wishlist = new Wishlist({
        userId,

        items: [
          {
            productId: product._id,
            title: product.title,
            price,
            image,
          },
        ],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | EXISTING WISHLIST
    |--------------------------------------------------------------------------
    */

    else {
      const exists =
        wishlist.items.some(
          (item) =>
            String(item.productId) ===
            String(product._id)
        );

      if (exists) {
        return res.status(400).json({
          success: false,
          message:
            "Product already in wishlist",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | ADD PRODUCT
      |--------------------------------------------------------------------------
      */

      wishlist.items.push({
        productId: product._id,
        title: product.title,
        price,
        image,
      });
    }

    await wishlist.save();

    return res.status(200).json({
      success: true,
      message: "Added to wishlist",
      wishlist,
    });
  } catch (error) {
    console.error(
      "Add Wishlist Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to add wishlist item",
    });
  }
};


/*
|--------------------------------------------------------------------------
| REMOVE ITEM FROM WISHLIST
|--------------------------------------------------------------------------
*/

export const removeWishlistItem = async (
  req,
  res
) => {
  try {
    const userId = req.user._id;

    const { productId } = req.body;

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID required",
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message:
          "Product ID is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        productId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid product ID",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | FIND WISHLIST
    |--------------------------------------------------------------------------
    */

    const wishlist =
      await Wishlist.findOne({
        userId,
      });

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        message: "Wishlist is empty",
        wishlist: {
          items: [],
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | REMOVE PRODUCT
    |--------------------------------------------------------------------------
    */

    wishlist.items =
      wishlist.items.filter(
        (item) =>
          String(item.productId) !==
          String(productId)
      );

    await wishlist.save();

    return res.status(200).json({
      success: true,
      message:
        "Item removed from wishlist",
      wishlist,
    });
  } catch (error) {
    console.error(
      "Remove Wishlist Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to remove item",
    });
  }
};


/*
|--------------------------------------------------------------------------
| CLEAR USER WISHLIST
|--------------------------------------------------------------------------
*/

export const clearWishlist = async (
  req,
  res
) => {
  try {
    const userId = req.user._id;

    /*
    |--------------------------------------------------------------------------
    | FIND WISHLIST
    |--------------------------------------------------------------------------
    */

    const wishlist =
      await Wishlist.findOne({
        userId,
      });

    /*
    |--------------------------------------------------------------------------
    | IF NO WISHLIST
    |--------------------------------------------------------------------------
    */

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        message:
          "Wishlist already empty",
        wishlist: {
          items: [],
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CLEAR ITEMS
    |--------------------------------------------------------------------------
    */

    wishlist.items = [];

    await wishlist.save();

    return res.status(200).json({
      success: true,
      message: "Wishlist cleared",
      wishlist,
    });
  } catch (error) {
    console.error(
      "Clear Wishlist Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to clear wishlist",
    });
  }
};