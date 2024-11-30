// models/RequestWithdrawal.js
const mongoose = require("mongoose");

const RequestWithdrawal = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Reference to the User model
    required: true,
  },
  accountNumber: {
    type: String,
    required: true,
  },
  bank: {
    type: String,
    required: true,
  },
  bankCode: {
    type: String,
    required: true,
  },
  requestedAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  accountName: {
    type: String,
  },
  dateRequested: {
    type: Date,
    default: Date.now,
  },
  withdrawalID: {
    type: String,
  },
});

module.exports = mongoose.model("RequestWithdrawal", RequestWithdrawal);
