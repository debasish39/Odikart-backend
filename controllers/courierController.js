import mongoose from "mongoose";
import Courier from "../models/Courier.js";

/* =========================================================
   SECURITY / VALIDATION CONFIG
========================================================= */

const MAX_NAME_LENGTH = 120;
const MAX_CODE_LENGTH = 40;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 30;
const MAX_URL_LENGTH = 500;
const MAX_API_KEY_LENGTH = 1000;
const MAX_SERVICE_AREAS = 500;
const MAX_DELIVERY_DAYS = 365;
const MAX_CHARGE = 100000000;

/* =========================================================
   HELPERS
========================================================= */

const isValidObjectId = (id) =>
  Boolean(id) &&
  mongoose.Types.ObjectId.isValid(id);

const normalizeText = (
  value,
  maxLength
) =>
  String(value ?? "")
    .trim()
    .slice(0, maxLength);

const normalizeCode = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, MAX_CODE_LENGTH);

const normalizeEmail = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .slice(0, MAX_EMAIL_LENGTH);

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );

const isValidUrl = (value) => {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
};

const toBoolean = (value) => {
  if (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false" ||
    value === 0 ||
    value === "0"
  ) {
    return false;
  }

  return null;
};

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

const isAdmin = (req) =>
  req.user?.role === "admin";

const sendServerError = (
  res,
  error,
  context
) => {
  console.error(
    `${context}:`,
    error
  );

  /*
    Never expose:
    - MongoDB errors
    - stack traces
    - API credentials
    - internal server information
  */
  return res.status(500).json({
    success: false,
    message:
      "An unexpected error occurred",
  });
};

/* =========================================================
   REMOVE SENSITIVE COURIER DATA
========================================================= */

const sanitizeCourier = (
  courier
) => {
  if (!courier) {
    return null;
  }

  const data =
    typeof courier.toObject ===
    "function"
      ? courier.toObject()
      : { ...courier };

  /*
    API credentials must NEVER be returned
    by normal courier endpoints.
  */

  delete data.apiKey;

  /*
    If your schema later contains additional
    secrets, remove them here as well.
  */

  return data;
};

/* =========================================================
   BUILD COURIER PAYLOAD
========================================================= */

/*
  SECURITY:

  Do NOT do:

      Courier.create(req.body)

  or:

      findByIdAndUpdate(
        id,
        req.body
      )

  because the client could potentially
  modify fields such as:

  - verification
  - documents
  - API credentials
  - internal status
  - ownership
  - administrative fields
*/

const buildCourierPayload = (
  body = {},
  {
    includeApiKey = false,
  } = {}
) => {
  const payload = {};

  if (
    body.name !== undefined
  ) {
    payload.name =
      normalizeText(
        body.name,
        MAX_NAME_LENGTH
      );
  }

  if (
    body.code !== undefined
  ) {
    payload.code =
      normalizeCode(
        body.code
      );
  }

  if (
    body.logo !== undefined
  ) {
    payload.logo =
      normalizeText(
        body.logo,
        MAX_URL_LENGTH
      );
  }

  if (
    body.description !== undefined
  ) {
    payload.description =
      normalizeText(
        body.description,
        MAX_DESCRIPTION_LENGTH
      );
  }

  if (
    body.website !== undefined
  ) {
    payload.website =
      normalizeText(
        body.website,
        MAX_URL_LENGTH
      );
  }

  if (
    body.email !== undefined
  ) {
    payload.email =
      normalizeEmail(
        body.email
      );
  }

  if (
    body.phone !== undefined
  ) {
    payload.phone =
      normalizeText(
        body.phone,
        MAX_PHONE_LENGTH
      );
  }

  if (
    body.customerCareNumber !==
    undefined
  ) {
    payload.customerCareNumber =
      normalizeText(
        body.customerCareNumber,
        MAX_PHONE_LENGTH
      );
  }

  if (
    body.trackingUrl !== undefined
  ) {
    payload.trackingUrl =
      normalizeText(
        body.trackingUrl,
        MAX_URL_LENGTH
      );
  }

  if (
    body.apiBaseUrl !== undefined
  ) {
    payload.apiBaseUrl =
      normalizeText(
        body.apiBaseUrl,
        MAX_URL_LENGTH
      );
  }

  /*
    API key should only be accepted from
    an authenticated admin endpoint.

    Never return it to the frontend.
  */

  if (
    includeApiKey &&
    body.apiKey !== undefined
  ) {
    payload.apiKey =
      normalizeText(
        body.apiKey,
        MAX_API_KEY_LENGTH
      );
  }

  if (
    body.estimatedDeliveryDays !==
    undefined
  ) {
    payload.estimatedDeliveryDays =
      toNumber(
        body.estimatedDeliveryDays
      );
  }

  if (
    body.supportsCOD !== undefined
  ) {
    payload.supportsCOD =
      toBoolean(
        body.supportsCOD
      );
  }

  if (
    body.supportsReturn !==
    undefined
  ) {
    payload.supportsReturn =
      toBoolean(
        body.supportsReturn
      );
  }

  if (
    body.supportsInternational !==
    undefined
  ) {
    payload.supportsInternational =
      toBoolean(
        body.supportsInternational
      );
  }

  if (
    body.serviceAreas !==
    undefined
  ) {
    payload.serviceAreas =
      Array.isArray(
        body.serviceAreas
      )
        ? body.serviceAreas
            .slice(
              0,
              MAX_SERVICE_AREAS
            )
            .map((area) =>
              normalizeText(
                area,
                150
              )
            )
            .filter(Boolean)
        : [];
  }

  if (
    body.baseCharge !==
    undefined
  ) {
    payload.baseCharge =
      toNumber(
        body.baseCharge
      );
  }

  if (
    body.pricePerKg !==
    undefined
  ) {
    payload.pricePerKg =
      toNumber(
        body.pricePerKg
      );
  }

  if (
    body.codCharge !==
    undefined
  ) {
    payload.codCharge =
      toNumber(
        body.codCharge
      );
  }

  /*
    Documents and verification are deliberately
    NOT accepted from the generic courier
    create/update endpoint.

    These should be handled by dedicated
    admin verification endpoints.
  */

  if (
    body.featured !== undefined
  ) {
    payload.featured =
      toBoolean(
        body.featured
      );
  }

  if (
    body.isActive !== undefined
  ) {
    payload.isActive =
      toBoolean(
        body.isActive
      );
  }

  return payload;
};

/* =========================================================
   VALIDATE COURIER PAYLOAD
========================================================= */

const validateCourierPayload = (
  payload,
  {
    isCreate = false,
  } = {}
) => {
  if (
    isCreate ||
    payload.name !== undefined
  ) {
    if (
      !payload.name ||
      payload.name.length <
        2
    ) {
      return "Courier name must be at least 2 characters";
    }
  }

  if (
    isCreate ||
    payload.code !== undefined
  ) {
    if (
      !payload.code ||
      !/^[A-Z0-9_-]{2,40}$/.test(
        payload.code
      )
    ) {
      return "Courier code must contain 2-40 letters, numbers, _ or -";
    }
  }

  const urlFields = [
    "logo",
    "website",
    "trackingUrl",
    "apiBaseUrl",
  ];

  for (
    const field of urlFields
  ) {
    if (
      payload[field] !==
        undefined &&
      !isValidUrl(
        payload[field]
      )
    ) {
      return `${field} must be a valid HTTP/HTTPS URL`;
    }
  }

  if (
    payload.email !==
      undefined &&
    payload.email &&
    !isValidEmail(
      payload.email
    )
  ) {
    return "Invalid courier email";
  }

  const numericFields = [
    "estimatedDeliveryDays",
    "baseCharge",
    "pricePerKg",
    "codCharge",
  ];

  for (
    const field of numericFields
  ) {
    if (
      payload[field] !==
        undefined &&
      payload[field] === null
    ) {
      return `${field} must be a valid number`;
    }
  }

  if (
    payload.estimatedDeliveryDays !==
      undefined
  ) {
    if (
      payload.estimatedDeliveryDays <
        0 ||
      payload.estimatedDeliveryDays >
        MAX_DELIVERY_DAYS
    ) {
      return "Invalid estimated delivery days";
    }
  }

  const chargeFields = [
    "baseCharge",
    "pricePerKg",
    "codCharge",
  ];

  for (
    const field of chargeFields
  ) {
    if (
      payload[field] !==
        undefined &&
      (
        payload[field] <
          0 ||
        payload[field] >
          MAX_CHARGE
      )
    ) {
      return `Invalid ${field}`;
    }
  }

  if (
    payload.supportsCOD ===
      null ||
    payload.supportsReturn ===
      null ||
    payload.supportsInternational ===
      null ||
    payload.featured === null ||
    payload.isActive === null
  ) {
    return "Boolean fields must contain true or false";
  }

  return null;
};

/* =========================================================
   CREATE COURIER
   ADMIN ONLY
========================================================= */

export const createCourier =
  async (
    req,
    res
  ) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const payload =
        buildCourierPayload(
          req.body,
          {
            includeApiKey:
              true,
          }
        );

      const validationError =
        validateCourierPayload(
          payload,
          {
            isCreate: true,
          }
        );

      if (
        validationError
      ) {
        return res.status(400).json({
          success: false,
          message:
            validationError,
        });
      }

      const exists =
        await Courier.findOne({
          $or: [
            {
              name: payload.name,
            },
            {
              code: payload.code,
            },
          ],
        }).select("_id");

      if (exists) {
        return res.status(409).json({
          success: false,
          message:
            "Courier name or code already exists",
        });
      }

      const courier =
        await Courier.create(
          payload
        );

      return res.status(201).json({
        success: true,
        message:
          "Courier created successfully",
        courier:
          sanitizeCourier(
            courier
          ),
      });

    } catch (error) {
      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Courier name or code already exists",
        });
      }

      return sendServerError(
        res,
        error,
        "Create Courier Error"
      );
    }
  };

/* =========================================================
   GET ALL COURIERS
========================================================= */

export const getCouriers =
  async (
    req,
    res
  ) => {
    try {
      /*
        Public consumers should not receive
        inactive couriers unless they are admins.
      */

      const filter =
        isAdmin(req)
          ? {}
          : {
              isActive:
                true,
            };

      const couriers =
        await Courier.find(
          filter
        )
          .select(
            "-apiKey"
          )
          .sort({
            name: 1,
          })
          .lean();

      return res.status(200).json({
        success: true,
        count:
          couriers.length,
        couriers,
      });

    } catch (error) {
      return sendServerError(
        res,
        error,
        "Get Couriers Error"
      );
    }
  };

/* =========================================================
   GET SINGLE COURIER
========================================================= */

export const getCourierById =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid courier ID",
        });
      }

      const filter =
        isAdmin(req)
          ? {
              _id: id,
            }
          : {
              _id: id,
              isActive:
                true,
            };

      const courier =
        await Courier.findOne(
          filter
        )
          .select(
            "-apiKey"
          )
          .lean();

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      return res.status(200).json({
        success: true,
        courier,
      });

    } catch (error) {
      return sendServerError(
        res,
        error,
        "Get Courier Error"
      );
    }
  };

/* =========================================================
   UPDATE COURIER
   ADMIN ONLY
========================================================= */

export const updateCourier =
  async (
    req,
    res
  ) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const {
        id,
      } = req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid courier ID",
        });
      }

      const payload =
        buildCourierPayload(
          req.body,
          {
            includeApiKey:
              true,
          }
        );

      const validationError =
        validateCourierPayload(
          payload
        );

      if (
        validationError
      ) {
        return res.status(400).json({
          success: false,
          message:
            validationError,
        });
      }

      /*
        Prevent changing the code to an
        already-existing courier code.
      */

      if (
        payload.code
      ) {
        const duplicate =
          await Courier.findOne({
            code:
              payload.code,
            _id: {
              $ne: id,
            },
          }).select("_id");

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              "Courier code already exists",
          });
        }
      }

      if (
        payload.name
      ) {
        const duplicate =
          await Courier.findOne({
            name:
              payload.name,
            _id: {
              $ne: id,
            },
          }).select("_id");

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              "Courier name already exists",
          });
        }
      }

      /*
        $set only updates explicitly permitted
        fields from our whitelist.

        It does NOT replace the entire document.
      */

      const courier =
        await Courier.findByIdAndUpdate(
          id,
          {
            $set:
              payload,
          },
          {
            new: true,
            runValidators: true,
            context: "query",
          }
        );

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Courier updated successfully",
        courier:
          sanitizeCourier(
            courier
          ),
      });

    } catch (error) {
      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Courier name or code already exists",
        });
      }

      return sendServerError(
        res,
        error,
        "Update Courier Error"
      );
    }
  };

/* =========================================================
   DELETE / DISABLE COURIER
   ADMIN ONLY
========================================================= */

export const deleteCourier =
  async (
    req,
    res
  ) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const {
        id,
      } = req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid courier ID",
        });
      }

      const courier =
        await Courier.findById(
          id
        );

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      courier.isActive =
        false;

      /*
        Do not physically delete the courier
        because existing shipments/orders may
        reference this courier.
      */

      await courier.save();

      return res.status(200).json({
        success: true,
        message:
          "Courier disabled successfully",
      });

    } catch (error) {
      return sendServerError(
        res,
        error,
        "Delete Courier Error"
      );
    }
  };

/* =========================================================
   ENABLE COURIER
   ADMIN ONLY
========================================================= */

export const enableCourier =
  async (
    req,
    res
  ) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const {
        id,
      } = req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid courier ID",
        });
      }

      const courier =
        await Courier.findById(
          id
        );

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      courier.isActive =
        true;

      await courier.save();

      return res.status(200).json({
        success: true,
        message:
          "Courier enabled successfully",
        courier:
          sanitizeCourier(
            courier
          ),
      });

    } catch (error) {
      return sendServerError(
        res,
        error,
        "Enable Courier Error"
      );
    }
  };