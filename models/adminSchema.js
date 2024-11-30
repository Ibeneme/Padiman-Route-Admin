const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  superAdmin: { type: Boolean, default: false },
});

module.exports = mongoose.model("Admin", adminSchema);