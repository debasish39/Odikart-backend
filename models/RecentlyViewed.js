import mongoose from "mongoose";

/* =====================================
   RECENTLY VIEWED PRODUCT SCHEMA
===================================== */

const recentlyViewedSchema = new mongoose.Schema(
  {
    /* =====================================
       VISITOR ID
    ===================================== */

    /*
      This comes from the browser cookie.

      Example:
      recentVisitorId = "abc123xyz..."

      Authentication is NOT required.
    */

    visitorId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    /* =====================================
       PRODUCT
    ===================================== */

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    /* =====================================
       LAST VIEWED TIME
    ===================================== */

    viewedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },

  {
    timestamps: true,
  }
);

/* =====================================
   UNIQUE VISITOR + PRODUCT
===================================== */

/*
  One browser/visitor should have only
  one record for each product.

  If the visitor views the same product
  again, viewedAt is updated.
*/

recentlyViewedSchema.index(
  {
    visitorId: 1,
    product: 1,
  },
  {
    unique: true,
  }
);

/* =====================================
   FAST RECENTLY VIEWED QUERY
===================================== */

/*
  Makes this query fast:

  Find all products viewed by a visitor
  and sort them by newest view first.
*/

recentlyViewedSchema.index({
  visitorId: 1,
  viewedAt: -1,
});

/* =====================================
   MODEL
===================================== */

const RecentlyViewed = mongoose.model(
  "RecentlyViewed",
  recentlyViewedSchema
);

export default RecentlyViewed;