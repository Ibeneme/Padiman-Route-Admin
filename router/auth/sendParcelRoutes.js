const express = require("express");
const SendParcel = require("../../models/SendParcel");
// Correct imports

// Adjust the path as needed
const router = express.Router();

// Create a new parcel
router.post("/", async (req, res) => {
  try {
    const newParcel = new SendParcel(req.body);
    console.log(newParcel, "newParcel");
    const savedParcel = await newParcel.save();
    res.status(201).json({ success: true, data: savedParcel });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all parcels
router.get("/", async (req, res) => {
  try {
    const parcels = await SendParcel.find();
    res.status(200).json({ success: true, data: parcels });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get a parcel by ID
router.get("/:id", async (req, res) => {
  try {
    const parcel = await SendParcel.findById(req.params.id);
    if (!parcel) {
      return res
        .status(404)
        .json({ success: false, message: "Parcel not found" });
    }
    res.status(200).json({ success: true, data: parcel });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get parcels by user ID
router.get("/user/:userId", async (req, res) => {
  try {
    const parcels = await SendParcel.find({ userId: req.params.userId });
    if (!parcels || parcels.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No parcels found for this user" });
    }
    res.status(200).json({ success: true, data: parcels });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// Update a parcel by ID
router.put("/:id", async (req, res) => {
  try {
    const updatedParcel = await SendParcel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedParcel) {
      return res
        .status(404)
        .json({ success: false, message: "Parcel not found" });
    }
    res.status(200).json({ success: true, data: updatedParcel });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a parcel by ID
router.delete("/:id", async (req, res) => {
  try {
    const deletedParcel = await SendParcel.findByIdAndDelete(req.params.id);
    if (!deletedParcel) {
      return res
        .status(404)
        .json({ success: false, message: "Parcel not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Parcel deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
