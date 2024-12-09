const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// const { generateOtp, sendOtp } = require("../utils/otpUtils");
const adminSchema = require("../../models/adminSchema");
const AdminOtp = require("../../models/AdminOtp");
const { generateOtp, sendOtp } = require("../../utils/otpUtils");

const router = express.Router();

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// 1. Create an Admin Account
router.post("/create", async (req, res) => {
  const {
    firstName,
    lastName,
    phoneNumber,
    password,
    superAdmin = false,
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new adminSchema({
      firstName,
      lastName,
      phoneNumber,
      password: hashedPassword,
      superAdmin,
    });

    await admin.save();
    res.status(201).json({ message: "Admin account created successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error creating admin account.", error });
  }
});


// 2. Login and Generate Access Token
router.post("/login", async (req, res) => {
  const { phoneNumber, password } = req.body;

  try {
    const admin = await adminSchema.findOne({ phoneNumber });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        superAdmin: admin.superAdmin,
        phoneNumber: admin.phoneNumber,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ token: token, user: admin });
  } catch (error) {
    res.status(500).json({ message: "Error during login.", error });
  }
});

// 3. Forgot Password - Send OTP
// 3. Forgot Password - Send OTP
router.post("/forgot-password", async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    // Check if an admin exists with the given phone number
    const existingAdmin = await adminSchema.findOne({ phoneNumber });

    if (!existingAdmin) {
      return res
        .status(404)
        .json({ message: "Admin not found with this phone number." });
    }

    // Generate OTP
    const otp = generateOtp();

    // Check if an OTP already exists for this phone number
    const existingOtp = await AdminOtp.findOne({ phoneNumber });

    if (existingOtp) {
      existingOtp.otp = otp;
      await existingOtp.save();
    } else {
      await new AdminOtp({ phoneNumber, otp }).save();
    }

    console.log(otp, "otp");
    await sendOtp(phoneNumber, otp); // Sends OTP (functionality abstracted)
    res.status(200).json({ message: "OTP sent successfully." });
  } catch (error) {
    console.error(error);
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
    console.log(otp, "validate");
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
    console.log(otp, "otp");
    await sendOtp(phoneNumber, otp); // Sends OTP
    res.status(200).json({ message: "OTP resent successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error resending OTP.", error });
  }
});

// 6. Update Password
router.put("/update-password", async (req, res) => {
  const { phoneNumber, newPassword } = req.body;

  console.log(phoneNumber, newPassword, "phoneNumber, newPassword ");
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const admin = await adminSchema.findOneAndUpdate(
      { phoneNumber },
      { password: hashedPassword },
      { new: true }
    );
    console.log(admin, "admin");
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
