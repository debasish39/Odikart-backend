import clerk from "../config/clerk.js";

/* =====================================
   GET ALL USERS
===================================== */

export const getUsers = async (req, res) => {

  try {

    // Pagination
    const page = Number(req.query.page) || 1;

    const limit = 20;

    const offset = (page - 1) * limit;

    // Fetch users from Clerk
    const users = await clerk.users.getUserList({
      limit,
      offset,
    });

    console.log("USERS:", users);

    // Empty users
    if (!users || users.length === 0) {

      return res.json({
        success: true,
        users: [],
        message: "No users found",
      });

    }

    /* =====================================
       FORMAT IST DATE
    ===================================== */

    const formatIST = (date) => {

      if (!date) return "No login yet";

      return new Date(date).toLocaleString(
        "en-IN",
        {
          timeZone: "Asia/Kolkata",

          day: "2-digit",

          month: "short",

          year: "numeric",

          hour: "2-digit",

          minute: "2-digit",
        }
      );

    };

    /* =====================================
       FORMAT USERS
    ===================================== */

    const formattedUsers = users.map((user) => ({

      id: user.id,

      // All emails
      emails: user.emailAddresses.map(
        (e) => e.emailAddress
      ),

      // Full name
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),

      // Profile image
      image: user.imageUrl,

      // Created date
      createdAt: formatIST(user.createdAt),

      // Last login
      lastSignIn: formatIST(user.lastSignInAt),

    }));

    /* =====================================
       RESPONSE
    ===================================== */

    res.json({
      success: true,

      page,

      count: formattedUsers.length,

      users: formattedUsers,
    });

  } catch (error) {

    console.error(
      "Fetch Users Error:",
      error
    );

    res.status(500).json({
      success: false,
      error: "Failed to fetch users",
    });

  }

};

/* =====================================
   UPDATE USER NAME
===================================== */

export const updateUser = async (req, res) => {

  try {

    // User ID from params
    const userId = req.params.id;

    // Request body
    const {
      firstName,
      lastName,
    } = req.body;

    // Update Clerk user
    const updated = await clerk.users.updateUser(
      userId,
      {

        ...(firstName && {
          firstName,
        }),

        ...(lastName && {
          lastName,
        }),

      }
    );

    // Response
    res.json({

      success: true,

      user: {

        id: updated.id,

        name:
          `${updated.firstName || ""} ${updated.lastName || ""}`.trim(),

        email:
          updated.emailAddresses[0]
            ?.emailAddress || "No email",

      },

    });

  } catch (err) {

    console.error(
      "Update name error:",
      err
    );

    res.status(500).json({

      success: false,

      error: err.message,

    });

  }

};

/* =====================================
   UPDATE USER PASSWORD
===================================== */

export const updateUserPassword = async (
  req,
  res
) => {

  try {

    // User ID
    const userId = req.params.id;

    // Password from body
    const { password } = req.body;

    /* =====================================
       VALIDATION
    ===================================== */

    if (
      !password ||
      password.length < 8
    ) {

      return res.status(400).json({
        success: false,
        error: "Password must be ≥ 8 chars",
      });

    }

    /* =====================================
       UPDATE PASSWORD
    ===================================== */

    const updated =
      await clerk.users.updateUser(
        userId,
        {
          password,
        }
      );

    /* =====================================
       RESPONSE
    ===================================== */

    res.json({

      success: true,

      message: "Password updated",

      userId: updated.id,

    });

  } catch (error) {

    console.error(
      "ERROR DETAILS:",
      error.errors
    );

    /* =====================================
       EMAIL EXISTS
    ===================================== */

    if (
      error.errors?.[0]?.code ===
      "form_identifier_exists"
    ) {

      return res.status(400).json({

        success: false,

        error: "Email already exists",

      });

    }

    /* =====================================
       VERIFICATION NEEDED
    ===================================== */

    if (
      error.errors?.[0]?.code ===
      "form_verification_needed"
    ) {

      return res.status(400).json({

        success: false,

        error:
          "Email must be verified before setting as primary",

      });

    }

    /* =====================================
       SERVER ERROR
    ===================================== */

    res.status(500).json({

      success: false,

      error: error.message,

    });

  }

};