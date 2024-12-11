const express = require("express");
const jwt = require("jsonwebtoken");
const OTP = require("../../models/otp");
const router = express.Router();
const userTypes = require("../../models/userTypes");
const bcrypt = require("bcrypt"); // Import bcrypt for hashing
const { default: mongoose } = require("mongoose");
const sendSMS = require('../../utils/sendSMS')

const JWT_SECRET = "your_jwt_secret";
const JWT_REFRESH_SECRET = "your_refresh_secret";
const OTP_EXPIRATION = 1800000; // 5 minutes in milliseconds

const sendOTP = async (phone_number, otp) => {
  console.log(`Sending OTP ${otp} to ${phone_number}`);
  try {
    // Send OTP via SMS
    const response = await sendSMS({
      message: `Your OTP code is ${otp}`,
      phoneNumber: phone_number
    });
    console.log("OTP sent successfully:", response);
  } catch (error) {
    console.error("Error sending OTP:", error);
  }
};


// Register user
router.post("/register", async (req, res) => {
  const {
    first_name,
    last_name,
    phone_number,
    email,
    password,
    referral_code,
  } = req.body;

  try {
    const existingUser = await userTypes.findOne({
      $or: [{ phone_number }],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: true, message: "User already exists." });
    }

    // Hash the password
    const trimmedPassword = password.trim();
    const hashedPassword = await bcrypt.hash(trimmedPassword, 10); // bcrypt.hash(password, saltRounds)

    const newUser = new userTypes({
      first_name,
      last_name,
      phone_number,
      email,
      password: hashedPassword,
      referredBy: referral_code,
    });

    await newUser.save();

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpEntry = new OTP({ phone_number, otp });
    await otpEntry.save();

    sendOTP(phone_number, otp);

    return res
      .status(201)
      .json({ success: true, message: "User registered. OTP sent." });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { phone_number, otp } = req.body;

  try {
    const otpEntry = await OTP.findOne({ phone_number });

    if (!otpEntry || otpEntry.otp !== otp) {
      return res.status(400).json({ error: true, message: "Invalid OTP." });
    }

    await OTP.deleteOne({ phone_number });

    const user = await userTypes.findOne({ phone_number });
    if (!user) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    user.is_verified = true;
    await user.save();

    return res
      .status(200)
      .json({
        success: true,
        message: "OTP verified and user verified successfully.",
      });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

// Resend OTP
router.post("/resend-otp", async (req, res) => {
  const { phone_number } = req.body;

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpEntry = await OTP.findOneAndUpdate(
      { phone_number },
      { otp, created_at: new Date() },
      { upsert: true, new: true }
    );

    sendOTP(phone_number, otp);

    return res
      .status(200)
      .json({ success: true, message: "OTP resent successfully." });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { phone_number, password } = req.body;

  try {
    const user = await userTypes.findOne({ phone_number });
    if (!user) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    // Compare the password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid password." });
    }

    const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: user,
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

// Change Password (Step 1: Send OTP)
router.post("/change-password", async (req, res) => {
  const { phone_number } = req.body;

  try {
    const user = await userTypes.findOne({ phone_number });
    if (!user) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.findOneAndUpdate(
      { phone_number },
      { otp, created_at: new Date() },
      { upsert: true, new: true }
    );

    sendOTP(phone_number, otp);

    return res
      .status(200)
      .json({ success: true, message: "OTP sent for password change." });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

// Change Password (Step 2: Confirm Change)
router.post("/confirm-change-password", async (req, res) => {
  const { phone_number, new_password } = req.body;

  try {
    if (!phone_number || !new_password) {
      return res
        .status(400)
        .json({
          error: true,
          message: "Phone number and new password are required.",
        });
    }

    const user = await userTypes.findOne({ phone_number });
    if (!user) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await userTypes.findOneAndUpdate(
      { phone_number },
      { password: hashedPassword }
    );

    return res
      .status(200)
      .json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

// Route to fetch a user by ID excluding the password
router.get("/user/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const user = await userTypes.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ error: true, message: "Token is required." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: true, message: "Invalid token." });
    }
    req.user = user;
    next();
  });
};

// Route to fetch a user based on the token's user ID (excluding password)
router.get("/user", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await userTypes.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: true, message: "Internal server error" });
  }
});

// Route to update user details by ID
router.put("/user/:id", async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, phone_number, email } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: true, message: "Invalid user ID." });
    }

    const user = await userTypes.findById(id);

    if (!user) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    user.first_name = first_name || user.first_name;
    user.last_name = last_name || user.last_name;
    user.phone_number = phone_number || user.phone_number;
    user.email = email || user.email;

    await user.save();

    res
      .status(200)
      .json({ success: true, message: "User details updated successfully." });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

module.exports = router;
