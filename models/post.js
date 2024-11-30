// models/Post.js
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true, // Ensure the text is always provided
    },
    userId: {
      type: String,
      required: true,
    },
    first_name: {
      type: String,
      required: false,
    },
    last_name: {
      type: String,
      required: false,
    },
    admin: {
      type: Boolean,
      default: false,
      required: false,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
