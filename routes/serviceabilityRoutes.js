import express from "express";

import {
  checkProductDeliveryServiceability,
  checkCartServiceability,
} from "../controllers/serviceabilityController.js";


const router = express.Router();


/* =====================================
   SINGLE PRODUCT
===================================== */

router.post(
  "/product",
  checkProductDeliveryServiceability
);


/* =====================================
   ENTIRE CART
===================================== */

router.post(
  "/cart",
  checkCartServiceability
);


export default router;