const express = require("express");
const jwt = require("jsonwebtoken");
const OTP = require("../../models/otp");
const router = express.Router();
const userTypes = require("../../models/userTypes");
const bcrypt = require("bcrypt"); // Import bcrypt for hashing
const { default: mongoose } = require("mongoose");
const sendSMS = require("../../utils/sendSMS");
const DriversMessage = require("../../models/DriversMessage");
const PairedDriver = require("../../models/PairedDriverSchema");
const axios = require("axios");
const JWT_SECRET = "your_jwt_secret";
const JWT_REFRESH_SECRET = "your_refresh_secret";
const OTP_EXPIRATION = 1800000; // 5 minutes in milliseconds
const PAYSTACK_SECRET_KEY = "sk_test_36fa1899b7cc4af2f3b86f3544c4ab99e9a80ea4";

const sendOTP = async (phone_number, otp) => {
  //console.log(`Sending OTP ${otp} to ${phone_number}`);
  try {
    // Send OTP via SMS
    const response = await sendSMS({
      message: `Your OTP code is ${otp}`,
      phoneNumber: phone_number,
    });
    console.log("OTP sent successfully:", response);
  } catch (error) {
    console.error("Error sending OTP:", error);
  }
};

// Register user
router.post("/register", async (req, res) => {
  const {
    first_name,
    last_name,
    phone_number,
    email,
    password,
    referral_code,
  } = req.body;

  try {
    const existingUser = await userTypes.findOne({
      $or: [{ phone_number }],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: true, message: "User already exists." });
    }

    // Hash the password
    const trimmedPassword = password.trim();
    const hashedPassword = await bcrypt.hash(trimmedPassword, 10); // bcrypt.hash(password, saltRounds)

    const newUser = new userTypes({
      first_name,
      last_name,
      phone_number,
      email,
      password: hashedPassword,
      referredBy: referral_code,
    });

    await newUser.save();

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpEntry = new OTP({ phone_number, otp });
    await otpEntry.save();

    sendOTP(phone_number, otp);

    return res
      .status(201)
      .json({ success: true, message: "User registered. OTP sent." });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { phone_number, otp } = req.body;

  try {
    const otpEntry = await OTP.findOne({ phone_number });

    if (!otpEntry || otpEntry.otp !== otp) {
      return res.status(400).json({ error: true, message: "Invalid OTP." });
    }

    await OTP.deleteOne({ phone_number });

    const user = await userTypes.findOne({ phone_number });
    if (!user) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    user.is_verified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified and user verified successfully.",
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

// Resend OTP
router.post("/resend-otp", async (req, res) => {
  const { phone_number } = req.body;

  console.log(phone_number, "phone_number, password");

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpEntry = await OTP.findOneAndUpdate(
      { phone_number },
      { otp, created_at: new Date() },
      { upsert: true, new: true }
    );

    sendOTP(phone_number, otp);
    console.log(otp);

    return res
      .status(200)
      .json({ success: true, message: "OTP resent successfully." });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { phone_number, password } = req.body;
  //console.log(phone_number, password, "refreshToken");

  try {
    const user = await userTypes.findOne({ phone_number });
    if (!user) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    // Compare the password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid password." });
    }

    const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });
    //console.log(accessToken, refreshToken, "refreshToken");

    return res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: user,
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

// Change Password (Step 1: Send OTP)
router.post("/change-password", async (req, res) => {
  const { phone_number } = req.body;

  try {
    const user = await userTypes.findOne({ phone_number });
    if (!user) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.findOneAndUpdate(
      { phone_number },
      { otp, created_at: new Date() },
      { upsert: true, new: true }
    );

    sendOTP(phone_number, otp);

    return res
      .status(200)
      .json({ success: true, message: "OTP sent for password change." });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

// Change Password (Step 2: Confirm Change)
router.post("/confirm-change-password", async (req, res) => {
  const { phone_number, new_password } = req.body;

  try {
    if (!phone_number || !new_password) {
      return res.status(400).json({
        error: true,
        message: "Phone number and new password are required.",
      });
    }

    const user = await userTypes.findOne({ phone_number });
    if (!user) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await userTypes.findOneAndUpdate(
      { phone_number },
      { password: hashedPassword }
    );

    return res
      .status(200)
      .json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
});

// Route to fetch a user by ID excluding the password
router.get("/user/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const user = await userTypes.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ error: true, message: "Token is required." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: true, message: "Invalid token." });
    }
    req.user = user;
    next();
  });
};

// Route to fetch a user based on the token's user ID (excluding password)
router.get("/user", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log(userId, "userId");
    const user = await userTypes.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: true, message: "Internal server error" });
  }
});

// Route to update user details by ID
router.put("/user/:id", async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, phone_number, email } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: true, message: "Invalid user ID." });
    }

    const user = await userTypes.findById(id);

    if (!user) {
      return res.status(404).json({ error: true, message: "User not found." });
    }

    user.first_name = first_name || user.first_name;
    user.last_name = last_name || user.last_name;
    user.phone_number = phone_number || user.phone_number;
    user.email = email || user.email;

    await user.save();

    res
      .status(200)
      .json({ success: true, message: "User details updated successfully." });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Route to get messages by groupId or create one if not found
router.get("/messages/:groupId", async (req, res) => {
  const { groupId } = req.params;

  try {
    let driversMessage = await DriversMessage.findOne({ groupId });

    // If no messages exist for the groupId, create a new one
    if (!driversMessage) {
      driversMessage = new DriversMessage({
        groupId,
        messages: [], // Start with an empty messages array
      });

      await driversMessage.save();

      return res.status(201).json({
        success: true,
        status: 201,
        // message: "",
        data: driversMessage,
      });
    }

    return res.status(200).json({
      success: true,
      status: 200,
      messages: driversMessage.messages,
    });
  } catch (error) {
    console.error("Error fetching or creating messages:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      // message: "Server error while fetching or creating messages.",
    });
  }
});

// Route to set or update price
router.put("/paired-driver/set-price", async (req, res) => {
  try {
    const { price, id } = req.body; // Get new price from request body

    // Log the incoming data for debugging purposes
    console.log("Received price:", price);
    console.log("Received id:", id);

    // Validate the price
    if (!price || typeof price !== "number" || price < 0) {
      return res.status(400).json({ message: "Invalid price value." });
    }

    // Find and update the PairedDriver record
    const pairedDriver = await PairedDriver.findByIdAndUpdate(
      id,
      {
        $set: {
          price,
          priceSet: true, // Set priceSet to true after updating the price
        },
        $inc: { setPriceCounts: 1 }, // Increment price update count
      },
      { new: true } // Return updated document
    );

    if (!pairedDriver) {
      return res.status(404).json({ message: "PairedDriver not found." });
    }

    // Log the successful update
    console.log("Updated price:", price);
    console.log("Updated PairedDriver:", pairedDriver);

    // Respond with success message and updated pairedDriver data
    res.status(200).json({
      message: "Price updated successfully.",
      pairedDriver,
      success: true,
    });
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error updating price:", error);
    res.status(500).json({ message: "Server error." });
  }
});
//  Route to update ride status (startRide, cancelRide, endRide)
router.put("/paired-driver/update-ride-status/:id", async (req, res) => {
  try {
    const { id } = req.params; // Get PairedDriver ID from URL
    const { status } = req.body; // Get status field and amount to update earnings

    // Log input values
    console.log("Request Params (ID):", id);
    console.log("Request Body (Status):", status);

    // Validate that status is one of the allowed fields
    const allowedStatuses = ["startRide", "cancelRide", "endRide"];
    if (!allowedStatuses.includes(status)) {
      console.log("Invalid status provided:", status);
      return res.status(400).json({ message: "Invalid ride status." });
    }

    // Prepare the update object (set the specified status to true)
    const updateData = { [status]: true };
    console.log("Update Data:", updateData);

    // Find and update the ride status
    const pairedDriver = await PairedDriver.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true } // Return updated document
    );

    if (!pairedDriver) {
      console.log("PairedDriver not found for ID:", id);
      return res.status(404).json({ message: "PairedDriver not found." });
    }

    console.log("PairedDriver updated:", pairedDriver);

    // Extract driverUserId from PairedDriver
    const { driverUserId, price } = pairedDriver;
    console.log("Driver UserID:", driverUserId);
    console.log("Price:", price);

    // Find the UserType document for the driver
    const user = await userTypes.findOne({ _id: driverUserId });
    if (!user) {
      console.log("UserType not found for driverUserId:", driverUserId);
      return res.status(404).json({ message: "UserType not found." });
    }

    console.log("UserType found:", user);

    // Update the earnings array of the userType
    if (price) {
      // Push the new earning entry to the earnings array
      user.earnings.push({
        date: new Date(),
        amount: price, // Corrected: should be price, not user
        rideId: id, // Use the ride ID as reference
      });

      // Update totalEarnings and totalBalance
      user.totalEarnings += price; // Add the new earnings to the totalEarnings
      user.totalBalance += price; // Add the new earnings to the balance
    }

    // Save the updated UserType document
    await user.save();

    res.json({
      message: `${status} updated successfully, earnings updated.`,
      pairedDriver,
      success: true,
    });
  } catch (error) {
    console.error("Error updating ride status:", error);
    res.status(500).json({ message: "Server error." });
  }
});
// Route for generating Paystack payment URL
router.post("/create-paystack-payment", async (req, res) => {
  try {
    const { email, amount, currency = "NGN", callback_url } = req.body;

    // Validate required fields
    if (!email || !amount || !callback_url) {
      return res
        .status(400)
        .json({ error: "email, amount, and callback_url are required." });
    }

    const payload = {
      email,
      amount: amount, // Paystack expects the amount in kobo
      currency,
      callback_url,
    };

    console.log(payload, "payloadpayload");
    // Make a request to Paystack API to initialize the payment
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      payload,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Extract the reference from the Paystack response
    const { reference, authorization_url } = response.data.data;

    // Return the checkout URL and reference

    res.status(200).json({
      checkout_url: authorization_url,
      reference, // Include reference in the response
    });
  } catch (error) {
    console.error("Error creating Paystack payment:", error);
    const errorMessage =
      error.response?.data?.message || "Internal Server Error";
    res.status(500).json({ error: errorMessage });
  }
});

// Route for verifying Paystack payment
router.get("/verify-payment/:orderID", async (req, res) => {
  try {
    const { reference } = req.query;
    const { orderID } = req.params;
    console.log(orderID, "payloadpayload");
    // Validate the orderID and reference
    if (!reference) {
      return res.status(400).json({ error: "Payment reference is required." });
    }
    if (!orderID) {
      return res.status(400).json({ error: "Order ID is required." });
    }

    console.log(reference, orderID, "referencereference");

    // Make a request to Paystack API to verify the payment
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paymentData = response.data.data;
    console.log(response, "paymentData");
    if (paymentData.status === "success") {
      // Payment is successful
      console.log(paymentData, "paymentData");

      const updatedPayment = {
        isPaid: true,
        timestamp: new Date(paymentData.paid_at),
        paymentMethod: paymentData.channel,
        paymentService: "paystack", // Assuming the service is "paystack"
        details: {
          id: reference,
          amount: paymentData.amount / 100, // Convert to the correct currency unit if needed
          gatewayResponse: paymentData.gateway_response,
          reference: paymentData.reference,
          receipt_number: paymentData.receipt_number,
          status: paymentData.status,
          message: paymentData.message,
          paid_at: paymentData.paid_at,
          created_at: paymentData.created_at,
          channel: paymentData.channel,
          currency: paymentData.currency,
          customer: {
            email: paymentData.customer.email,
            phone: paymentData.customer.phone,
          },
          authorization: {
            authorization_code: paymentData.authorization.authorization_code,
            bin: paymentData.authorization.bin,
            last4: paymentData.authorization.last4,
            exp_month: paymentData.authorization.exp_month,
            exp_year: paymentData.authorization.exp_year,
            channel: paymentData.authorization.channel,
            card_type: paymentData.authorization.card_type,
            bank: paymentData.authorization.bank,
            country_code: paymentData.authorization.country_code,
            brand: paymentData.authorization.brand,
            reusable: paymentData.authorization.reusable,
            signature: paymentData.authorization.signature,
            account_name: paymentData.authorization.account_name,
          },
        },
      };

      // Update the ride (order) with the payment information
      const updatedRide = await PairedDriver.findOneAndUpdate(
        { _id: orderID }, // Find the ride using the orderID
        {
          $set: {
            paid: true, // Set the 'paid' status to true
            "payments.isPaid": true, // Set the payment status to true
            "payments.details.id": paymentData.reference,
            "payments.details.amount": paymentData.amount / 100, // Convert to the correct currency unit if needed
            "payments.details.gatewayResponse": paymentData.gateway_response,
            "payments.details.reference": paymentData.reference,
            "payments.details.receipt_number": paymentData.receipt_number,
            "payments.details.status": paymentData.status,
            "payments.details.message": paymentData.message,
            "payments.details.paid_at": paymentData.paid_at,
            "payments.details.created_at": paymentData.created_at,
            "payments.details.channel": paymentData.channel,
            "payments.details.currency": paymentData.currency,
            "payments.details.customer.email": paymentData.customer.email,
            "payments.details.customer.phone": paymentData.customer.phone,
            "payments.details.authorization.authorization_code":
              paymentData.authorization.authorization_code,
            "payments.details.authorization.bin": paymentData.authorization.bin,
            "payments.details.authorization.last4":
              paymentData.authorization.last4,
            "payments.details.authorization.exp_month":
              paymentData.authorization.exp_month,
            "payments.details.authorization.exp_year":
              paymentData.authorization.exp_year,
            "payments.details.authorization.channel":
              paymentData.authorization.channel,
            "payments.details.authorization.card_type":
              paymentData.authorization.card_type,
            "payments.details.authorization.bank":
              paymentData.authorization.bank,
            "payments.details.authorization.country_code":
              paymentData.authorization.country_code,
            "payments.details.authorization.brand":
              paymentData.authorization.brand,
            "payments.details.authorization.reusable":
              paymentData.authorization.reusable,
            "payments.details.authorization.signature":
              paymentData.authorization.signature,
            "payments.details.authorization.account_name":
              paymentData.authorization.account_name,
          },
        },
        { new: true } // Return the updated document
      );

      console.log(updatedRide);

      // Handle the case where the ride isn't found (e.g., invalid orderID)
      if (!updatedRide) {
        return res.status(404).json({ error: "Order not found." });
      }
      console.log("Payment verified and update");
      res.status(200).json({
        message: "Payment verified and updated successfully.",
        updatedRide,
        success: true,
        pay: updatedPayment,
      });
    } else {
      // Payment failed or incomplete
      res.status(400).json({
        message: "Payment verification failed.",
        paymentData,
        success: false,
      });
    }
  } catch (error) {
    console.error("Error verifying Paystack payment:", error);
    const errorMessage =
      error.response?.data?.message || "Internal Server Error";
    res.status(500).json({ error: errorMessage });
  }
});

module.exports = router;
