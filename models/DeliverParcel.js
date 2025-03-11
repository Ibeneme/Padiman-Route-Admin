const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define the DeliverParcel schema
const deliverParcelSchema = new Schema(
  {
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
    
    destination: {
      type: String,
      required: false,
    },
    country: {
      type: String,
      required: false,
    },
    state: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: false,
    },
    travel_date: {
      type: Date,
      required: false,
    },
    arrival_date: {
      type: Date,
      required: false,
    },
    bus_stop: {
      type: String,
      required: false,
    },
    can_carry_light: {
      type: Boolean,
      required: false,
    },
    can_carry_heavy: {
      type: Boolean,
      required: false,
    },
    min_price: {
      type: Number,
      required: false,
    },
    max_price: {
      type: Number,
      required: false,
    },
    paid: {
      type: Boolean,
      required: false,
    },
    price: {
      type: String,
      required: false,
    },
    userId: {
      required: true, // userId is compulsory
      type: String,
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
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create and export the DeliverParcel model
const DeliverParcel = mongoose.model("DeliverParcel", deliverParcelSchema);

module.exports = DeliverParcel;
