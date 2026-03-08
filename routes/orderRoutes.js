const express = require("express");
const router = express.Router();

const {
  createOrder,
  getOrders
} = require("../controllers/orderController");

router.post("/create", createOrder);

router.get("/", getOrders);

module.exports = router;