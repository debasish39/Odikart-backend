
import jwt from "jsonwebtoken";

import User from "../models/User.js";

/* =====================================
   AUTH MIDDLEWARE
===================================== */

export const authMiddleware =
  async (

    req,
    res,
    next

  ) => {

    try {

      console.log(
        "\n========== AUTH MIDDLEWARE =========="
      );

      let token;

      /* =====================================
         HEADERS
      ===================================== */

      console.log(
        "Authorization Header:",
        req.headers.authorization
      );

      /* =====================================
         GET TOKEN
      ===================================== */

   if (
  req.headers.authorization &&
  req.headers.authorization.startsWith("Bearer ")
) {

  token = req.headers.authorization.split(" ")[1];

} 
      /* =====================================
         TOKEN CONSOLE
      ===================================== */

      console.log(
        "Extracted Token:",
        token
      );

      /* =====================================
         NO TOKEN
      ===================================== */

      if (!token) {

        console.log(
          "❌ No token provided"
        );

        return res.status(401).json({

          success: false,

          message:
            "No token provided",

        });

      }

      /* =====================================
         VERIFY TOKEN
      ===================================== */

      const decoded =
        jwt.verify(

          token,

          process.env.JWT_SECRET

        );

      console.log(
        "✅ Decoded JWT:",
        decoded
      );

      /* =====================================
         FIND USER
      ===================================== */

      const user =
        await User.findById(

          decoded.id

        ).select("-password");

      console.log(
        "✅ Found User:",
        user
      );

      /* =====================================
         USER NOT FOUND
      ===================================== */

      if (!user) {

        console.log(
          "❌ User not found in DB"
        );

        return res.status(404).json({

          success: false,

          message:
            "User not found",

        });

      }

      /* =====================================
         ATTACH USER
      ===================================== */

      req.user = user;

      console.log(
        "✅ req.user attached"
      );

      console.log(
        "====================================\n"
      );

      next();

    } catch (error) {

  console.error("\n❌ AUTH ERROR:");
console.log("JWT_SECRET LENGTH:", process.env.JWT_SECRET?.length);
console.log("JWT_SECRET LENGTH:", process.env.JWT_SECRET);
  console.error("NAME:", error.name);
  console.error("MESSAGE:", error.message);

  return res.status(401).json({
    success: false,
    message: error.message,
  });

}

  };

export default authMiddleware;

