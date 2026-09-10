import crypto from "crypto";

const generateReferralCode = () => {
  return `ODI${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

export default generateReferralCode;
