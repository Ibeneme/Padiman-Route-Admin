const mongoose = require("mongoose");

const sendParcel = new mongoose.Schema(
  {
    state: {
      type: String,
      default: null,
    },
    sender_city: {
      type: String,
      default: null,
    },
    receiver_city: {
      type: String,
      default: null,
    },
    delivery_date: {
      type: Date,
      default: null,
    },
    is_perishable: {
      type: Boolean,
      default: false,
    },
    is_fragile: {
      type: Boolean,
      default: false,
    },
    receiver_name: {
      type: String,
      default: null,
    },
    receiver_phone: {
      type: String,
      default: null,
    },
    receiver_email: {
      type: String,
      default: null,
    },
    receiver_gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: null,
    },
    userId: {
      type: String,
      required: true,
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
    paid: {
      type: Boolean,
      default: false,
    },
    startRide: {
      type: Boolean,
      default: false,
    },
    refundRide: {
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
    rateRide: {
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
    paid_for: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SendParcel", sendParcel);
