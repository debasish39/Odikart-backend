import crypto from "crypto";
import Withdrawal from "../models/Withdrawal.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";

export const createWithdrawal = async (req, res) => {
  try {
    const sellerId = req.user._id;

    const {
      amount,
      accountHolderName,
      accountNumber,
      ifsc,
      bankName,
      idempotencyKey: clientIdempotencyKey,
    } = req.body;

    console.log("=================================");
    console.log("💸 CREATE WITHDRAWAL");
    console.log("SELLER:", sellerId);
    console.log("AMOUNT:", amount);
    console.log("=================================");

    // =====================================
    // VALIDATE AMOUNT
    // =====================================

    const withdrawalAmount = Number(amount);

    const MIN_WITHDRAWAL = 100;
    const MAX_WITHDRAWAL = 100000;

    if (
      !Number.isFinite(withdrawalAmount) ||
      withdrawalAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid withdrawal amount",
      });
    }

    if (withdrawalAmount < MIN_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        message:
          `Minimum withdrawal is ₹${MIN_WITHDRAWAL}`,
      });
    }

    if (withdrawalAmount > MAX_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        message:
          `Maximum withdrawal is ₹${MAX_WITHDRAWAL}`,
      });
    }

    // =====================================
    // BANK DETAILS
    // =====================================

    if (
      !accountHolderName?.trim() ||
      !accountNumber?.trim() ||
      !ifsc?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Complete bank details are required",
      });
    }

    const normalizedIFSC =
      ifsc.trim().toUpperCase();

    if (
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
        normalizedIFSC
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid IFSC code",
      });
    }

    // =====================================
    // IDEMPOTENCY KEY
    // =====================================

    /*
      If frontend sends a key, use it.

      Otherwise generate one on backend.

      NEVER use:
        idempotencyKey: ""
    */

    const idempotencyKey =
      clientIdempotencyKey?.trim() ||
      `WD-${sellerId}-${crypto.randomUUID()}`;

    console.log(
      "🔑 Idempotency Key:",
      idempotencyKey
    );

    // =====================================
    // CHECK DUPLICATE REQUEST
    // =====================================

    const existingTransaction =
      await WalletTransaction.findOne({
        sellerId,
        idempotencyKey,
      });

    if (existingTransaction) {
      console.log(
        "⚠️ DUPLICATE WITHDRAWAL REQUEST"
      );

      const existingWithdrawal =
        await Withdrawal.findById(
          existingTransaction.withdrawalId
        );

      return res.status(200).json({
        success: true,
        duplicate: true,
        message:
          "Existing withdrawal returned",
        withdrawal:
          existingWithdrawal,
        transaction:
          existingTransaction,
      });
    }

    // =====================================
    // CHECK EXISTING WITHDRAWALS
    // =====================================

    const pendingWithdrawal =
      await Withdrawal.findOne({
        sellerId,
        status: {
          $in: [
            "PENDING",
            "PROCESSING",
          ],
        },
      });

    if (pendingWithdrawal) {
      return res.status(400).json({
        success: false,
        message:
          "You already have a withdrawal being processed",
        withdrawalId:
          pendingWithdrawal._id,
      });
    }

    // =====================================
    // FIND WALLET
    // =====================================

    const wallet =
      await Wallet.findOne({
        sellerId,
      });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    // =====================================
    // CHECK WALLET
    // =====================================

    if (!wallet.isActive) {
      return res.status(403).json({
        success: false,
        message: "Wallet is inactive",
      });
    }

    // =====================================
    // CHECK BALANCE
    // =====================================

    if (
      withdrawalAmount >
      Number(wallet.availableBalance || 0)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Insufficient wallet balance",
        availableBalance:
          wallet.availableBalance,
      });
    }

    // =====================================
    // BALANCE BEFORE
    // =====================================

    const balanceBefore =
      Number(wallet.availableBalance || 0);

    // =====================================
    // RESERVE MONEY
    // =====================================

    wallet.availableBalance =
      balanceBefore -
      withdrawalAmount;

    wallet.pendingBalance =
      Number(
        wallet.pendingBalance || 0
      ) + withdrawalAmount;

    await wallet.save();

    console.log(
      "💰 MONEY RESERVED"
    );

    console.log(
      "BALANCE BEFORE:",
      balanceBefore
    );

    console.log(
      "AVAILABLE AFTER:",
      wallet.availableBalance
    );

    console.log(
      "PENDING AFTER:",
      wallet.pendingBalance
    );

    // =====================================
    // CREATE WITHDRAWAL
    // =====================================

    const withdrawal =
      await Withdrawal.create({
        sellerId,

        amount:
          withdrawalAmount,

        status:
          "PENDING",

        bankAccount: {
          accountHolderName:
            accountHolderName.trim(),

          accountNumber:
            accountNumber.trim(),

          ifsc:
            normalizedIFSC,

          bankName:
            bankName?.trim() || "",
        },

        provider:
          "INTERNAL",
      });

    // =====================================
    // CREATE WALLET TRANSACTION
    // =====================================

    const transaction =
      await WalletTransaction.create({
        sellerId,

        walletId:
          wallet._id,

        type:
          "WITHDRAWAL",

        direction:
          "DEBIT",

        amount:
          withdrawalAmount,

        balanceBefore:

          balanceBefore,

        balanceAfter:

          wallet.availableBalance,

        withdrawalId:
          withdrawal._id,

        provider:
          "INTERNAL",

        idempotencyKey,

        status:
          "PENDING",

        createdBy:
          "SELLER",

        description:
          `Withdrawal request ₹${withdrawalAmount}`,
      });

    console.log(
      "✅ WITHDRAWAL CREATED:",
      withdrawal._id
    );

    console.log(
      "✅ TRANSACTION CREATED:",
      transaction._id
    );

    return res.status(201).json({
      success: true,

      message:
        "Withdrawal request submitted",

      withdrawal: {
        _id:
          withdrawal._id,

        amount:
          withdrawal.amount,

        status:
          withdrawal.status,

        bankAccount: {
          accountHolderName:
            withdrawal.bankAccount
              .accountHolderName,

          accountNumber:
            `******${withdrawal.bankAccount.accountNumber.slice(-4)}`,

          ifsc:
            withdrawal.bankAccount.ifsc,

          bankName:
            withdrawal.bankAccount.bankName,
        },
      },

      transaction,

      wallet: {
        availableBalance:
          wallet.availableBalance,

        pendingBalance:
          wallet.pendingBalance,
      },

      idempotencyKey,
    });

  } catch (error) {
    console.error(
      "❌ CREATE WITHDRAWAL ERROR:",
      error
    );

    /*
      Duplicate-key protection.

      This catches a race condition where
      two requests arrive at almost exactly
      the same time.
    */

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Duplicate withdrawal request",
        error:
          error.keyValue,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};
export const processWithdrawal = async (
  req,
  res
) => {

  try {

    const {
      withdrawalId,
    } = req.params;

    const {
      provider = "INTERNAL",
      providerPayoutId = "",
      adminNote = "",
    } = req.body;

    console.log("=================================");
    console.log("💸 PROCESS WITHDRAWAL");
    console.log("=================================");
    console.log(
      "Withdrawal:",
      withdrawalId
    );
    console.log(
      "Admin:",
      req.user._id
    );

    // =====================================
    // ADMIN CHECK
    // =====================================

    if (
      req.user.role !== "admin"
    ) {

      return res.status(403).json({
        success: false,
        message:
          "Only admin can process withdrawals",
      });

    }

    // =====================================
    // FIND WITHDRAWAL
    // =====================================

    const withdrawal =
      await Withdrawal.findById(
        withdrawalId
      );

    if (!withdrawal) {

      return res.status(404).json({
        success: false,
        message:
          "Withdrawal not found",
      });

    }

    console.log(
      "Withdrawal Status:",
      withdrawal.status
    );

    // =====================================
    // STATUS CHECK
    // =====================================

    if (
      withdrawal.status !==
      "PENDING"
    ) {

      return res.status(400).json({
        success: false,
        message:
          `Cannot process withdrawal in ${withdrawal.status} state`,
      });

    }

    // =====================================
    // FIND WALLET
    // =====================================

    const wallet =
      await Wallet.findOne({
        sellerId:
          withdrawal.sellerId,
      });

    if (!wallet) {

      return res.status(404).json({
        success: false,
        message:
          "Seller wallet not found",
      });

    }

    // =====================================
    // CHECK PENDING BALANCE
    // =====================================

    if (
      wallet.pendingBalance <
      withdrawal.amount
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Wallet pending balance is insufficient",

      });

    }

    // =====================================
    // MOVE TO PROCESSING
    // =====================================

    withdrawal.status =
      "PROCESSING";

    withdrawal.processedBy =
      req.user._id;

    withdrawal.provider =
      provider;

    withdrawal.adminNote =
      adminNote;

    await withdrawal.save();

    console.log(
      "🟡 WITHDRAWAL → PROCESSING"
    );

    // =====================================
    // PAYOUT PROVIDER
    // =====================================

    /*
      DEVELOPMENT MODE

      Replace this section later with:

      Razorpay
      Cashfree
      Stripe
      Bank Payout API
    */

    const payoutResult = {

      success: true,

      payoutId:
        providerPayoutId ||
        `PAYOUT-${Date.now()}`,

    };

    // =====================================
    // PAYOUT FAILED
    // =====================================

    if (
      !payoutResult.success
    ) {

      wallet.pendingBalance =
        Number(
          wallet.pendingBalance
        ) -
        Number(
          withdrawal.amount
        );

      wallet.availableBalance =
        Number(
          wallet.availableBalance
        ) +
        Number(
          withdrawal.amount
        );

      await wallet.save();

      withdrawal.status =
        "FAILED";

      withdrawal.failureReason =
        "Payout provider failed";

      withdrawal.processedAt =
        new Date();

      await withdrawal.save();

      // -------------------------------------
      // TRANSACTION
      // -------------------------------------

      await WalletTransaction.create({

        sellerId:
          withdrawal.sellerId,

        walletId:
          wallet._id,

        type:
          "REVERSAL",

        direction:
          "CREDIT",

        amount:
          withdrawal.amount,

        balanceBefore:
          wallet.availableBalance -
          withdrawal.amount,

        balanceAfter:
          wallet.availableBalance,

        withdrawalId:
          withdrawal._id,

        provider,

        status:
          "COMPLETED",

        createdBy:
          "SYSTEM",

        description:
          `Withdrawal reversal ₹${withdrawal.amount}`,

        failureReason:
          "Payout failed",

        processedAt:
          new Date(),
      });

      return res.status(400).json({

        success: false,

        message:
          "Payout failed and amount returned",

        withdrawal,

        wallet,

      });

    }

    // =====================================
    // PAYOUT SUCCESS
    // =====================================

    const balanceBefore =
      wallet.availableBalance;

    // =====================================
    // RELEASE PENDING
    // =====================================

    wallet.pendingBalance =
      Number(
        wallet.pendingBalance
      ) -
      Number(
        withdrawal.amount
      );

    wallet.totalWithdrawn =
      Number(
        wallet.totalWithdrawn || 0
      ) +
      Number(
        withdrawal.amount
      );

    await wallet.save();

    console.log(
      "💰 WALLET SETTLED"
    );

    console.log(
      "AVAILABLE:",
      wallet.availableBalance
    );

    console.log(
      "PENDING:",
      wallet.pendingBalance
    );

    console.log(
      "TOTAL WITHDRAWN:",
      wallet.totalWithdrawn
    );

    // =====================================
    // UPDATE WITHDRAWAL
    // =====================================

    const referenceId =
      payoutResult.payoutId;

    withdrawal.status =
      "COMPLETED";

    withdrawal.providerPayoutId =
      payoutResult.payoutId;

    withdrawal.referenceId =
      referenceId;

    withdrawal.processedBy =
      req.user._id;

    withdrawal.processedAt =
      new Date();

    withdrawal.completedAt =
      new Date();

    await withdrawal.save();

    // =====================================
    // UPDATE ORIGINAL TRANSACTION
    // =====================================

    const transaction =
      await WalletTransaction.findOne({

        withdrawalId:
          withdrawal._id,

        type:
          "WITHDRAWAL",

      });

    if (!transaction) {

      console.warn(
        "⚠️ Withdrawal transaction not found"
      );

    } else {

      transaction.status =
        "COMPLETED";

      transaction.provider =
        provider;

      transaction.referenceId =
        referenceId;

      transaction.processedAt =
        new Date();

      transaction.balanceAfter =
        wallet.availableBalance;

      await transaction.save();

    }

    console.log(
      "================================="
    );

    console.log(
      "✅ WITHDRAWAL COMPLETED"
    );

    console.log(
      "================================="
    );

    return res.status(200).json({

      success: true,

      message:
        "Withdrawal completed successfully",

      withdrawal,

      wallet: {

        availableBalance:
          wallet.availableBalance,

        pendingBalance:
          wallet.pendingBalance,

        totalWithdrawn:
          wallet.totalWithdrawn,

      },

      transaction,

      referenceId,

    });

  } catch (error) {

    console.error(
      "❌ PROCESS WITHDRAWAL ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};
export const rejectWithdrawal = async (
  req,
  res
) => {

  try {

    if (
      req.user.role !== "admin"
    ) {

      return res.status(403).json({
        success: false,
        message:
          "Only admin can reject withdrawals",
      });

    }

    const {
      withdrawalId,
    } = req.params;

    const {
      reason,
    } = req.body;

    if (!reason) {

      return res.status(400).json({
        success: false,
        message:
          "Rejection reason is required",
      });

    }

    const withdrawal =
      await Withdrawal.findById(
        withdrawalId
      );

    if (!withdrawal) {

      return res.status(404).json({
        success: false,
        message:
          "Withdrawal not found",
      });

    }

    if (
      withdrawal.status !==
      "PENDING"
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Only pending withdrawals can be rejected",
      });

    }

    const wallet =
      await Wallet.findOne({
        sellerId:
          withdrawal.sellerId,
      });

    if (!wallet) {

      return res.status(404).json({
        success: false,
        message:
          "Wallet not found",
      });

    }

    // =====================================
    // RETURN MONEY
    // =====================================

    wallet.pendingBalance -=
      withdrawal.amount;

    wallet.availableBalance +=
      withdrawal.amount;

    await wallet.save();

    // =====================================
    // UPDATE WITHDRAWAL
    // =====================================

    withdrawal.status =
      "REJECTED";

    withdrawal.failureReason =
      reason;

    withdrawal.processedBy =
      req.user._id;

    withdrawal.processedAt =
      new Date();

    withdrawal.adminNote =
      reason;

    await withdrawal.save();

    // =====================================
    // REVERSAL TRANSACTION
    // =====================================

    await WalletTransaction.create({

      sellerId:
        withdrawal.sellerId,

      walletId:
        wallet._id,

      type:
        "REVERSAL",

      direction:
        "CREDIT",

      amount:
        withdrawal.amount,

      balanceBefore:
        wallet.availableBalance -
        withdrawal.amount,

      balanceAfter:
        wallet.availableBalance,

      withdrawalId:
        withdrawal._id,

      provider:
        "INTERNAL",

      status:
        "COMPLETED",

      createdBy:
        "ADMIN",

      description:
        `Withdrawal rejected: ${reason}`,

      processedAt:
        new Date(),

    });

    return res.status(200).json({

      success: true,

      message:
        "Withdrawal rejected and money returned",

      withdrawal,

      wallet: {

        availableBalance:
          wallet.availableBalance,

        pendingBalance:
          wallet.pendingBalance,

      },

    });

  } catch (error) {

    console.error(
      "❌ REJECT WITHDRAWAL ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        error.message,

    });

  }

};