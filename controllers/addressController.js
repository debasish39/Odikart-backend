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
    clean(phone).replace(/\D/g, "")
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
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
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
      email,
      alternatePhone,

      houseNumber,
      street,
      area,
      landmark,

      city,
      district,
      state,
      postalCode,
      country,
      postOffice,

      deliveryInstructions,

      location,
      isDefault,
    } = req.body;

    // Required fields
    if (
      !fullName ||
      !email ||
      !phone ||
      !houseNumber ||
      !street ||
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

    // Phone validation
    const cleanPhone = clean(phone).replace(/\D/g, "");

    if (!isValidPhone(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit phone number",
      });
    }

    // Alternate phone validation
    const cleanAlternatePhone = clean(alternatePhone).replace(
      /\D/g,
      ""
    );

    if (
      cleanAlternatePhone &&
      !isValidPhone(cleanAlternatePhone)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid alternate phone number",
      });
    }

    // PIN validation
    const cleanPostalCode = clean(postalCode);

    if (!isValidPin(cleanPostalCode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid 6-digit PIN code",
      });
    }

    // If this is default, remove default from other addresses
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
        }
      );
    }

    // Create address
    const address = await Address.create({
      userId: req.user._id,

      // Contact
      fullName: clean(fullName),
      phone: cleanPhone,
      email: clean(email).toLowerCase(),
      alternatePhone: cleanAlternatePhone,

      // Address
      houseNumber: clean(houseNumber),
      street: clean(street),
      area: clean(area),
      landmark: clean(landmark),

      // Location
      city: clean(city),
      district: clean(district),
      state: clean(state),
      postalCode: cleanPostalCode,
      country: clean(country, "India"),
      postOffice: clean(postOffice),

      // Delivery
      deliveryInstructions: clean(deliveryInstructions),

      // Settings
      label: label || "Home",
      isDefault: Boolean(isDefault),

      // GPS
      location: cleanLocation(location),
    });

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      address,
    });
  } catch (error) {
    console.error("Add Address Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add address",
    });
  }
};

/**
 * Get all addresses of logged-in user
 */
export const getMyAddresses = async (req, res) => {
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
    console.error("Get Addresses Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch addresses",
    });
  }
};

/**
 * Update an existing address
 */
export const updateAddress = async (req, res) => {
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

    const {
      label,
      fullName,
      phone,
      email,
      alternatePhone,

      houseNumber,
      street,
      area,
      landmark,

      city,
      district,
      state,
      postalCode,
      country,
      postOffice,

      deliveryInstructions,

      location,
      isDefault,
    } = req.body;

    // Required fields
    if (
      !fullName ||
      !email ||
      !phone ||
      !houseNumber ||
      !street ||
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

    // Phone validation
    const cleanPhone = clean(phone).replace(/\D/g, "");

    if (!isValidPhone(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit phone number",
      });
    }

    // Alternate phone validation
    const cleanAlternatePhone = clean(alternatePhone).replace(
      /\D/g,
      ""
    );

    if (
      cleanAlternatePhone &&
      !isValidPhone(cleanAlternatePhone)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid alternate phone number",
      });
    }

    // PIN validation
    const cleanPostalCode = clean(postalCode);

    if (!isValidPin(cleanPostalCode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid 6-digit PIN code",
      });
    }

    // If this is default, remove default from other addresses
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
        }
      );
    }

    // Update contact
    address.fullName = clean(fullName);
    address.phone = cleanPhone;
    address.email = clean(email).toLowerCase();
    address.alternatePhone = cleanAlternatePhone;

    // Update address
    address.houseNumber = clean(houseNumber);
    address.street = clean(street);
    address.area = clean(area);
    address.landmark = clean(landmark);

    // Update location
    address.city = clean(city);
    address.district = clean(district);
    address.state = clean(state);
    address.postalCode = cleanPostalCode;
    address.country = clean(country, "India");
    address.postOffice = clean(postOffice);

    // Delivery
    address.deliveryInstructions = clean(
      deliveryInstructions
    );

    // Settings
    address.label = label || "Home";
    address.isDefault = Boolean(isDefault);

    // GPS
    address.location = cleanLocation(location);

    await address.save();

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address,
    });
  } catch (error) {
    console.error("Update Address Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update address",
    });
  }
};

/**
 * Delete an address
 */
export const deleteAddress = async (req, res) => {
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

    address.isDeleted = true;
    address.isDefault = false;

    await address.save();

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Delete Address Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete address",
    });
  }
};

/**
 * Get user addresses for admin
 */
export const getUserAddressesForAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const addresses = await Address.find({
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
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user addresses",
    });
  }
};