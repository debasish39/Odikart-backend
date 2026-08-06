import mongoose from "mongoose";
import dotenv from "dotenv";

import Product from "../models/Product.js";
import Category from "../models/Category.js";

dotenv.config();


const migrateProductCategories = async () => {

  try {

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");


    const products = await Product.find({});

    console.log(
      `Found ${products.length} products`
    );


    for (const product of products) {


      let updated = false;


      // Convert category string -> ObjectId

      if (
        typeof product.category === "string"
      ) {

        const category =
          await Category.findOne({
            name: {
              $regex: `^${product.category}$`,
              $options: "i"
            }
          });


        if (category) {

          product.category =
            category._id;

          updated = true;

          console.log(
            `Updated category for ${product.title}`
          );

        } else {

          console.log(
            `Category not found: ${product.category}`
          );

        }

      }



      // Convert subCategory string -> ObjectId

      if (
        typeof product.subCategory === "string"
      ) {


        const subCategory =
          await Category.findOne({
            name:{
              $regex:`^${product.subCategory}$`,
              $options:"i"
            }
          });


        if(subCategory){

          product.subCategory =
            subCategory._id;

          updated = true;


          console.log(
            `Updated subcategory for ${product.title}`
          );

        } else {

          console.log(
            `Subcategory not found: ${product.subCategory}`
          );

        }

      }



      if(updated){

        await product.save();

      }


    }


    console.log(
      "Migration completed successfully"
    );


    process.exit(0);


  } catch(error){

    console.error(
      "Migration error:",
      error
    );

    process.exit(1);

  }

};


migrateProductCategories();