import crypto from "crypto";
import mongoose from "mongoose";
import Withdrawal from "../models/Withdrawal.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";

const MIN_WITHDRAWAL = 100;
const MAX_WITHDRAWAL = 100000;

const maskAccountNumber = (value = "") =>
  value.length > 4 ? `******${value.slice(-4)}` : "******";

const normalizeAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : NaN;
};

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value);

export const createWithdrawal = async (req, res) => {
  try {
    const sellerId = req.user?._id;

    const {
      amount,
      accountHolderName,
      accountNumber,
      ifsc,
      bankName,
      idempotencyKey: clientKey,
    } = req.body;

    const withdrawalAmount = normalizeAmount(amount);

    if (
      !Number.isFinite(withdrawalAmount) ||
      withdrawalAmount < MIN_WITHDRAWAL ||
      withdrawalAmount > MAX_WITHDRAWAL
    ) {
      return res.status(400).json({
        success: false,
        message: `Withdrawal amount must be between ₹${MIN_WITHDRAWAL} and ₹${MAX_WITHDRAWAL}`,
      });
    }

    if (
      !accountHolderName?.trim() ||
      !accountNumber?.trim() ||
      !ifsc?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Complete bank details are required",
      });
    }

    const normalizedIFSC = ifsc.trim().toUpperCase();

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalizedIFSC)) {
      return res.status(400).json({
        success: false,
        message: "Invalid IFSC code",
      });
    }

    const idempotencyKey =
      clientKey?.trim() ||
      `WD-${sellerId}-${crypto.randomUUID()}`;

    const existingTransaction = await WalletTransaction.findOne({
      sellerId,
      idempotencyKey,
    }).lean();

    if (existingTransaction?.withdrawalId) {
      const withdrawal = await Withdrawal.findById(
        existingTransaction.withdrawalId
      ).lean();

      return res.status(200).json({
        success: true,
        duplicate: true,
        message: "Existing withdrawal returned",
        withdrawal,
        transaction: existingTransaction,
      });
    }

    const pendingWithdrawal = await Withdrawal.findOne({
      sellerId,
      status: { $in: ["PENDING", "PROCESSING"] },
    }).lean();

    if (pendingWithdrawal) {
      return res.status(409).json({
        success: false,
        message: "You already have a withdrawal being processed",
        withdrawalId: pendingWithdrawal._id,
      });
    }

    // Atomic reservation: only deduct if enough available balance exists.
    const wallet = await Wallet.findOneAndUpdate(
      {
        sellerId,
        isActive: true,
        availableBalance: { $gte: withdrawalAmount },
      },
      {
        $inc: {
          availableBalance: -withdrawalAmount,
          pendingBalance: withdrawalAmount,
        },
      },
      { new: false }
    );

    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance or inactive wallet",
      });
    }

    const balanceBefore = Number(wallet.availableBalance);
    const availableAfter = balanceBefore - withdrawalAmount;

    let withdrawal;
    let transaction;

    try {
      withdrawal = await Withdrawal.create({
        sellerId,
        amount: withdrawalAmount,
        status: "PENDING",
        bankAccount: {
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          ifsc: normalizedIFSC,
          bankName: bankName?.trim() || "",
        },
        provider: "INTERNAL",
      });

      transaction = await WalletTransaction.create({
        sellerId,
        walletId: wallet._id,
        type: "WITHDRAWAL",
        direction: "DEBIT",
        amount: withdrawalAmount,
        balanceBefore,
        balanceAfter: availableAfter,
        withdrawalId: withdrawal._id,
        provider: "INTERNAL",
        idempotencyKey,
        status: "PENDING",
        createdBy: "SELLER",
        description: `Withdrawal request ₹${withdrawalAmount}`,
      });
    } catch (createError) {
      // Compensating transaction if document creation fails.
      await Wallet.updateOne(
        { _id: wallet._id },
        {
          $inc: {
            availableBalance: withdrawalAmount,
            pendingBalance: -withdrawalAmount,
          },
        }
      );

      throw createError;
    }

    return res.status(201).json({
      success: true,
      message: "Withdrawal request submitted",
      withdrawal: {
        _id: withdrawal._id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        bankAccount: {
          accountHolderName: withdrawal.bankAccount.accountHolderName,
          accountNumber: maskAccountNumber(
            withdrawal.bankAccount.accountNumber
          ),
          ifsc: withdrawal.bankAccount.ifsc,
          bankName: withdrawal.bankAccount.bankName,
        },
      },
      transaction,
      wallet: {
        availableBalance: availableAfter,
        pendingBalance:
          Number(wallet.pendingBalance) + withdrawalAmount,
      },
      idempotencyKey,
    });
  } catch (error) {
    console.error("Create Withdrawal Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate withdrawal request",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create withdrawal request",
    });
  }
};

export const processWithdrawal = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can process withdrawals",
      });
    }

    const { withdrawalId } = req.params;

    if (!isValidObjectId(withdrawalId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid withdrawal ID",
      });
    }

    const {
      provider = "INTERNAL",
      providerPayoutId = "",
      adminNote = "",
    } = req.body;

    const withdrawal = await Withdrawal.findOneAndUpdate(
      { _id: withdrawalId, status: "PENDING" },
      {
        $set: {
          status: "PROCESSING",
          processedBy: req.user._id,
          provider,
          adminNote: adminNote.trim(),
          processedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!withdrawal) {
      return res.status(409).json({
        success: false,
        message: "Withdrawal not found or is no longer pending",
      });
    }

    const wallet = await Wallet.findOne({
      sellerId: withdrawal.sellerId,
    });

    if (!wallet || wallet.pendingBalance < withdrawal.amount) {
      await Withdrawal.updateOne(
        { _id: withdrawal._id, status: "PROCESSING" },
        {
          $set: {
            status: "FAILED",
            failureReason: "Wallet pending balance is insufficient",
            processedAt: new Date(),
          },
        }
      );

      return res.status(409).json({
        success: false,
        message: "Wallet pending balance is insufficient",
      });
    }

    /*
      DEVELOPMENT PAYOUT ADAPTER.
      Replace this block with Razorpay/Cashfree/bank payout integration.
    */
    const payoutResult = {
      success: true,
      payoutId: providerPayoutId || `PAYOUT-${Date.now()}`,
    };

    if (!payoutResult.success) {
      return res.status(502).json({
        success: false,
        message: "Payout provider failed",
      });
    }

    const now = new Date();

    // Release the reserved amount from pending balance.
    const updatedWallet = await Wallet.findOneAndUpdate(
      {
        _id: wallet._id,
        pendingBalance: { $gte: withdrawal.amount },
      },
      {
        $inc: {
          pendingBalance: -withdrawal.amount,
          totalWithdrawn: withdrawal.amount,
        },
      },
      { new: true }
    );

    if (!updatedWallet) {
      return res.status(409).json({
        success: false,
        message: "Unable to settle wallet balance safely",
      });
    }

    const completedWithdrawal = await Withdrawal.findOneAndUpdate(
      { _id: withdrawal._id, status: "PROCESSING" },
      {
        $set: {
          status: "COMPLETED",
          providerPayoutId: payoutResult.payoutId,
          referenceId: payoutResult.payoutId,
          processedBy: req.user._id,
          processedAt: now,
          completedAt: now,
        },
      },
      { new: true }
    );

    const transaction = await WalletTransaction.findOneAndUpdate(
      {
        withdrawalId: withdrawal._id,
        type: "WITHDRAWAL",
      },
      {
        $set: {
          status: "COMPLETED",
          provider,
          referenceId: payoutResult.payoutId,
          processedAt: now,
          balanceAfter: updatedWallet.availableBalance,
        },
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Withdrawal completed successfully",
      withdrawal: completedWithdrawal,
      transaction,
      wallet: {
        availableBalance: updatedWallet.availableBalance,
        pendingBalance: updatedWallet.pendingBalance,
        totalWithdrawn: updatedWallet.totalWithdrawn,
      },
      referenceId: payoutResult.payoutId,
    });
  } catch (error) {
    console.error("Process Withdrawal Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process withdrawal",
    });
  }
};

export const rejectWithdrawal = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can reject withdrawals",
      });
    }

    const { withdrawalId } = req.params;
    const reason = req.body?.reason?.trim();

    if (!isValidObjectId(withdrawalId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid withdrawal ID",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    // Claim the pending withdrawal first so two admins cannot reject it.
    const withdrawal = await Withdrawal.findOneAndUpdate(
      { _id: withdrawalId, status: "PENDING" },
      {
        $set: {
          status: "REJECTED",
          failureReason: reason,
          processedBy: req.user._id,
          processedAt: new Date(),
          adminNote: reason,
        },
      },
      { new: true }
    );

    if (!withdrawal) {
      return res.status(409).json({
        success: false,
        message: "Withdrawal not found or is no longer pending",
      });
    }

    const wallet = await Wallet.findOneAndUpdate(
      {
        sellerId: withdrawal.sellerId,
        pendingBalance: { $gte: withdrawal.amount },
      },
      {
        $inc: {
          pendingBalance: -withdrawal.amount,
          availableBalance: withdrawal.amount,
        },
      },
      { new: false }
    );

    if (!wallet) {
      return res.status(409).json({
        success: false,
        message: "Unable to return withdrawal amount safely",
      });
    }

    const balanceBefore = Number(wallet.availableBalance);
    const balanceAfter = balanceBefore + withdrawal.amount;

    const reversal = await WalletTransaction.create({
      sellerId: withdrawal.sellerId,
      walletId: wallet._id,
      type: "REVERSAL",
      direction: "CREDIT",
      amount: withdrawal.amount,
      balanceBefore,
      balanceAfter,
      withdrawalId: withdrawal._id,
      provider: "INTERNAL",
      status: "COMPLETED",
      createdBy: "ADMIN",
      description: `Withdrawal rejected: ${reason}`,
      processedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Withdrawal rejected and money returned",
      withdrawal,
      reversal,
      wallet: {
        availableBalance: balanceAfter,
        pendingBalance:
          Number(wallet.pendingBalance) - withdrawal.amount,
      },
    });
  } catch (error) {
    console.error("Reject Withdrawal Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject withdrawal",
    });
  }
};
