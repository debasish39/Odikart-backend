import mongoose from "mongoose";
import Courier from "../models/Courier.js";
import Order from "../models/Order.js";

/* =========================================================
   CONFIG
========================================================= */

const MAX_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 20;
const MAX_VEHICLE_NUMBER_LENGTH = 30;
const MAX_AREA_LENGTH = 150;
const MAX_AREAS = 100;
const MAX_NOTE_LENGTH = 1000;
const MAX_REJECTION_REASON_LENGTH = 1000;

const ALLOWED_VEHICLE_TYPES = [
  "Bike",
  "Scooter",
  "Cycle",
  "Auto",
  "Car",
  "Van",
  "Other",
];

const ACTIVE_DELIVERY_STATUSES = [
  "Ready for Pickup",
  "Shipped",
  "In Transit",
  "Out for Delivery",
];

/* =========================================================
   DEBUG LOGGING
   Set COURIER_DEBUG=false in .env to disable these logs.
========================================================= */

const COURIER_DEBUG =
  String(process.env.COURIER_DEBUG ?? "true").toLowerCase() !== "false";

const courierDebug = (label, data = {}) => {
  if (!COURIER_DEBUG) return;

  console.log(`\n[COURIER DEBUG] ${label}`);
  try {
    console.log(
      JSON.stringify(
        data,
        (key, value) => {
          if (
            ["aadhaarNumber", "drivingLicenseNumber", "token", "password"].includes(
              key
            )
          ) {
            return value ? "[REDACTED]" : value;
          }
          if (key === "buffer" || key === "stream") return "[FILE]";
          return value;
        },
        2
      )
    );
  } catch {
    console.log(data);
  }
};

const courierDebugError = (label, error) => {
  console.error(`\n[COURIER DEBUG ERROR] ${label}`);
  console.error("message:", error?.message);
  console.error("name:", error?.name);
  console.error("code:", error?.code);
  if (error?.stack) console.error("stack:", error.stack);
};

/* =========================================================
   HELPERS
========================================================= */

const isValidObjectId = (id) => {
  return (
    Boolean(id) &&
    mongoose.Types.ObjectId.isValid(id)
  );
};

const normalizeText = (
  value,
  maxLength
) => {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
};

const normalizePhone = (value) => {
  return String(value ?? "")
    .trim()
    .replace(/[^\d+]/g, "")
    .slice(0, MAX_PHONE_LENGTH);
};

const normalizeVehicleNumber = (value) => {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .slice(0, MAX_VEHICLE_NUMBER_LENGTH);
};

const isAdmin = (req) => {
  return req.user?.role === "admin";
};

const isCourier = (req) => {
  return req.user?.role === "courier";
};

const sendServerError = (
  res,
  error,
  context
) => {
  console.error(`${context}:`, error);
  courierDebugError(context, error);

  return res.status(500).json({
    success: false,
    message:
      "An unexpected error occurred",
  });
};

/* =========================================================
   COURIER VERIFICATION HELPERS
========================================================= */

const hasAadhaar = (courier) => {
  return Boolean(
    courier?.documents?.aadhaar
      ?.documentUrl
  );
};

const hasDrivingLicense = (courier) => {
  return Boolean(
    courier?.documents?.drivingLicense
      ?.documentUrl
  );
};

const isDocumentsVerified = (courier) => {
  if (!courier) return false;

  const aadhaarVerified =
    courier?.documents?.aadhaar?.verified === true;

  // Cycle couriers require Aadhaar only.
  if (courier.vehicleType === "Cycle") {
    return aadhaarVerified;
  }

  const drivingLicenseVerified =
    courier?.documents?.drivingLicense?.verified === true;

  return aadhaarVerified && drivingLicenseVerified;
};

const isCourierVerified = (courier) => {
  if (!courier) return false;

  if (courier.verificationStatus !== "verified") {
    return false;
  }

  const aadhaarExists = hasAadhaar(courier);

  if (courier.vehicleType === "Cycle") {
    return aadhaarExists && isDocumentsVerified(courier);
  }

  return (
    aadhaarExists &&
    hasDrivingLicense(courier) &&
    isDocumentsVerified(courier)
  );
};

/* =========================================================
   SANITIZE COURIER
========================================================= */

const sanitizeCourier = (courier) => {
  if (!courier) {
    return null;
  }

  const data =
    typeof courier.toObject ===
    "function"
      ? courier.toObject()
      : { ...courier };

  /*
    NEVER expose verification documents
    through normal courier APIs.
  */

  if (data.documents) {
    delete data.documents;
  }

  /*
    Remove possible sensitive fields.
  */

  delete data.apiKey;

  delete data.aadhaarNumber;

  delete data.drivingLicenseNumber;

  return data;
};

/* =========================================================
   SANITIZE COURIER FOR CUSTOMER
========================================================= */

const sanitizeCourierForCustomer = (
  courier
) => {
  if (!courier) {
    return null;
  }

  return {
    _id: courier._id,
    name: courier.name,
    photo: courier.photo || "",
    vehicleType:
      courier.vehicleType || "",
    vehicleNumber:
      courier.vehicleNumber || "",

    rating:
      typeof courier.rating ===
      "number"
        ? courier.rating
        : 5,

    totalDeliveries:
      courier.totalDeliveries || 0,

    showPhoneToCustomer:
      courier.showPhoneToCustomer ===
      true,

    phone:
      courier.showPhoneToCustomer ===
      true
        ? courier.phone
        : undefined,

    currentLocation:
      courier.currentLocation || null,

    locationUpdatedAt:
      courier.locationUpdatedAt ||
      null,

    isLocationSharing:
      courier.isLocationSharing ===
      true,
  };
};

/* =========================================================
   VALIDATE COURIER INPUT
========================================================= */

const validateCourierInput = (
  body = {},
  { isCreate = false } = {}
) => {
  /* =========================
     NAME
  ========================= */

  if (
    isCreate ||
    body.name !== undefined
  ) {
    const name = normalizeText(
      body.name,
      MAX_NAME_LENGTH
    );

    if (name.length < 2) {
      return "Courier name must be at least 2 characters";
    }
  }

  /* =========================
     PHONE
  ========================= */

  if (
    isCreate ||
    body.phone !== undefined
  ) {
    const phone = normalizePhone(
      body.phone
    );

    if (phone.length < 10) {
      return "Valid courier phone number is required";
    }
  }

  /* =========================
     VEHICLE TYPE
  ========================= */

  if (
    body.vehicleType !== undefined
  ) {
    if (
      !ALLOWED_VEHICLE_TYPES.includes(
        body.vehicleType
      )
    ) {
      return "Invalid vehicle type";
    }
  }

  /* =========================
     VEHICLE NUMBER
  ========================= */

  if (
    body.vehicleNumber !== undefined
  ) {
    const vehicleType =
      body.vehicleType || "Bike";

    if (
      vehicleType !== "Cycle" &&
      !normalizeVehicleNumber(
        body.vehicleNumber
      )
    ) {
      return "Vehicle number is required for this vehicle type";
    }
  }

  /* =========================
     DELIVERY TIME
  ========================= */

  if (
    body.estimatedDeliveryMinutes !==
    undefined
  ) {
    const minutes = Number(
      body.estimatedDeliveryMinutes
    );

    if (
      !Number.isFinite(minutes) ||
      minutes < 1 ||
      minutes > 1440
    ) {
      return "Estimated delivery time must be between 1 and 1440 minutes";
    }
  }

  /* =========================
     SERVICE AREAS

     Accept:

     serviceAreas=Hyderabad

     OR

     serviceAreas=Hyderabad
     serviceAreas=Berhampur

     OR

     serviceAreas=["Hyderabad","Berhampur"]
  ========================= */

  if (
    body.serviceAreas !== undefined
  ) {
    let areas = body.serviceAreas;

    if (
      typeof areas === "string"
    ) {
      const trimmed =
        areas.trim();

      if (trimmed.startsWith("[") &&
          trimmed.endsWith("]")) {
        try {
          areas = JSON.parse(trimmed);
        } catch {
          areas = [trimmed];
        }
      } else {
        areas = [trimmed];
      }
    }

    if (!Array.isArray(areas)) {
      return "Invalid service areas";
    }

    if (
      areas.length > MAX_AREAS
    ) {
      return `Maximum ${MAX_AREAS} service areas allowed`;
    }
  }

  /* =========================
     STATUS
  ========================= */

  if (
    body.status !== undefined
  ) {
    const allowedStatuses = [
      "available",
      "busy",
      "offline",
      "suspended",
    ];

    if (
      !allowedStatuses.includes(
        body.status
      )
    ) {
      return "Invalid courier status";
    }
  }

  return null;
};
/* =========================================================
   BUILD COURIER PAYLOAD
========================================================= */

const parseBoolean = (value) => {
  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  );
};

const normalizeServiceAreas = (value) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  let areas = value;

  if (typeof areas === "string") {
    const trimmed = areas.trim();

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        areas = JSON.parse(trimmed);
      } catch {
        areas = [trimmed];
      }
    } else {
      areas = [trimmed];
    }
  }

  if (!Array.isArray(areas)) {
    return [];
  }

  return areas
    .slice(0, MAX_AREAS)
    .map((area) => normalizeText(area, MAX_AREA_LENGTH))
    .filter(Boolean);
};

const normalizeAadhaarNumber = (value) => {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 12);
};

const normalizeDrivingLicenseNumber = (value) => {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 30);
};

const getUploadedFileUrl = (file) => {
  if (!file) {
    courierDebug("FILE URL: no file received");
    return "";
  }

  courierDebug("FILE RECEIVED", {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    location: file.location,
    secure_url: file.secure_url,
    url: file.url,
  });

  return (
    file.path ||
    file.location ||
    file.secure_url ||
    file.url ||
    ""
  );
};

const buildCourierPayload = (body = {}, files = {}) => {
  const payload = {};

  if (body.name !== undefined) {
    payload.name = normalizeText(body.name, MAX_NAME_LENGTH);
  }

  if (body.phone !== undefined) {
    payload.phone = normalizePhone(body.phone);
  }

  const photoFile = files?.photo?.[0];

  if (photoFile) {
    const photoUrl = getUploadedFileUrl(photoFile);

    if (photoUrl) {
      payload.photo = photoUrl;
    }
  } else if (body.photo !== undefined) {
    payload.photo = normalizeText(body.photo, 500);
  }

  if (body.vehicleType !== undefined) {
    payload.vehicleType = body.vehicleType;
  }

  const vehicleType = body.vehicleType || "Bike";

  if (vehicleType === "Cycle") {
    payload.vehicleNumber = "";
  } else if (body.vehicleNumber !== undefined) {
    payload.vehicleNumber = normalizeVehicleNumber(body.vehicleNumber);
  }

  if (body.serviceAreas !== undefined) {
    payload.serviceAreas = normalizeServiceAreas(body.serviceAreas);
  }

  if (body.estimatedDeliveryMinutes !== undefined) {
    payload.estimatedDeliveryMinutes =
      Number(body.estimatedDeliveryMinutes);
  }

  if (body.status !== undefined) {
    payload.status = body.status;
  }

  if (body.isActive !== undefined) {
    payload.isActive = parseBoolean(body.isActive);
  }

  if (body.showPhoneToCustomer !== undefined) {
    payload.showPhoneToCustomer =
      parseBoolean(body.showPhoneToCustomer);
  }

  if (body.isLocationSharing !== undefined) {
    payload.isLocationSharing =
      parseBoolean(body.isLocationSharing);
  }

  if (body.adminNote !== undefined) {
    payload.adminNote =
      normalizeText(body.adminNote, MAX_NOTE_LENGTH);
  }

  return payload;
};

/* =========================================================
   CREATE COURIER
   ADMIN ONLY
========================================================= */

export const createCourier = async (req, res) => {
  try {
    courierDebug("CREATE START", {
      userId: req.user?._id,
      role: req.user?.role,
      body: { ...req.body, aadhaarNumber: req.body?.aadhaarNumber ? "[REDACTED]" : "" ,
        drivingLicenseNumber: req.body?.drivingLicenseNumber ? "[REDACTED]" : "" },
      files: Object.fromEntries(
        Object.entries(req.files || {}).map(([key, value]) => [
          key,
          Array.isArray(value) ? value.map((f) => ({
            originalname: f?.originalname,
            mimetype: f?.mimetype,
            size: f?.size,
            path: f?.path,
            location: f?.location,
          })) : value,
        ])
      ),
    });
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const body = req.body || {};
    const files = req.files || {};

    const validationError = validateCourierInput(body, {
      isCreate: true,
    });

    courierDebug("CREATE VALIDATION", {
      validationError,
      vehicleType: body.vehicleType,
      serviceAreas: body.serviceAreas,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const vehicleType = body.vehicleType || "Bike";

    const aadhaarFile = files?.aadhaar?.[0];
    const drivingLicenseFile =
      files?.drivingLicense?.[0];

    const aadhaarNumber =
      normalizeAadhaarNumber(body.aadhaarNumber);

    if (!aadhaarFile) {
      return res.status(400).json({
        success: false,
        message: "Aadhaar card is required",
      });
    }

    if (aadhaarNumber.length !== 12) {
      return res.status(400).json({
        success: false,
        message: "Valid 12-digit Aadhaar number is required",
      });
    }

    let drivingLicenseNumber = "";

    if (vehicleType !== "Cycle") {
      drivingLicenseNumber =
        normalizeDrivingLicenseNumber(
          body.drivingLicenseNumber
        );

      if (!drivingLicenseFile) {
        return res.status(400).json({
          success: false,
          message:
            "Driving Licence is required for this vehicle type",
        });
      }

      if (!drivingLicenseNumber) {
        return res.status(400).json({
          success: false,
          message: "Driving Licence number is required",
        });
      }
    }

    const aadhaarUrl = getUploadedFileUrl(aadhaarFile);

    if (!aadhaarUrl) {
      return res.status(400).json({
        success: false,
        message: "Unable to save Aadhaar document",
      });
    }

    let drivingLicenseUrl = "";

    if (vehicleType !== "Cycle") {
      drivingLicenseUrl =
        getUploadedFileUrl(drivingLicenseFile);

      if (!drivingLicenseUrl) {
        return res.status(400).json({
          success: false,
          message:
            "Unable to save Driving Licence document",
        });
      }
    }

    const payload = buildCourierPayload(body, files);

    payload.verificationStatus = "under_review";
    payload.status = "offline";
    payload.isActive = true;
    payload.isLocationSharing = false;

    payload.documents = {
      aadhaar: {
        documentUrl: aadhaarUrl,
        documentNumber: aadhaarNumber,
        uploadedAt: new Date(),
        verified: false,
      },
      drivingLicense:
        vehicleType === "Cycle"
          ? {
              documentUrl: "",
              documentNumber: "",
              uploadedAt: null,
              verified: false,
            }
          : {
              documentUrl: drivingLicenseUrl,
              documentNumber: drivingLicenseNumber,
              uploadedAt: new Date(),
              verified: false,
            },
    };

    courierDebug("CREATE PAYLOAD READY", {
      vehicleType,
      hasPhoto: Boolean(payload.photo),
      hasAadhaarFile: Boolean(aadhaarFile),
      hasDrivingLicenseFile: Boolean(drivingLicenseFile),
      aadhaarUrl: Boolean(aadhaarUrl),
      drivingLicenseUrl: Boolean(drivingLicenseUrl),
      verificationStatus: payload.verificationStatus,
      status: payload.status,
      isActive: payload.isActive,
    });

    const courier = await Courier.create(payload);

    courierDebug("CREATE SUCCESS", {
      courierId: courier._id,
      vehicleType: courier.vehicleType,
      verificationStatus: courier.verificationStatus,
      status: courier.status,
    });

    return res.status(201).json({
      success: true,
      message:
        "Courier created successfully. Verification is under review.",
      courier: sanitizeCourier(courier),
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      "Create Courier Error"
    );
  }
};

/* =========================================================
   GET ALL COURIERS
   ADMIN
========================================================= */

export const getCouriers = async (
  req,
  res
) => {
  try {
    const filter = isAdmin(req)
      ? {}
      : {
          isActive: true,
          verificationStatus:
            "verified",
        };

    const couriers =
      await Courier.find(filter)
        .select(
          "-documents.aadhaar.documentNumber -documents.drivingLicense.documentNumber"
        )
        .sort({
          name: 1,
        })
        .lean();

    const result = isAdmin(req)
      ? couriers.map(
          sanitizeCourier
        )
      : couriers.map(
          sanitizeCourierForCustomer
        );

    return res.status(200).json({
      success: true,
      count: result.length,
      couriers: result,
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

const sanitizeCourierForAdmin = (courier) => {
  if (!courier) return null;

  const data =
    typeof courier.toObject === "function"
      ? courier.toObject()
      : { ...courier };

  delete data.apiKey;
  delete data.aadhaarNumber;
  delete data.drivingLicenseNumber;

  if (data.documents) {
    const mask = (value) => {
      const digits = String(value || "");
      if (!digits) return "";
      return digits.length <= 4
        ? "****"
        : `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
    };

    data.documents = {
      aadhaar: {
        documentUrl: data.documents.aadhaar?.documentUrl || "",
        documentNumber: mask(
          data.documents.aadhaar?.documentNumber
        ),
        uploadedAt:
          data.documents.aadhaar?.uploadedAt || null,
        verified:
          data.documents.aadhaar?.verified === true,
      },
      drivingLicense:
        data.vehicleType === "Cycle"
          ? undefined
          : {
              documentUrl:
                data.documents.drivingLicense?.documentUrl || "",
              documentNumber: mask(
                data.documents.drivingLicense?.documentNumber
              ),
              uploadedAt:
                data.documents.drivingLicense?.uploadedAt || null,
              verified:
                data.documents.drivingLicense?.verified === true,
            },
    };
  }

  return data;
};

export const getCourierById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid courier ID",
      });
    }

    const courier = await Courier.findById(id).lean();

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    const response = isAdmin(req)
      ? sanitizeCourierForAdmin(courier)
      : sanitizeCourierForCustomer(courier);

    return res.status(200).json({
      success: true,
      courier: response,
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

export const updateCourier = async (req, res) => {
  try {
    courierDebug("UPDATE START", {
      courierId: req.params?.id,
      userId: req.user?._id,
      role: req.user?.role,
      body: { ...req.body, aadhaarNumber: req.body?.aadhaarNumber ? "[REDACTED]" : "",
        drivingLicenseNumber: req.body?.drivingLicenseNumber ? "[REDACTED]" : "" },
      fileKeys: Object.keys(req.files || {}),
    });
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid courier ID",
      });
    }

    const courier = await Courier.findById(id);

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    const body = req.body || {};
    const files = req.files || {};

    const validationError =
      validateCourierInput(body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const nextVehicleType =
      body.vehicleType !== undefined
        ? body.vehicleType
        : courier.vehicleType;

    const payload =
      buildCourierPayload(
        body,
        files
      );

    /* =========================
       PHOTO
    ========================= */

    const photoFile =
      files?.photo?.[0];

    if (photoFile) {
      const photoUrl =
        getUploadedFileUrl(
          photoFile
        );

      if (!photoUrl) {
        return res.status(400).json({
          success: false,
          message:
            "Unable to save courier photo",
        });
      }

      payload.photo = photoUrl;
    }

    /* =========================
       AADHAAR
    ========================= */

    const aadhaarFile =
      files?.aadhaar?.[0];

    const aadhaarNumber =
      normalizeAadhaarNumber(
        body.aadhaarNumber
      );

    if (aadhaarFile) {
      const url =
        getUploadedFileUrl(
          aadhaarFile
        );

      if (!url) {
        return res.status(400).json({
          success: false,
          message:
            "Unable to save Aadhaar document",
        });
      }

      if (
        aadhaarNumber.length !== 12
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid 12-digit Aadhaar number is required when uploading a new Aadhaar",
        });
      }

      courier.documents.aadhaar =
        {
          documentUrl: url,
          documentNumber:
            aadhaarNumber,
          uploadedAt:
            new Date(),
          verified: false,
        };

      courier.verificationStatus =
        "under_review";

      courier.verifiedAt = null;
      courier.verifiedBy = null;
      courier.rejectionReason = "";
      courier.rejectedAt = null;
      courier.rejectedBy = null;
    } else if (
      aadhaarNumber
    ) {
      if (
        aadhaarNumber.length !== 12
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Aadhaar number must contain 12 digits",
        });
      }

      courier.documents.aadhaar.documentNumber =
        aadhaarNumber;

      courier.documents.aadhaar.verified =
        false;

      courier.verificationStatus =
        "under_review";

      courier.verifiedAt = null;
      courier.verifiedBy = null;
    }

    /* =========================
       DRIVING LICENCE
       NEVER REQUIRED FOR CYCLE
    ========================= */

    if (
      nextVehicleType === "Cycle"
    ) {
      courier.documents.drivingLicense = {
        documentUrl: "",
        documentNumber: "",
        uploadedAt: null,
        verified: false,
      };
    } else {
      const licenseFile =
        files?.drivingLicense?.[0];

      const licenseNumber =
        normalizeDrivingLicenseNumber(
          body.drivingLicenseNumber
        );

      if (licenseFile) {
        const url =
          getUploadedFileUrl(
            licenseFile
          );

        if (!url) {
          return res.status(400).json({
            success: false,
            message:
              "Unable to save Driving Licence document",
          });
        }

        if (!licenseNumber) {
          return res.status(400).json({
            success: false,
            message:
              "Driving Licence number is required when uploading a new Driving Licence",
          });
        }

        courier.documents.drivingLicense =
          {
            documentUrl: url,
            documentNumber:
              licenseNumber,
            uploadedAt:
              new Date(),
            verified: false,
          };

        courier.verificationStatus =
          "under_review";

        courier.verifiedAt = null;
        courier.verifiedBy = null;
        courier.rejectionReason = "";
        courier.rejectedAt = null;
        courier.rejectedBy = null;
      } else if (
        licenseNumber
      ) {
        courier.documents.drivingLicense.documentNumber =
          licenseNumber;

        courier.documents.drivingLicense.verified =
          false;

        courier.verificationStatus =
          "under_review";

        courier.verifiedAt = null;
        courier.verifiedBy = null;
      }
    }

    /* =========================
       BASIC FIELDS
    ========================= */

    Object.keys(payload).forEach(
      (key) => {
        if (
          key !== "documents" &&
          payload[key] !== undefined
        ) {
          courier[key] =
            payload[key];
        }
      }
    );

    /* A Cycle never stores a vehicle number. */
    if (
      nextVehicleType === "Cycle"
    ) {
      courier.vehicleNumber = "";
    }

    /* Location sharing should never be
       manually enabled for an inactive courier. */
    if (
      courier.isActive !== true
    ) {
      courier.isLocationSharing =
        false;

      courier.status =
        "offline";
    }

    /* Unverified couriers cannot be available. */
    if (
      courier.verificationStatus !==
        "verified" &&
      (
        courier.status ===
          "available" ||
        courier.status ===
          "busy"
      )
    ) {
      courier.status =
        "offline";
    }

    await courier.save();

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
    return sendServerError(
      res,
      error,
      "Update Courier Error"
    );
  }
};

/* =========================================================
   DISABLE COURIER
   ADMIN ONLY
========================================================= */

export const deleteCourier =
  async (req, res) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const { id } =
        req.params;

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
        await Courier.findById(id);

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      /*
        IMPORTANT:
        Do not use courier.save() here.

        Some legacy Courier documents may not contain fields
        that are required by the current schema (for example
        phone). save() performs full document validation and
        can therefore fail even though we are only changing
        the active state.

        This operation only changes courier state, so use an
        atomic MongoDB update instead.
      */
      const updatedCourier =
        await Courier.findByIdAndUpdate(
          id,
          {
            $set: {
              isActive: false,
              status: "offline",
              isLocationSharing: false,
              locationUpdatedAt: new Date(),
            },
          },
          {
            new: true,
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Courier disabled successfully",
        courier:
          sanitizeCourier(updatedCourier),
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
  async (req, res) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const { id } =
        req.params;

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
        await Courier.findById(id);

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      /*
        Use an atomic update instead of courier.save() so an
        older courier document with missing required fields
        cannot block a simple enable operation.
      */
      const updatedCourier =
        await Courier.findByIdAndUpdate(
          id,
          {
            $set: {
              isActive: true,
            },
          },
          {
            new: true,
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Courier enabled successfully",
        courier:
          sanitizeCourier(
            updatedCourier
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

/* =========================================================
   UPLOAD VERIFICATION DOCUMENTS
   ADMIN / COURIER
========================================================= */

export const uploadCourierDocuments = async (
  req,
  res
) => {
  try {
    courierDebug("DOCUMENT UPLOAD START", {
      courierId: req.params?.id,
      userId: req.user?._id,
      role: req.user?.role,
      vehicleType: req.body?.vehicleType,
      aadhaarNumberProvided: Boolean(req.body?.aadhaarNumber),
      drivingLicenseNumberProvided: Boolean(req.body?.drivingLicenseNumber),
      fileKeys: Object.keys(req.files || {}),
    });
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid courier ID",
      });
    }

    const courier =
      await Courier.findById(id);

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    if (
      !isAdmin(req) &&
      !isCourier(req)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only admin or courier can upload documents",
      });
    }

    if (
      isCourier(req) &&
      String(
        req.user?.courierId ||
        req.user?._id
      ) !== String(courier._id)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only upload your own documents",
      });
    }

    const aadhaarFile =
      req.files?.aadhaar?.[0];

    const licenseFile =
      req.files?.drivingLicense?.[0];

    const aadhaarNumber =
      normalizeAadhaarNumber(
        req.body?.aadhaarNumber
      );

    if (
      !aadhaarFile &&
      !courier.documents?.aadhaar?.documentUrl
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Aadhaar card is required",
      });
    }

    if (
      aadhaarFile &&
      aadhaarNumber.length !== 12
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid 12-digit Aadhaar number is required",
      });
    }

    if (
      courier.vehicleType !== "Cycle" &&
      !licenseFile &&
      !courier.documents?.drivingLicense?.documentUrl
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Driving Licence is required for this vehicle type",
      });
    }

    if (
      courier.vehicleType !== "Cycle" &&
      licenseFile &&
      !normalizeDrivingLicenseNumber(
        req.body?.drivingLicenseNumber
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Driving Licence number is required",
      });
    }

    if (aadhaarFile) {
      const url =
        getUploadedFileUrl(
          aadhaarFile
        );

      if (!url) {
        return res.status(400).json({
          success: false,
          message:
            "Unable to save Aadhaar document",
        });
      }

      courier.documents.aadhaar = {
        ...(courier.documents?.aadhaar?.toObject?.() ||
          courier.documents?.aadhaar ||
          {}),
        documentUrl: url,
        documentNumber:
          aadhaarNumber ||
          courier.documents?.aadhaar?.documentNumber ||
          "",
        uploadedAt: new Date(),
        verified: false,
      };
    }

    if (
      courier.vehicleType === "Cycle"
    ) {
      courier.documents.drivingLicense = {
        documentUrl: "",
        documentNumber: "",
        uploadedAt: null,
        verified: false,
      };
    } else if (licenseFile) {
      const url =
        getUploadedFileUrl(
          licenseFile
        );

      if (!url) {
        return res.status(400).json({
          success: false,
          message:
            "Unable to save Driving Licence document",
        });
      }

      courier.documents.drivingLicense = {
        ...(courier.documents?.drivingLicense?.toObject?.() ||
          courier.documents?.drivingLicense ||
          {}),
        documentUrl: url,
        documentNumber:
          normalizeDrivingLicenseNumber(
            req.body?.drivingLicenseNumber
          ),
        uploadedAt: new Date(),
        verified: false,
      };
    }

    courier.verificationStatus =
      "under_review";

    courier.rejectionReason = "";
    courier.rejectedAt = null;
    courier.rejectedBy = null;
    courier.verifiedAt = null;
    courier.verifiedBy = null;
    courier.status = "offline";
    courier.isLocationSharing = false;

    await courier.save();

    return res.status(200).json({
      success: true,
      message:
        "Documents uploaded successfully. Courier verification is under review.",
      courier:
        sanitizeCourier(
          courier
        ),
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      "Upload Courier Documents Error"
    );
  }
};

/* =========================================================
   GET VERIFICATION DETAILS
   ADMIN ONLY
========================================================= */

export const getCourierVerification =
  async (req, res) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const { id } =
        req.params;

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
        await Courier.findById(id)
          .select(
            "+documents.aadhaar.documentNumber +documents.drivingLicense.documentNumber"
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

        verification: {
          courierId:
            courier._id,

          name:
            courier.name,

          phone:
            courier.phone,

          photo:
            courier.photo || "",

          vehicleType:
            courier.vehicleType,

          vehicleNumber:
            courier.vehicleNumber,

          verificationStatus:
            courier.verificationStatus,

          documents: {
            aadhaar: {
              documentUrl:
                courier.documents
                  ?.aadhaar
                  ?.documentUrl ||
                "",

              documentNumber:
                courier.documents
                  ?.aadhaar
                  ?.documentNumber ||
                "",

              uploadedAt:
                courier.documents
                  ?.aadhaar
                  ?.uploadedAt ||
                null,

              verified:
                courier.documents
                  ?.aadhaar
                  ?.verified === true,
            },

            ...(courier.vehicleType === "Cycle"
              ? {}
              : {
                  drivingLicense: {
                    documentUrl:
                      courier.documents
                        ?.drivingLicense
                        ?.documentUrl ||
                      "",

                    documentNumber:
                      courier.documents
                        ?.drivingLicense
                        ?.documentNumber ||
                      "",

                    uploadedAt:
                      courier.documents
                        ?.drivingLicense
                        ?.uploadedAt ||
                      null,

                    verified:
                      courier.documents
                        ?.drivingLicense
                        ?.verified === true,
                  },
                }),
          },

          verificationNote:
            courier.verificationNote ||
            "",

          rejectionReason:
            courier.rejectionReason ||
            "",

          verifiedAt:
            courier.verifiedAt ||
            null,

          rejectedAt:
            courier.rejectedAt ||
            null,
        },
      });
    } catch (error) {
      return sendServerError(
        res,
        error,
        "Get Courier Verification Error"
      );
    }
  };

/* =========================================================
   VERIFY COURIER
   ADMIN ONLY
========================================================= */

export const verifyCourier = async (
  req,
  res
) => {
  try {
    courierDebug("VERIFY START", {
      courierId: req.params?.id,
      adminId: req.user?._id,
      body: req.body,
    });
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access only",
      });
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid courier ID",
      });
    }

    const courier =
      await Courier.findById(id);

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    if (!hasAadhaar(courier)) {
      return res.status(400).json({
        success: false,
        message:
          "Aadhaar card is required before verification",
      });
    }

    if (
      courier.vehicleType !== "Cycle" &&
      !hasDrivingLicense(courier)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Driving Licence is required before verification",
      });
    }

    courier.documents.aadhaar.verified =
      true;

    if (
      courier.vehicleType === "Cycle"
    ) {
      courier.documents.drivingLicense = {
        documentUrl: "",
        documentNumber: "",
        uploadedAt: null,
        verified: false,
      };
    } else {
      courier.documents.drivingLicense.verified =
        true;
    }

    courier.verificationStatus =
      "verified";

    courier.verifiedAt =
      new Date();

    courier.verifiedBy =
      req.user._id;

    courier.rejectionReason = "";
    courier.rejectedAt = null;
    courier.rejectedBy = null;

    courier.verificationNote =
      normalizeText(
        req.body?.verificationNote,
        MAX_NOTE_LENGTH
      );

    if (
      courier.status === "suspended"
    ) {
      courier.status =
        "offline";
    }

    await courier.save();

    return res.status(200).json({
      success: true,
      message:
        "Courier verified successfully",
      courier:
        sanitizeCourier(
          courier
        ),
    });
  } catch (error) {
    return sendServerError(
      res,
      error,
      "Verify Courier Error"
    );
  }
};

/* =========================================================
   REJECT COURIER
   ADMIN ONLY
========================================================= */

export const rejectCourier =
  async (req, res) => {
    try {
      courierDebug("REJECT START", {
        courierId: req.params?.id,
        adminId: req.user?._id,
        hasReason: Boolean(req.body?.rejectionReason || req.body?.reason),
      });
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const { id } =
        req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid courier ID",
        });
      }

      const reason =
        normalizeText(
          req.body?.rejectionReason ??
            req.body?.reason,
          MAX_REJECTION_REASON_LENGTH
        );

      /*
        Rejection reason is mandatory.
      */

      if (!reason) {
        return res.status(400).json({
          success: false,
          message:
            "Rejection reason is required",
        });
      }

      if (reason.length < 5) {
        return res.status(400).json({
          success: false,
          message:
            "Rejection reason must be at least 5 characters",
        });
      }

      const courier =
        await Courier.findById(id);

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      courier.verificationStatus =
        "rejected";

      courier.rejectionReason =
        reason;

      courier.rejectedAt =
        new Date();

      courier.rejectedBy =
        req.user._id;

      courier.verifiedAt = null;

      courier.verifiedBy = null;

      if (
        courier.documents?.aadhaar
      ) {
        courier.documents.aadhaar.verified =
          false;
      }

      if (
        courier.documents
          ?.drivingLicense
      ) {
        courier.documents.drivingLicense.verified =
          false;
      }

      /*
        Rejected courier cannot
        receive deliveries.
      */

      courier.status =
        "offline";

      courier.isLocationSharing =
        false;

      await courier.save();

      return res.status(200).json({
        success: true,
        message:
          "Courier rejected successfully",
        rejectionReason:
          courier.rejectionReason,
        courier:
          sanitizeCourier(
            courier
          ),
      });
    } catch (error) {
      return sendServerError(
        res,
        error,
        "Reject Courier Error"
      );
    }
  };

/* =========================================================
   RESUBMIT VERIFICATION
========================================================= */

export const resubmitCourierVerification =
  async (req, res) => {
    try {
      const { id } =
        req.params;

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
        await Courier.findById(id);

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      if (
        !hasAadhaar(courier)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Aadhaar card is required",
        });
      }

      if (
        courier.vehicleType !== "Cycle" &&
        !hasDrivingLicense(courier)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Driving Licence is required for this vehicle type",
        });
      }

      courier.verificationStatus =
        "under_review";

      courier.documents.aadhaar.verified =
        false;

      if (courier.vehicleType === "Cycle") {
        courier.documents.drivingLicense = {
          documentUrl: "",
          documentNumber: "",
          uploadedAt: null,
          verified: false,
        };
      } else {
        courier.documents.drivingLicense.verified =
          false;
      }

      courier.rejectionReason = "";

      courier.rejectedAt = null;

      courier.rejectedBy = null;

      courier.verifiedAt = null;

      courier.verifiedBy = null;

      await courier.save();

      return res.status(200).json({
        success: true,
        message:
          "Courier verification resubmitted successfully",
        courier:
          sanitizeCourier(
            courier
          ),
      });
    } catch (error) {
      return sendServerError(
        res,
        error,
        "Resubmit Courier Verification Error"
      );
    }
  };

/* =========================================================
   SET COURIER AVAILABLE
   COURIER ONLY
========================================================= */

export const setCourierAvailable =
  async (req, res) => {
    try {
      courierDebug("SET AVAILABLE START", {
        userId: req.user?._id,
        courierId: req.user?.courierId,
      });
      if (!isCourier(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Courier access only",
        });
      }

      const courierId =
        req.user?.courierId ||
        req.user?._id;

      if (
        !isValidObjectId(
          courierId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid courier account",
        });
      }

      const courier =
        await Courier.findById(
          courierId
        );

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      if (
        !isCourierVerified(
          courier
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Courier must be verified before becoming available",
        });
      }

      if (!courier.isActive) {
        return res.status(403).json({
          success: false,
          message:
            "Courier account is inactive",
        });
      }

      if (
        courier.status ===
        "suspended"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Courier account is suspended",
        });
      }

      courier.status =
        "available";

      await courier.save();

      return res.status(200).json({
        success: true,
        message:
          "Courier is now available",
        courier:
          sanitizeCourier(
            courier
          ),
      });
    } catch (error) {
      return sendServerError(
        res,
        error,
        "Set Courier Available Error"
      );
    }
  };

/* =========================================================
   SET COURIER OFFLINE
   COURIER ONLY
========================================================= */

export const setCourierOffline =
  async (req, res) => {
    try {
      if (!isCourier(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Courier access only",
        });
      }

      const courierId =
        req.user?.courierId ||
        req.user?._id;

      const courier =
        await Courier.findById(
          courierId
        );

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      courier.status =
        "offline";

      courier.isLocationSharing =
        false;

      await courier.save();

      return res.status(200).json({
        success: true,
        message:
          "Courier is now offline",
      });
    } catch (error) {
      return sendServerError(
        res,
        error,
        "Set Courier Offline Error"
      );
    }
  };

/* =========================================================
   UPDATE COURIER LOCATION
   COURIER ONLY
========================================================= */

export const updateCourierLocation =
  async (req, res) => {
    try {
      courierDebug("LOCATION UPDATE START", {
        userId: req.user?._id,
        courierId: req.user?.courierId,
        latitude: req.body?.latitude,
        longitude: req.body?.longitude,
      });
      if (!isCourier(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Courier access only",
        });
      }

      const courierId =
        req.user?.courierId ||
        req.user?._id;

      const {
        latitude,
        longitude,
      } = req.body;

      const lat =
        Number(latitude);

      const lng =
        Number(longitude);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid latitude and longitude are required",
        });
      }

      if (
        lat < -90 ||
        lat > 90
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid latitude",
        });
      }

      if (
        lng < -180 ||
        lng > 180
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid longitude",
        });
      }

      const courier =
        await Courier.findById(
          courierId
        );

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      if (
        !isCourierVerified(
          courier
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only verified couriers can share location",
        });
      }

      if (
        !courier.isLocationSharing
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Location sharing is not active",
        });
      }

      courier.currentLocation = {
        type: "Point",
        coordinates: [
          lng,
          lat,
        ],
      };

      courier.locationUpdatedAt =
        new Date();

      await courier.save();

      /*
        Send real-time location
        through Socket.IO.
      */

      const io =
        req.app.get("io");

      if (io) {
        io.to(
          `courier:${courier._id}`
        ).emit(
          "courier-location-updated",
          {
            courierId:
              courier._id,

            latitude: lat,

            longitude: lng,

            updatedAt:
              courier.locationUpdatedAt,
          }
        );

        /*
          Find active delivery and
          notify customer room.
        */

        const activeOrder =
          await Order.findOne({
            "shipping.courier":
              courier._id,

            status: {
              $in:
                ACTIVE_DELIVERY_STATUSES,
            },
          }).select("_id");

        if (activeOrder) {
          io.to(
            `order:${activeOrder._id}`
          ).emit(
            "courier-location-updated",
            {
              courierId:
                courier._id,

              latitude: lat,

              longitude: lng,

              updatedAt:
                courier.locationUpdatedAt,
            }
          );
        }
      }

      return res.status(200).json({
        success: true,
        message:
          "Courier location updated",
        location: {
          latitude: lat,
          longitude: lng,
          updatedAt:
            courier.locationUpdatedAt,
        },
      });
    } catch (error) {
      return sendServerError(
        res,
        error,
        "Update Courier Location Error"
      );
    }
  };

/* =========================================================
   START LOCATION SHARING
   COURIER ONLY
========================================================= */

export const startLocationSharing =
  async (req, res) => {
    try {
      if (!isCourier(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Courier access only",
        });
      }

      const courierId =
        req.user?.courierId ||
        req.user?._id;

      const courier =
        await Courier.findById(
          courierId
        );

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      if (
        !isCourierVerified(
          courier
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Courier must be verified before sharing location",
        });
      }

      if (!courier.isActive) {
        return res.status(403).json({
          success: false,
          message:
            "Courier account is inactive",
        });
      }

      courier.isLocationSharing =
        true;

      courier.locationUpdatedAt =
        new Date();

      await courier.save();

      return res.status(200).json({
        success: true,
        message:
          "Location sharing started",
      });
    } catch (error) {
      return sendServerError(
        res,
        error,
        "Start Location Sharing Error"
      );
    }
  };

/* =========================================================
   STOP LOCATION SHARING
   COURIER ONLY
========================================================= */

export const stopLocationSharing =
  async (req, res) => {
    try {
      if (!isCourier(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Courier access only",
        });
      }

      const courierId =
        req.user?.courierId ||
        req.user?._id;

      const courier =
        await Courier.findById(
          courierId
        );

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      courier.isLocationSharing =
        false;

      await courier.save();

      return res.status(200).json({
        success: true,
        message:
          "Location sharing stopped",
      });
    } catch (error) {
      return sendServerError(
        res,
        error,
        "Stop Location Sharing Error"
      );
    }
  };

/* =========================================================
   GET COURIER LOCATION
   CUSTOMER / SELLER / ADMIN
========================================================= */

export const getCourierLocation =
  async (req, res) => {
    try {
      const { courierId } =
        req.params;

      if (
        !isValidObjectId(
          courierId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid courier ID",
        });
      }

      const courier =
        await Courier.findById(
          courierId
        )
          .select(
            "name photo vehicleType vehicleNumber currentLocation locationUpdatedAt isLocationSharing verificationStatus isActive"
          )
          .lean();

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      /*
        Only verified active couriers
        can expose live location.
      */

      if (
        courier.verificationStatus !==
          "verified" ||
        !courier.isActive
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Courier location is unavailable",
        });
      }

      if (
        !courier.isLocationSharing
      ) {
        return res.status(200).json({
          success: true,
          tracking: false,
          message:
            "Courier is not currently sharing location",
          location: null,
        });
      }

      return res.status(200).json({
        success: true,
        tracking: true,

        courier: {
          _id:
            courier._id,

          name:
            courier.name,

          photo:
            courier.photo || "",

          vehicleType:
            courier.vehicleType,

          vehicleNumber:
            courier.vehicleNumber,
        },

        location:
          courier.currentLocation,

        locationUpdatedAt:
          courier.locationUpdatedAt,
      });
    } catch (error) {
      return sendServerError(
        res,
        error,
        "Get Courier Location Error"
      );
    }
  };

/* =========================================================
   GET VERIFICATION QUEUE
   ADMIN ONLY
========================================================= */

export const getVerificationQueue =
  async (req, res) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const couriers =
        await Courier.find({
          verificationStatus: {
            $in: [
              "pending",
              "under_review",
              "rejected",
            ],
          },
        })
          .select(
            "name phone photo vehicleType vehicleNumber verificationStatus verificationNote rejectionReason createdAt updatedAt"
          )
          .sort({
            updatedAt: -1,
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
        "Get Verification Queue Error"
      );
    }
  };

/* =========================================================
   SUSPEND COURIER
   ADMIN ONLY
========================================================= */

export const suspendCourier =
  async (req, res) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const { id } =
        req.params;

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
        await Courier.findById(id);

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      courier.status =
        "suspended";

      courier.isLocationSharing =
        false;

      await courier.save();

      return res.status(200).json({
        success: true,
        message:
          "Courier suspended successfully",
      });
    } catch (error) {
      return sendServerError(
        res,
        error,
        "Suspend Courier Error"
      );
    }
  };

/* =========================================================
   REACTIVATE COURIER
   ADMIN ONLY
========================================================= */

export const reactivateCourier =
  async (req, res) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const { id } =
        req.params;

      const courier =
        await Courier.findById(id);

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      if (
        !isCourierVerified(
          courier
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Courier must be verified before reactivation",
        });
      }

      courier.status =
        "offline";

      courier.isActive =
        true;

      await courier.save();

      return res.status(200).json({
        success: true,
        message:
          "Courier reactivated successfully",
        courier:
          sanitizeCourier(
            courier
          ),
      });
    } catch (error) {
      return sendServerError(
        res,
        error,
        "Reactivate Courier Error"
      );
    }
  };

/* =========================================================
   CHECK WHETHER COURIER CAN RECEIVE ORDER
========================================================= */

export const canCourierReceiveOrder =
  async (req, res) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Admin access only",
        });
      }

      const { id } =
        req.params;

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
        await Courier.findById(id);

      if (!courier) {
        return res.status(404).json({
          success: false,
          message:
            "Courier not found",
        });
      }

      const verified =
        isCourierVerified(
          courier
        );

      const available =
        courier.status ===
        "available";

      const active =
        courier.isActive === true;

      const allowed =
        verified &&
        available &&
        active;

      return res.status(200).json({
        success: true,

        allowed,

        reason: allowed
          ? "Courier can receive orders"
          : !verified
          ? "Courier is not verified"
          : !active
          ? "Courier is inactive"
          : "Courier is not available",

        courier: {
          id:
            courier._id,

          verificationStatus:
            courier.verificationStatus,

          status:
            courier.status,

          isActive:
            courier.isActive,

          documentsVerified:
            isDocumentsVerified(
              courier
            ),
        },
      });
    } catch (error) {
      return sendServerError(
        res,
        error,
        "Check Courier Eligibility Error"
      );
    }
  };