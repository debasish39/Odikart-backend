import mongoose from "mongoose";

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["android"],
      default: "android",
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

deviceTokenSchema.index({ userId: 1, platform: 1 });

export default mongoose.models.DeviceToken ||
  mongoose.model("DeviceToken", deviceTokenSchema);