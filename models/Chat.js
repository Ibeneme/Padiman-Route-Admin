const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  message: { type: String, required: true },
  passenger: { type: Boolean, required: false },
  //timeSent: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema({
  chatID: { type: String, required: true, unique: true },
  users: { type: [String], required: false }, // Array of user IDs
  messages: [messageSchema],
  fetchID: { type: String, required: false },
  passID: { type: String, required: false },
  reported: { type: Boolean, default: false },
  endRide: {
    type: Boolean,
    default: false,
  },
  startRide: {
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
  user_first_name: {
    type: String,
    default: null,
  },
  user_last_name: {
    type: String,
    default: null,
  },
  rateRide: { type: Boolean, default: false },

  paid: { type: Boolean, default: false }, // Indicates if the payment has been made
  price: { type: Number, default: null }, // Price associated with the chat
});

module.exports = mongoose.model("Chat", chatSchema);
