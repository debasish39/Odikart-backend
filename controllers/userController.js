import User from "../models/User.js";

import bcrypt from "bcryptjs";

/* =====================================
   GET ALL USERS
===================================== */

export const getUsers =
async (

  req,
  res

) => {

  try {

    /* =====================================
       ADMIN CHECK
    ===================================== */

    if (

      req.user.role !==
      "admin"

    ) {

      return res.status(403).json({

        success: false,

        message:
          "Admin access only",

      });

    }

    /* =====================================
       PAGINATION
    ===================================== */

    const page =
      Number(req.query.page) || 1;

    const limit = 20;

    const skip =
      (page - 1) * limit;

    /* =====================================
       FETCH USERS
    ===================================== */

    const users =
      await User.find()

        .select(

          "-password -otp -otpExpiry -resetPasswordOTP -resetPasswordOTPExpiry"

        )

        .skip(skip)

        .limit(limit)

        .sort({
          createdAt: -1,
        });

    /* =====================================
       TOTAL USERS
    ===================================== */

    const totalUsers =
      await User.countDocuments();

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      page,

      count:
        users.length,

      totalUsers,

      users,

    });

  } catch (error) {

    console.error(
      "Get Users Error:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        error.message,

    });

  }

};

/* =====================================
   UPDATE USER
===================================== */

export const updateUser =
async (

  req,
  res

) => {

  try {

    const userId =
      req.params.id;

    const {

      firstName,

      lastName,

      phone,

      image,

      role,

    } = req.body;

    /* =====================================
       FIND USER
    ===================================== */

    const user =
      await User.findById(
        userId
      );

    if (!user) {

      return res.status(404).json({

        success: false,

        message:
          "User not found",

      });

    }

    /* =====================================
       UPDATE USER
    ===================================== */

    user.firstName =
      firstName ||
      user.firstName;

    user.lastName =
      lastName ||
      user.lastName;

    user.phone =
      phone ||
      user.phone;

    user.image =
      image ||
      user.image;

    /* =====================================
       ADMIN CAN CHANGE ROLE
    ===================================== */

    if (

      req.user.role ===
      "admin" &&

      role

    ) {

      user.role = role;

    }

    await user.save();

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "User updated successfully",

      user,

    });

  } catch (error) {

    console.error(
      "Update User Error:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        error.message,

    });

  }

};

/* =====================================
   UPDATE USER PASSWORD
===================================== */

export const updateUserPassword =
async (

  req,
  res

) => {

  try {

    const userId =
      req.params.id;

    const { password } =
      req.body;

    /* =====================================
       VALIDATION
    ===================================== */

    if (

      !password ||

      password.length < 8

    ) {

      return res.status(400).json({

        success: false,

        error:
          "Password must be at least 8 characters",

      });

    }

    /* =====================================
       FIND USER
    ===================================== */

    const user =
      await User.findById(
        userId
      );

    if (!user) {

      return res.status(404).json({

        success: false,

        error:
          "User not found",

      });

    }

    /* =====================================
       HASH PASSWORD
    ===================================== */

    const hashedPassword =
      await bcrypt.hash(

        password,

        10

      );

    /* =====================================
       UPDATE PASSWORD
    ===================================== */

    user.password =
      hashedPassword;

    await user.save();

    /* =====================================
       RESPONSE
    ===================================== */

    res.status(200).json({

      success: true,

      message:
        "Password updated successfully",

    });

  } catch (error) {

    console.error(
      "Password Update Error:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        error.message,

    });

  }

};

