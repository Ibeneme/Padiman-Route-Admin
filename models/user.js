const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      minlength: 3,
      maxlength: 30,
    },
    bio: {
      type: String,
      minlength: 3,
      maxlength: 30,
    },
    username: {
      type: String,
      minlength: 3,
      maxlength: 30,
    },
    familyName: {
      type: String,
      minlength: 3,
      maxlength: 30,
    },
    givenName: {
      type: String,
      minlength: 3,
      maxlength: 30,
    },
    cw_token_id: {
      type: String,
      minlength: 3,
      maxlength: 30,
    },
    imageUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

module.exports = User;
