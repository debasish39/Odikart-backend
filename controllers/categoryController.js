import Category from "../models/Category.js";

/* ===============================
   CREATE CATEGORY
================================ */

export const createCategory = async (req, res) => {

  try {

    const category = await Category.create(req.body);

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });

  } catch (error) {

  console.log(error);

  console.log(error.stack);

  return res.status(500).json({
    success:false,
    message:error.message
  });

}

};

/* ===============================
   GET ALL CATEGORIES
================================ */

export const getCategories = async (req, res) => {

  try {

    const categories = await Category.find({
      isActive: true,
    }).sort({
      displayOrder: 1,
    });

    res.json({
      success: true,
      categories,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

/* ===============================
   GET CATEGORY BY ID
================================ */

export const getCategory = async (req, res) => {

  try {

    const category = await Category.findById(
      req.params.id
    );

    if (!category) {

      return res.status(404).json({
        success: false,
        message: "Category not found",
      });

    }

    res.json({
      success: true,
      category,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

/* ===============================
   UPDATE CATEGORY
================================ */

export const updateCategory = async (req, res) => {

  try {

    const category = await Category.findByIdAndUpdate(

      req.params.id,

      req.body,

      {
        new: true,
        runValidators: true,
      }

    );

    if (!category) {

      return res.status(404).json({
        success: false,
        message: "Category not found",
      });

    }

    res.json({
      success: true,
      message: "Category updated",
      category,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

/* ===============================
   DELETE CATEGORY
================================ */

export const deleteCategory = async (req, res) => {

  try {

    const category = await Category.findById(
      req.params.id
    );

    if (!category) {

      return res.status(404).json({
        success: false,
        message: "Category not found",
      });

    }

    await category.deleteOne();

    res.json({
      success: true,
      message: "Category deleted successfully",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

/* ===============================
   SEARCH CATEGORY
================================ */

export const searchCategory = async (req, res) => {

  try {

    const keyword = req.query.keyword || "";

    const categories = await Category.find({

      name: {
        $regex: keyword,
        $options: "i",
      },

      isActive: true,

    });

    res.json({

      success: true,

      categories,

    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};