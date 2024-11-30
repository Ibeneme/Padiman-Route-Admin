// routes/usertypes.js
const express = require("express");
const jwt = require("jsonwebtoken");
const OTP = require("../../models/otp");
const router = express.Router();
const userTypes = require("../../models/userTypes");
// Environment variables (replace with actual values)
const JWT_SECRET = "your_jwt_secret";
const JWT_REFRESH_SECRET = "your_refresh_secret";
const OTP_EXPIRATION = 300000; // 5 minutes in milliseconds
const argon2 = require("argon2");
const { default: mongoose } = require("mongoose");

// Helper function to send OTP (mock implementation)
const sendOTP = (phone_number, otp) => {
  console.log(`Sending OTP ${otp} to ${phone_number}`);
  // Replace this with a real SMS service
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

  console.log(
    first_name,
    last_name,
    phone_number,
    email,
    password,
    referral_code,
    "hhd"
  );
  try {
    // Check if user exists
    const existingUser = await userTypes.findOne({
      $or: [
        { phone_number },
        // , { email }
      ],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: true, message: "User already exists." });
    }

    console.log(existingUser, "existingUser");

    // Hash password
    // Hash the password

    // Hash password
    const trimmedPassword = password.trim();

    // Hash password
    const hashedPassword = await argon2.hash(trimmedPassword);
    console.log(hashedPassword, "hashedPassword");

    // Create new user
    const newUser = new userTypes({
      first_name,
      last_name,
      phone_number,
      email,
      password: hashedPassword,
      referredBy: referral_code,
    });

    await newUser.save();
    console.log(newUser, "newUser");
    // Generate OTP and save to the OTP model
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpEntry = new OTP({ phone_number, otp });
    await otpEntry.save();

    // Send OTP to phone number
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
  console.log(phone_number, otp, "phone_number, otp");

  try {
    // Step 1: Find OTP entry by phone number
    const otpEntry = await OTP.findOne({ phone_number });

    // Step 2: Check if OTP entry exists and matches the provided OTP
    if (!otpEntry || otpEntry.otp !== otp) {
      return res.status(400).json({ error: true, message: "Invalid OTP." });
    }

    // Step 3: OTP is valid, so delete OTP entry from the database
    await OTP.deleteOne({ phone_number });
    console.log("OTP verified");

    // Step 4: Find the user by phone number (you can modify this part to your user model)
    const user = await userTypes.findOne({ phone_number });
    console.log(user, "useruser");
    // Step 5: Check if the user exists, then update their 'is_verified' field
    if (!user) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    // Step 6: Update the user's 'is_verified' field to true
    user.is_verified = true;
    await user.save(); // Save the updated user record

    console.log("User is_verified set to true");

    // Step 7: Respond with a success message
    return res.status(200).json({
      success: true,
      message: "OTP verified and user verified successfully.",
    });
  } catch (error) {
    console.error("Error in verify-otp:", error.message);
    return res.status(500).json({ error: true, message: error.message });
  }
});

// Resend OTP
router.post("/resend-otp", async (req, res) => {
  const { phone_number } = req.body;
  console.log(phone_number, "phone_number");
  try {
    // Generate a new 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Log the generated OTP for debugging purposes
    console.log(otp, "Generated OTP");

    // Find an existing OTP entry or create a new one for the given phone number
    const otpEntry = await OTP.findOneAndUpdate(
      { phone_number }, // Match the phone number
      { otp, created_at: new Date() }, // Update OTP and creation time
      { upsert: true, new: true } // Create a new document if one doesn't exist, and return the updated document
    );

    // Send the OTP to the provided phone number (ensure `sendOTP` is implemented properly)
    sendOTP(phone_number, otp);

    // Respond with a success message
    return res
      .status(200)
      .json({ success: true, message: "OTP resent successfully." });
  } catch (error) {
    // Handle errors and respond with an error message
    console.error(error.message, "Error in resending OTP");
    return res.status(500).json({ error: true, message: error.message });
  }
});

// Login
// Login
router.post("/login", async (req, res) => {
  const { phone_number, password } = req.body;

  console.log("Received login request with phone number:", password);

  try {
    // Find the user by phone number
    const user = await userTypes.findOne({ phone_number });
    if (!user) {
      console.log("User not found with phone number:", phone_number);
      return res.status(404).json({ error: true, message: "User not found." });
    }

    console.log("Found user:", user);

    // Verify password
    const isPasswordValid = password === user.password;
    //await argon2.verify(user.password, password); // Use user.password here
    console.log("Password comparison result:", isPasswordValid);

    if (!isPasswordValid) {
      console.log("Invalid password for user:", phone_number);
      return res
        .status(400)
        .json({ error: true, message: "Invalid password." });
    }

    // Generate JWT tokens if password is valid
    console.log(
      "Password is valid. Generating JWT tokens for user:",
      phone_number
    );
    const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "15m", // Access token expiry time
    });
    console.log("Generated access token:", accessToken);

    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, {
      expiresIn: "7d", // Refresh token expiry time
    });
    console.log("Generated refresh token:", refreshToken);

    return res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: user,
    });
  } catch (error) {
    console.error("Error during login:", error.message);
    return res.status(500).json({ error: true, message: error.message });
  }
});

// Change Password (Step 1: Send OTP)
router.post("/change-password", async (req, res) => {
  const { phone_number } = req.body;
  console.log(phone_number, "phone_number");

  try {
    // Check if a user exists with the provided phone number
    const user = await userTypes.findOne({ phone_number });
    if (!user) {
      return res.status(404).json({
        error: true,
        message: "User with this phone number not found.",
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP in the database
    await OTP.findOneAndUpdate(
      { phone_number },
      { otp, created_at: new Date() },
      { upsert: true, new: true }
    );

    // Send OTP
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
  console.log(phone_number, new_password);

  try {
    // Validate the input
    if (!phone_number || !new_password) {
      return res.status(400).json({
        error: true,
        message: "Phone number and new password are required.",
      });
    }

    // Check if the user exists
    const user = await userTypes.findOne({ phone_number });
    if (!user) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    // Hash the new password
    //const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update the user's password
    await userTypes.findOneAndUpdate(
      { phone_number },
      { password: new_password }
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
    // Find the user by their ID and exclude the password field
    const user = await userTypes.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

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

    // Find
    console.log(userId, "userId"); // the user by ID and exclude the password field
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

// Route to update user details by ID
router.put("/user/:id", async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, phone_number, email } = req.body;

  // Debug: Log incoming data to ensure it's correctly received
  console.log(first_name, last_name, phone_number, email, id, "first_name, last_name, phone_number, email");


  try {
    // Validate if the provided user ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: true, message: "Invalid user ID." });
    }

    // Check if the user exists
    const user = await userTypes.findById(id);
    console.log(user, "userDetails");

    if (!user) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    // Check if the phone number or email already exists for another user
    const existingUser = await userTypes.findOne({
      $or: [{ phone_number }, { email }],
      _id: { $ne: id }, // Exclude the current user
    });
    console.log(existingUser, "existingUser");

    if (existingUser) {
      return res.status(400).json({
        error: true,
        message: "Phone number or email already in use.",
      });
    }

    // Debug: Check user fields before updating
    console.log("Before update:", user);

    // Update user details with new values from request body
    user.first_name = first_name;
    user.last_name = last_name;
    user.phone_number = phone_number;
    user.email = email;

    // Save the updated user
    const updatedUser = await user.save();  // Ensure `await` is used here to save the user

    // Debug: Check updated user after save
    console.log("Updated user:", updatedUser);

    // Send response with updated user data
    res.status(200).json({
      success: true,
      message: "User details updated successfully.",
      user: updatedUser,  // Return updated user object in the response
    });
  } catch (error) {
    console.error("Error updating user details:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});


module.exports = router;
