import { processPendingReferralRewards } from "./referralRewardService.js";

// const REFERRAL_RETURN_WINDOW_DAYS = Number(
//   process.env.REFERRAL_RETURN_WINDOW_DAYS || 7
// );

// const REFERRAL_MIN_ORDER_AMOUNT = Number(
//   process.env.REFERRAL_MIN_ORDER_AMOUNT || 499
// );

REFERRAL_RETURN_WINDOW_DAYS=0
REFERRAL_MIN_ORDER_AMOUNT=1

export const startReferralRewardJob = () => {
  const run = async () => {
    try {
      const result = await processPendingReferralRewards({
        limit: 100,
        minOrderAmount: REFERRAL_MIN_ORDER_AMOUNT,
        returnWindowDays: REFERRAL_RETURN_WINDOW_DAYS,
      });

      console.log(
        `[Referral Job] Scanned: ${result.scanned}, Rewarded: ${result.rewarded}, Skipped: ${result.skipped}`
      );
    } catch (error) {
      console.error(
        "[Referral Job] Error:",
        error.message
      );
    }
  };

  // Run once when server starts
  run();

  // Run every 1 hour
  return setInterval(
    run,
    60 * 60 * 1000
  );
};

export default startReferralRewardJob;