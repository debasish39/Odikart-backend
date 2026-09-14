import Address from "../models/Address.js";

/**
 * Normalize a value into a trimmed string.
 */
const clean = (value, fallback = "") => {
  return String(value ?? fallback).trim();
};

/**
 * Validate Indian PIN code.
 */
const isValidPin = (postalCode) => {
  return /^[1-9][0-9]{5}$/.test(clean(postalCode));
};

/**
 * Validate phone number.
 */
const isValidPhone = (phone) => {
  return /^[6-9][0-9]{9}$/.test(
    clean(phone).replace(/\D/g, ""),
  );
};

/**
 * Clean location safely.
 */
const cleanLocation = (location) => {
  if (!location || typeof location !== "object") {
    return {
      latitude: null,
      longitude: null,
    };
  }

  const latitude =
    location.latitude !== null &&
    location.latitude !== undefined &&
    location.latitude !== ""
      ? Number(location.latitude)
      : null;

  const longitude =
    location.longitude !== null &&
    location.longitude !== undefined &&
    location.longitude !== ""
      ? Number(location.longitude)
      : null;

  return {
    latitude:
      Number.isFinite(latitude) ? latitude : null,

    longitude:
      Number.isFinite(longitude) ? longitude : null,
  };
};


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

      // Physical address
      houseNumber,
      buildingName,
      floor,
      street,
      addressLine1,
      addressLine2,
      landmark,
      area,
      village,

      // Postal information
      postOffice,
      block,
      city,
      district,
      state,
      postalCode,
      country,

      // Delivery
      deliveryInstructions,

      // GPS
      location,

      // Settings
      isDefault,
    } = req.body;


    // ============================================================
    // REQUIRED FIELD VALIDATION
    // ============================================================

    if (
      !fullName ||
      !phone ||
      !houseNumber ||
      !street ||
      !addressLine1 ||
      !area ||
      !postOffice ||
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


    // ============================================================
    // PHONE VALIDATION
    // ============================================================

    const cleanPhone = clean(phone)
      .replace(/\D/g, "");

    if (!isValidPhone(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid 10-digit phone number",
      });
    }


    // ============================================================
    // ALTERNATE PHONE VALIDATION
    // ============================================================

    const cleanAlternatePhone = clean(
      alternatePhone,
    ).replace(/\D/g, "");

    if (
      cleanAlternatePhone &&
      !isValidPhone(cleanAlternatePhone)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid alternate phone number",
      });
    }


    // ============================================================
    // PIN CODE VALIDATION
    // ============================================================

    const cleanPostalCode = clean(postalCode);

    if (!isValidPin(cleanPostalCode)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid 6-digit PIN code",
      });
    }


    // ============================================================
    // DEFAULT ADDRESS
    // ============================================================

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


    // ============================================================
    // CREATE ADDRESS
    // ============================================================

    const address = await Address.create({
      userId: req.user._id,

      label:
        label || "Home",

      // Contact
      fullName:
        clean(fullName),

      phone:
        cleanPhone,

      alternatePhone:
        cleanAlternatePhone,

      // Physical address
      houseNumber:
        clean(houseNumber),

      buildingName:
        clean(buildingName),

      floor:
        clean(floor),

      street:
        clean(street),

      // Keep existing fields
      addressLine1:
        clean(addressLine1),

      addressLine2:
        clean(addressLine2),

      landmark:
        clean(landmark),

      area:
        clean(area),

      village:
        clean(village),

      // Postal information
      postOffice:
        clean(postOffice),

      block:
        clean(block),

      city:
        clean(city),

      district:
        clean(district),

      state:
        clean(state),

      postalCode:
        cleanPostalCode,

      country:
        clean(country, "India"),

      // Delivery
      deliveryInstructions:
        clean(deliveryInstructions),

      // GPS
      location:
        cleanLocation(location),

      // Settings
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


/**
 * Get all addresses of logged-in user
 */
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


/**
 * Update an existing address
 */
export const updateAddress = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;


    // ============================================================
    // FIND USER ADDRESS
    // ============================================================

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


    const {
      label,
      fullName,
      phone,
      alternatePhone,

      // Physical address
      houseNumber,
      buildingName,
      floor,
      street,
      addressLine1,
      addressLine2,
      landmark,
      area,
      village,

      // Postal
      postOffice,
      block,
      city,
      district,
      state,
      postalCode,
      country,

      // Delivery
      deliveryInstructions,

      // GPS
      location,

      // Settings
      isDefault,
    } = req.body;


    // ============================================================
    // REQUIRED FIELD VALIDATION
    // ============================================================

    if (
      !fullName ||
      !phone ||
      !houseNumber ||
      !street ||
      !addressLine1 ||
      !area ||
      !postOffice ||
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


    // ============================================================
    // PHONE
    // ============================================================

    const cleanPhone = clean(phone)
      .replace(/\D/g, "");

    if (!isValidPhone(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid 10-digit phone number",
      });
    }


    // ============================================================
    // ALTERNATE PHONE
    // ============================================================

    const cleanAlternatePhone = clean(
      alternatePhone,
    ).replace(/\D/g, "");

    if (
      cleanAlternatePhone &&
      !isValidPhone(cleanAlternatePhone)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid alternate phone number",
      });
    }


    // ============================================================
    // PIN
    // ============================================================

    const cleanPostalCode = clean(postalCode);

    if (!isValidPin(cleanPostalCode)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid 6-digit PIN code",
      });
    }


    // ============================================================
    // DEFAULT ADDRESS
    // ============================================================

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


    // ============================================================
    // UPDATE CONTACT
    // ============================================================

    address.label =
      label || "Home";

    address.fullName =
      clean(fullName);

    address.phone =
      cleanPhone;

    address.alternatePhone =
      cleanAlternatePhone;


    // ============================================================
    // UPDATE PHYSICAL ADDRESS
    // ============================================================

    address.houseNumber =
      clean(houseNumber);

    address.buildingName =
      clean(buildingName);

    address.floor =
      clean(floor);

    address.street =
      clean(street);

    address.addressLine1 =
      clean(addressLine1);

    address.addressLine2 =
      clean(addressLine2);

    address.landmark =
      clean(landmark);

    address.area =
      clean(area);

    address.village =
      clean(village);


    // ============================================================
    // UPDATE POSTAL INFORMATION
    // ============================================================

    address.postOffice =
      clean(postOffice);

    address.block =
      clean(block);

    address.city =
      clean(city);

    address.district =
      clean(district);

    address.state =
      clean(state);

    address.postalCode =
      cleanPostalCode;

    address.country =
      clean(country, "India");


    // ============================================================
    // DELIVERY INSTRUCTIONS
    // ============================================================

    address.deliveryInstructions =
      clean(deliveryInstructions);


    // ============================================================
    // GPS
    // ============================================================

    address.location =
      cleanLocation(location);


    // ============================================================
    // DEFAULT
    // ============================================================

    address.isDefault =
      Boolean(isDefault);


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


/**
 * Delete an address
 *
 * Soft delete is used.
 */
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


    // Soft delete
    address.isDeleted = true;

    // Deleted address cannot remain default
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


/**
 * Get user addresses for admin
 */
export const getUserAddressesForAdmin =
  async (req, res) => {
    try {
      const { userId } =
        req.params;

      const addresses =
        await Address.find({
          userId,
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
        "Admin Get User Addresses Error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch user addresses",
      });
    }
  };