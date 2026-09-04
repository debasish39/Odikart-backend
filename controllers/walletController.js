import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";

const getSellerId = (req) => req.user?._id;

export const getSellerWallet = async (req, res) => {
  try {
    const sellerId = getSellerId(req);

    let wallet = await Wallet.findOne({ sellerId }).lean();

    if (!wallet) {
      const created = await Wallet.create({
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

      wallet = created.toObject();
    }

    return res.status(200).json({
      success: true,
      wallet,
    });
  } catch (error) {
    console.error("Get Seller Wallet Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load seller wallet",
    });
  }
};

export const getWalletTransactions = async (req, res) => {
  try {
    const sellerId = getSellerId(req);

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = { sellerId };

    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(filter)
        .populate("orderId", "_id orderNumber status pricing")
        .populate("withdrawalId", "_id amount status referenceId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      WalletTransaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      transactions,
    });
  } catch (error) {
    console.error("Wallet Transactions Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load wallet transactions",
    });
  }
};
