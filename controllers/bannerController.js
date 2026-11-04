import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import Banner from "../models/Banner.js";

const VALID_PLACEMENTS = [
  "home_main",
  "daily_deals",
  "category",
  "popup",
];

const VALID_REDIRECT_TYPES = [
  "none",
  "category",
  "product",
  "collection",
  "url",
];

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const parseOptionalDate = (value, fieldName) => {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} is not a valid date`);
    error.status = 400;
    throw error;
  }
  return date;
};

const parseBoolean = (value, fallback) => {
  if (value === undefined) return fallback;
  return value === true || value === "true";
};

const uploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          { quality: "auto:good" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("Cloudinary upload returned no result"));
        resolve(result);
      }
    );

    stream.end(buffer);
  });

const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    console.error("Cloudinary image cleanup failed:", error.message);
  }
};

const validateBannerInput = (body, { creating = false } = {}) => {
  const {
    title,
    placement,
    redirectType,
    redirectUrl,
    priority,
    startDate,
    endDate,
  } = body;

  if (creating && !String(title || "").trim()) {
    const error = new Error("Banner title is required");
    error.status = 400;
    throw error;
  }

  if (placement && !VALID_PLACEMENTS.includes(placement)) {
    const error = new Error("Invalid banner placement");
    error.status = 400;
    throw error;
  }

  if (redirectType && !VALID_REDIRECT_TYPES.includes(redirectType)) {
    const error = new Error("Invalid redirect type");
    error.status = 400;
    throw error;
  }

  if (redirectType === "url" && redirectUrl) {
    try {
      const parsed = new URL(redirectUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      const error = new Error("Redirect URL must be a valid HTTP or HTTPS URL");
      error.status = 400;
      throw error;
    }
  }

  if (priority !== undefined && !Number.isFinite(Number(priority))) {
    const error = new Error("Priority must be a number");
    error.status = 400;
    throw error;
  }

  const start = parseOptionalDate(startDate, "Start date");
  const end = parseOptionalDate(endDate, "End date");

  if (start && end && end <= start) {
    const error = new Error("End date must be later than start date");
    error.status = 400;
    throw error;
  }
};

const activeDateFilter = (now = new Date()) => ({
  $and: [
    {
      $or: [
        { startDate: null },
        { startDate: { $exists: false } },
        { startDate: { $lte: now } },
      ],
    },
    {
      $or: [
        { endDate: null },
        { endDate: { $exists: false } },
        { endDate: { $gte: now } },
      ],
    },
  ],
});

// PUBLIC: GET /api/banners?placement=home_main
export const getPublicBanners = async (req, res, next) => {
  try {
    const { placement } = req.query;

    if (placement && !VALID_PLACEMENTS.includes(placement)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner placement",
      });
    }

    const filter = {
      isActive: true,
      ...activeDateFilter(),
    };

    if (placement) filter.placement = placement;

    const banners = await Banner.find(filter)
      .select("-__v")
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: banners.length,
      banners,
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: GET /api/banners/admin
export const getAllBanners = async (req, res, next) => {
  try {
    const { placement, status } = req.query;
    const filter = {};

    if (placement) {
      if (!VALID_PLACEMENTS.includes(placement)) {
        return res.status(400).json({ success: false, message: "Invalid placement" });
      }
      filter.placement = placement;
    }

    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    const banners = await Banner.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: banners.length,
      banners,
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: POST /api/banners/admin
// multipart/form-data: image (required), mobileImage (optional), plus banner fields.
export const createBanner = async (req, res, next) => {
  let uploadedMain;
  let uploadedMobile;

  try {
    validateBannerInput(req.body, { creating: true });

    if (!req.files?.image?.[0]) {
      return res.status(400).json({
        success: false,
        message: "Main banner image is required",
      });
    }

    uploadedMain = await uploadToCloudinary(
      req.files.image[0].buffer,
      "odikart/banners"
    );

    if (req.files?.mobileImage?.[0]) {
      uploadedMobile = await uploadToCloudinary(
        req.files.mobileImage[0].buffer,
        "odikart/banners/mobile"
      );
    }

    const banner = await Banner.create({
      title: String(req.body.title).trim(),
      subtitle: req.body.subtitle || "",
      image: {
        url: uploadedMain.secure_url,
        publicId: uploadedMain.public_id,
      },
      mobileImage: uploadedMobile
        ? {
            url: uploadedMobile.secure_url,
            publicId: uploadedMobile.public_id,
          }
        : { url: "", publicId: "" },
      buttonText: req.body.buttonText || "Shop Now",
      placement: req.body.placement || "home_main",
      redirectType: req.body.redirectType || "none",
      redirectId: req.body.redirectId || "",
      redirectUrl: req.body.redirectUrl || "",
      startDate: parseOptionalDate(req.body.startDate, "Start date"),
      endDate: parseOptionalDate(req.body.endDate, "End date"),
      priority: Number(req.body.priority || 0),
      isActive: parseBoolean(req.body.isActive, true),
    });

    return res.status(201).json({
      success: true,
      message: "Banner created successfully",
      banner,
    });
  } catch (error) {
    if (uploadedMain?.public_id) await deleteCloudinaryImage(uploadedMain.public_id);
    if (uploadedMobile?.public_id) await deleteCloudinaryImage(uploadedMobile.public_id);
    next(error);
  }
};

// ADMIN: PUT /api/banners/admin/:id
export const updateBanner = async (req, res, next) => {
  let newMain;
  let newMobile;

  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid banner ID" });
    }

    validateBannerInput(req.body);

    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    if (req.files?.image?.[0]) {
      newMain = await uploadToCloudinary(
        req.files.image[0].buffer,
        "odikart/banners"
      );
    }

    if (req.files?.mobileImage?.[0]) {
      newMobile = await uploadToCloudinary(
        req.files.mobileImage[0].buffer,
        "odikart/banners/mobile"
      );
    }

    const oldMainId = banner.image?.publicId;
    const oldMobileId = banner.mobileImage?.publicId;

    const textFields = [
      "title",
      "subtitle",
      "buttonText",
      "placement",
      "redirectType",
      "redirectId",
      "redirectUrl",
    ];

    for (const field of textFields) {
      if (req.body[field] !== undefined) banner[field] = req.body[field];
    }

    if (req.body.priority !== undefined) {
      banner.priority = Number(req.body.priority);
    }

    if (req.body.isActive !== undefined) {
      banner.isActive = parseBoolean(req.body.isActive, banner.isActive);
    }

    if (req.body.startDate !== undefined) {
      banner.startDate = parseOptionalDate(req.body.startDate, "Start date");
    }

    if (req.body.endDate !== undefined) {
      banner.endDate = parseOptionalDate(req.body.endDate, "End date");
    }

    if (newMain) {
      banner.image = {
        url: newMain.secure_url,
        publicId: newMain.public_id,
      };
    }

    if (newMobile) {
      banner.mobileImage = {
        url: newMobile.secure_url,
        publicId: newMobile.public_id,
      };
    }

    await banner.save();

    if (newMain && oldMainId) await deleteCloudinaryImage(oldMainId);
    if (newMobile && oldMobileId) await deleteCloudinaryImage(oldMobileId);

    return res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      banner,
    });
  } catch (error) {
    if (newMain?.public_id) await deleteCloudinaryImage(newMain.public_id);
    if (newMobile?.public_id) await deleteCloudinaryImage(newMobile.public_id);
    next(error);
  }
};

// ADMIN: PATCH /api/banners/admin/:id/status
export const updateBannerStatus = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid banner ID" });
    }

    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      { isActive: parseBoolean(req.body.isActive, false) },
      { new: true, runValidators: true }
    );

    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Banner status updated",
      banner,
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: PATCH /api/banners/admin/reorder
// Body: { "items": [{ "id": "...", "priority": 10 }, ...] }
export const reorderBanners = async (req, res, next) => {
  try {
    const items = req.body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "items must be a non-empty array",
      });
    }

    const operations = [];

    for (const item of items) {
      if (!isValidObjectId(item.id) || !Number.isFinite(Number(item.priority))) {
        return res.status(400).json({
          success: false,
          message: "Each item needs a valid id and numeric priority",
        });
      }

      operations.push({
        updateOne: {
          filter: { _id: item.id },
          update: { $set: { priority: Number(item.priority) } },
        },
      });
    }

    const result = await Banner.bulkWrite(operations);

    return res.status(200).json({
      success: true,
      message: "Banner order updated",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: DELETE /api/banners/admin/:id
export const deleteBanner = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid banner ID" });
    }

    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    await banner.deleteOne();

    await Promise.all([
      deleteCloudinaryImage(banner.image?.publicId),
      deleteCloudinaryImage(banner.mobileImage?.publicId),
    ]);

    return res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// PUBLIC: POST /api/banners/:id/click
export const trackBannerClick = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid banner ID" });
    }

    const banner = await Banner.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { $inc: { clicks: 1 } },
      { new: true }
    ).select("_id clicks");

    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    return res.status(200).json({ success: true, clicks: banner.clicks });
  } catch (error) {
    next(error);
  }
};

// PUBLIC: POST /api/banners/:id/impression
export const trackBannerImpression = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid banner ID" });
    }

    await Banner.updateOne(
      { _id: req.params.id, isActive: true },
      { $inc: { impressions: 1 } }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};