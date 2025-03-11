const mongoose = require("mongoose");

// Define the Driver schema
const driverSchema = new mongoose.Schema({
  is_booked: {
    type: Boolean,
    required: false,
  },
  destination: {
    type: String,
    required: false,
  },
  travelling_date: {
    type: Date,
    required: false,
  },
  current_city: {
    type: String,
    required: false,
  },
  no_of_passengers: {
    type: String,
    required: false,
    min: 1,
    max: 2147483647, // Maximum value for passengers (as per your input)
  },
  average_driver_rating: {
    type: Number,
    default: 0, // Default value is 0
  },
  plate_no: {
    type: String,
    required: false,
    min: 1,
    max: 2147483647, // Maximum value for plate number (as per your input)
  },
  preferred_take_off: {
    type: String,
    required: false,
  },
  time_of_take_off: {
    type: String,
    required: false,
  },
  drop_off: {
    type: String,
    required: false,
  },
  userId: {
    type: String,
    required: true, // userId is compulsory
  },
  driver: {
    type: String,
    required: false,
  },
  user_first_name: {
    type: String,
    required: false,
  },
  user_last_name: {
    type: String,
    required: false,
  },
  users_phone_number: {
    type: String,
    required: false,
  },
  reportRide: {
    type: Boolean,
    default: false,
  },
  location_name: {
    type: String,
    default: null,
  },
  location_lat: {
    type: String,
    default: null,
  },
  location_lng: {
    type: String,
    default: null,
  },
});

// Create the Driver model
const Driver = mongoose.model("Driver", driverSchema);

module.exports = Driver;
