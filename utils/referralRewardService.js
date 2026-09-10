import mongoose from "mongoose";
import Referral from "../models/Referral.js";
import User from "../models/User.js";
import Order from "../models/Order.js";

const money = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number)
    ? Math.round(number * 100) / 100
    : 0;
};

/**
 * Release referral rewards only after:
 * 1. Referred customer has a qualifying order.
 * 2. Order is Delivered.
 * 3. Return-protection window has expired.
 * 4. The order is still Delivered (a return was not started).
 * 5. Referral is still registered.
 *
 * The Referral update is claimed atomically so two workers cannot
 * reward the same referral twice.
 */
export const processPendingReferralRewards = async ({
  limit = 20,
  minOrderAmount = 499,
  returnWindowDays = 7,
} = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safeMinOrderAmount = Math.max(Number(minOrderAmount) || 0, 0);
  const safeReturnWindowDays = Math.max(
    Number(returnWindowDays) || 7,
    0,
  );

  const cutoff = new Date(
    Date.now() - safeReturnWindowDays * 24 * 60 * 60 * 1000,
  );

  const candidateOrders = await Order.find({
    status: "Delivered",
    deliveredAt: { $lte: cutoff },
  })
    .sort({ deliveredAt: 1 })
    .limit(safeLimit)
    .select("_id userId pricing deliveredAt status")
    .lean();

  let rewarded = 0;
  let skipped = 0;

  for (const order of candidateOrders) {
    const orderAmount = money(order.pricing?.subtotal ?? order.pricing?.total ?? 0);

    if (orderAmount < safeMinOrderAmount) {
      skipped += 1;
      continue;
    }

    const referral = await Referral.findOne({
      referredUser: order.userId,
      status: "registered",
    });

    if (!referral) {
      skipped += 1;
      continue;
    }

    // Atomic claim. If another worker already claimed it, findOneAndUpdate returns null.
    const claimedReferral = await Referral.findOneAndUpdate(
      {
        _id: referral._id,
        status: "registered",
      },
      {
        $set: {
          status: "qualified",
          qualifyingOrder: order._id,
        },
      },
      { new: true },
    );

    if (!claimedReferral) {
      skipped += 1;
      continue;
    }

    const session = await mongoose.startSession();

    try {
      let transactionRewarded = false;

      await session.withTransaction(async () => {
        const freshReferral = await Referral.findOne({
          _id: claimedReferral._id,
          status: "qualified",
          qualifyingOrder: order._id,
        }).session(session);

        if (!freshReferral) return;

        const referrer = await User.findOne({
          _id: freshReferral.referrer,
          role: "user",
          isBlocked: false,
          isDeleted: false,
        }).session(session);

        if (!referrer) {
          await Referral.updateOne(
            { _id: freshReferral._id, status: "qualified" },
            { $set: { status: "cancelled" } },
            { session },
          );
          return;
        }

        const reward = money(freshReferral.referrerRewardAmount);

        if (reward <= 0) {
          await Referral.updateOne(
            { _id: freshReferral._id, status: "qualified" },
            {
              $set: {
                status: "rewarded",
                rewardGivenAt: new Date(),
              },
            },
            { session },
          );
          transactionRewarded = true;
          return;
        }

        const currentBalance = money(
          referrer.referral?.referralRewardBalance,
        );
        const currentEarnings = money(
          referrer.referral?.totalReferralEarnings,
        );
        const currentSuccessful = Number(
          referrer.referral?.totalSuccessfulReferrals || 0,
        );

        const result = await User.updateOne(
          { _id: referrer._id },
          {
            $set: {
              "referral.referralRewardBalance": money(
                currentBalance + reward,
              ),
              "referral.totalReferralEarnings": money(
                currentEarnings + reward,
              ),
              "referral.totalSuccessfulReferrals":
                currentSuccessful + 1,
            },
          },
          { session },
        );

        if (result.modifiedCount !== 1) {
          throw new Error("Unable to credit referral reward");
        }

        const referralUpdate = await Referral.updateOne(
          { _id: freshReferral._id, status: "qualified" },
          {
            $set: {
              status: "rewarded",
              rewardGivenAt: new Date(),
            },
          },
          { session },
        );

        if (referralUpdate.modifiedCount !== 1) {
          throw new Error("Unable to finalize referral reward");
        }

        transactionRewarded = true;
      });

      if (transactionRewarded) rewarded += 1;
      else skipped += 1;
    } catch (error) {
      // Return the referral to registered so a later scheduled run can retry.
      await Referral.updateOne(
        {
          _id: claimedReferral._id,
          status: "qualified",
          qualifyingOrder: order._id,
        },
        {
          $set: {
            status: "registered",
            qualifyingOrder: null,
          },
        },
      );
      skipped += 1;
    } finally {
      await session.endSession();
    }
  }

  return {
    success: true,
    scanned: candidateOrders.length,
    rewarded,
    skipped,
  };
};

export default processPendingReferralRewards;
