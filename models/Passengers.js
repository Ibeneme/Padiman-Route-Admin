const mongoose = require("mongoose");

const passengerRequestSchema = new mongoose.Schema({
  destination: {
    type: String,
    required: false, // Not required as per your specification
  },
  travelling_date: {
    type: Date,
    required: true, // Only required field after userId
  },
  current_city: {
    type: String,
    required: false,
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
  
  userId: {
    type: String,
    required: true, // This field is required
  },
  user_first_name: {
    type: String,
    default: null,
  },
  user_last_name: {
    type: String,
    default: null,
  },
  users_phone_number: {
    type: String,
    default: null,
  },
  paid: {
    type: Boolean,
    default: false,
  },
  amount: {
    type: Number,
    default: null,
  },
  time_paid: {
    type: Date,
    default: null,
  },
  endRide: {
    type: Boolean,
    default: false,
  },
  cancelRide: {
    type: Boolean,
    default: false,
  },
  confirmRide: {
    type: Boolean,
    default: false,
  },
  refundRide: {
    type: Boolean,
    default: false,
  },
  reportRide: {
    type: Boolean,
    default: false,
  },
  rateRide: {
    type: Boolean,
    default: false,
  },
  reportRideReason: {
    type: String,
    default: false,
  },
  startRide: {
    type: Boolean,
    default: false,
  },
  driver: {
    type: String,
    default: null,
  },
  driver_first_name: {
    type: String,
    default: null,
  },
  driver_last_name: {
    type: String,
    default: null,
  },
  driver_phone_number: {
    type: String,
    default: null,
  },
});

const PassengerRequest = mongoose.model(
  "PassengerRequest",
  passengerRequestSchema
);

module.exports = PassengerRequest;
