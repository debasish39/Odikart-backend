import Cart from "../models/Cart.js";

/* =====================================
   SAVE / UPDATE CART
===================================== */

export const saveCart = async (
  req,
  res
) => {

  try {

    /* =====================================
       REQUEST BODY
    ===================================== */

    const {

      userId,

      items,

    } = req.body;

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
       FIND CART
    ===================================== */

    let cart =
      await Cart.findOne({

        userId,

      });

    /* =====================================
       UPDATE CART
    ===================================== */

    if (cart) {

      cart.items = items;

      cart.updatedAt =
        new Date();

      await cart.save();

    }

    /* =====================================
       CREATE CART
    ===================================== */

    else {

      cart = new Cart({

        userId,

        items,

      });

      await cart.save();

    }

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "Cart saved",

      cart,

    });

  } catch (error) {

    console.error(
      "Cart Save Error:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        "Failed to save cart",

    });

  }

};

/* =====================================
   GET USER CART
===================================== */

export const getCart = async (
  req,
  res
) => {

  try {

    /* =====================================
       USER ID
    ===================================== */

    const userId =
      req.params.userId;

    /* =====================================
       FIND CART
    ===================================== */

    const cart =
      await Cart.findOne({

        userId,

      });

    /* =====================================
       EMPTY CART
    ===================================== */

    if (!cart) {

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

      cart,

    });

  } catch (error) {

    console.error(
      "Fetch Cart Error:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        "Failed to fetch cart",

    });

  }

};
/* =====================================
   ADD ITEM TO CART
===================================== */

export const addToCart = async (
  req,
  res
) => {
 try {
    const { userId, product } = req.body;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [{ ...product, quantity: 1 }],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.productId === product.productId,
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += 1;
      } else {
        cart.items.push({ ...product, quantity: 1 });
      }
    }

    await cart.save();

    res.json({
      success: true,
      cart,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to add item",
    });
  }

};


/* =====================================
   INCREASE CART QUANTITY
===================================== */

export const increaseQuantity = async (
  req,
  res
) => {

  try {

    /* =====================================
       REQUEST BODY
    ===================================== */

    const {

      userId,

      productId,

    } = req.body;

    /* =====================================
       FIND CART
    ===================================== */

    const cart =
      await Cart.findOne({

        userId,

      });

    /* =====================================
       CART NOT FOUND
    ===================================== */

    if (!cart) {

      return res.status(404).json({

        success: false,

        error:
          "Cart not found",

      });

    }

    /* =====================================
       FIND ITEM
    ===================================== */

    const item =
      cart.items.find(

        (item) =>

          item.productId ===
          productId

      );

    /* =====================================
       ITEM NOT FOUND
    ===================================== */

    if (!item) {

      return res.status(404).json({

        success: false,

        error:
          "Item not found",

      });

    }

    /* =====================================
       INCREASE QUANTITY
    ===================================== */

    item.quantity += 1;

    /* =====================================
       SAVE CART
    ===================================== */

    await cart.save();

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "Quantity increased",

      cart,

    });

  } catch (error) {

    console.error(
      "Increase Quantity Error:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        "Increase quantity failed",

    });

  }

};

/* =====================================
   DECREASE CART QUANTITY
===================================== */

export const decreaseQuantity = async (
  req,
  res
) => {

  try {

    /* =====================================
       REQUEST BODY
    ===================================== */

    const {

      userId,

      productId,

    } = req.body;

    /* =====================================
       FIND CART
    ===================================== */

    const cart =
      await Cart.findOne({

        userId,

      });

    /* =====================================
       CART NOT FOUND
    ===================================== */

    if (!cart) {

      return res.status(404).json({

        success: false,

        error:
          "Cart not found",

      });

    }

    /* =====================================
       FIND ITEM
    ===================================== */

    const item =
      cart.items.find(

        (item) =>

          item.productId ===
          productId

      );

    /* =====================================
       ITEM NOT FOUND
    ===================================== */

    if (!item) {

      return res.status(404).json({

        success: false,

        error:
          "Item not found",

      });

    }

    /* =====================================
       DECREASE QUANTITY
    ===================================== */

    item.quantity -= 1;

    /* =====================================
       REMOVE ITEM IF ZERO
    ===================================== */

    if (item.quantity <= 0) {

      cart.items =
        cart.items.filter(

          (item) =>

            item.productId !==
            productId

        );

    }

    /* =====================================
       SAVE CART
    ===================================== */

    await cart.save();

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "Quantity decreased",

      cart,

    });

  } catch (error) {

    console.error(
      "Decrease Quantity Error:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        "Decrease quantity failed",

    });

  }

};

/* =====================================
   REMOVE ITEM FROM CART
===================================== */

export const removeCartItem = async (
  req,
  res
) => {

  try {

    /* =====================================
       REQUEST BODY
    ===================================== */

    const {

      userId,

      productId,

    } = req.body;

    /* =====================================
       FIND CART
    ===================================== */

    const cart =
      await Cart.findOne({

        userId,

      });

    /* =====================================
       CART NOT FOUND
    ===================================== */

    if (!cart) {

      return res.status(404).json({

        success: false,

        error:
          "Cart not found",

      });

    }

    /* =====================================
       REMOVE ITEM
    ===================================== */

    cart.items =
      cart.items.filter(

        (item) =>

          item.productId !==
          productId

      );

    /* =====================================
       SAVE CART
    ===================================== */

    await cart.save();

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "Item removed from cart",

      cart,

    });

  } catch (error) {

    console.error(
      "Remove Cart Item Error:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        "Remove item failed",

    });

  }

};
/* =====================================
   CLEAR USER CART
===================================== */

export const clearCart = async (
  req,
  res
) => {

  try {

    /* =====================================
       USER ID
    ===================================== */

    const {

      userId,

    } = req.params;

    /* =====================================
       CLEAR CART
    ===================================== */

    await Cart.findOneAndUpdate(

      { userId },

      {

        items: [],

      }

    );

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "Cart cleared",

    });

  } catch (error) {

    console.error(
      "Clear Cart Error:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        "Failed to clear cart",

    });

  }

};