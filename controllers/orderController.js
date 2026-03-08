const Order = require("../models/Order");

exports.createOrder = async (req, res) => {

  try {

    const order = new Order(req.body);

    await order.save();

    res.status(201).json({
      success: true,
      message: "Order stored in MongoDB",
      order
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Order creation failed"
    });

  }

};

exports.getOrders = async (req, res) => {

  try {

    const orders = await Order.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      orders
    });

  } catch (error) {

    res.status(500).json({
      success: false
    });

  }

};