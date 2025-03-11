const express = require("express");
const Driver = require("../../models/driver");
const userTypes = require("../../models/userTypes");
const router = express.Router();


// Create a new driver

router.post("/create", async (req, res) => {
  try {
    console.log("Request Body:", req.body); // Debugging: Log the incoming data

    // Fetch average rating for the driver using userId
    const user = await userTypes.findOne({ _id: req.body.userId });

    if (!user) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    const average_driver_rating = user.average_rating || 0; // Default to 0 if no rating exists

    const newDriver = new Driver({
      ...req.body,
      average_driver_rating,
    });

    // Validate before saving (optional, depending on your Mongoose schema setup)
    const validationError = newDriver.validateSync();
    if (validationError) {
      console.error("Validation Error:", validationError.errors);
      return res.status(400).json({ success: false, error: validationError.message });
    }

    // Save the new driver to the database
    const savedDriver = await newDriver.save();
    console.log("Saved Driver:", savedDriver); // Debugging: Log the saved document

    res.status(201).json({ success: true, data: savedDriver });
  } catch (error) {
    console.error("Error Saving Driver:", error.message); // Debugging: Log the error
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Update an existing driver
router.put("/update/:id", async (req, res) => {
  try {
    const updatedDriver = await Driver.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedDriver) {
      return res.status(404).json({ success: false, error: "Driver not found" });
    }
    res.status(200).json({ success: true, data: updatedDriver });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Delete a driver
router.delete("/delete/:id", async (req, res) => {
  try {
    const deletedDriver = await Driver.findByIdAndDelete(req.params.id);
    if (!deletedDriver) {
      return res.status(404).json({ success: false, error: "Driver not found" });
    }
    res.status(200).json({ success: true, message: "Driver deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Get all drivers
router.get("/getAll", async (req, res) => {
  try {
    const drivers = await Driver.find();
    res.status(200).json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Get a specific driver by ID
router.get("/get/:id", async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, error: "Driver not found" });
    }
    res.status(200).json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Get all drivers by userId
router.get("/getByUserId/:userId", async (req, res) => {
  try {
    console.log("jjj");
    const drivers = await Driver.find({ userId: req.params.userId });
    if (!drivers || drivers.length === 0) {
      return res.status(404).json({ success: false, error: "No drivers found for this user" });
    }
    res.status(200).json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;