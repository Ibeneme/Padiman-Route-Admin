const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  superAdmin: { type: Boolean, default: false },
  rights: {
    viewAllUsers: { type: Boolean, default: false },
    //  updateAllUsers: { type: Boolean, default: false },
    viewWithdrawalEarnings: { type: Boolean, default: false },
    // updateWithdrawalEarnings: { type: Boolean, default: false },
    viewReferralEarnings: { type: Boolean, default: false },
    viewPadimanEarnings: { type: Boolean, default: false },
  },
});

// Middleware to override rights if the admin is a superAdmin
adminSchema.pre("save", function (next) {
  if (this.superAdmin) {
    this.rights = {
      viewAllUsers: true,
      updateAllUsers: true,
      viewWithdrawalEarnings: true,
      updateWithdrawalEarnings: true,
      viewReferralEarnings: true,
      viewPadimanEarnings: true,
    };
  }
  next();
});

// Virtual field to check if the admin has specific rights
adminSchema.virtual("hasFullAccess").get(function () {
  return this.superAdmin;
});

module.exports = mongoose.model("Admin", adminSchema);
