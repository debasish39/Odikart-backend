import Product from "../models/Product.js";

/**
 * Decrease stock atomically.
 *
 * Returns true when every item was successfully reserved.
 */
export const decreaseOrderStock = async (items) => {
  const updatedProducts = [];

  try {
    for (const item of items) {
      const product = await Product.findOneAndUpdate(
        {
          _id: item.productId,

          // Find the exact variant
          variants: {
            $elemMatch: {
              sku: item.variantSku,
              stock: { $gte: item.quantity },
              isActive: { $ne: false },
            },
          },
        },
        {
          $inc: {
            "variants.$[variant].stock": -item.quantity,
          },
        },
        {
          arrayFilters: [
            {
              "variant.sku": item.variantSku,
              "variant.stock": { $gte: item.quantity },
              "variant.isActive": { $ne: false },
            },
          ],
          new: true,
        },
      );

      if (!product) {
        throw new Error(
          `Insufficient stock for ${item.title} (${item.variantSku})`,
        );
      }

      updatedProducts.push({
        productId: item.productId,
        variantSku: item.variantSku,
        quantity: item.quantity,
      });
    }

    return updatedProducts;
  } catch (error) {
    // If one item failed after previous items were decreased,
    // restore everything already decreased.
    if (updatedProducts.length > 0) {
      await restoreOrderStock(updatedProducts);
    }

    throw error;
  }
};

/**
 * Restore stock.
 *
 * Used when:
 * - order cancelled
 * - return accepted/refunded
 */
export const restoreOrderStock = async (items) => {
  for (const item of items) {
    await Product.updateOne(
      {
        _id: item.productId,
        variants: {
          $elemMatch: {
            sku: item.variantSku,
          },
        },
      },
      {
        $inc: {
          "variants.$[variant].stock": item.quantity,
        },
      },
      {
        arrayFilters: [
          {
            "variant.sku": item.variantSku,
          },
        ],
      },
    );
  }
};
