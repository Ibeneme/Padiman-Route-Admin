// routes/usertypes.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const OTP = require("../../models/otp");
const router = express.Router();
const userTypes = require("../../models/userTypes");
// Environment variables (replace with actual values)
const JWT_SECRET = "your_jwt_secret";
const JWT_REFRESH_SECRET = "your_refresh_secret";
const OTP_EXPIRATION = 300000; // 5 minutes in milliseconds
const argon2 = require("argon2");

// Helper function to send OTP (mock implementation)
const sendOTP = (phone_number, otp) => {
  console.log(`Sending OTP ${otp} to ${phone_number}`);
  // Replace this with a real SMS service
};

// Register user

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Extract token from Authorization header

  if (!token) {
    return res.status(403).json({ error: true, message: "Token is required." });
  }

  // Verify the token
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: true, message: "Invalid token." });
    }
    req.user = user; // Attach the user to the request object
    next(); // Proceed to the next middleware or route handler
  });
};

// Route to fetch a user based on the token's user ID (excluding password)
router.get("/user", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId; // The user ID from the token's payload

    // Find the user by ID and exclude the password field
    const user = await userTypes.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
});

module.exports = router;
