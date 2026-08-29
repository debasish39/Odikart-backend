import Razorpay from "razorpay";
import dotenv from "dotenv";
dotenv.config();
const razorpay = new Razorpay({

  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET

});
console.log(process.env.RAZORPAY_KEY_ID);
console.log(process.env.RAZORPAY_SECRET);
console.log("ORDERS:", !!razorpay.orders); console.log( "CREATE:", typeof razorpay.orders?.create ); console.log("===================================");
export default razorpay;
