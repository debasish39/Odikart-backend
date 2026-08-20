import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import Order from "../models/Order.js";

export const creditSellerWallet = async (orderId) => {
  try {

    console.log("=================================");
    console.log("💰 WALLET CREDIT STARTED");
    console.log("ORDER:", orderId);
    console.log("=================================");

    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "Delivered") {
      throw new Error(
        "Wallet can only be credited after delivery"
      );
    }

    const sellerAmounts = {};

    // =====================================
    // CALCULATE SELLER AMOUNTS
    // =====================================

    for (const item of order.items) {

      if (!item.sellerId) {
        console.log(
          "⚠️ sellerId missing:",
          item
        );
        continue;
      }

      const sellerId =
        item.sellerId.toString();

      const amount =
        Number(item.price || 0) *
        Number(item.quantity || 0);

      sellerAmounts[sellerId] =
        (sellerAmounts[sellerId] || 0) +
        amount;
    }

    console.log(
      "SELLER AMOUNTS:",
      sellerAmounts
    );

    // =====================================
    // PROCESS EACH SELLER
    // =====================================

    for (const sellerId of Object.keys(
      sellerAmounts
    )) {

      const grossAmount =
        sellerAmounts[sellerId];

      // =====================================
      // FIND SELLER
      // =====================================

      const seller =
        await User.findById(sellerId);

      if (!seller) {
        throw new Error(
          `Seller not found: ${sellerId}`
        );
      }

      // =====================================
      // COMMISSION
      // =====================================

      const commissionRate =
        seller.sellerInfo
          ?.subscription
          ?.commissionRate ?? 10;

      const commission =
        (grossAmount *
          commissionRate) /
        100;

      const sellerAmount =
        grossAmount -
        commission;

      console.log("SELLER:", sellerId);
      console.log("GROSS:", grossAmount);
      console.log(
        "COMMISSION RATE:",
        commissionRate
      );
      console.log(
        "COMMISSION:",
        commission
      );
      console.log(
        "SELLER AMOUNT:",
        sellerAmount
      );

      // =====================================
      // DUPLICATE PROTECTION
      // =====================================

      const alreadyCredited =
        await WalletTransaction.findOne({
          sellerId: seller._id,
          orderId: order._id,
          type: "SALE",
        });

      if (alreadyCredited) {

        console.log(
          "⚠️ Already credited"
        );

        continue;
      }

      // =====================================
      // GET / CREATE WALLET
      // =====================================

      let wallet =
        await Wallet.findOne({
          sellerId: seller._id,
        });

      if (!wallet) {

        wallet =
          await Wallet.create({
            sellerId: seller._id,
            availableBalance: 0,
            pendingBalance: 0,
            lifetimeEarnings: 0,
            totalWithdrawn: 0,
            totalCommission: 0,
            totalRefunds: 0,
            currency: "INR",
            isActive: true,
          });
      }

      // =====================================
      // CREDIT WALLET
      // =====================================

      wallet.availableBalance =
        Number(
          wallet.availableBalance || 0
        ) + sellerAmount;

      wallet.lifetimeEarnings =
        Number(
          wallet.lifetimeEarnings || 0
        ) + sellerAmount;

      wallet.totalCommission =
        Number(
          wallet.totalCommission || 0
        ) + commission;

      await wallet.save();

      console.log(
        "💰 WALLET UPDATED"
      );

      console.log(
        "AVAILABLE BALANCE:",
        wallet.availableBalance
      );

      console.log(
        "LIFETIME EARNINGS:",
        wallet.lifetimeEarnings
      );

      console.log(
        "TOTAL COMMISSION:",
        wallet.totalCommission
      );

   // =====================================
// CREATE TRANSACTION
// =====================================

const balanceAfter =
  wallet.availableBalance;

console.log(
  "🧾 CREATING WALLET TRANSACTION"
);

console.log(
  "Seller ID:",
  seller._id
);

console.log(
  "Order ID:",
  order._id
);

console.log(
  "Gross Amount:",
  grossAmount
);

console.log(
  "Commission:",
  commission
);

console.log(
  "Seller Amount:",
  sellerAmount
);

console.log(
  "Balance After:",
  balanceAfter
);

await WalletTransaction.create({

  sellerId:
    seller._id,

  orderId:
    order._id,

  type:
    "SALE",

  grossAmount:
    grossAmount,

  commission:
    commission,

  amount:
    sellerAmount,

  balanceAfter:
    balanceAfter,

  status:
    "COMPLETED",

  description:
    `Sale earning for order ${
      order.orderNumber ||
      order._id
    }`,
});

console.log(
  "✅ WALLET TRANSACTION CREATED"
);

      console.log(
        "✅ WALLET TRANSACTION CREATED"
      );
    }

    console.log(
      "================================="
    );

    console.log(
      "✅ WALLET CREDIT COMPLETED"
    );

    console.log(
      "================================="
    );

    return {
      success: true,
    };

  } catch (error) {

    console.error(
      "❌ WALLET CREDIT ERROR:",
      error
    );

    throw error;
  }
};