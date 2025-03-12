const express = require("express");
const router = express.Router();
const B2 = require("backblaze-b2");
const multer = require("multer");
const userTypes = require("../../models/userTypes");
const BecomeADriver = require("../../models/becomeADriverSchema");
const axios = require("axios"); // Import axios

// Initialize Backblaze B2 with your credentials
const b2 = new B2({
  applicationKeyId: "e8b3c0128769",
  applicationKey: "0058f4534e105eb24f3b135703608c66720edf0beb",
});

// Multer configuration for file upload
const storage = multer.memoryStorage();
//const upload = multer({ storage: storage });
// Original upload for profile image
const uploadProfileImage = multer.memoryStorage();
const upload = multer({ storage: uploadProfileImage });

// Updated declaration for car images upload
const uploadCarImages = multer().array("carImages");
// Profile Image Update Route
router.put(
  "/update-profile/:userId", // Route to update user profile by userId
  upload.single("image"), // Handle single image upload
  async (req, res) => {
    try {
      const { userId } = req.params; // Get userId from the route parameter
      const file = req.file; // Get the uploaded file from form data

      if (!file) {
        return res.status(400).json({ error: "No image uploaded" });
      }

      // Format file name
      const fileName = `users/profile/${Date.now()}_${file.originalname.replace(
        /\s+/g,
        "_"
      )}`;

      // Authorize with Backblaze B2
      await b2.authorize();

      // Get upload URL from Backblaze B2
      const response = await b2.getUploadUrl({
        bucketId: "ce38bb235c0071f288f70619", // Your bucketId
      });

      // Upload the file to Backblaze B2
      const uploadResponse = await b2.uploadFile({
        uploadUrl: response.data.uploadUrl,
        uploadAuthToken: response.data.authorizationToken,
        fileName: fileName,
        data: file.buffer,
      });

      // Construct image URL
      const bucketName = "Clonekraft";
      const uploadedFileName = uploadResponse.data.fileName;
      const imageURL = `https://f005.backblazeb2.com/file/${bucketName}/${uploadedFileName}`;

      // Find user by userId and update the profile image URL
      const user = await userTypes.findOneAndUpdate(
        { _id: userId }, // Find user by userId
        { profile_img_url: imageURL }, // Update the profile image URL
        { new: true } // Return the updated document
      );

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.status(200).json({ message: "Profile updated successfully", user });
    } catch (error) {
      console.error("Error updating profile image:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

const uploadVideo = multer().single("video"); // Define the middleware to handle video upload

// Constants for App ID and Public Key
const APP_ID = "6597f3a4b2cb7c00401d774e";
const PUBLIC_KEY = "prod_sk_GF5VuFFBgwpzB9IWgASu2bGrs";

const BASE_URL = "https://api.dojah.io"; // Replace with the actual base URL

// POST route for Document Analysis (Driver's License)
router.post("/document/analysis", async (req, res) => {
  try {
    // Get the request body
    const { imageFrontSide, imageBackSide, input_type } = req.body;

    // Validate that imageFrontSide is provided
    if (!imageFrontSide) {
      return res.status(400).json({ error: "Front side image is required." });
    }

    // Prepare the payload for the API request
    const payload = {
      input_type,
      imageFrontSide,
      imageBackSide, // Optional
    };

    // Make the API request to Document Analysis
    const response = await axios.post(
      `${BASE_URL}/api/v1/document/analysis`,
      payload,
      {
        headers: {
          AppId: APP_ID,
          Authorization: PUBLIC_KEY,
        },
      }
    );

    console.log(response.data, "response.data");
    // Return the response data from the API
    res.status(200).json(response.data);
  } catch (error) {
    // Handle errors (e.g., network issues, invalid response, etc.)
    console.error("Error during document analysis:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post(
  "/become-a-driver",
  upload.single("video"), // Ensure "video" matches the form field
  async (req, res) => {
    try {
      const { user_id, licenseNumber, dateOfBirth } = req.body;
      const video = req.file; // Assuming a single video file is uploaded

      if (!video) {
        return res.status(400).json({ error: "A video is required." });
      }

      const user = await userTypes.findById(user_id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      user.become_a_driver = true;
      await user.save();

      const videoFileName = `drivers/videos/${Date.now()}_${
        video.originalname
      }`;

      await b2.authorize();

      const response = await b2.getUploadUrl({
        bucketId: "ce38bb235c0071f288f70619", // Your bucket ID
      });

      const videoUploadResponse = await b2.uploadFile({
        uploadUrl: response.data.uploadUrl,
        uploadAuthToken: response.data.authorizationToken,
        fileName: videoFileName,
        data: video.buffer,
      });

      const bucketName = "Clonekraft";
      const uploadedVideoFileName = videoUploadResponse.data.fileName;
      const videoURL = `https://f005.backblazeb2.com/file/${bucketName}/${uploadedVideoFileName}`;

      console.log(videoFileName, uploadedVideoFileName);

      const newDriver = new BecomeADriver({
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        licenseNumber,
        dateOfBirth,
        carVideo: videoURL, // Store video URL
        userId: user_id, // Include userId for reference
      });

      await newDriver.save();

      res
        .status(200)
        .json({ message: "Driver registration successful!", success: true });
    } catch (err) {
      console.error("Error during driver registration:", err);
      res.status(500).json({ error: "Failed to register driver." });
    }
  }
);
// Driver Status Update Route
router.put("/update-driver-status/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    const { status } = req.body; // "accepted" or "rejected"

    if (!status || !["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status. It must be 'accepted' or 'rejected'.",
      });
    }

    // Fetch the driver record
    const driver = await BecomeADriver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ error: "Driver record not found." });
    }

    // Update the driver's status
    driver.status = status;
    await driver.save();

    // Fetch the associated user
    const user = await userTypes.findById(driver.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Handle the changes based on the status
    if (status === "accepted") {
      // If accepted, update user information
      user.become_a_driver = false;
      user.driver_verified = true;
      await user.save();
    } else if (status === "rejected") {
      // If rejected, just update the user's become_a_driver to false
      user.become_a_driver = false;
      await user.save();
    }

    res.status(200).json({ message: "Driver status updated successfully!" });
  } catch (err) {
    console.error("Error updating driver status:", err);
    res.status(500).json({ error: "Failed to update driver status." });
  }
});

module.exports = router;
