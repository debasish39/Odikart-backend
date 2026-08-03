import Brand from "../models/Brand.js";
// POST /api/brands
export const createBrand = async (req, res) => {
  try {

    const {
      name,
      category,
      description,
      logo,
      banner,
      website,
      country,
      email,
      phone,
      featured
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: "Name and category are required"
      });
    }

    const brand = await Brand.create({
      name,
      category,
      description,
      logo,
      banner,
      website,
      country,
      email,
      phone,
      featured
    });

    res.status(201).json({
      success: true,
      message: "Brand created successfully",
      brand
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

// GET /api/brands
export const getBrands = async (req, res) => {

  try {

    const brands = await Brand.find()
      .populate("category")
      .sort({ name: 1 });

    res.json({
      success: true,
      brands
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};
// GET /api/brands/:id
export const getBrandById = async (req, res) => {

  try {

    const brand = await Brand.findById(req.params.id)
      .populate("category");

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found"
      });
    }

    res.json({
      success: true,
      brand
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};
// PUT /api/brands/:id
export const updateBrand = async (req, res) => {

  try {

    const brand = await Brand.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      message: "Brand updated",
      brand
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};
// DELETE /api/brands/:id
export const deleteBrand = async (req, res) => {

  try {

    await Brand.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Brand deleted"
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};
// GET /api/brands/category/:categoryId
export const getBrandsByCategory = async (req, res) => {

  try {

    const brands = await Brand.find({
      category: req.params.categoryId,
      isActive: true
    });

    res.json({
      success: true,
      brands
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};