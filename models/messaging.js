const mongoose = require("mongoose");
const { Schema } = mongoose;

// Translation Schema
const translationSchema = new Schema({
  language: { type: String },
  text: { type: String },
});

// Reaction Schema
const reactionSchema = new Schema({
  reaction: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  timeReacted: { type: Date, default: Date.now },
});

// Status Schema for isRead and isDelivered
const statusSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: Boolean, default: false },
});

// Replied Message Schema
const repliedMessageSchema = new Schema({
  translations: [translationSchema],
  reactions: [reactionSchema],
  message: { type: String, default: null },
  replies: [{ type: Schema.Types.ObjectId, ref: "RepliedMessage" }],
  timeReplied: { type: Date, default: Date.now },
  repliedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  isRead: [statusSchema],
  isDelivered: [statusSchema],
});

// Message Schema
const messageSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  translations: [translationSchema],
  reactions: [reactionSchema],
  replies: [repliedMessageSchema],
  message: { type: String, default: null },
  timeSent: { type: Date, default: Date.now },
  isRead: [statusSchema],
  isDelivered: [statusSchema],
  mainMessageId: { type: String, default: null },
  // receiverid: { type: Schema.Types.ObjectId, ref: "User" },
});

// Main Message Schema
const mainMessageSchema = new Schema({
  userIds: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
  name: { type: String },
  description: { type: String },
  timeCreated: { type: Date, default: Date.now },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  updatedAt: { 
    type: [
      {
        time: { type: Date, default: Date.now },
        userId: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
    default: [],
  },
  imageUrl: { type: String },
  messages: [messageSchema],
});

// Middleware to update `updatedAt` field before saving
mainMessageSchema.pre('save', function (next) {
  const currentTime = Date.now();
  const currentUser = this._id; // Adjust this to get the current user ID if available in your context

  this.updatedAt.push({ time: currentTime, userId: currentUser });
  next();
});

// Model
const MainMessage = mongoose.model("MainMessage", mainMessageSchema);

module.exports = MainMessage;
