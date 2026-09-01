import mongoose from "mongoose";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";

/* =========================================================
   SECURITY / VALIDATION HELPERS
========================================================= */

const MAX_CART_ITEMS = 100;
const MAX_QUANTITY = 100000;
const MAX_SKU_LENGTH = 100;
const MAX_TITLE_LENGTH = 200;

const getUserId = (req) =>
  req.user?._id || req.user?.id;

const isValidObjectId = (id) =>
  Boolean(id) &&
  mongoose.Types.ObjectId.isValid(id);

const normalizeSku = (sku) =>
  String(sku ?? "").trim().slice(0, MAX_SKU_LENGTH);

const normalizeQuantity = (quantity) => {
  const value = Number(quantity);

  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_QUANTITY
  ) {
    return null;
  }

  return value;
};

/*
  Only approved, active products are allowed in a cart.

  This prevents a user from adding:
  - deleted products
  - blocked products
  - pending products
  - rejected products
  - inactive products
*/
const findAvailableProduct = async (productId) => {
  return Product.findOne({
    _id: productId,
    isDeleted: false,
    isActive: true,
    status: "approved",
  });
};

/*
  Never trust title/price/image values sent by the client.

  Cart data is refreshed from the current Product document.
*/

/*
|--------------------------------------------------------------------------
| Build cart item
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Cart items contain the CURRENT pricing information needed
| by the frontend checkout calculation.
|
| Product/Variant remains the source of truth.
|
*/

const buildCartItem = (
  product,
  selectedVariant,
  variantSku,
  quantity
) => {

  const price = selectedVariant
    ? Number(selectedVariant.price || 0)
    : Number(product.price ?? 0);


  /*
  |--------------------------------------------------------------------------
  | IMAGE
  |--------------------------------------------------------------------------
  */

  const image =
    selectedVariant?.images?.[0] ||
    product.media?.thumbnail ||
    product.media?.images?.[0] ||
    "";


  /*
  |--------------------------------------------------------------------------
  | ATTRIBUTES
  |--------------------------------------------------------------------------
  */

  const attributes = selectedVariant
    ? Object.fromEntries(
        selectedVariant.attributes || []
      )
    : {};


  /*
  |--------------------------------------------------------------------------
  | VARIANT PRICING
  |--------------------------------------------------------------------------
  */

  const discountPercentage =
    Number(
      selectedVariant?.discountPercentage || 0
    );


  const taxPercentage =
    Number(
      selectedVariant?.tax || 0
    );


  /*
  |--------------------------------------------------------------------------
  | PRODUCT OFFER
  |--------------------------------------------------------------------------
  */

  const offer = product.offer
    ? {
        enabled:
          product.offer.enabled === true,

        discountType:
          product.offer.discountType ||
          "percentage",

        value:
          Number(
            product.offer.value || 0
          ),

        startDate:
          product.offer.startDate || null,

        endDate:
          product.offer.endDate || null,
      }
    : {
        enabled: false,

        discountType:
          "percentage",

        value: 0,

        startDate: null,

        endDate: null,
      };


  /*
  |--------------------------------------------------------------------------
  | RETURN CART ITEM
  |--------------------------------------------------------------------------
  */

  return {

    productId:
      product._id,

    variantSku:
      variantSku || "",

    attributes,

    title:
      String(
        product.title || ""
      ).slice(
        0,
        MAX_TITLE_LENGTH
      ),

    price,

    image,

    quantity,


    /*
    |--------------------------------------------------------------------------
    | PRICING INFORMATION
    |--------------------------------------------------------------------------
    */

    taxPercentage,

    discountPercentage,

    offer,
  };
};



/*
  Revalidate every cart item against the database.

  This is important before checkout because:
  - prices can change
  - products can be blocked
  - variants can become inactive
  - stock can change
*/
const validateCartItems = async (cart) => {
  const validItems = [];
  const removedItems = [];

  for (const item of cart.items || []) {
    const product =
      await findAvailableProduct(
        item.productId
      );

    if (!product) {
      removedItems.push({
        productId: item.productId,
        variantSku: item.variantSku || "",
        reason:
          "Product is no longer available",
      });
      continue;
    }

    const variantSku =
      normalizeSku(
        item.variantSku
      );

    let selectedVariant = null;

    if (product.variants?.length) {
      if (!variantSku) {
        removedItems.push({
          productId: item.productId,
          variantSku: "",
          reason:
            "Product variant is required",
        });
        continue;
      }

      selectedVariant =
        product.variants.find(
          (variant) =>
            normalizeSku(
              variant.sku
            ) === variantSku
        );

      if (
        !selectedVariant ||
        selectedVariant.isActive === false
      ) {
        removedItems.push({
          productId: item.productId,
          variantSku,
          reason:
            "Selected variant is no longer available",
        });
        continue;
      }

      if (
        !Number.isInteger(
          Number(selectedVariant.stock)
        ) ||
        Number(selectedVariant.stock) <
          Number(item.quantity)
      ) {
        removedItems.push({
          productId: item.productId,
          variantSku,
          reason:
            "Insufficient stock",
        });
        continue;
      }
    }

    const quantity =
      normalizeQuantity(
        item.quantity
      );

    if (!quantity) {
      removedItems.push({
        productId: item.productId,
        variantSku,
        reason:
          "Invalid quantity",
      });
      continue;
    }

    validItems.push(
      buildCartItem(
        product,
        selectedVariant,
        variantSku,
        quantity
      )
    );
  }

  return {
    validItems,
    removedItems,
  };
};

/*
  Keep one cart per authenticated user.
  req.user comes from authMiddleware.
*/
const requireAuthenticatedUser =
  (req, res) => {
    const userId =
      getUserId(req);

    if (
      !userId ||
      !isValidObjectId(userId)
    ) {
      res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });

      return null;
    }

    return userId;
  };

/* =========================================================
   SAVE / UPDATE CART
========================================================= */

export const saveCart = async (
  req,
  res
) => {
  try {
    const userId =
      requireAuthenticatedUser(
        req,
        res
      );

    if (!userId) {
      return;
    }

    const {
      items,
    } = req.body;

    if (
      !Array.isArray(items)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cart items must be an array",
      });
    }

    if (
      items.length >
      MAX_CART_ITEMS
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Cart cannot contain more than ${MAX_CART_ITEMS} items`,
      });
    }

    /*
      SECURITY:
      Do not blindly save req.body.items.

      Every item is reconstructed from the current
      database product so a client cannot manipulate:
      price, title, image, seller or attributes.
    */

    const sanitizedItems = [];

    for (
      const rawItem of items
    ) {
      if (
        !isValidObjectId(
          rawItem?.productId
        )
      ) {
        continue;
      }

      const product =
        await findAvailableProduct(
          rawItem.productId
        );

      if (!product) {
        continue;
      }

      const variantSku =
        normalizeSku(
          rawItem.variantSku
        );

      let selectedVariant = null;

      if (
        product.variants?.length
      ) {
        if (!variantSku) {
          continue;
        }

        selectedVariant =
          product.variants.find(
            (variant) =>
              normalizeSku(
                variant.sku
              ) === variantSku
          );

        if (
          !selectedVariant ||
          selectedVariant.isActive === false
        ) {
          continue;
        }
      }

      const quantity =
        normalizeQuantity(
          rawItem.quantity
        );

      if (!quantity) {
        continue;
      }

      if (
        selectedVariant &&
        quantity >
          Number(
            selectedVariant.stock
          )
      ) {
        continue;
      }

      const cartItem =
        buildCartItem(
          product,
          selectedVariant,
          variantSku,
          quantity
        );

      /*
        Merge duplicate product +
        variant combinations.
      */

      const existingIndex =
        sanitizedItems.findIndex(
          (item) =>
            item.productId.toString() ===
              product._id.toString() &&
            item.variantSku ===
              variantSku
        );

      if (
        existingIndex !== -1
      ) {
        const combinedQuantity =
          sanitizedItems[
            existingIndex
          ].quantity + quantity;

        if (
          selectedVariant &&
          combinedQuantity >
            Number(
              selectedVariant.stock
            )
        ) {
          sanitizedItems[
            existingIndex
          ].quantity =
            Number(
              selectedVariant.stock
            );
        } else {
          sanitizedItems[
            existingIndex
          ].quantity =
            combinedQuantity;
        }
      } else {
        sanitizedItems.push(
          cartItem
        );
      }

      if (
        sanitizedItems.length >=
        MAX_CART_ITEMS
      ) {
        break;
      }
    }

    let cart =
      await Cart.findOne({
        userId,
      });

    if (cart) {
      cart.items =
        sanitizedItems;

      cart.updatedAt =
        new Date();

      await cart.save();
    } else {
      cart = new Cart({
        userId,
        items:
          sanitizedItems,
      });

      await cart.save();
    }

    return res.status(200).json({
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

    return res.status(500).json({
      success: false,
      message:
        "Failed to save cart",
    });
  }
};

/* =========================================================
   GET USER CART
========================================================= */

export const getCart = async (
  req,
  res
) => {
  try {
    const userId =
      requireAuthenticatedUser(
        req,
        res
      );

    if (!userId) {
      return;
    }

    const cart =
      await Cart.findOne({
        userId,
      });

    if (!cart) {
      return res.status(200).json({
        success: true,
        items: [],
      });
    }

    /*
      Revalidate cart contents every time it
      is fetched so stale products are not
      silently presented as purchasable.
    */

    const {
      validItems,
      removedItems,
    } =
      await validateCartItems(
        cart
      );

    const changed =
      validItems.length !==
        cart.items.length ||
      validItems.some(
        (item, index) =>
          item.productId.toString() !==
            cart.items[
              index
            ]?.productId?.toString() ||
          item.variantSku !==
            cart.items[
              index
            ]?.variantSku ||
          item.quantity !==
            cart.items[
              index
            ]?.quantity ||
          item.price !==
            cart.items[
              index
            ]?.price
      );

    if (changed) {
      cart.items =
        validItems;

      cart.updatedAt =
        new Date();

      await cart.save();
    }

    return res.status(200).json({
      success: true,
      cart,
      items:
        validItems,
      removedItems,
    });

  } catch (error) {
    console.error(
      "Get Cart Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch cart",
    });
  }
};

/* =========================================================
   ADD ITEM TO CART
========================================================= */

export const addToCart = async (
  req,
  res
) => {
  try {
    const userId =
      requireAuthenticatedUser(
        req,
        res
      );

    if (!userId) {
      return;
    }

    const {
      productId,
      variantSku,
      quantity = 1,
    } = req.body;

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

    const normalizedQuantity =
      normalizeQuantity(
        quantity
      );

    if (!normalizedQuantity) {
      return res.status(400).json({
        success: false,
        message:
          `Quantity must be an integer between 1 and ${MAX_QUANTITY}`,
      });
    }

    const product =
      await findAvailableProduct(
        productId
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found or not available",
      });
    }

    const normalizedSku =
      normalizeSku(
        variantSku
      );

    let selectedVariant = null;

    if (
      product.variants?.length
    ) {
      if (!normalizedSku) {
        return res.status(400).json({
          success: false,
          message:
            "Variant SKU is required",
        });
      }

      selectedVariant =
        product.variants.find(
          (variant) =>
            normalizeSku(
              variant.sku
            ) === normalizedSku
        );

      if (!selectedVariant) {
        return res.status(404).json({
          success: false,
          message:
            "Selected variant not found",
        });
      }

      if (
        selectedVariant.isActive === false
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selected variant is not available",
        });
      }

      const stock =
        Number(
          selectedVariant.stock
        );

      if (
        !Number.isInteger(
          stock
        ) ||
        stock <
          normalizedQuantity
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Insufficient stock",
          availableStock:
            Math.max(
              0,
              stock || 0
            ),
        });
      }
    }

    const maximumOrder =
      Number(
        product.maximumOrderQuantity
      );

    if (
      Number.isInteger(
        maximumOrder
      ) &&
      maximumOrder > 0 &&
      normalizedQuantity >
        maximumOrder
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Maximum ${maximumOrder} items can be ordered`,
        maximumOrderQuantity:
          maximumOrder,
      });
    }

    let cart =
      await Cart.findOne({
        userId,
      });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
      });
    }

    if (
      cart.items.length >=
      MAX_CART_ITEMS
    ) {
      /*
        If the same product/variant is already
        present, it can still be increased.
      */
      const alreadyExists =
        cart.items.some(
          (item) =>
            item.productId.toString() ===
              product._id.toString() &&
            item.variantSku ===
              normalizedSku
        );

      if (!alreadyExists) {
        return res.status(400).json({
          success: false,
          message:
            `Cart cannot contain more than ${MAX_CART_ITEMS} different items`,
        });
      }
    }

    const existingItem =
      cart.items.find(
        (item) =>
          item.productId.toString() ===
            product._id.toString() &&
          item.variantSku ===
            normalizedSku
      );

    const newQuantity =
      existingItem
        ? Number(
            existingItem.quantity
          ) +
          normalizedQuantity
        : normalizedQuantity;

    if (
      !Number.isInteger(
        newQuantity
      ) ||
      newQuantity >
        MAX_QUANTITY
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Requested quantity is too large",
      });
    }

    if (
      maximumOrder > 0 &&
      Number.isInteger(
        maximumOrder
      ) &&
      newQuantity >
        maximumOrder
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Maximum ${maximumOrder} items can be ordered`,
        maximumOrderQuantity:
          maximumOrder,
      });
    }

    if (
      selectedVariant &&
      newQuantity >
        Number(
          selectedVariant.stock
        )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Requested quantity exceeds available stock",
        availableStock:
          Number(
            selectedVariant.stock
          ),
      });
    }

    const cartItem =
      buildCartItem(
        product,
        selectedVariant,
        normalizedSku,
        newQuantity
      );

    if (existingItem) {
      existingItem.attributes =
        cartItem.attributes;

      existingItem.title =
        cartItem.title;

      existingItem.price =
        cartItem.price;

      existingItem.image =
        cartItem.image;

      existingItem.quantity =
        cartItem.quantity;
    } else {
      cart.items.push(
        cartItem
      );
    }

    cart.updatedAt =
      new Date();

    await cart.save();

    return res.status(200).json({
      success: true,
      message:
        "Product added to cart",
      cart,
    });

  } catch (error) {
    console.error(
      "Add To Cart Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to add product to cart",
    });
  }
};

/* =========================================================
   INCREASE QUANTITY
========================================================= */

export const increaseQuantity =
  async (
    req,
    res
  ) => {
    try {
      const userId =
        requireAuthenticatedUser(
          req,
          res
        );

      if (!userId) {
        return;
      }

      const {
        productId,
        variantSku = "",
      } = req.body;

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

      const normalizedSku =
        normalizeSku(
          variantSku
        );

      const cart =
        await Cart.findOne({
          userId,
        });

      if (!cart) {
        return res.status(404).json({
          success: false,
          message:
            "Cart not found",
        });
      }

      const item =
        cart.items.find(
          (cartItem) =>
            cartItem.productId.toString() ===
              productId.toString() &&
            cartItem.variantSku ===
              normalizedSku
        );

      if (!item) {
        return res.status(404).json({
          success: false,
          message:
            "Cart item not found",
        });
      }

      const product =
        await findAvailableProduct(
          productId
        );

      if (!product) {
        return res.status(409).json({
          success: false,
          message:
            "Product is no longer available",
        });
      }

      let selectedVariant = null;

      if (
        product.variants?.length
      ) {
        if (!normalizedSku) {
          return res.status(400).json({
            success: false,
            message:
              "Variant SKU is required",
          });
        }

        selectedVariant =
          product.variants.find(
            (variant) =>
              normalizeSku(
                variant.sku
              ) === normalizedSku
          );

        if (
          !selectedVariant ||
          selectedVariant.isActive === false
        ) {
          return res.status(409).json({
            success: false,
            message:
              "Selected variant is no longer available",
          });
        }

        const newQuantity =
          Number(item.quantity) +
          1;

        if (
          newQuantity >
          Number(
            selectedVariant.stock
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "No more stock available",
            availableStock:
              Number(
                selectedVariant.stock
              ),
          });
        }
      }

      const newQuantity =
        Number(item.quantity) +
        1;

      if (
        newQuantity >
        MAX_QUANTITY
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Maximum cart quantity exceeded",
        });
      }

      const maximumOrder =
        Number(
          product.maximumOrderQuantity
        );

      if (
        Number.isInteger(
          maximumOrder
        ) &&
        maximumOrder > 0 &&
        newQuantity >
          maximumOrder
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Maximum ${maximumOrder} items can be ordered`,
        });
      }

      /*
        Refresh price/title/image from DB.
      */
      const refreshed =
        buildCartItem(
          product,
          selectedVariant,
          normalizedSku,
          newQuantity
        );

      item.quantity =
        refreshed.quantity;

      item.price =
        refreshed.price;

      item.title =
        refreshed.title;

      item.image =
        refreshed.image;

      item.attributes =
        refreshed.attributes;

      cart.updatedAt =
        new Date();

      await cart.save();

      return res.status(200).json({
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

      return res.status(500).json({
        success: false,
        message:
          "Failed to increase quantity",
      });
    }
  };

/* =========================================================
   DECREASE QUANTITY
========================================================= */

export const decreaseQuantity =
  async (
    req,
    res
  ) => {
    try {
      const userId =
        requireAuthenticatedUser(
          req,
          res
        );

      if (!userId) {
        return;
      }

      const {
        productId,
        variantSku = "",
      } = req.body;

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

      const normalizedSku =
        normalizeSku(
          variantSku
        );

      const cart =
        await Cart.findOne({
          userId,
        });

      if (!cart) {
        return res.status(404).json({
          success: false,
          message:
            "Cart not found",
        });
      }

      const itemIndex =
        cart.items.findIndex(
          (item) =>
            item.productId.toString() ===
              productId.toString() &&
            item.variantSku ===
              normalizedSku
        );

      if (
        itemIndex === -1
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Cart item not found",
        });
      }

      const item =
        cart.items[itemIndex];

      if (
        Number(item.quantity) >
        1
      ) {
        item.quantity =
          Number(item.quantity) -
          1;

        /*
          Refresh current price/data.
        */
        const product =
          await findAvailableProduct(
            productId
          );

        if (product) {
          const selectedVariant =
            normalizedSku
              ? product.variants?.find(
                  (variant) =>
                    normalizeSku(
                      variant.sku
                    ) ===
                    normalizedSku
                )
              : null;

          if (
            !product.variants?.length ||
            (
              selectedVariant &&
              selectedVariant.isActive !== false
            )
          ) {
            const refreshed =
              buildCartItem(
                product,
                selectedVariant,
                normalizedSku,
                item.quantity
              );

            item.price =
              refreshed.price;

            item.title =
              refreshed.title;

            item.image =
              refreshed.image;

            item.attributes =
              refreshed.attributes;
          }
        }
      } else {
        cart.items.splice(
          itemIndex,
          1
        );
      }

      cart.updatedAt =
        new Date();

      await cart.save();

      return res.status(200).json({
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

      return res.status(500).json({
        success: false,
        message:
          "Failed to decrease quantity",
      });
    }
  };

/* =========================================================
   REMOVE CART ITEM
========================================================= */

export const removeCartItem =
  async (
    req,
    res
  ) => {
    try {
      const userId =
        requireAuthenticatedUser(
          req,
          res
        );

      if (!userId) {
        return;
      }

      const {
        productId,
        variantSku = "",
      } = req.body;

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

      const normalizedSku =
        normalizeSku(
          variantSku
        );

      const cart =
        await Cart.findOne({
          userId,
        });

      if (!cart) {
        return res.status(404).json({
          success: false,
          message:
            "Cart not found",
        });
      }

      const originalLength =
        cart.items.length;

      cart.items =
        cart.items.filter(
          (item) =>
            !(
              item.productId.toString() ===
                productId.toString() &&
              item.variantSku ===
                normalizedSku
            )
        );

      if (
        cart.items.length ===
        originalLength
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Cart item not found",
        });
      }

      cart.updatedAt =
        new Date();

      await cart.save();

      return res.status(200).json({
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

      return res.status(500).json({
        success: false,
        message:
          "Failed to remove cart item",
      });
    }
  };

/* =========================================================
   CLEAR CART
========================================================= */

export const clearCart = async (
  req,
  res
) => {
  try {
    const userId =
      requireAuthenticatedUser(
        req,
        res
      );

    if (!userId) {
      return;
    }

    const cart =
      await Cart.findOne({
        userId,
      });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message:
          "Cart not found",
      });
    }

    cart.items = [];

    cart.updatedAt =
      new Date();

    await cart.save();

    return res.status(200).json({
      success: true,
      message:
        "Cart cleared",
    });

  } catch (error) {
    console.error(
      "Clear Cart Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to clear cart",
    });
  }
};
