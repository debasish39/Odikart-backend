import mongoose from "mongoose";
import User from "../models/User.js";
import ReferralWalletTransaction from "../models/ReferralWalletTransaction.js";

export const creditReferralReward = async ({
  userId,
  amount,
  referralId = null,
  orderId = null,
  description = "Referral reward",
  session = null,
}) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  if (!amount || amount <= 0) {
    throw new Error("Reward amount must be greater than 0");
  }

  const user = await User.findById(userId).session(session);

  if (!user) {
    throw new Error("User not found");
  }

  const currentBalance =
    Number(user.referral?.referralRewardBalance || 0);

  const newBalance = currentBalance + Number(amount);

  user.referral = user.referral || {};

  user.referral.referralRewardBalance = newBalance;

  user.referral.totalReferralEarnings =
    Number(user.referral.totalReferralEarnings || 0) +
    Number(amount);

  user.referral.totalSuccessfulReferrals =
    Number(user.referral.totalSuccessfulReferrals || 0) + 1;

  await user.save({ session });

  await ReferralWalletTransaction.create(
    [
      {
        user: user._id,
        type: "credit",
        amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        referral: referralId,
        order: orderId,
        description,
      },
    ],
    { session }
  );

  return {
    balanceBefore: currentBalance,
    balanceAfter: newBalance,
    amount,
  };
};