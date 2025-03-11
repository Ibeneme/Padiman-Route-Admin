const express = require("express");
const mongoose = require("mongoose");
const DeliverParcel = require("../../models/DeliverParcel");
//const DeliverParcel = require("../models/DeliverParcel"); // Adjust the path as needed
const router = express.Router();

// Middleware to check if the userId exists in the request
const checkUserId = (req, res, next) => {
  if (!req.body.userId && !req.params.userId) {
    return res.status(400).json({ message: "User ID is required" });
  }
  next();
};

// 1. POST route to add a new deliver parcel
router.post("/deliverparcels", async (req, res) => {
  const {
    parcelData,
    destination,
    country,
    state,
    city,
    travel_date,
    arrival_date,
    bus_stop,
    can_carry_light,
    can_carry_heavy,
    min_price,
    max_price,
    userId,
    user_first_name,
    user_last_name,
    users_phone_number,
    location_name,
    location_lat,
    location_lng,
  } = req.body;
  console.log(
    destination,
    country,
    state,
    city,
    travel_date,
    arrival_date,
    bus_stop,
    can_carry_light,
    can_carry_heavy,
    min_price,
    max_price,
    userId,
    user_first_name,
    user_last_name,
    users_phone_number
  );

  try {
    const newParcel = new DeliverParcel({
      destination,
      country,
      state,
      city,
      travel_date,
      arrival_date,
      bus_stop,
      can_carry_light,
      can_carry_heavy,
      min_price,
      max_price,
      userId,
      user_first_name,
      user_last_name,
      users_phone_number,
      location_name,
      location_lat,
      location_lng,
    });

    const savedParcel = await newParcel.save();
    console.log(savedParcel, "savedParcel");
    res.status(201).json({
      message: "Parcel added successfully",
      savedParcel,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding parcel", error });
  }
});

// 2. PUT route to update an existing deliver parcel by ID
router.put("/deliverparcels/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const updatedParcel = await DeliverParcel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedParcel) {
      return res.status(404).json({ message: "Parcel not found" });
    }

    res
      .status(200)
      .json({ message: "Parcel updated successfully", updatedParcel });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating parcel", error });
  }
});

// 3. GET route to get all deliver parcels
router.get("/deliverparcels-all", async (req, res) => {
  try {
    const parcels = await DeliverParcel.find();
    res.status(200).json({ success: true, data: parcels });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching parcels",
      error: error.message,
    });
  }
});

// 4. GET route to get all deliver parcels by userId
router.get("/deliverparcels/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const parcels = await DeliverParcel.find({ userId });
    if (parcels.length === 0) {
      return res
        .status(404)
        .json({ message: "No parcels found for this user" });
    }
    res.status(200).json(parcels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching user parcels", error });
  }
});

// 5. DELETE route to delete a deliver parcel by ID
router.delete("/deliverparcels/:id", async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {
    const deletedParcel = await DeliverParcel.findByIdAndDelete(id);

    if (!deletedParcel) {
      return res.status(404).json({ message: "Parcel not found" });
    }

    res
      .status(200)
      .json({ message: "Parcel deleted successfully", deletedParcel });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting parcel", error });
  }
});

module.exports = router;
