import Wishlist from "../models/Wishlist.js";

/* =====================================
   SAVE / UPDATE WISHLIST
===================================== */

export const saveWishlist = async (
  req,
  res
) => {

  try {

  const userId =
  req.user._id;

const { items } =
  req.body;



    /* =====================================
       VALIDATION
    ===================================== */

    if (!userId) {

      return res.status(400).json({

        success: false,

        error:
          "User ID required",

      });

    }

    /* =====================================
       FIND WISHLIST
    ===================================== */

    let wishlist =
      await Wishlist.findOne({

        userId,

      });

    /* =====================================
       UPDATE WISHLIST
    ===================================== */

    if (wishlist) {

      wishlist.items = items;

      wishlist.updatedAt =
        new Date();

      await wishlist.save();

    }

    /* =====================================
       CREATE WISHLIST
    ===================================== */

    else {

      wishlist = new Wishlist({

        userId,

        items,

      });

      await wishlist.save();

    }

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "Wishlist saved",

      wishlist,

    });

  } catch (error) {

    console.error(
      "Wishlist Save Error:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        "Failed to save wishlist",

    });

  }

};

/* =====================================
   GET USER WISHLIST
===================================== */

export const getWishlist = async (
  req,
  res
) => {

  try {

    
const userId =
  req.user._id;

const wishlist =
  await Wishlist.findOne({

    userId,

  });



    /* =====================================
       EMPTY WISHLIST
    ===================================== */

    if (!wishlist) {

      return res.status(200).json({

        success: true,

        items: [],

      });

    }

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

  success: true,

  items:
    wishlist.items,

  wishlist,

});

  } catch (error) {

    console.error(
      "Fetch Wishlist Error:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        "Failed to fetch wishlist",

    });

  }

};

/* =====================================
   ADD ITEM TO WISHLIST
===================================== */

export const addToWishlist =
async (

  req,
  res

) => {

  try {

    const userId =
      req.user._id;

    const { product } =
      req.body;

    /* =====================================
       VALIDATION
    ===================================== */

    if (!product) {

      return res.status(400).json({

        success: false,

        error:
          "Product required",

      });

    }

    /* =====================================
       FIND WISHLIST
    ===================================== */

    let wishlist =
      await Wishlist.findOne({

        userId,

      });

    /* =====================================
       CREATE WISHLIST
    ===================================== */

    if (!wishlist) {

      wishlist =
        new Wishlist({

          userId,

          items: [

            {

              ...product,

            },

          ],

        });

    }

    /* =====================================
       EXISTING WISHLIST
    ===================================== */

    else {

      const exists =
        wishlist.items.some(

          (item) =>

            item.productId ===
            product.productId

        );

      if (exists) {

        return res.status(400).json({

          success: false,

          error:
            "Product already in wishlist",

        });

      }

      wishlist.items.push({

        ...product,

      });

    }

    /* =====================================
       SAVE
    ===================================== */

    await wishlist.save();

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "Added to wishlist",

      wishlist,

    });

  } catch (error) {

    console.error(

      "Add Wishlist Error:",

      error

    );

    res.status(500).json({

      success: false,

      error:
        "Failed to add wishlist item",

    });

  }

};


/* =====================================
   CLEAR USER WISHLIST
===================================== */

export const clearWishlist = async (
  req,
  res
) => {

  try {


const userId =
  req.user._id;


    /* =====================================
       FIND WISHLIST
    ===================================== */

    const wishlist =
      await Wishlist.findOne({

        userId,

      });

    /* =====================================
       WISHLIST NOT FOUND
    ===================================== */

    if (!wishlist) {

      return res.status(404).json({

        success: false,

        error:
          "Wishlist not found",

      });

    }

    /* =====================================
       CLEAR ITEMS
    ===================================== */

    wishlist.items = [];

    wishlist.updatedAt =
      new Date();

    await wishlist.save();

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "Wishlist cleared",

      wishlist,

    });

  } catch (error) {

    console.error(
      "Clear Wishlist Error:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        "Failed to clear wishlist",

    });

  }

};

/* =====================================
   REMOVE ITEM FROM WISHLIST
===================================== */

export const removeWishlistItem = async (
  req,
  res
) => {

  try {

   
const userId =
  req.user._id;

const { productId } =
  req.body;



    /* =====================================
       VALIDATION
    ===================================== */

    if (
      !userId ||
      !productId
    ) {

      return res.status(400).json({

        success: false,

        error:
          "userId and productId required",

      });

    }

    /* =====================================
       FIND WISHLIST
    ===================================== */

    const wishlist =
      await Wishlist.findOne({

        userId,

      });

    /* =====================================
       WISHLIST NOT FOUND
    ===================================== */

    if (!wishlist) {

      return res.status(404).json({

        success: false,

        error:
          "Wishlist not found",

      });

    }

    /* =====================================
       REMOVE PRODUCT
    ===================================== */

    wishlist.items =
      wishlist.items.filter(

        (item) =>

          item.productId !==
          productId

      );

    wishlist.updatedAt =
      new Date();

    await wishlist.save();

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

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

    res.status(500).json({

      success: false,

      error:
        "Failed to remove item",

    });

  }

};