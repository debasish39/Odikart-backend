/**
 * Normalize Indian PIN code
 */
export const normalizePincode = (pincode) => {
  return String(pincode || "").trim();
};


/**
 * Validate Indian PIN format
 */
export const isValidPincode = (pincode) => {
  return /^[1-9][0-9]{5}$/.test(pincode);
};


/**
 * Check whether a product can be delivered
 * to a particular PIN code.
 */
export const checkProductServiceability = (
  product,
  pincode
) => {
  const normalizedPincode =
    normalizePincode(pincode);

  if (!isValidPincode(normalizedPincode)) {
    return {
      serviceable: false,
      reason: "INVALID_PINCODE",
      message: "Please enter a valid 6-digit PIN code.",
    };
  }

  const serviceablePincodes =
    product?.shipping?.serviceablePincodes || [];

  const normalizedServiceablePincodes =
    serviceablePincodes.map((pin) =>
      normalizePincode(pin)
    );

  /*
   * Empty list means the seller/product
   * has not configured serviceability.
   *
   * For marketplace safety, we BLOCK the order.
   */
  if (
    normalizedServiceablePincodes.length === 0
  ) {
    return {
      serviceable: false,
      reason: "SERVICEABILITY_NOT_CONFIGURED",
      message:
        "Delivery is currently unavailable for this product.",
    };
  }

  const serviceable =
    normalizedServiceablePincodes.includes(
      normalizedPincode
    );

  if (!serviceable) {
    return {
      serviceable: false,
      reason: "PINCODE_NOT_SERVICEABLE",
      message:
        "This product cannot be delivered to your PIN code.",
    };
  }

  return {
    serviceable: true,
    reason: "SERVICEABLE",
    message:
      "This product can be delivered to your PIN code.",
  };
};