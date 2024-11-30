// models/otp.js
const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  phone_number: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  created_at: { type: Date, default: Date.now, expires: 300 }, // Expires in 5 minutes
});

module.exports = mongoose.model("OTP", otpSchema);
