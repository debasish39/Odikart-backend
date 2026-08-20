import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";


/* =====================================
   GET SELLER WALLET
===================================== */

export const getSellerWallet = async (
  req,
  res
) => {

  try {

    const sellerId =
      req.user._id;


    let wallet =
      await Wallet.findOne({
        sellerId,
      });


    /* =====================================
       CREATE WALLET IF NOT EXISTS
    ===================================== */

    if (!wallet) {

      wallet =
        await Wallet.create({

          sellerId,

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


    return res.status(200).json({

      success: true,

      wallet,

    });


  } catch (error) {

    console.error(
      "Get Seller Wallet Error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};
export const getWalletTransactions =
  async (req, res) => {

    try {

      const sellerId =
        req.user._id;


      const transactions =
        await WalletTransaction.find({

          sellerId,

        })
          .populate(
            "orderId",
            "_id orderNumber status pricing"
          )
          .sort({
            createdAt: -1,
          });


      return res.status(200).json({

        success: true,

        count:
          transactions.length,

        transactions,

      });


    } catch (error) {

      console.error(
        "Wallet Transactions Error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          error.message,

      });

    }

  };