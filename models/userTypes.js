const mongoose = require("mongoose");

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
    totalEarnings: { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 },
    totalRefunds: { type: Number, default: 0 },
    totalBalance: { type: Number, default: 0 },
    referralEarnings: { type: Number, default: 0 },
    average_rating: { type: Number, default: 0 },
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
    average_rating: { type: Number, default: 0, min: 0, max: 5 },
    referral_code: { type: String, default: null },
    referredBy: { type: String, default: null },
    password: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// Middleware to generate referral code before saving a user
userTypeSchema.pre("save", function (next) {
  if (!this.referral_code) {
    const firstNamePart = this.first_name
      ? this.first_name.slice(0, 4).toUpperCase()
      : "USER";
    const randomPart = generateRandomCode(4);
    this.referral_code = `${firstNamePart}${randomPart}`;
  }

  next();
});

module.exports = mongoose.model("UserType", userTypeSchema);