import Address from "../models/Address.js";
export const addAddress = async (req, res) => {
  try {
    const {
      label,
      fullName,
      phone,
      alternatePhone,
      addressLine1,
      addressLine2,
      landmark,
      area,
      city,
      district,
      state,
      postalCode,
      country,
      location,
      isDefault,
    } = req.body;

    if (
      !fullName ||
      !phone ||
      !addressLine1 ||
      !area ||
      !city ||
      !district ||
      !state ||
      !postalCode
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please fill all required address fields",
      });
    }

    if (
      !/^[1-9][0-9]{5}$/.test(
        String(postalCode),
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid 6-digit PIN code",
      });
    }

    // If this address becomes default,
    // remove default from previous addresses.
    if (isDefault === true) {
      await Address.updateMany(
        {
          userId: req.user._id,
          isDeleted: false,
        },
        {
          $set: {
            isDefault: false,
          },
        },
      );
    }

    const address = await Address.create({
      userId: req.user._id,

      label:
        label || "Home",

      fullName,

      phone,

      alternatePhone:
        alternatePhone || "",

      addressLine1,

      addressLine2:
        addressLine2 || "",

      landmark:
        landmark || "",

      area,

      city,

      district,

      state,

      postalCode:
        String(postalCode),

      country:
        country || "India",

      location:
        location || {
          latitude: null,
          longitude: null,
        },

      isDefault:
        Boolean(isDefault),
    });

    return res.status(201).json({
      success: true,
      message:
        "Address added successfully",
      address,
    });
  } catch (error) {
    console.error(
      "Add Address Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to add address",
    });
  }
};
export const getMyAddresses = async (
  req,
  res,
) => {
  try {
    const addresses =
      await Address.find({
        userId: req.user._id,
        isDeleted: false,
      }).sort({
        isDefault: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      addresses,
    });
  } catch (error) {
    console.error(
      "Get Addresses Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch addresses",
    });
  }
};
export const updateAddress = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    const address =
      await Address.findOne({
        _id: id,
        userId: req.user._id,
        isDeleted: false,
      });

    if (!address) {
      return res.status(404).json({
        success: false,
        message:
          "Address not found",
      });
    }

    if (
      req.body.isDefault === true
    ) {
      await Address.updateMany(
        {
          userId: req.user._id,
          isDeleted: false,
          _id: {
            $ne: id,
          },
        },
        {
          $set: {
            isDefault: false,
          },
        },
      );
    }

    Object.assign(
      address,
      req.body,
    );

    await address.save();

    return res.status(200).json({
      success: true,
      message:
        "Address updated successfully",
      address,
    });
  } catch (error) {
    console.error(
      "Update Address Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update address",
    });
  }
};
export const deleteAddress = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    const address =
      await Address.findOne({
        _id: id,
        userId: req.user._id,
        isDeleted: false,
      });

    if (!address) {
      return res.status(404).json({
        success: false,
        message:
          "Address not found",
      });
    }

    address.isDeleted = true;
    address.isDefault = false;

    await address.save();

    return res.status(200).json({
      success: true,
      message:
        "Address deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Address Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete address",
    });
  }
};