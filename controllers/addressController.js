import Address from "../models/Address.js";

/**
 * Add a new address
 */
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
      village,
      city,
      district,
      state,
      postalCode,
      country,
      location,
      isDefault,
    } = req.body;

    // Required field validation
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
        message: "Please fill all required address fields",
      });
    }

    // PIN code validation
    if (!/^[1-9][0-9]{5}$/.test(String(postalCode))) {
      return res.status(400).json({
        success: false,
        message: "Invalid 6-digit PIN code",
      });
    }

    // If this address becomes default,
    // remove default from all previous addresses.
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

    // Create address
    const address = await Address.create({
      userId: req.user._id,

      label: label || "Home",

      fullName: String(fullName).trim(),

      phone: String(phone).trim(),

      alternatePhone: String(
        alternatePhone || "",
      ).trim(),

      addressLine1: String(
        addressLine1,
      ).trim(),

      addressLine2: String(
        addressLine2 || "",
      ).trim(),

      landmark: String(
        landmark || "",
      ).trim(),

      area: String(area).trim(),

      // Village is optional
      village: String(
        village || "",
      ).trim(),

      city: String(city).trim(),

      district: String(
        district,
      ).trim(),

      state: String(state).trim(),

      postalCode: String(
        postalCode,
      ).trim(),

      country: String(
        country || "India",
      ).trim(),

      location: location || {
        latitude: null,
        longitude: null,
      },

      isDefault: Boolean(isDefault),
    });

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      address,
    });
  } catch (error) {
    console.error(
      "Add Address Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to add address",
    });
  }
};


/**
 * Get all addresses of logged-in user
 */
export const getMyAddresses = async (
  req,
  res,
) => {
  try {
    const addresses = await Address.find({
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
      message: "Failed to fetch addresses",
    });
  }
};


/**
 * Update an existing address
 */
export const updateAddress = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    // Find address belonging to logged-in user
    const address = await Address.findOne({
      _id: id,
      userId: req.user._id,
      isDeleted: false,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const {
      label,
      fullName,
      phone,
      alternatePhone,
      addressLine1,
      addressLine2,
      landmark,
      area,
      village,
      city,
      district,
      state,
      postalCode,
      country,
      location,
      isDefault,
    } = req.body;

    // Required field validation
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
        message: "Please fill all required address fields",
      });
    }

    // PIN code validation
    if (!/^[1-9][0-9]{5}$/.test(String(postalCode))) {
      return res.status(400).json({
        success: false,
        message: "Invalid 6-digit PIN code",
      });
    }

    // If this address becomes default,
    // remove default from all other addresses.
    if (isDefault === true) {
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

    // Update every address field explicitly
    address.label = label || "Home";

    address.fullName =
      String(fullName).trim();

    address.phone =
      String(phone).trim();

    address.alternatePhone =
      String(
        alternatePhone || "",
      ).trim();

    address.addressLine1 =
      String(addressLine1).trim();

    address.addressLine2 =
      String(
        addressLine2 || "",
      ).trim();

    address.landmark =
      String(
        landmark || "",
      ).trim();

    address.area =
      String(area).trim();

    // IMPORTANT:
    // Village is now saved when editing.
    address.village =
      String(
        village || "",
      ).trim();

    address.city =
      String(city).trim();

    address.district =
      String(district).trim();

    address.state =
      String(state).trim();

    address.postalCode =
      String(postalCode).trim();

    address.country =
      String(
        country || "India",
      ).trim();

    address.location =
      location || {
        latitude: null,
        longitude: null,
      };

    address.isDefault =
      Boolean(isDefault);

    await address.save();

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address,
    });
  } catch (error) {
    console.error(
      "Update Address Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update address",
    });
  }
};


/**
 * Delete an address
 * Soft delete is used.
 */
export const deleteAddress = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    const address = await Address.findOne({
      _id: id,
      userId: req.user._id,
      isDeleted: false,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // Soft delete
    address.isDeleted = true;

    // Deleted address cannot remain default
    address.isDefault = false;

    await address.save();

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Address Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete address",
    });
  }
};