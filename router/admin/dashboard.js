const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("../../utils/decode");
const userTypes = require("../../models/userTypes");
const sendParcel = require("../../models/SendParcel");
const PassengerRequest = require("../../models/Passengers");
const DeliverParcel = require("../../models/DeliverParcel");
const Driver = require("../../models/driver");
const Post = require("../../models/post");

const adminSchema = require("../../models/adminSchema");
// const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const BecomeADriver = require("../../models/becomeADriverSchema");
const requestWithdrawalSchema = require("../../models/requestWithdrawals");

const router = express.Router();

router.get("/dashboard-summary", async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    // 1. Calculate signups by month
    const signupsByMonth = await userTypes.aggregate([
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          signupCount: { $sum: 1 },
        },
      },
    ]);

    // 2. Calculate totals
    const totals = await userTypes.aggregate([
      {
        $group: {
          _id: null,
          totalWithdrawals: { $sum: "$totalWithdrawals" },
          totalRefunds: { $sum: "$totalRefunds" },
          totalBalance: { $sum: "$totalBalance" },
        },
      },
    ]);

    // 3. Count blocked drivers
    const blockedDrivers = await userTypes.countDocuments({
      is_driver_blocked: true,
    });

    // 4. Count referred users
    const referredUsers = await userTypes.countDocuments({
      referredBy: { $ne: null },
    });

    // 5. Parcel status counts
    const sendParcelStatusCounts = await sendParcel.aggregate([
      {
        $group: {
          _id: null,
          placed: { $sum: { $cond: [{ $eq: ["$paid", false] }, 1, 0] } },
          paid: { $sum: { $cond: ["$paid", 1, 0] } },
          startRide: { $sum: { $cond: ["$startRide", 1, 0] } },
          refundRide: { $sum: { $cond: ["$refundRide", 1, 0] } },
          confirmRide: { $sum: { $cond: ["$confirmRide", 1, 0] } },
          endRide: { $sum: { $cond: ["$endRide", 1, 0] } },
        },
      },
    ]);

    // 6. Passenger request status counts
    const joinRide = await PassengerRequest.aggregate([
      {
        $group: {
          _id: null,
          placed: { $sum: { $cond: [{ $eq: ["$paid", false] }, 1, 0] } },
          paid: { $sum: { $cond: ["$paid", 1, 0] } },
          startRide: { $sum: { $cond: ["$startRide", 1, 0] } },
          refundRide: { $sum: { $cond: ["$refundRide", 1, 0] } },
          confirmRide: { $sum: { $cond: ["$confirmRide", 1, 0] } },
          endRide: { $sum: { $cond: ["$endRide", 1, 0] } },
        },
      },
    ]);

    // Prepare the response
    res.status(200).json({
      signupsByMonth,
      totals: totals[0] || {
        totalWithdrawals: 0,
        totalRefunds: 0,
        totalBalance: 0,
      },
      blockedDrivers,
      referredUsers,
      sendParcelStatusCounts: sendParcelStatusCounts[0] || {
        placed: 0,
        paid: 0,
        startRide: 0,
        refundRide: 0,
        confirmRide: 0,
        endRide: 0,
      },
      joinRide: joinRide[0] || {
        placed: 0,
        paid: 0,
        startRide: 0,
        refundRide: 0,
        confirmRide: 0,
        endRide: 0,
      },
    });
  } catch (error) {
    console.log("Error fetching dashboard summary:", error);
    res.status(500).json({ error: "Failed to fetch dashboard summary." });
  }
});

router.get("/deliver-parcels", async (req, res) => {
  try {
    // Fetch all parcels from the database
    const parcels = await DeliverParcel.find();

    // Respond with the fetched parcels
    res.status(200).json({
      success: true,
      message: "Parcels retrieved successfully.",
      data: parcels,
    });
  } catch (error) {
    // Handle errors and send a response
    res.status(500).json({
      success: false,
      message: "Error fetching parcels.",
      error: error.message,
    });
  }
});

// Route to get all rides
router.get("/offer-ride", async (req, res) => {
  try {
    // Fetch all rides from the database
    const rides = await Driver.find();

    // Respond with the fetched rides
    res.status(200).json({
      success: true,
      message: "Rides retrieved successfully.",
      data: rides,
    });
  } catch (error) {
    // Handle errors and send an error response
    res.status(500).json({
      success: false,
      message: "Error fetching rides.",
      error: error.message,
    });
  }
});

// Route to get all posts
router.get("/posts", async (req, res) => {
  try {
    // Fetch all posts from the database
    const posts = await Post.find();

    // Respond with the fetched posts
    res.status(200).json({
      success: true,
      message: "Posts retrieved successfully.",
      data: posts,
    });
  } catch (error) {
    // Handle any errors
    res.status(500).json({
      success: false,
      message: "Error fetching posts.",
      error: error.message,
    });
  }
});

// Endpoint to get all withdrawal requests
router.get("/withdrawal-requests", async (req, res) => {
  try {
    // Fetch all withdrawal requests from the database
    const requests = await requestWithdrawalSchema.find();

    // Respond with the fetched data
    res.status(200).json({
      success: true,
      message: "Withdrawal requests retrieved successfully.",
      data: requests,
    });
  } catch (error) {
    // Handle errors
    res.status(500).json({
      success: false,
      message: "Error fetching withdrawal requests.",
      error: error.message,
    });
  }
});

// POST /rate - Rate a user based on ride or delivery type
router.post("/rate", async (req, res) => {
  const { userId, rating, requestId, type } = req.body;

  if (rating < 0 || rating > 5) {
    return res.status(400).json({
      error: true,
      message: "Rating must be between 0 and 5.",
    });
  }

  try {
    // Fetch user and update average rating
    const user = await userTypes.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: true,
        message: "User not found.",
      });
    }

    // Calculate new average rating
    const totalRatings = user.ratings?.length || 0;
    const currentAverage = user.average_rating || 0;

    const newAverage =
      (currentAverage * totalRatings + rating) / (totalRatings + 1);

    // Update user with the new rating
    user.average_rating = newAverage.toFixed(2); // Limit to 2 decimal places
    user.ratings = [...(user.ratings || []), rating]; // Track individual ratings
    await user.save();

    // Update `rateRide` in respective schema
    if (type === "ride") {
      const ride = await PassengerRequest.findById(requestId);
      if (!ride) {
        return res.status(404).json({
          error: true,
          message: "Ride request not found.",
        });
      }
      ride.rateRide = true;
      await ride.save();
    } else if (type === "delivery") {
      const delivery = await sendParcel.findById(requestId);
      if (!delivery) {
        return res.status(404).json({
          error: true,
          message: "Delivery request not found.",
        });
      }
      delivery.rateRide = true;
      await delivery.save();
    } else {
      return res.status(400).json({
        error: true,
        message: 'Invalid type. Must be "ride" or "delivery".',
      });
    }

    res.status(200).json({
      success: true,
      message: "Rating submitted and rateRide updated successfully.",
      averageRating: user.average_rating,
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: "An error occurred: " + error.message,
    });
  }
});

router.get("/passenger-requests", async (req, res) => {
  try {
    // Fetch all passenger requests from the database
    const requests = await PassengerRequest.find();

    // Transform data to match your sample format
    const formattedRequests = requests.map((request) => ({
      _id: request._id,
      destination: request.destination,
      travelling_date: request.travelling_date,
      current_city: request.current_city,
      userId: request.userId,
      user_first_name: request.user_first_name,
      user_last_name: request.user_last_name,
      users_phone_number: request.users_phone_number,
      paid: request.paid,
      endRide: request.endRide,
      cancelRide: request.cancelRide,
      confirmRide: request.confirmRide,
      refundRide: request.refundRide,
      reportRide: request.reportRide,
      startRide: request.startRide,
      driver: request.driver,
      driver_first_name: request.driver_first_name,
      driver_last_name: request.driver_last_name,
      driver_phone_number: request.driver_phone_number,
    }));

    // Respond with the formatted data
    res.status(200).json({
      success: true,
      message: "Passenger requests retrieved successfully.",
      data: formattedRequests,
    });
  } catch (error) {
    // Handle errors
    res.status(500).json({
      success: false,
      message: "Error fetching passenger requests.",
      error: error.message,
    });
  }
});

// Get all parcel data
router.get("/send-parcels", async (req, res) => {
  try {
    // Fetch all parcels from the database
    const parcels = await sendParcel.find();

    // Transform data to match the sample format
    const formattedParcels = parcels.map((parcel) => ({
      _id: parcel._id,
      user_first_name: parcel.user_first_name,
      user_last_name: parcel.user_last_name,
      receiver_name: parcel.receiver_name,
      paid: parcel.paid,
      amount: parcel.amount,
      endRide: parcel.endRide,
      cancelRide: parcel.cancelRide,
      confirmRide: parcel.confirmRide,
      startRide: parcel.startRide,
      refundRide: parcel.refundRide,
      state: parcel.state,
      sender_city: parcel.sender_city,
      receiver_city: parcel.receiver_city,
      delivery_date: parcel.delivery_date,
      is_perishable: parcel.is_perishable,
      is_fragile: parcel.is_fragile,
    }));

    // Respond with the formatted data
    res.status(200).json({
      success: true,
      message: "Parcels retrieved successfully.",
      data: formattedParcels,
    });
  } catch (error) {
    // Handle errors
    res.status(500).json({
      success: false,
      message: "Error fetching parcels.",
      error: error.message,
    });
  }
});

// Route to get all admins
// Route to get all admins
router.get("/admins", async (req, res) => {
  try {
    // Fetch all admins without filtering by role
    const admins = await adminSchema.find();

    if (admins.length === 0) {
      return res.status(404).json({ message: "No admins found" });
    }

    // Return the list of admins
    res.status(200).json({ admins, success: true });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ message: "Error fetching admins" });
  }
});

// Route to get user data
router.get("/users", async (req, res) => {
  try {
    // Fetch users where the 'delete' flag is false
    const users = await userTypes.find({ delete: false });
    const formattedUsers = users.map((user) => ({
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      email: user.email,
      totalEarnings: user.totalEarnings,
      totalWithdrawals: user.totalWithdrawals,
      totalRefunds: user.totalRefunds,
      totalBalance: user.totalBalance,
      profile_img_url: user.profile_img_url,
      facial_verified: user.facial_verified,
      has_verified_bvn: user.has_verified_bvn,
      has_verified_licence: user.has_verified_licence,
      is_verified: user.is_verified,
      is_driver_blocked: user.is_driver_blocked,
      average_rating: user.average_rating,
      blocked: user.blocked,
      delete: user.delete,
      earnings: user.earnings,
      withdrawals: user.withdrawals,
      is_driver: user.is_driver,
      become_a_driver: user.become_a_driver,
    }));

    // Respond with the filtered and formatted data
    res.status(200).json({
      success: true,
      message: "Users retrieved successfully.",
      data: formattedUsers,
    });
  } catch (error) {
    // Handle errors
    res.status(500).json({
      success: false,
      message: "Error fetching users.",
      error: error.message,
    });
  }
});

const deleteUsersAfter7Days = async () => {
  const currentDate = moment();
  const usersToDelete = await UserType.find({
    delete: true,
    updatedAt: { $lte: currentDate.subtract(7, "days").toDate() }, // Users older than 7 days with `delete` flag set to true
  });

  // Perform the deletion
  for (const user of usersToDelete) {
    await userTypes.findByIdAndDelete(user._id);
  }
};

// Middleware to check and automatically delete users after 7 days
setInterval(deleteUsersAfter7Days, 24 * 60 * 60 * 1000); // Check every day

// Route to update the `delete` and `blocked` flags for users
router.post("/users/update-status", async (req, res) => {
  const { userIds, deleteFlag, blockFlag } = req.body; // userIds: Array of user objects or IDs, deleteFlag: boolean, blockFlag: boolean
  console.log(userIds, deleteFlag, blockFlag, "userIds");

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide an array of user IDs or user objects.",
    });
  }

  // Check if userIds is an array of user objects or just IDs.
  let ids = [];
  if (typeof userIds[0] === "string") {
    // If userIds contains just the IDs (strings)
    ids = userIds;
  } else if (userIds[0] && userIds[0]._id) {
    // If userIds contains user objects with _id field
    ids = userIds.map((user) => user._id);
  } else {
    return res.status(400).json({
      success: false,
      message: "User IDs must be strings or user objects containing '_id'.",
    });
  }

  // Validate all extracted IDs are valid MongoDB ObjectId strings (24 hex characters)
  if (!ids.every((id) => mongoose.Types.ObjectId.isValid(id))) {
    return res.status(400).json({
      success: false,
      message: "All user IDs must be valid MongoDB ObjectIds.",
    });
  }

  try {
    // Perform the batch update using extracted IDs
    const result = await userTypes.updateMany(
      { _id: { $in: ids } },
      { $set: { delete: deleteFlag, blocked: blockFlag } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found with the provided IDs.",
      });
    }

    res.status(200).json({
      success: true,
      message: `${result.matchedCount} users updated successfully.`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user status.",
      error: error.message,
    });
  }
});

// Route to delete DeliverParcel items by ID array
router.post("/deliverparcels/delete", async (req, res) => {
  const { ids } = req.body; // Array of IDs to be deleted

  console.log(ids, "ids");

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide an array of IDs.",
    });
  }

  try {
    // Delete the documents where the ID is in the array
    const result = await DeliverParcel.deleteMany({
      _id: { $in: ids },
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No DeliverParcel documents found with the provided IDs.",
      });
    }

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} DeliverParcel document(s) deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting DeliverParcel documents.",
      error: error.message,
    });
  }
});

// Route to delete SendParcel items by ID array
router.post("/sendparcels/delete", async (req, res) => {
  const { ids } = req.body;
  console.log(ids, "ids");
  if (!Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide an array of IDs." });
  }

  try {
    const result = await sendParcel.deleteMany({ _id: { $in: ids } });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No SendParcel documents found with the provided IDs.",
      });
    }

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} SendParcel document(s) deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting SendParcel documents.",
      error: error.message,
    });
  }
});

// Route to delete Driver items by ID array
router.post("/drivers/delete", async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide an array of IDs." });
  }

  try {
    const result = await Driver.deleteMany({ _id: { $in: ids } });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No Driver documents found with the provided IDs.",
      });
    }

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} Driver document(s) deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting Driver documents.",
      error: error.message,
    });
  }
});

// Route to delete PassengerRequest items by ID array
router.post("/passengerrequests/delete", async (req, res) => {
  const { ids } = req.body;
  console.log(ids, "ids");

  if (!Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide an array of IDs." });
  }

  try {
    const result = await PassengerRequest.deleteMany({ _id: { $in: ids } });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No PassengerRequest documents found with the provided IDs.",
      });
    }

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} PassengerRequest document(s) deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting PassengerRequest documents.",
      error: error.message,
    });
  }
});

// Route to accept or reject withdrawal requests by ID array
router.post("/withdrawals/accept-reject", async (req, res) => {
  const { ids, status } = req.body; // Expecting an array of IDs and the status to update ("accepted" or "rejected")

  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    !status ||
    !["accepted", "rejected"].includes(status)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Please provide an array of IDs and a valid status ('accepted' or 'rejected').",
    });
  }

  try {
    const result = await RequestWithdrawal.updateMany(
      { _id: { $in: ids } },
      { $set: { status } },
      { multi: true }
    );

    if (result.nModified === 0) {
      return res.status(404).json({
        success: false,
        message: "No withdrawal requests found with the provided IDs.",
      });
    }

    res.status(200).json({
      success: true,
      message: `${result.nModified} withdrawal request(s) updated to '${status}' successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating withdrawal requests.",
      error: error.message,
    });
  }
});

// Route to delete admins by an array of ids
router.delete("/admins", async (req, res) => {
  const { ids } = req.body; // Expecting an array of admin IDs in the request body

  if (!Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .json({ message: "Please provide an array of admin IDs." });
  }

  try {
    // Delete the users where the user ID is in the array of provided IDs
    const result = await adminSchema.deleteMany({
      _id: { $in: ids },
      role: "admin",
    });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: "No admins found with the provided IDs." });
    }

    res
      .status(200)
      .json({ message: `${result.deletedCount} admins deleted successfully.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting admins." });
  }
});

router.post("/posts", async (req, res) => {
  try {
    const { text, userId, first_name, last_name, admin } = req.body;

    // Create a new post
    const newPost = new Post({
      text,
      userId,
      first_name,
      last_name,
      admin,
    });

    // Save the post to the database
    const savedPost = await newPost.save();
    res.status(201).json({ success: true, post: savedPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create post" });
  }
});

// Route to delete a post by ID
router.delete("/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;

    // Find and delete the post by its ID
    const deletedPost = await Post.findByIdAndDelete(postId);

    if (!deletedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete post" });
  }
});

// Create an admin
// Create an admin
router.post("/create-admin", async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, password, superAdmin } = req.body;

    // Do not allow superAdmin flag to be set manually (default is false)
    if (superAdmin) {
      return res.status(400).json({ message: "Cannot create a super admin." });
    }

    // Check if admin with this phone number already exists
    const existingAdmin = await adminSchema.findOne({ phoneNumber });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ message: "Admin with this phone number already exists" });
    }

    const newAdmin = new adminSchema({
      firstName,
      lastName,
      phoneNumber,
      password, // Save plain password without hashing
      superAdmin: false,
    });

    // Save the new admin to the database
    await newAdmin.save();
    res.status(201).json({
      message: "Admin created successfully",
      admin: newAdmin,
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
// Delete an admin
router.delete("/delete-admin/:id", async (req, res) => {
  try {
    const adminId = req.params.id;

    // Check if the admin to delete is a super admin
    const adminToDelete = await adminSchema.findById({ _id: adminId });
    if (!adminToDelete) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Prevent deletion of super admin
    if (adminToDelete.superAdmin) {
      return res.status(400).json({ message: "Cannot delete a super admin" });
    }

    // Delete the admin
    await adminSchema.findByIdAndDelete(adminId);
    res
      .status(200)
      .json({ message: "Admin deleted successfully", success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/update-withdrawal", async (req, res) => {
  const { status, withdrawalID, _id } = req.body; // "accepted" or "rejected"
  const userId = _id;
  console.log(status, withdrawalID, userId, "status, withdrawalID, userId");

  try {
    // Step 1: Fetch the withdrawal request by withdrawalID
    const withdrawalRequest = await requestWithdrawalSchema.findOne({
      withdrawalID,
    });
    if (!withdrawalRequest) {
      return res.status(404).json({ message: "Withdrawal request not found" });
    }
    console.log(withdrawalRequest, "withdrawalRequest");

    // Step 2: Fetch the user associated with the withdrawal request
    const user = await userTypes.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { requestedAmount } = withdrawalRequest;

    // Step 3: Handle withdrawal status updates
    if (status === "accepted") {
      // Update user's balance and earnings if accepted
      user.totalBalance -= requestedAmount;
      user.totalEarnings += requestedAmount;

      // Update withdrawal request status to accepted
      withdrawalRequest.status = "accepted";

      // Step 4: Find the specific withdrawal object in user's withdrawals array and update it
      const withdrawalIndex = user.withdrawals.findIndex(
        (withdrawal) => withdrawal.withdrawalID === withdrawalID
      );
      if (withdrawalIndex !== -1) {
        user.withdrawals[withdrawalIndex].status = "accepted";
      }
    } else if (status === "rejected") {
      // Revert the user's balance and earnings if rejected
      user.totalBalance += requestedAmount;
      user.totalEarnings -= requestedAmount;

      // Record the rejection in the user's earnings
      user.earnings.push({
        amount: requestedAmount,
        date: new Date(),
        rideId: "withdrawal_rejected", // Customize this as needed
        type: "withdrawal rejected",
      });

      // Update withdrawal request status to rejected
      withdrawalRequest.status = "rejected";

      // Step 5: Find the specific withdrawal object in user's withdrawals array and update it
      const withdrawalIndex = user.withdrawals.findIndex(
        (withdrawal) => withdrawal.withdrawalID === withdrawalID
      );
      if (withdrawalIndex !== -1) {
        user.withdrawals[withdrawalIndex].status = "rejected";
      }
    } else {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Step 6: Save changes to user and withdrawal request
    await user.save();
    await withdrawalRequest.save();

    return res.status(200).json({
      message: `Withdrawal request ${status} successfully`,
      withdrawalRequest,
      user,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

router.get("/withdrawals-accepted", async (req, res) => {
  try {
    // Fetch users and filter for accepted withdrawals
    const users = await userTypes.find();

    let totalAmount = 0;
    let acceptedWithdrawals = [];

    users.forEach((user) => {
      // Filter withdrawals with status "accepted"
      const withdrawals = user.withdrawals.filter(
        (withdrawal) => withdrawal.status === "accepted"
      );

      // Add the amount of each accepted withdrawal to the totalAmount
      withdrawals.forEach((withdrawal) => {
        totalAmount += parseFloat(withdrawal.amount); // Convert to number if it's a string

        // Include user's first name, last name, and the time the withdrawal was accepted
        acceptedWithdrawals.push({
          amount: withdrawal.amount / 10,
          date: withdrawal.date,
          rideId: withdrawal.rideId,
          accountNumber: withdrawal.accountNumber,
          status: withdrawal.status,
          accountName: withdrawal.accountName,
          bank: withdrawal.bank,
          acceptedTime: withdrawal.date, // Time the withdrawal was accepted
          user: {
            first_name: user.first_name,
            last_name: user.last_name,
          },
        });
      });
    });

    // Return both the total amount and the withdrawal logs with user info
    res.json({
      success: true,
      totalAmount,
      data: acceptedWithdrawals,
    });
  } catch (error) {
    console.error("Error fetching accepted withdrawals:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/withdrawals-rejected", async (req, res) => {
  try {
    // Fetch users and filter for accepted withdrawals
    const users = await userTypes.find();

    let totalAmount = 0;
    let acceptedWithdrawals = [];

    users.forEach((user) => {
      // Filter withdrawals with status "accepted"
      const withdrawals = user.withdrawals.filter(
        (withdrawal) => withdrawal.status === "rejected"
      );

      // Add the amount of each accepted withdrawal to the totalAmount
      withdrawals.forEach((withdrawal) => {
        totalAmount += parseFloat(withdrawal.amount); // Convert to number if it's a string

        // Include user's first name, last name, and the time the withdrawal was accepted
        acceptedWithdrawals.push({
          amount: withdrawal.amount / 10,
          date: withdrawal.date,
          rideId: withdrawal.rideId,
          accountNumber: withdrawal.accountNumber,
          status: withdrawal.status,
          accountName: withdrawal.accountName,
          bank: withdrawal.bank,
          acceptedTime: withdrawal.date, // Time the withdrawal was accepted
          user: {
            first_name: user.first_name,
            last_name: user.last_name,
          },
        });
      });
    });

    // Return both the total amount and the withdrawal logs with user info
    res.json({
      success: true,
      totalAmount,
      data: acceptedWithdrawals,
    });
  } catch (error) {
    console.error("Error fetching accepted withdrawals:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/withdrawals-ref", async (req, res) => {
  try {
    // Fetch all users
    const users = await userTypes.find();

    let totalAmount = 0;
    let acceptedWithdrawals = [];
    let referralEarnings = {};

    users.forEach((user) => {
      // Filter withdrawals with status "accepted"
      const withdrawals = user.withdrawals.filter(
        (withdrawal) => withdrawal.status === "accepted"
      );

      // Calculate referral earnings and collect accepted withdrawals
      withdrawals.forEach((withdrawal) => {
        totalAmount += parseFloat(withdrawal.amount); // Add to total amount

        acceptedWithdrawals.push({
          amount: withdrawal.amount,
          date: withdrawal.date,
          rideId: withdrawal.rideId,
          accountNumber: withdrawal.accountNumber,
          status: withdrawal.status,
          accountName: withdrawal.accountName,
          bank: withdrawal.bank,
          acceptedTime: withdrawal.date,
          user: {
            first_name: user.first_name,
            last_name: user.last_name,
          },
        });

        // Calculate referral earnings for referrer if referredBy exists
        if (user.referredBy) {
          if (!referralEarnings[user.referredBy]) {
            referralEarnings[user.referredBy] = 0;
          }
          referralEarnings[user.referredBy] += withdrawal.amount * 0.03;
        }
      });
    });

    // Update referral earnings for each referrer
    for (const referrerId in referralEarnings) {
      await userTypes.updateOne(
        { user_id: referrerId },
        { $inc: { refferralearning: referralEarnings[referrerId] } }
      );
    }

    res.json({
      success: true,
      referralEarnings,
    });
  } catch (error) {
    console.error("Error fetching accepted withdrawals:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/drivers/applications", async (req, res) => {
  try {
    const applications = await BecomeADriver.find();
    res.status(200).json({ data: applications, success: true });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving applications", error });
  }
});

// Route to update application status
router.put("/drivers/applications/:userId", async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  console.log(userId, status);
  if (!["accepted", "rejected"].includes(status)) {
    return res
      .status(400)
      .json({ message: 'Invalid status value. Use "accepted" or "rejected".' });
  }

  try {
    // Update the BecomeADriver application
    const application = await BecomeADriver.findOneAndUpdate(
      { userId },
      { status },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: "Driver application not found." });
    }

    // Update the user's driver status
    const userUpdate =
      status === "accepted" ? { is_driver: true } : { become_a_driver: false };

    const user = await userTypes.findOneAndUpdate({ _id: userId }, userUpdate, {
      new: true,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res
      .status(200)
      .json({ message: "Status updated successfully", application, user });
  } catch (error) {
    res.status(500).json({ message: "Error updating status", error });
  }
});

module.exports = router;
