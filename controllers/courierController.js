import Courier from "../models/Courier.js";

/* =====================================
   CREATE COURIER
===================================== */

export const createCourier = async (req, res) => {
  try {

const {
  name,
  code,
  logo,
  description,
  website,
  email,
  phone,
  customerCareNumber,
  trackingUrl,
  apiBaseUrl,
  apiKey,
  estimatedDeliveryDays,
  supportsCOD,
  supportsReturn,
  supportsInternational,
  serviceAreas,
  baseCharge,
  pricePerKg,
  codCharge,
  documents,
  verification,
  featured,
  isActive,
} = req.body;
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Name and code are required",
      });
    }

    const exists = await Courier.findOne({
      $or: [
        { name },
        { code },
      ],
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Courier already exists",
      });
    }

  const courier = await Courier.create({
  name,
  code,
  logo,
  description,
  website,
  email,
  phone,
  customerCareNumber,
  trackingUrl,
  apiBaseUrl,
  apiKey,
  estimatedDeliveryDays,
  supportsCOD,
  supportsReturn,
  supportsInternational,
  serviceAreas,
  baseCharge,
  pricePerKg,
  codCharge,
  documents,
  verification,
  featured,
  isActive,
});

    res.status(201).json({
      success: true,
      message: "Courier created successfully",
      courier,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

/* =====================================
   GET ALL COURIERS
===================================== */

export const getCouriers = async (req, res) => {
  try {

    const couriers = await Courier.find()
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: couriers.length,
      couriers,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

/* =====================================
   GET SINGLE COURIER
===================================== */

export const getCourierById = async (req, res) => {
  try {

    const courier = await Courier.findById(req.params.id);

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    res.status(200).json({
      success: true,
      courier,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

/* =====================================
   UPDATE COURIER
===================================== */

export const updateCourier = async (req, res) => {
  try {

    const courier = await Courier.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Courier updated successfully",
      courier,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

/* =====================================
   DELETE COURIER (SOFT DELETE)
===================================== */

export const deleteCourier = async (req, res) => {
  try {

    const courier = await Courier.findById(req.params.id);

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    courier.isActive = false;

    await courier.save();

    res.status(200).json({
      success: true,
      message: "Courier disabled successfully",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

/* =====================================
   ENABLE COURIER
===================================== */

export const enableCourier = async (req, res) => {
  try {

    const courier = await Courier.findById(req.params.id);

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    courier.isActive = true;

    await courier.save();

    res.status(200).json({
      success: true,
      message: "Courier enabled successfully",
      courier,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};