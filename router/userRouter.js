const express = require("express");
const User = require("../models/users");
const router = express.Router();
// Assuming the User model is in a 'models' directory

router.get("/users", async (req, res) => {
  try {
    const users = await User.find().sort({ updated_at: 1 }); // Sort users by updated_at in ascending order (oldest first)
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/users/:email", async (req, res) => {
  try {
    // Extract the email from request params
    const { email } = req.params;

    // Check if the user already exists
    let existingUser = await User.findOne({ email });

    // If user already exists, return the user's id
    // If user already exists, return the user object with fullName, email, and other properties
    if (existingUser) {
      // If fullName is provided in the request body, update it in the existing user object
      if (req.body.fullName) {
        existingUser.fullName = req.body.fullName;
      }
      // Save the updated user object
      await existingUser.save();
      // Return the entire user object
      return res.status(200).json(existingUser);
    }

    // If it's a new user, create a new user with email and fullName
    const newUser = new User({
      email,
      fullName: req.body.fullName || "", // Use fullName if provided, otherwise use an empty string
    });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
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


router.post("/users/token", authenticateToken, async (req, res) => {
  try {
    // Extract the user ID from the token
    const { userId } = req;

    // Find the user by their ID
    let user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Respond with the user details
    res.status(200).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/put/:userId/", async (req, res) => {
  const userId = req.params.userId;

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update seen status to true
    user.seen = true;

    // Save the updated user
    await user.save();

    return res
      .status(200)
      .json({ message: "User seen status updated successfully" });
  } catch (error) {
    console.error("Error updating user seen status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/users", async (req, res) => {
  try {
    // Delete all users
    await User.deleteMany({});
    res.status(200).json({ message: "All users deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
