const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Helper function to generate random alphanumeric string
const generateRandomCode = (length) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const userTypeSchema = new mongoose.Schema(
  {
    id: { type: Number, default: 0 },
    user_id: { type: String, default: null },
    first_name: { type: String, default: null },
    last_name: { type: String, default: null },
    phone_number: { type: String, required: true },
    email: { type: String, default: null },
    totalEarnings: {
      type: Number,
      default: 0, // Default value is 0
    },
    totalWithdrawals: {
      type: Number,
      default: 0, // Default value is 0
    },
    totalRefunds: {
      type: Number,
      default: 0, // Default value is 0
    },
    totalBalance: {
      type: Number,
      default: 0, // Default value is 0
    },
    referralEarnings: {
      type: Number,
      default: 0, // Default value is 0
    },
    average_rating: {
      type: Number,
      default: 0, // Default value is 0
    },
    earnings: [],
    refunds: [],
    withdrawals: [
      {
        amount: Number,
        date: Date,
        rideId: String,
        accountNumber: String,
        status: String,
        accountName: String,
        bank: String,
        withdrawalID: String,
      },
    ],

    profile_img_url: { type: String, default: null },
    facial_verified: { type: Boolean, default: false },
    driver_verified: { type: Boolean, default: false },
    has_verified_bvn: { type: Boolean, default: false },
    has_verified_licence: { type: Boolean, default: false },
    is_verified: { type: Boolean, default: false },
    become_a_driver: { type: Boolean, default: false },
    blocked: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
    is_driver: { type: Boolean, default: false },
    is_driver_blocked: { type: Boolean, default: false },
    balance: { type: Number, default: 0 },
    average_rating: { type: Number, default: 0, min: 0, max: 5 }, // Rating between 0 and 5
    referral_code: { type: String, default: null },
    referredBy: { type: String, default: null },
    password: { type: String, required: true }, // Password field added
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
  }
);

// Middleware to generate referral code before saving a user
userTypeSchema.pre("save", async function (next) {
  if (!this.referral_code) {
    const firstNamePart = this.first_name
      ? this.first_name.slice(0, 4).toUpperCase()
      : "USER";
    const randomPart = generateRandomCode(4);
    this.referral_code = `${firstNamePart}${randomPart}`;
  }

  // Hash the password before saving the user
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10); // Generate a salt with 10 rounds
    this.password = await bcrypt.hash(this.password, salt); // Hash the password
  }

  next();
});

// Export the model
module.exports = mongoose.model("UserType", userTypeSchema);
