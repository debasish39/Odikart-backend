import mongoose from "mongoose";
import Category from "../models/Category.js";

/* =====================================
   CREATE CATEGORY / SUBCATEGORY
===================================== */

export const createCategory = async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      icon,
      parentCategory,
      featured,
      displayOrder,
    } = req.body;

    /* =====================================
       VALIDATION
    ===================================== */

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    /* =====================================
       PARENT CATEGORY VALIDATION
    ===================================== */

    if (parentCategory) {
      if (!mongoose.Types.ObjectId.isValid(parentCategory)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent category ID",
        });
      }

      const parent = await Category.findOne({
        _id: parentCategory,
        isActive: true,
      });

      if (!parent) {
        return res.status(404).json({
          success: false,
          message: "Parent category not found",
        });
      }

      /*
       Prevent creating a subcategory
       under another subcategory.
      */

      if (parent.parentCategory) {
        return res.status(400).json({
          success: false,
          message:
            "A subcategory cannot have another subcategory as its parent",
        });
      }
    }

    /* =====================================
       DUPLICATE NAME CHECK
    ===================================== */

    const existingCategory = await Category.findOne({
      name: name.trim(),
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    /* =====================================
       CREATE
    ===================================== */

    const category = await Category.create({
      name: name.trim(),
      description: description || "",
      image: image || "",
      icon: icon || "",
      parentCategory: parentCategory || null,
      featured: featured || false,
      displayOrder: displayOrder || 0,
    });

    return res.status(201).json({
      success: true,
      message: parentCategory
        ? "Subcategory created successfully"
        : "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Create Category Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category name or slug already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =====================================
   GET ALL PARENT CATEGORIES
===================================== */

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      parentCategory: null,
      isActive: true,
    })
      .sort({
        displayOrder: 1,
        name: 1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Get Categories Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =====================================
   GET SUBCATEGORIES
===================================== */

export const getSubCategories = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const parentCategory = await Category.findOne({
      _id: categoryId,
      parentCategory: null,
      isActive: true,
    });

    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        message: "Parent category not found",
      });
    }

    const subCategories = await Category.find({
      parentCategory: categoryId,
      isActive: true,
    })
      .sort({
        displayOrder: 1,
        name: 1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: subCategories.length,
      category: parentCategory,
      subCategories,
    });
  } catch (error) {
    console.error(
      "Get Subcategories Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =====================================
   GET ALL CATEGORIES + SUBCATEGORIES
   ADMIN
===================================== */

export const getCategoryTree = async (req, res) => {
  try {
   const categories = await Category.find()
  .sort({
    displayOrder: 1,
    createdAt: -1,
  })
  .lean();
    const parents = categories.filter(
      (category) =>
        !category.parentCategory
    );

    const tree = parents.map((parent) => ({
      ...parent,

      subCategories: categories.filter(
        (category) =>
          category.parentCategory &&
          category.parentCategory.toString() ===
            parent._id.toString()
      ),
    }));

    return res.status(200).json({
      success: true,
      categories: tree,
    });
  } catch (error) {
    console.error(
      "Get Category Tree Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =====================================
   GET CATEGORY BY ID
===================================== */

export const getCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category =
      await Category.findById(id).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const subCategories =
      await Category.find({
        parentCategory: id,
        isActive: true,
      })
        .sort({
          displayOrder: 1,
          name: 1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      category,
      subCategories,
    });
  } catch (error) {
    console.error(
      "Get Category Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =====================================
   UPDATE CATEGORY
===================================== */

export const updateCategory = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category =
      await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const {
      name,
      description,
      image,
      icon,
      featured,
      displayOrder,
      isActive,
    } = req.body;

    if (name !== undefined) {
      const existing =
        await Category.findOne({
          name: name.trim(),
          _id: { $ne: id },
        });

      if (existing) {
        return res.status(409).json({
          success: false,
          message:
            "Another category with this name already exists",
        });
      }

      category.name = name.trim();
    }

    if (description !== undefined)
      category.description = description;

    if (image !== undefined)
      category.image = image;

    if (icon !== undefined)
      category.icon = icon;

    if (featured !== undefined)
      category.featured = featured;

    if (displayOrder !== undefined)
      category.displayOrder = displayOrder;

    if (isActive !== undefined)
      category.isActive = isActive;

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error(
      "Update Category Error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Category name or slug already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =====================================
   DELETE CATEGORY
===================================== */

export const deleteCategory = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category =
      await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    /* =====================================
       CHECK SUBCATEGORIES
    ===================================== */

    const subCategoryCount =
      await Category.countDocuments({
        parentCategory: id,
        isActive: true,
      });

    if (subCategoryCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete category. Delete or deactivate its subcategories first.",
      });
    }

    /* =====================================
       SOFT DELETE
    ===================================== */

    category.isActive = false;

    await category.save();

    return res.status(200).json({
      success: true,
      message:
        "Category deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Category Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =====================================
   SEARCH CATEGORY
===================================== */

export const searchCategory = async (
  req,
  res
) => {
  try {
    const keyword =
      req.query.keyword?.trim() || "";

    const categories =
      await Category.find({
        name: {
          $regex: keyword,
          $options: "i",
        },

        isActive: true,
      })
        .sort({
          displayOrder: 1,
          name: 1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error(
      "Search Category Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};