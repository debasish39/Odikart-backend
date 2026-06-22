import jwt from "jsonwebtoken";

import dotenv from "dotenv";

dotenv.config();

/* =====================================
   GENERATE JWT TOKEN
===================================== */

const generateToken = (

  user

) => {

  return jwt.sign(

    {

      id:
        user._id,

      role:
        user.role,

      email:
        user.email,

    },

    process.env.JWT_SECRET,

    {

      expiresIn: "7d",

    }

  );

};

export default generateToken;