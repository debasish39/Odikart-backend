import mongoose from "mongoose";

import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import Withdrawal from "../models/Withdrawal.js";
import User from "../models/User.js";

/* =====================================================
   HELPERS
===================================================== */

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};


/* =====================================================
   1. FINANCE OVERVIEW
===================================================== */

export const getFinanceOverview = async (req, res) => {
  try {
    const [
      walletSummary,
      transactionSummary,
      withdrawalSummary,
    ] = await Promise.all([

      /* ---------------------------------------------
         WALLET SUMMARY
      --------------------------------------------- */

      Wallet.aggregate([
        {
          $match: {
            isActive: true,
          },
        },
        {
          $group: {
            _id: null,

            availableBalance: {
              $sum: {
                $ifNull: ["$availableBalance", 0],
              },
            },

            pendingBalance: {
              $sum: {
                $ifNull: ["$pendingBalance", 0],
              },
            },

            lifetimeEarnings: {
              $sum: {
                $ifNull: ["$lifetimeEarnings", 0],
              },
            },

            totalWithdrawn: {
              $sum: {
                $ifNull: ["$totalWithdrawn", 0],
              },
            },

            totalCommission: {
              $sum: {
                $ifNull: ["$totalCommission", 0],
              },
            },

            totalRefunds: {
              $sum: {
                $ifNull: ["$totalRefunds", 0],
              },
            },
          },
        },
      ]),

      /* ---------------------------------------------
         TRANSACTION SUMMARY
      --------------------------------------------- */

      WalletTransaction.aggregate([
        {
          $group: {
            _id: {
              type: "$type",
              status: "$status",
            },

            amount: {
              $sum: {
                $ifNull: ["$amount", 0],
              },
            },

            grossAmount: {
              $sum: {
                $ifNull: ["$grossAmount", 0],
              },
            },

            commission: {
              $sum: {
                $ifNull: ["$commission", 0],
              },
            },
          },
        },
      ]),

      /* ---------------------------------------------
         WITHDRAWAL SUMMARY
      --------------------------------------------- */

      Withdrawal.aggregate([
        {
          $group: {
            _id: "$status",

            amount: {
              $sum: {
                $ifNull: ["$amount", 0],
              },
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]),
    ]);


    const wallet = walletSummary[0] || {};


    /* ---------------------------------------------
       TRANSACTION VALUES
    --------------------------------------------- */

    let saleAmount = 0;
    let refundAmount = 0;
    let withdrawalTransactionAmount = 0;
    let commissionAmount = 0;

    transactionSummary.forEach((item) => {
      const type = item._id?.type;
      const status = item._id?.status;

      /*
       Only completed transactions should
       contribute to financial totals.
      */

      if (status !== "COMPLETED") {
        return;
      }

      if (type === "SALE") {
        saleAmount += item.grossAmount || 0;
        commissionAmount += item.commission || 0;
      }

      if (type === "REFUND") {
        refundAmount += item.amount || 0;
      }

      if (type === "WITHDRAWAL") {
        withdrawalTransactionAmount +=
          item.amount || 0;
      }
    });


    /* ---------------------------------------------
       WITHDRAWAL VALUES
    --------------------------------------------- */

    let pendingWithdrawals = 0;
    let processingWithdrawals = 0;
    let completedWithdrawals = 0;
    let rejectedWithdrawals = 0;
    let failedWithdrawals = 0;

    let pendingWithdrawalCount = 0;
    let processingWithdrawalCount = 0;
    let completedWithdrawalCount = 0;

    withdrawalSummary.forEach((item) => {
      const amount = item.amount || 0;
      const count = item.count || 0;

      switch (item._id) {
        case "PENDING":
          pendingWithdrawals += amount;
          pendingWithdrawalCount += count;
          break;

        case "PROCESSING":
          processingWithdrawals += amount;
          processingWithdrawalCount += count;
          break;

        case "COMPLETED":
          completedWithdrawals += amount;
          completedWithdrawalCount += count;
          break;

        case "REJECTED":
          rejectedWithdrawals += amount;
          break;

        case "FAILED":
          failedWithdrawals += amount;
          break;

        default:
          break;
      }
    });


    return res.status(200).json({
      success: true,

      overview: {
        /* Seller wallet */
        availableSellerBalance:
          wallet.availableBalance || 0,

        pendingSellerBalance:
          wallet.pendingBalance || 0,

        lifetimeSellerEarnings:
          wallet.lifetimeEarnings || 0,

        totalSellerWithdrawn:
          wallet.totalWithdrawn || 0,

        /* Commission */
        totalCommission:
          wallet.totalCommission ||
          commissionAmount ||
          0,

        /* Refunds */
        totalRefunds:
          wallet.totalRefunds ||
          refundAmount ||
          0,

        /* Sales */
        totalSales:
          saleAmount || 0,

        /* Withdrawals */
        pendingWithdrawals,
        processingWithdrawals,
        completedWithdrawals,
        rejectedWithdrawals,
        failedWithdrawals,

        pendingWithdrawalCount,
        processingWithdrawalCount,
        completedWithdrawalCount,

        /* Useful combined value */
        totalWithdrawals:
          completedWithdrawals,

        /* Platform */
        platformRevenue:
          commissionAmount || 0,
      },
    });

  } catch (error) {
    console.error(
      "Finance Overview Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load finance overview",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};


/* =====================================================
   2. GET ALL SELLER WALLETS
===================================================== */

export const getAdminWallets = async (req, res) => {
  try {
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 20,
        1
      ),
      100
    );

    const skip = (page - 1) * limit;

    const search =
      String(req.query.search || "").trim();


    const sellerFilter = {
      role: "seller",
    };


    /* ---------------------------------------------
       SEARCH SELLERS
    --------------------------------------------- */

    let sellerIds = null;

    if (search) {
      const sellers = await User.find({
        ...sellerFilter,

        $or: [
          {
            name: {
              $regex: search,
              $options: "i",
            },
          },
          {
            email: {
              $regex: search,
              $options: "i",
            },
          },
          {
            phone: {
              $regex: search,
              $options: "i",
            },
          },
          {
            businessName: {
              $regex: search,
              $options: "i",
            },
          },
        ],
      })
        .select("_id")
        .lean();

      sellerIds = sellers.map(
        (seller) => seller._id
      );

      if (sellerIds.length === 0) {
        return res.status(200).json({
          success: true,
          wallets: [],
          page,
          limit,
          total: 0,
          totalPages: 0,
        });
      }
    }


    const filter = {
      isActive: true,
    };

    if (sellerIds) {
      filter.sellerId = {
        $in: sellerIds,
      };
    }


    const [
      wallets,
      total,
    ] = await Promise.all([
      Wallet.find(filter)
        .populate(
          "sellerId",
          "name email phone businessName role"
        )
        .sort({
          updatedAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Wallet.countDocuments(filter),
    ]);


    return res.status(200).json({
      success: true,

      wallets,

      page,

      limit,

      total,

      totalPages:
        Math.ceil(total / limit),
    });

  } catch (error) {
    console.error(
      "Admin Wallets Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load seller wallets",
    });
  }
};


/* =====================================================
   3. GET SINGLE SELLER WALLET
===================================================== */

export const getAdminWallet = async (req, res) => {
  try {
    const { sellerId } = req.params;


    if (!isValidObjectId(sellerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid seller ID",
      });
    }


    const wallet = await Wallet.findOne({
      sellerId,
      isActive: true,
    })
      .populate(
        "sellerId",
        "name email phone businessName role"
      )
      .lean();


    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Seller wallet not found",
      });
    }


    return res.status(200).json({
      success: true,
      wallet,
    });

  } catch (error) {
    console.error(
      "Get Admin Wallet Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load seller wallet",
    });
  }
};


/* =====================================================
   4. GET ALL TRANSACTIONS
===================================================== */

export const getAdminTransactions = async (
  req,
  res
) => {
  try {
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 20,
        1
      ),
      100
    );

    const skip = (page - 1) * limit;


    const filter = {};


    /* ---------------------------------------------
       SELLER FILTER
    --------------------------------------------- */

    if (req.query.sellerId) {
      if (
        !isValidObjectId(
          req.query.sellerId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid seller ID",
        });
      }

      filter.sellerId =
        req.query.sellerId;
    }


    /* ---------------------------------------------
       TYPE FILTER
    --------------------------------------------- */

    const allowedTypes = [
      "SALE",
      "REFUND",
      "WITHDRAWAL",
      "SETTLEMENT",
      "ADJUSTMENT",
      "REVERSAL",
    ];

    if (req.query.type) {
      if (
        !allowedTypes.includes(
          req.query.type
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction type",
        });
      }

      filter.type =
        req.query.type;
    }


    /* ---------------------------------------------
       STATUS FILTER
    --------------------------------------------- */

    const allowedStatuses = [
      "PENDING",
      "PROCESSING",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
      "REVERSED",
    ];

    if (req.query.status) {
      if (
        !allowedStatuses.includes(
          req.query.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction status",
        });
      }

      filter.status =
        req.query.status;
    }


    /* ---------------------------------------------
       DATE FILTER
    --------------------------------------------- */

    if (
      req.query.startDate ||
      req.query.endDate
    ) {
      filter.createdAt = {};

      if (req.query.startDate) {
        const start = new Date(
          req.query.startDate
        );

        if (
          Number.isNaN(
            start.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid start date",
          });
        }

        start.setHours(
          0,
          0,
          0,
          0
        );

        filter.createdAt.$gte =
          start;
      }


      if (req.query.endDate) {
        const end = new Date(
          req.query.endDate
        );

        if (
          Number.isNaN(
            end.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid end date",
          });
        }

        end.setHours(
          23,
          59,
          59,
          999
        );

        filter.createdAt.$lte =
          end;
      }
    }


    const [
      transactions,
      total,
    ] = await Promise.all([
      WalletTransaction.find(filter)
        .populate(
          "sellerId",
          "name email phone businessName"
        )
        .populate(
          "orderId",
          "orderNumber status"
        )
        .populate(
          "withdrawalId",
          "amount status referenceId"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      WalletTransaction.countDocuments(
        filter
      ),
    ]);


    return res.status(200).json({
      success: true,

      transactions,

      page,

      limit,

      total,

      totalPages:
        Math.ceil(total / limit),
    });

  } catch (error) {
    console.error(
      "Admin Transactions Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load transactions",
    });
  }
};


/* =====================================================
   5. GET ALL WITHDRAWALS
===================================================== */

export const getAdminWithdrawals = async (
  req,
  res
) => {
  try {
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 20,
        1
      ),
      100
    );

    const skip = (page - 1) * limit;


    const filter = {};


    /* ---------------------------------------------
       STATUS
    --------------------------------------------- */

    const allowedStatuses = [
      "PENDING",
      "PROCESSING",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
      "REJECTED",
    ];

    if (req.query.status) {
      if (
        !allowedStatuses.includes(
          req.query.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid withdrawal status",
        });
      }

      filter.status =
        req.query.status;
    }


    /* ---------------------------------------------
       SELLER
    --------------------------------------------- */

    if (req.query.sellerId) {
      if (
        !isValidObjectId(
          req.query.sellerId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid seller ID",
        });
      }

      filter.sellerId =
        req.query.sellerId;
    }


    /* ---------------------------------------------
       DATE FILTER
    --------------------------------------------- */

    if (
      req.query.startDate ||
      req.query.endDate
    ) {
      filter.createdAt = {};

      if (req.query.startDate) {
        const start = new Date(
          req.query.startDate
        );

        if (
          Number.isNaN(
            start.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid start date",
          });
        }

        start.setHours(
          0,
          0,
          0,
          0
        );

        filter.createdAt.$gte =
          start;
      }


      if (req.query.endDate) {
        const end = new Date(
          req.query.endDate
        );

        if (
          Number.isNaN(
            end.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid end date",
          });
        }

        end.setHours(
          23,
          59,
          59,
          999
        );

        filter.createdAt.$lte =
          end;
      }
    }


    const [
      withdrawals,
      total,
    ] = await Promise.all([
      Withdrawal.find(filter)
        .populate(
          "sellerId",
          "name email phone businessName"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Withdrawal.countDocuments(
        filter
      ),
    ]);


    return res.status(200).json({
      success: true,

      withdrawals,

      page,

      limit,

      total,

      totalPages:
        Math.ceil(total / limit),
    });

  } catch (error) {
    console.error(
      "Admin Withdrawals Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load withdrawals",
    });
  }
};


/* =====================================================
   6. COMMISSION OVERVIEW
===================================================== */

export const getCommissionOverview = async (
  req,
  res
) => {
  try {
    const result =
      await Wallet.aggregate([
        {
          $match: {
            isActive: true,
          },
        },
        {
          $group: {
            _id: null,

            totalCommission: {
              $sum: {
                $ifNull: [
                  "$totalCommission",
                  0,
                ],
              },
            },

            lifetimeEarnings: {
              $sum: {
                $ifNull: [
                  "$lifetimeEarnings",
                  0,
                ],
              },
            },

            totalRefunds: {
              $sum: {
                $ifNull: [
                  "$totalRefunds",
                  0,
                ],
              },
            },
          },
        },
      ]);


    const data =
      result[0] || {};


    return res.status(200).json({
      success: true,

      commission: {
        totalCommission:
          data.totalCommission || 0,

        sellerEarnings:
          data.lifetimeEarnings || 0,

        totalRefunds:
          data.totalRefunds || 0,
      },
    });

  } catch (error) {
    console.error(
      "Commission Overview Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load commission overview",
    });
  }
};