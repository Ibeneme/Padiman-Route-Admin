const express = require("express");
const PassengerRequest = require("../../models/Passengers");
const DeliverParcel = require("../../models/DeliverParcel");
const sendParcel = require("../../models/SendParcel");
const Driver = require("../../models/driver");
const userTypes = require("../../models/userTypes");
const Chat = require("../../models/Chat");
const router = express.Router();
const https = require("https");
const requestWithdrawalSchema = require("../../models/RequestWithdrawalSchema");

// Helper function to generate a consistent chat ID
function generateChatID(userId1, userId2) {
  // Ensure the IDs are sorted to make the chat ID consistent
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
}

router.get("/api-fetch-chat/api/:fetchID", async (req, res) => {
  const { fetchID } = req.params; // Extract fetchID from URL params

  try {
    // Find all chats with the same fetchID
    const chats = await Chat.find({ fetchID: fetchID });

    // If no chats found with the provided fetchID
    if (chats.length === 0) {
      return res
        .status(404)
        .json({ message: "No chats found for this fetchID" });
    }

    // Return the found chats as an array
    console.log(chats, "Found chats");
    res.json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:chatID", async (req, res) => {
  try {
    const { chatID } = req.params;

    const chat = await Chat.findOne({ chatID });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    res.json(chat.messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Route to set or update the price for a chat
router.post("/set-price", async (req, res) => {
  const { chatID, price } = req.body;

  // Log the received data
  console.log(chatID, price, "Received chatID and price");

  // Check if both chatID and price are provided
  if (!chatID || !price) {
    return res.status(400).json({ message: "Chat ID and price are required" });
  }

  try {
    // Find the chat by chatID
    const chat = await Chat.findOne({ chatID });

    if (!chat) {
      // If chat not found, return a 404 error
      return res.status(404).json({ message: "Chat not found" });
    }

    // If chat found, update the price
    chat.price = price; // Set the new price

    // Log the updated chat object
    console.log("Updated Chat: ", chat);

    // Save the chat with the updated price
    await chat.save();

    // Return a success response with the updated chat data
    return res.status(200).json({
      success: true,
      message: "Price updated successfully",
      chat: chat, // Send the updated chat object in response
    });
  } catch (error) {
    // Handle any errors during the process
    console.error("Error setting/updating price:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
// Fetch chat and messages by chatId
router.get("/chat/:chatId", async (req, res) => {
  const { chatId } = req.params; // Extract chatId from route parameters

  try {
    const chat = await Chat.findOne({ chatID: chatId }); // Fetch chat by chatID

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Return the whole chat object, which already contains all fields
    return res.status(200).json(chat);
  } catch (error) {
    console.error("Error fetching chat:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

// Route to create or get a chat between two users
// router.post("/createChat", async (req, res) => {
//   const { users } = req.body;
//   const userId1 = users?.userId1;
//   const userId2 = users?.userId2;
//   console.log(userId1, userId2, users, "userId1, userId2F");
//   if (!userId1 || !userId2) {
//     return res
//       .status(400)
//       .json({ error: "Both userId1 and userId2 are required" });
//   }

//   if (userId1 === userId2) {
//     return res.status(400).json({ error: "userTypes IDs must be different" });
//   }

//   try {
//     const chatID = generateChatID(userId1, userId2);

//     // Check if the chat already exists
//     let chat = await Chat.findOne({ chatID });

//     if (chat) {
//       // Chat exists, return the existing chat ID
//       return res.status(200).json({ chatID });
//     }

//     // Chat does not exist, create a new chat
//     chat = new Chat({
//       users: [userId1, userId2],
//       chatID,
//     });

//     await chat.save();

//     // Return the new chat ID
//     return res.status(201).json({ chatID });
//   } catch (error) {
//     console.error("Error creating chat:", error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// });

router.get("/chats/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    // Find all chats where the provided userId is part of the users array
    const chats = await Chat.find({ users: userId });

    if (!chats.length) {
      return res.status(404).json({ message: "No chats found for this user" });
    }

    // Return the found chats
    return res.status(200).json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/update-data", async (req, res) => {
  const { chatID, type, requestID, driverID, userId, amount } = req.body;

  try {
    // Fetch the chat by chatID and update paid to true
    const chat = await Chat.findOneAndUpdate(
      { chatID },
      { paid: true },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    console.log("Chat updated:", chat);

    // Handle delivery type
    if (type === "delivery") {
      const delivery = await DeliverParcel.findOne({ _id: requestID });
      if (!delivery) {
        return res.status(404).json({ message: "Delivery not found" });
      }

      console.log("Delivery fetched:", delivery);

      // Update the sendParcel schema
      const updatedsendParcel = await sendParcel.findOneAndUpdate(
        { _id: requestID },
        {
          amount: chat.price,
          time_paid: new Date(),
          driver: driverID,
          driver_first_name: delivery.user_first_name,
          driver_last_name: delivery.user_last_name,
          driver_phone_number: delivery.users_phone_number,
          paid: true,
          //paid_for:
        },
        { new: true }
      );

      console.log("sendParcel updated:", updatedsendParcel);
    }
    // Handle ride type
    else if (type === "ride") {
      const rideRequest = await PassengerRequest.findOneAndUpdate(
        { _id: requestID },
        {
          paid: true,
          time_paid: new Date(),
          amount: chat.price,
        },
        { new: true }
      );

      if (!rideRequest) {
        return res.status(404).json({ message: "Ride request not found" });
      }

      console.log("RideRequest updated:", rideRequest);

      // Fetch driver details
      const driver = await Driver.findOne({ _id: driverID });
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }

      console.log("Driver fetched:", driver);

      // Update the driver details in the ride request
      rideRequest.driver = driverID;
      rideRequest.driver_first_name = driver.user_first_name;
      rideRequest.driver_last_name = driver.user_last_name;
      rideRequest.driver_phone_number = driver.users_phone_number;

      await rideRequest.save();
      console.log("RideRequest with driver details updated:", rideRequest);

      // Add earnings to the user's earnings array
      const user = await userTypes.findOne({ user_id: userId });
      if (!user) {
        return res.status(404).json({ message: "userTypes not found" });
      }

      user.earnings.push({
        amount: chat.price, // Add the amount from the request
        date: new Date(), // Set the current date
        rideId: requestID, // Use requestID or any unique identifier
      });

      // Corrected syntax for updating totalEarnings and totalBalance
      user.totalEarnings += chat.price; // Add chat.price to totalEarnings
      user.totalBalance += chat.price; // Add chat.price to totalBalance

      // Save the updated user object
      await user.save();

      // Log the updated user
      console.log("User earnings updated:", user);
    } else {
      return res.status(400).json({ message: "Invalid type provided" });
    }

    res.status(200).json({ message: "Update successful" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

router.get("/fetch-details/chat/chat/:type/:userId", async (req, res) => {
  const { type, userId } = req.params; // Type can be 'earnings', 'withdrawals', 'refunds', or 'balance'
  console.log(type, userId, "type, userId ");

  if (!type || !userId) {
    return res
      .status(400)
      .json({ success: false, message: "Missing type or userId" });
  }

  try {
    // Find the user by userId
    const user = await userTypes.findOne({ _id: userId });
    console.log(user, "user");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "userTypes not found" });
    }

    let totalEarnings = 0;
    let totalWithdrawals = 0;
    let totalRefunds = 0;

    // Depending on the type, calculate totals and return
    switch (type.toLowerCase()) {
      case "earnings":
        totalEarnings = user.totalEarnings;
        console.log(totalEarnings, "totalEarnings");
        return res.json({
          success: true,
          totalEarnings,
          earnings: user.earnings,
        });

      case "withdrawals":
        totalWithdrawals = user.totalWithdrawals;
        console.log(user.withdrawals, "user.withdrawals");
        return res.json({
          success: true,
          totalWithdrawals,
          withdrawals: user.withdrawals,
        });

      case "refunds":
        totalRefunds = user.totalRefunds;
        return res.json({ success: true, totalRefunds, refunds: user.refunds });

      case "balance":
        // Calculate balance as the sum of totalEarnings + totalRefunds
        totalEarnings = user.totalBalance;
        totalRefunds = user.totalRefunds;

        const totalBalance = totalEarnings + totalRefunds;
        return res.json({ success: true, totalBalance });

      default:
        return res
          .status(400)
          .json({ success: false, message: "Invalid type" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/requests", async (req, res) => {
  const {
    requestId,
    type,
    chatId,
    requestType,
    driverId,
    amount,
    refund,
    reason,
    userId,
    ratingCount,
  } = req.body;

  console.log(
    requestId,
    type,
    chatId,
    requestType,
    driverId,
    amount,
    refund,
    reason,
    userId,
    ratingCount
  );

  // Validate that type, requestType, requestId, chatId are provided
  if (!type || !requestType || !chatId || !requestId) {
    return res.status(400).json({
      message: "Type, Request Type, Request ID, and Chat ID are required.",
    });
  }

  try {
    let updatedRecord;

    // Check if the type is "ride" or "delivery" and update the corresponding schema
    if (type === "ride") {
      // For "ride", update the PassengerRequest schema
      if (requestType === "endRide") {
        updatedRecord = await PassengerRequest.findOneAndUpdate(
          { _id: requestId },
          { $set: { endRide: true, requestType: requestType } },
          { new: true }
        );
      } else if (requestType === "confirmRide") {
        updatedRecord = await PassengerRequest.findOneAndUpdate(
          { _id: requestId },
          { $set: { confirmRide: true, requestType: requestType } },
          { new: true }
        );
      } else if (requestType === "reportRide") {
        updatedRecord = await PassengerRequest.findOneAndUpdate(
          { _id: requestId },
          { $set: { reportRide: true, requestType: requestType } },
          { new: true }
        );
      } else if (requestType === "refundRide") {
        updatedRecord = await PassengerRequest.findOneAndUpdate(
          { _id: requestId },
          { $set: { refundRide: refund, requestType: requestType } },
          { new: true }
        );
      } else if (requestType === "startRide") {
        // New 'startRide' functionality
        updatedRecord = await PassengerRequest.findOneAndUpdate(
          { _id: requestId },
          { $set: { startRide: true, requestType: requestType } },
          { new: true }
        );
      } else if (requestType === "rateRide") {
        // New 'startRide' functionality
        updatedRecord = await PassengerRequest.findOneAndUpdate(
          { _id: requestId },
          { $set: { rateRide: true, requestType: requestType } },
          { new: true }
        );
      }

      if (!updatedRecord) {
        return res
          .status(404)
          .json({ message: "Passenger request not found." });
      }
    } else if (type === "delivery") {
      // For "delivery", update the sendParcel schema
      if (requestType === "endRide") {
        updatedRecord = await sendParcel.findOneAndUpdate(
          { _id: requestId },
          { $set: { endRide: true, requestType: requestType } },
          { new: true }
        );
      } else if (requestType === "confirmRide") {
        updatedRecord = await sendParcel.findOneAndUpdate(
          { _id: requestId },
          { $set: { confirmRide: true, requestType: requestType } },
          { new: true }
        );
      } else if (requestType === "reportRide") {
        updatedRecord = await sendParcel.findOneAndUpdate(
          { _id: requestId },
          { $set: { reportRide: true, requestType: requestType } },
          { new: true }
        );
      } else if (requestType === "refundRide") {
        updatedRecord = await sendParcel.findOneAndUpdate(
          { _id: requestId },
          { $set: { refundRide: refund, requestType: requestType } },
          { new: true }
        );
      } else if (requestType === "startRide") {
        // New 'startRide' functionality for "delivery"
        updatedRecord = await sendParcel.findOneAndUpdate(
          { _id: requestId },
          { $set: { startRide: true, requestType: requestType } },
          { new: true }
        );
      } else if (requestType === "rateRide") {
        // New 'startRide' functionality
        updatedRecord = await PassengerRequest.findOneAndUpdate(
          { _id: requestId },
          { $set: { rateRide: true, requestType: requestType } },
          { new: true }
        );
      }

      if (!updatedRecord) {
        return res.status(404).json({ message: "Parcel not found." });
      }
    } else {
      return res.status(400).json({ message: "Invalid type." });
    }

    // Update the Chat schema with requestType
    let updateField = {};
    if (requestType === "endRide") {
      updateField = { endRide: true };
    } else if (requestType === "confirmRide") {
      updateField = { confirmRide: true };
    } else if (requestType === "reportRide") {
      updateField = { reportRide: true };
    } else if (requestType === "refundRide") {
      updateField = { refundRide: refund };
    } else if (requestType === "startRide") {
      updateField = { startRide: true }; // Update for startRide
    } else if (requestType === "rateRide") {
      updateField = { startRide: true }; // Update for startRide
    } else {
      return res.status(400).json({ message: "Invalid requestType." });
    }

    const chat = await Chat.findOneAndUpdate(
      { chatID: chatId }, // Search for the chat document with the specific chatId
      { $set: updateField }, // Update the specified field(s)
      { new: true } // Return the updated document
    );

    if (!chat) {
      return res.status(404).json({ message: "Chat not found." });
    }

    // Now update the driver's rating based on ratingCount
    if (requestType === "rateRide") {
      const driver = await userTypes.findOne({ _id: driverId });

      if (!driver) {
        return res.status(404).json({ message: "Driver not found." });
      }

      const currentRatingCount = driver.ratingCount || 0;
      const currentRatingSum = driver.ratingSum || 0;

      // Add the new rating to the current rating sum
      const newRatingSum = currentRatingSum + ratingCount;

      // Update the rating count by 1
      const newRatingCount = currentRatingCount + 1;

      // Calculate the new average rating by adding the current average rating and the new rating, then divide by 2
      const newAverageRating =
        (currentRatingSum + ratingCount) / newRatingCount;

      console.log(newAverageRating, "newAverageRating");

      // Update the driver's rating details
      driver.ratingCount = newRatingCount;
      driver.ratingSum = newRatingSum;
      driver.average_rating = newAverageRating;

      await driver.save();
    }

    // If the ride is confirmed, update the driver's earnings and handle refund
    if (requestType === "confirmRide" && driverId && amount) {
      const driver = await userTypes.findOne({ _id: driverId });

      if (!driver) {
        return res.status(404).json({ message: "Driver not found." });
      }

      const numericAmount = Number(amount) || 0;

      // Ensure totalBalance and totalEarnings are arrays
      if (!Array.isArray(driver.totalBalance)) {
        driver.totalBalance = [];
      }
      if (!Array.isArray(driver.totalEarnings)) {
        driver.totalEarnings = [];
      }

      driver.earnings.push({
        amount: numericAmount,
        date: new Date(),
        rideId: requestId,
      });

      if (driver.totalBalance !== undefined) {
        driver.totalBalance += numericAmount; // Increment the balance by the numeric amount
      } else {
        driver.totalBalance = numericAmount; // Set the initial value
      }

      if (driver.totalEarnings !== undefined) {
        driver.totalEarnings += numericAmount; // Increment the earnings by the numeric amount
      } else {
        driver.totalEarnings = numericAmount; // Set the initial value
      }

      await driver.save();
    }

    return res
      .status(200)
      .json({ message: "Ride started and refund processed successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error." });
  }
});

router.get("/paystack/banks", (req, res) => {
  const options = {
    hostname: "api.paystack.co",
    port: 443,
    path: "/bank",
    method: "GET",
    headers: {
      Authorization: "sk_live_9ec11323a265fcc1330376e58d839139ebb0cd16",
    },
  };

  const paystackReq = https.request(options, (paystackRes) => {
    let data = "";

    paystackRes.on("data", (chunk) => {
      data += chunk;
    });

    paystackRes.on("end", () => {
      try {
        const parsedData = JSON.parse(data);
        res.status(paystackRes.statusCode).json(parsedData);
      } catch (error) {
        res
          .status(500)
          .json({ error: "Failed to parse response from Paystack" });
      }
    });
  });

  paystackReq.on("error", (error) => {
    console.error(error);
    res.status(500).json({ error: "Error communicating with Paystack" });
  });

  paystackReq.end();
});

router.get("/paystack/resolve-account", (req, res) => {
  const { account_number, bank_code } = req.query;
  console.log(account_number, bank_code);
  // Validate query parameters
  if (!account_number || !bank_code) {
    return res.status(400).json({
      message: "Both account_number and bank_code are required",
    });
  }

  // Define options for the HTTPS request
  const options = {
    hostname: "api.paystack.co",
    port: 443,
    path: `/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
    method: "GET",
    headers: {
      Authorization: "Bearer sk_live_9ec11323a265fcc1330376e58d839139ebb0cd16", // Replace with your Paystack secret key
    },
  };

  // Make the HTTPS request
  const request = https.request(options, (paystackRes) => {
    let data = "";

    // Accumulate data chunks
    paystackRes.on("data", (chunk) => {
      data += chunk;
    });

    // Handle the response when complete
    paystackRes.on("end", () => {
      try {
        const parsedData = JSON.parse(data);

        // Send the response back to the client
        res.status(paystackRes.statusCode).json(parsedData);
      } catch (error) {
        console.error("Error parsing response:", error);
        res.status(500).json({ message: "Error parsing Paystack response" });
      }
    });
  });

  // Handle HTTPS request errors
  request.on("error", (error) => {
    console.error("HTTPS request error:", error);
    res.status(500).json({ message: "Error connecting to Paystack", error });
  });

  // End the request
  request.end();
});

router.post("/paystack/request-withdrawal", async (req, res) => {
  const {
    accountNumber,
    accountName,
    bank,
    bankCode,
    requestedAmount,
    userId,
    withdrawalID,
  } = req.body;

  try {
    console.log(accountName, "accountName");
    // Check if requestedAmount is a valid number
    const numericAmount = Number(requestedAmount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: "Invalid requestedAmount. It must be a positive number.",
      });
    }

    console.log(withdrawalID, "withdrawalIDwithdrawalID");
    const newWithdrawal = new requestWithdrawalSchema({
      userId,
      accountNumber,
      bank,
      bankCode,
      requestedAmount: numericAmount,
      accountName: accountName,
      withdrawalID: withdrawalID,
    });

    await newWithdrawal.save();

    const user = await userTypes.findById(userId);
    if (user) {
      user.withdrawals.push({
        amount: numericAmount,
        date: new Date(),
        rideId: "someRideId", // Update this dynamically as needed
        accountNumber,
        status: "pending",
        accountName: accountName,
        bank,
        withdrawalID: withdrawalID,
      });

      // Ensure all totals are properly calculated
      user.totalBalance = Number(user.totalBalance) - numericAmount;
      user.totalEarnings = Number(user.totalEarnings) - numericAmount;
      user.totalWithdrawals = Number(user.totalWithdrawals) + numericAmount;

      await user.save();

      res
        .status(201)
        .json({ message: "Withdrawal request submitted successfully." });
    } else {
      res.status(404).json({ message: "User not found." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error processing withdrawal request." });
  }
});
// Update the status of a withdrawal request (accepted/rejected)
router.put("/paystack/update-withdrawal/:requestId", async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body; // 'accepted' or 'rejected'

  try {
    // Find the withdrawal request
    const withdrawalRequest = await requestWithdrawalSchema.findById(requestId);
    if (!withdrawalRequest) {
      return res.status(404).json({ message: "Withdrawal request not found." });
    }

    // Find the user
    const user = await userTypes.findById(withdrawalRequest.userId);
    if (!user) {
      return res.status(404).json({ message: "userTypes not found." });
    }

    // Update the status of the withdrawal request
    withdrawalRequest.status = status;
    await withdrawalRequest.save();

    // Update the user's withdrawal status
    const withdrawal = user.withdrawals.find(
      (w) => w.accountNumber === withdrawalRequest.accountNumber
    );
    if (withdrawal) {
      withdrawal.status = status;
      await user.save();
    }

    res
      .status(200)
      .json({ message: `Withdrawal request ${status} successfully.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating withdrawal request." });
  }
});



module.exports = router;
