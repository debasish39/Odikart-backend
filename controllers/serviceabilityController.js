import mongoose from "mongoose";

import Product from "../models/Product.js";

import {
  normalizePincode,
  isValidPincode,
  checkProductServiceability,
} from "../utils/checkProductServiceability.js";


/* =====================================
   CHECK SINGLE PRODUCT
===================================== */

export const checkProductDeliveryServiceability =
  async (req, res) => {
    try {
      const {
        productId,
        pincode,
      } = req.body;

      /* =====================================
         VALIDATE PRODUCT ID
      ===================================== */

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID",
        });
      }

      /* =====================================
         NORMALIZE PIN
      ===================================== */

      const normalizedPincode =
        normalizePincode(pincode);

      /* =====================================
         VALIDATE PIN
      ===================================== */

      if (!isValidPincode(normalizedPincode)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_PINCODE",
          message:
            "Please enter a valid 6-digit PIN code.",
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
        }).select(
          "title shipping seller"
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      /* =====================================
         CHECK SERVICEABILITY
      ===================================== */

      const result =
        checkProductServiceability(
          product,
          normalizedPincode
        );

      /* =====================================
         RESPONSE
      ===================================== */

      return res.status(200).json({
        success: true,

        pincode:
          normalizedPincode,

        productId:
          product._id,

        productTitle:
          product.title,

        serviceable:
          result.serviceable,

        code:
          result.reason,

        message:
          result.message,
      });

    } catch (error) {
      console.error(
        "Product Serviceability Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to check delivery serviceability",
      });
    }
  };


/* =====================================
   CHECK ENTIRE CART
===================================== */

export const checkCartServiceability =
  async (req, res) => {
    try {
      const {
        items,
        pincode,
        postalCode,
      } = req.body;

      console.log(
        "===================================="
      );

      console.log(
        "🛒 CART SERVICEABILITY CHECK"
      );

      console.log(
        "===================================="
      );

      console.log(
        "Pincode:",
        pincode || postalCode
      );

      console.log(
        "Items:",
        items?.length
      );

      /* =====================================
         VALIDATE ITEMS
      ===================================== */

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cart must contain at least one item",
        });
      }

      /* =====================================
         SUPPORT BOTH:
         
         pincode
         postalCode
      ===================================== */

      const normalizedPincode =
        normalizePincode(
          pincode || postalCode
        );

      /* =====================================
         VALIDATE PIN
      ===================================== */

      if (
        !isValidPincode(
          normalizedPincode
        )
      ) {
        return res.status(400).json({
          success: false,

          code:
            "INVALID_PINCODE",

          message:
            "Please enter a valid 6-digit PIN code.",
        });
      }

      /* =====================================
         EXTRACT PRODUCT IDS
      ===================================== */

      const productIds =
        items.map((item) => {
          return (
            item.productId ||
            item._id ||
            item.product?._id
          );
        });

      /* =====================================
         CHECK INVALID IDS
      ===================================== */

      const invalidProductIds =
        productIds.filter(
          (id) =>
            !id ||
            !mongoose.Types.ObjectId.isValid(id)
        );

      if (
        invalidProductIds.length > 0
      ) {
        return res.status(400).json({
          success: false,

          code:
            "INVALID_PRODUCT_ID",

          message:
            "One or more cart products have an invalid product ID.",

          invalidProductIds,
        });
      }

      /* =====================================
         FIND PRODUCTS
      ===================================== */

      const products =
        await Product.find({
          _id: {
            $in: productIds,
          },

          isDeleted: false,

          isActive: true,
        }).select(
          "title shipping seller"
        );

      /* =====================================
         PRODUCT MAP
      ===================================== */

      const productMap =
        new Map(
          products.map(
            (product) => [
              product._id.toString(),
              product,
            ]
          )
        );

      /* =====================================
         RESULT ARRAYS
      ===================================== */

      const results = [];

      const unavailableItems = [];

      /* =====================================
         CHECK EVERY PRODUCT
      ===================================== */

      for (
        let i = 0;
        i < items.length;
        i++
      ) {
        const item = items[i];

        const productId =
          productIds[i];

        const product =
          productMap.get(
            productId.toString()
          );

        /* =====================================
           PRODUCT NOT FOUND
        ===================================== */

        if (!product) {
          const result = {
            productId,

            productTitle:
              item.title ||
              "Unknown Product",

            serviceable: false,

            code:
              "PRODUCT_NOT_FOUND",

            message:
              "Product is no longer available.",
          };

          results.push(result);

          unavailableItems.push(result);

          continue;
        }

        /* =====================================
           SERVICEABILITY
        ===================================== */

        const serviceability =
          checkProductServiceability(
            product,
            normalizedPincode
          );

        const result = {
          productId:
            product._id,

          productTitle:
            product.title,

          serviceable:
            serviceability.serviceable,

          code:
            serviceability.reason,

          message:
            serviceability.message,
        };

        results.push(result);

        /* =====================================
           UNAVAILABLE
        ===================================== */

        if (
          !serviceability.serviceable
        ) {
          unavailableItems.push(
            result
          );
        }
      }

      /* =====================================
         ENTIRE CART SERVICEABILITY
      ===================================== */

      const serviceable =
        unavailableItems.length === 0;

      /* =====================================
         RESPONSE
      ===================================== */

      console.log(
        "Cart serviceable:",
        serviceable
      );

      console.log(
        "Unavailable items:",
        unavailableItems.length
      );

      console.log(
        "===================================="
      );

      return res.status(200).json({
        success: true,

        pincode:
          normalizedPincode,

        serviceable,

        orderAllowed:
          serviceable,

        message:
          serviceable
            ? "All products can be delivered to this PIN code."
            : "One or more products cannot be delivered to this PIN code.",

        items:
          results,

        unavailableItems,
      });

    } catch (error) {
      console.error(
        "Cart Serviceability Error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to check cart delivery serviceability",
      });
    }
  };