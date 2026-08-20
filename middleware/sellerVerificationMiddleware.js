// middleware/sellerVerificationMiddleware.js

const sellerVerificationMiddleware = (
  req,
  res,
  next
) => {
  try {
    // authMiddleware should already have populated req.user
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Admin can always create/manage products
    if (req.user.role === "admin") {
      return next();
    }

    // Only sellers need verification
    if (req.user.role !== "seller") {
      return res.status(403).json({
        success: false,
        message: "Only sellers can perform this action",
      });
    }

    /*
      Adjust these field names to match your User model.

      Supported examples:
      sellerStatus:
        "pending"
        "approved"
        "rejected"

      verification.status:
        "pending"
        "approved"
        "rejected"
    */

    const sellerStatus =
      req.user.sellerStatus ||
      req.user.verificationStatus ||
      req.user.verification?.status ||
      "pending";

    const normalizedStatus =
      String(sellerStatus).toLowerCase();

    // Seller is fully verified
    if (
      normalizedStatus === "approved" ||
      normalizedStatus === "verified"
    ) {
      return next();
    }

    // Rejected seller
    if (
      normalizedStatus === "rejected"
    ) {
      return res.status(403).json({
        success: false,
        code: "SELLER_VERIFICATION_REJECTED",
        message:
          "Your seller verification was rejected. Please upload your documents again.",
        redirect:
          "/seller/upload-documents",
      });
    }

    // Pending / not uploaded / incomplete
    return res.status(403).json({
      success: false,
      code: "SELLER_VERIFICATION_REQUIRED",
      message:
        "Seller verification is required before you can add products.",
      redirect:
        "/seller/upload-documents",
    });

  } catch (error) {
    console.error(
      "Seller verification middleware error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify seller status",
    });
  }
};

export default sellerVerificationMiddleware;