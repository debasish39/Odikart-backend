import express from "express";

import {
  createCourier,
  getCouriers,
  getCourierById,
  updateCourier,
  deleteCourier,
  enableCourier,
} from "../controllers/courierController.js";

const router = express.Router();

router.post("/courier", createCourier);

router.get("/couriers", getCouriers);

router.get("/courier/:id", getCourierById);

router.put("/courier/:id", updateCourier);

router.delete("/courier/:id", deleteCourier);

router.put("/courier/enable/:id", enableCourier);

export default router;