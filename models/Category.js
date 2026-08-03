import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
{
  /* ===========================
     BASIC INFO
  =========================== */

  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  slug: {
    type: String,
    unique: true,
    lowercase: true,
  },

  description: {
    type: String,
    default: "",
  },

  image: {
    type: String,
    default: "",
  },

  icon: {
    type: String,
    default: "",
  },

  /* ===========================
     PARENT CATEGORY
  =========================== */

  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null,
  },

  /* ===========================
     DISPLAY
  =========================== */

  featured: {
    type: Boolean,
    default: false,
  },

  displayOrder: {
    type: Number,
    default: 0,
  },

  /* ===========================
     PRODUCT COUNT
  =========================== */

  productCount: {
    type: Number,
    default: 0,
  },

  /* ===========================
     STATUS
  =========================== */

  isActive: {
    type: Boolean,
    default: true,
  },

},
{
  timestamps: true,
}
);

categorySchema.pre("save", async function () {

  if (this.name) {

    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");

  }

});

export default mongoose.model(
  "Category",
  categorySchema
);