import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    subtitle: {
      type: String,
      default: "",
      trim: true,
      maxlength: 250,
    },
    image: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    mobileImage: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    buttonText: {
      type: String,
      default: "Shop Now",
      trim: true,
      maxlength: 40,
    },
    placement: {
      type: String,
      enum: ["home_main", "daily_deals", "category", "popup"],
      default: "home_main",
      index: true,
    },
    redirectType: {
      type: String,
      enum: ["none", "category", "product", "collection", "url"],
      default: "none",
    },
    redirectId: {
      type: String,
      default: "",
    },
    redirectUrl: {
      type: String,
      default: "",
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    priority: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    impressions: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

bannerSchema.index({ placement: 1, isActive: 1, priority: -1 });

export default mongoose.models.Banner ||
  mongoose.model("Banner", bannerSchema);
