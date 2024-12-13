const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const adminSchema = require("../../models/adminSchema");
const AdminOtp = require("../../models/AdminOtp");
const { generateOtp, sendOtp } = require("../../utils/otpUtils");

const router = express.Router();

// Environment variables
const JWT_SECRET = "supersecretkey";
const SALT_ROUNDS = 10;

// 1. Create Admin Account
// 1. Create Admin Account
router.post("/create", async (req, res) => {
  const {
    firstName,
    lastName,
    phoneNumber,
    password, // Get raw password from request body
    superAdmin = false,
  } = req.body;

  console.log("Hashed password: ", password); // Log the hashed password

  try {
    // Validate input
    if (!firstName || !lastName || !phoneNumber || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Trim the password
    const trimPassword = password.trim();
    console.log("Hashed password: ", trimPassword); // Log the hashed password

    // Validate trimmed password
    if (!trimPassword) {
      return res.status(400).json({ message: "Password cannot be empty." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(trimPassword, SALT_ROUNDS);
    console.log("Hashed password: ", hashedPassword); // Log the hashed password

    // Create new admin
    const admin = new adminSchema({
      firstName,
      lastName,
      phoneNumber,
      password: hashedPassword,
      superAdmin,
    });

    await admin.save();
    console.log("Admin saved:", admin); // Log the saved admin object
    res
      .status(201)
      .json({
        message: "Admin created successfully",
        admin: admin,
        success: true,
      });
  } catch (error) {
    console.error("Error creating admin account:", error); // Log the error
    res.status(500).json({ message: "Error creating admin account.", error });
  }
});
// 2. Login and Generate Access Token
router.post("/login", async (req, res) => {
  const { phoneNumber, password } = req.body;

  console.log("Hashed password: ", password); // Log the hashed password

  try {
    // Validate inputs
    if (!phoneNumber || !password) {
      return res
        .status(400)
        .json({ message: "Phone number and password are required." });
    }

    // Find admin by phone number
    const admin = await adminSchema.findOne({ phoneNumber });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    console.log("Hashed password: ", admin); // Log the hashed password

    // Compare the hashed password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    console.log("Password comparison result:", isPasswordValid); // Log the comparison result
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Generate a token
    const { firstName = "Unknown", lastName = "Unknown" } = admin;
    const token = jwt.sign(
      {
        id: admin._id,
        superAdmin: admin.superAdmin,
        phoneNumber: admin.phoneNumber,
        firstName,
        lastName,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Respond with token and user data
    res.status(200).json({
      token,
      user: {
        id: admin._id,
        phoneNumber: admin.phoneNumber,
        firstName,
        lastName,
        superAdmin: admin.superAdmin,
      },
    });
  } catch (error) {
    console.log("Login error:", error); // Log any error that happens
    res.status(500).json({ message: "Error during login.", error });
  }
});

// 3. Forgot Password - Send OTP
router.post("/forgot-password", async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const existingAdmin = await adminSchema.findOne({ phoneNumber });
    if (!existingAdmin) {
      return res
        .status(404)
        .json({ message: "Admin not found with this phone number." });
    }

    const otp = generateOtp();
    const existingOtp = await AdminOtp.findOne({ phoneNumber });

    if (existingOtp) {
      existingOtp.otp = otp;
      await existingOtp.save();
    } else {
      await new AdminOtp({ phoneNumber, otp }).save();
    }

    await sendOtp(phoneNumber, otp);
    res.status(200).json({ message: "OTP sent successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error sending OTP.", error });
  }
});

// 4. Validate OTP
router.post("/validate-otp", async (req, res) => {
  const { phoneNumber, otp } = req.body;

  try {
    const adminOtp = await AdminOtp.findOne({ phoneNumber });
    if (!adminOtp || adminOtp.otp !== otp) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    res.status(200).json({ message: "OTP validated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error validating OTP.", error });
  }
});

// 5. Resend OTP
router.post("/resend-otp", async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const otp = generateOtp();
    const existingOtp = await AdminOtp.findOne({ phoneNumber });

    if (existingOtp) {
      existingOtp.otp = otp;
      await existingOtp.save();
    } else {
      await new AdminOtp({ phoneNumber, otp }).save();
    }

    await sendOtp(phoneNumber, otp);
    res.status(200).json({ message: "OTP resent successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error resending OTP.", error });
  }
});

// 6. Update Password
router.put("/update-password", async (req, res) => {
  const { phoneNumber, newPassword } = req.body;

  try {
    if (!phoneNumber || !newPassword) {
      return res
        .status(400)
        .json({ message: "Phone number and new password are required." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const admin = await adminSchema.findOneAndUpdate(
      { phoneNumber },
      { password: hashedPassword },
      { new: true }
    );

    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    res
      .status(200)
      .json({ message: "Password updated successfully.", success: true });
  } catch (error) {
    res.status(500).json({ message: "Error updating password.", error });
  }
});

module.exports = router;
