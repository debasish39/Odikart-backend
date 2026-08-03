import mongoose from "mongoose";

const courierSchema = new mongoose.Schema(
{
  /* =====================================
     BASIC INFORMATION
  ===================================== */

  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },

  logo: {
    type: String,
    default: "",
  },

  website: {
    type: String,
    default: "",
  },

  trackingUrl: {
    type: String,
    default: "",
  },

  customerCareNumber: {
    type: String,
    default: "",
  },

  email: {
    type: String,
    default: "",
    lowercase: true,
  },

  /* =====================================
     SHIPPING DETAILS
  ===================================== */

  estimatedDeliveryDays: {
    type: Number,
    default: 5,
  },

  supportsCOD: {
    type: Boolean,
    default: true,
  },

  supportsReturn: {
    type: Boolean,
    default: true,
  },

  supportsInternational: {
    type: Boolean,
    default: false,
  },

  /* =====================================
     STATUS
  ===================================== */

  isActive: {
    type: Boolean,
    default: true,
  },
documents: {

  agreement: {
    type: String,
    default: "",
  },

  gstCertificate: {
    type: String,
    default: "",
  },

  panCard: {
    type: String,
    default: "",
  },

  companyRegistrationCertificate: {
    type: String,
    default: "",
  },

  tradeLicense: {
    type: String,
    default: "",
  },

  msmeCertificate: {
    type: String,
    default: "",
  },

  insuranceCertificate: {
    type: String,
    default: "",
  },

  addressProof: {
    type: String,
    default: "",
  },

  cancelledCheque: {
    type: String,
    default: "",
  },

  bankVerificationLetter: {
    type: String,
    default: "",
  },

},
verification: {

  verified: {
    type: Boolean,
    default: false,
  },

  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  verifiedAt: {
    type: Date,
    default: null,
  },
contactPerson: {

  name: String,

  designation: String,

  phone: String,

  email: String,

},
bankDetails: {

  accountHolderName: String,

  bankName: String,

  accountNumber: String,

  ifscCode: String,

  upiId: String,

},
serviceAreas: [
  {
    type: String,
  }
],
},

},
{
  timestamps: true,
});

export default mongoose.model("Courier", courierSchema);