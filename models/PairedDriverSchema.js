const mongoose = require("mongoose");

// PairedDriver Schema
const PairedDriverSchema = new mongoose.Schema(
  {
    // Flexible reference for customerRequestId (either SendParcel or PassengerRequest)
    customerRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "customerRequestModel", // Determines which model to reference
    },
    customerRequestModel: {
      type: String,
      required: true,
      enum: ["SendParcel", "PassengerRequest"], // Defines the valid models
    },
    // Flexible reference for driverRequestId (either Driver or DeliverParcel)
    driverRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "driverRequestModel", // Determines which model to reference
    },
    driverRequestModel: {
      type: String,
      required: true,
      enum: ["Driver", "DeliverParcel"], // Defines the valid models
    },
    customerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model (customer)
      required: true,
    },
    driverUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model (driver)
      required: true,
    },
    price: {
      type: Number,
      required: false,
      default: 0,
    },
    priceSet: {
      type: Boolean,
      default: false,
    },
    setPriceCounts: {
      type: Number,
      default: 0,
    },
    paid: {
      type: Boolean,
      default: false,
    },
    reportRide: {
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
    endRide: {
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
    driver_first_name: {
      type: String,
      default: null,
    },
    driver_last_name: {
      type: String,
      default: null,
    },
    payments: {
      isPaid: { type: Boolean, default: false },
      timestamp: { type: Date, default: Date.now },
      paymentMethod: {
        type: String,
        enum: ["cash", "card", "transfer"],
        default: "card",
      },
      paymentService: { type: String, enum: ["paystack"], default: "paystack" },
      details: {
        id: { type: String },
        domain: { type: String },
        status: { type: String, default: "pending" },
        reference: { type: String },
        receipt_number: { type: String, default: null },
        amount: { type: Number },
        message: { type: String, default: null },
        gateway_response: { type: String },
        paid_at: { type: Date },
        created_at: { type: Date },
        channel: { type: String },
        currency: { type: String },
        authorization: {
          authorization_code: { type: String },
          bin: { type: String },
          last4: { type: String },
          exp_month: { type: String },
          exp_year: { type: String },
          channel: { type: String },
          card_type: { type: String },
          bank: { type: String },
          country_code: { type: String },
          brand: { type: String },
          reusable: { type: Boolean },
          signature: { type: String },
          account_name: { type: String, default: null },
        },
        customer: {
          id: { type: Number },
          first_name: { type: String, default: null },
          last_name: { type: String, default: null },
          email: { type: String },
          customer_code: { type: String },
          phone: { type: String, default: null },
          metadata: { type: String, default: null },
          risk_action: { type: String },
          international_format_phone: { type: String, default: null },
        },
      },
    },
  },
  { timestamps: true } // Automatically adds `createdAt` and `updatedAt` fields
);

// Create the model from the schema
const PairedDriver = mongoose.model("PairedDriver", PairedDriverSchema);

module.exports = PairedDriver;
