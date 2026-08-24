import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const generateToken = (user) => {

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,

      // Current application mode
      activeMode:
        user.activeMode || "customer",

      // Seller authorization information
      sellerStatus:
        user.sellerStatus || "none",
    },

    process.env.JWT_SECRET,

    {
      expiresIn: "7d",
    }
  );
};

export default generateToken;