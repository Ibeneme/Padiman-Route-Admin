const crypto = require("crypto");

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

async function sendOtp(phoneNumber, otp) {
  // Simulate sending OTP via SMS (can integrate with actual SMS services like Twilio)
  console.log(`Sending OTP ${otp} to phone number ${phoneNumber}`);
}

module.exports = { generateOtp, sendOtp };