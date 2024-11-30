const mongoose = require("mongoose");

const becomeADriverSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: false,
    },
    lastName: {
      type: String,
      required: false,
    },
    phoneNumber: {
      type: Number,
      required: false,
      match: /^\d{10}$/, // Ensure it's a 10-digit phone number
    },
    licenseNumber: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: String,
      required: true,
    },
    carImages: {
      type: [String], // Array of image URLs
      required: true,
    },
    driverLicense: {
      type: String,
      required: false,
    },
    carVideo: {
      type: String, // URI to the uploaded image (could also be a URL from a cloud storage)
      required: false,
    },
    status: {
      type: String,
      default: "pending", // Set default status to "pending"
    },
    userId: {
      required: true, // userId is compulsory
      type: String,
    },
  },
  { timestamps: true }
);

const BecomeADriver = mongoose.model("BecomeADriver", becomeADriverSchema);

module.exports = BecomeADriver;
