import mongoose from "mongoose";
import Brand from "../models/Brand.js";
import Category from "../models/Category.js";


/* =====================================
   CREATE BRAND
   POST /api/brands
===================================== */

export const createBrand = async (req, res) => {
  try {

    const {
      name,
      category,
      subCategory,
      description,
      logo,
      banner,
      website,
      country,
      email,
      phone,
      featured
    } = req.body;


    /* =====================================
       REQUIRED FIELDS
    ===================================== */

    if (!name || !category || !subCategory) {
      return res.status(400).json({
        success: false,
        message:
          "Name, category and subcategory are required"
      });
    }


    /* =====================================
       VALIDATE IDS
    ===================================== */

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID"
      });
    }


    if (!mongoose.Types.ObjectId.isValid(subCategory)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID"
      });
    }


    /* =====================================
       VERIFY CATEGORY
    ===================================== */

    const parentCategory =
      await Category.findOne({
        _id: category,
        parentCategory: null,
        isActive: true
      });


    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }


    /* =====================================
       VERIFY SUBCATEGORY
    ===================================== */

    const childCategory =
      await Category.findOne({
        _id: subCategory,
        parentCategory: category,
        isActive: true
      });


    if (!childCategory) {
      return res.status(400).json({
        success: false,
        message:
          "Subcategory does not belong to selected category"
      });
    }


    /* =====================================
       CREATE BRAND
    ===================================== */

    const brand = await Brand.create({

      name: name.trim(),

      category,

      subCategory,

      description: description || "",

      logo: logo || "",

      banner: banner || "",

      website: website || "",

      country: country || "",

      email: email || "",

      phone: phone || "",

      featured: featured || false

    });


    return res.status(201).json({

      success: true,

      message:
        "Brand created successfully",

      brand

    });


  } catch (error) {

    console.error(
      "Create Brand Error:",
      error
    );


    if (error.code === 11000) {

      return res.status(409).json({

        success: false,

        message:
          "Brand name or slug already exists"

      });

    }


    return res.status(500).json({

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

/* =====================================
   GET BRANDS BY SUBCATEGORY
   GET /api/brands/subcategory/:subCategoryId
===================================== */

export const getBrandsBySubCategory = async (
  req,
  res
) => {

  try {

    const { subCategoryId } =
      req.params;


    /* =====================================
       VALIDATE ID
    ===================================== */

    if (
      !mongoose.Types.ObjectId.isValid(
        subCategoryId
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid subcategory ID"

      });

    }


    /* =====================================
       VERIFY SUBCATEGORY
    ===================================== */

    const subCategory =
      await Category.findOne({

        _id: subCategoryId,

        parentCategory: {
          $ne: null
        },

        isActive: true

      });


    if (!subCategory) {

      return res.status(404).json({

        success: false,

        message:
          "Subcategory not found"

      });

    }


    /* =====================================
       GET BRANDS
    ===================================== */

    const brands =
      await Brand.find({

        subCategory: subCategoryId,

        isActive: true

      })
      .sort({
        name: 1
      })
      .lean();


    return res.status(200).json({

      success: true,

      count: brands.length,

      subCategory,

      brands

    });


  } catch (error) {

    console.error(
      "Get Brands By Subcategory Error:",
      error
    );


    return res.status(500).json({

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