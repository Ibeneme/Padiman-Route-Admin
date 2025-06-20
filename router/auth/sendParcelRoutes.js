const express = require("express");
const SendParcel = require("../../models/SendParcel");
const DeliverParcel = require("../../models/DeliverParcel");
const PassengerRequest = require("../../models/Passengers");
const Driver = require("../../models/driver");
const PairedDriver = require("../../models/PairedDriverSchema");
const router = express.Router();

// Haversine formula to calculate the distance in km
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Route to create a new parcel request (no changes here)
router.post("/", async (req, res) => {
  console.log("POST / - Received request to create new parcel.");
  try {
    const newParcel = new SendParcel(req.body);
    console.log("New parcel object created:", newParcel);
    const savedParcel = await newParcel.save();
    console.log("New parcel saved successfully:", savedParcel._id);
    res.status(201).json({ success: true, data: savedParcel });
    console.log("Response sent: 201 Created for new parcel.");
  } catch (error) {
    console.error("Error creating new parcel:", error.message);
    res.status(500).json({ success: false, error: error.message });
    console.log("Response sent: 500 Internal Server Error for new parcel.");
  }
});

// Route to find the nearest driver for a parcel or passenger request
router.post("/find-nearest-driver", async (req, res) => {
  console.log("POST /find-nearest-driver - Received request.");
  const { id, activeTab, new: isNew } = req.body;
  console.log(
    `Request details: ID=${id}, activeTab=${activeTab}, isNew=${isNew}`
  );

  try {
    // Validate required input parameters
    if (!id || !activeTab || isNew === undefined) {
      console.log("Validation failed: Missing ID, activeTab, or isNew.");
      return res.status(400).json({
        success: false,
        message: "ID, activeTab, and 'new' (isNew) are required.",
      });
    }

    // SEARCH_RADII_KM is no longer directly used for finding "closest" but kept for context if needed elsewhere.
    // const SEARCH_RADII_KM = [5, 10, 25, 50, 100, 200];
    // console.log("Search radii defined:", SEARCH_RADII_KM);

    const isDriverFlow =
      activeTab === "deliverParcel" || activeTab === "offerRide";
    console.log(`isDriverFlow: ${isDriverFlow}`);

    let dataModel;
    let availableDrivers = [];

    // --- Logic for Driver's perspective (already has a paired request or viewing a customer request) ---
    // This section remains unchanged as it's about a driver viewing an existing pairing.
    if (isDriverFlow) {
      console.log("Entering Driver Flow logic.");
      const pairedDriver = await PairedDriver.findOne({
        driverRequestId: id,
      }).populate("driverRequestModel");
      console.log(
        "PairedDriver found (if any):",
        pairedDriver ? pairedDriver._id : "None"
      );

      if (!pairedDriver) {
        console.log("No paired driver found for the given driverRequestId.");
        return res.status(404).json({
          success: false,
          message: "No active paired request found for this driver.",
        });
      }

      let customerRequestModel;
      if (activeTab === "deliverParcel") {
        customerRequestModel = await SendParcel.findById(
          pairedDriver.customerRequestId
        );
        console.log(
          "Customer request model (SendParcel) found:",
          customerRequestModel ? customerRequestModel._id : "None"
        );
      } else if (activeTab === "offerRide") {
        customerRequestModel = await PassengerRequest.findById(
          pairedDriver.customerRequestId
        );
        console.log(
          "Customer request model (PassengerRequest) found:",
          customerRequestModel ? customerRequestModel._id : "None"
        );
      }

      if (!customerRequestModel) {
        console.log("Associated customer request not found for paired driver.");
        return res.status(404).json({
          success: false,
          message: "Associated customer request not found.",
        });
      }

      console.log(
        "Returning paired driver and customer request model for driver flow."
      );
      return res.status(200).json({
        success: true,
        pairedDriver: pairedDriver,
        closestDriver: customerRequestModel, // Renamed from 'closestDriver' to reflect it's the customer's request
      });
    }

    // --- Logic for Customer's perspective (finding a driver for their request) ---
    console.log("Entering Customer Flow logic.");
    // Determine the correct model and available drivers based on activeTab
    if (activeTab === "sendParcel") {
      dataModel = await SendParcel.findById(id);
      console.log("Customer's SendParcel Request Data:", dataModel);
      availableDrivers = await DeliverParcel.find(); // Fetch all available delivery drivers
      console.log(
        "Available DeliverParcels fetched. Count:",
        availableDrivers.length
      );
    } else if (activeTab === "joinRide") {
      dataModel = await PassengerRequest.findById(id);
      console.log("Customer's PassengerRequest Data:", dataModel);
      availableDrivers = await Driver.find(); // Fetch all available passenger drivers
      console.log("Available Drivers fetched. Count:", availableDrivers.length);
    } else {
      console.log(
        "Validation failed: Invalid activeTab value for customer flow."
      );
      return res
        .status(400)
        .json({ success: false, message: "Invalid activeTab value." });
    }

    // Check if the customer's request data exists
    if (!dataModel) {
      console.log("Customer request data not found for ID:", id);
      return res
        .status(404)
        .json({ success: false, message: "Request data not found." });
    }

    // No need for userLat/userLng or distance calculations if we're just selecting randomly.
    // These lines are now commented out or can be removed if not used elsewhere in this flow.
    // const userLat = parseFloat(dataModel.location_lat);
    // const userLng = parseFloat(dataModel.location_lng);
    // if (isNaN(userLat) || isNaN(userLng)) {
    //   console.log("Validation failed: Invalid latitude or longitude in customer request.");
    //   return res.status(400).json({ success: false, message: "Invalid latitude or longitude in request." });
    // }

    let foundDriver = null;
    let driverSelectionMethod = ""; // To indicate how the driver was selected

    // --- Refactored Driver Selection Logic ---
    if (availableDrivers.length === 0) {
      console.log("No available drivers found at all.");
      return res.status(404).json({
        success: false,
        message: "No available drivers found at all, please try again later.",
      });
    }

    if (isNew) {
      // If 'Find another driver' (isNew=true), remove any existing pairing for this customer request
      const existingPairedDriver = await PairedDriver.findOne({
        customerRequestId: id,
      });
      if (existingPairedDriver) {
        console.log(
          `Existing paired driver (ID: ${existingPairedDriver._id}) found for customer request (ID: ${id}), deleting.`
        );
        await PairedDriver.deleteOne({ customerRequestId: id });
        console.log("Existing paired driver deleted successfully.");
      }

      // Randomly select a driver from availableDrivers
      const randomIndex = Math.floor(Math.random() * availableDrivers.length);
      foundDriver = availableDrivers[randomIndex];
      driverSelectionMethod = "random";
      console.log(`Random driver assigned. Driver ID: ${foundDriver._id}.`);
    } else {
      // If 'isNew' is false, check for existing pairing first
      console.log(
        `isNew is false. Checking for existing paired driver for customer request ${id}.`
      );
      const pairedDriver = await PairedDriver.findOne({
        customerRequestId: id,
      });

      if (pairedDriver) {
        console.log(`Existing paired driver (ID: ${pairedDriver._id}) found.`);
        // If an existing pairing is found, return it
        // In this case, 'foundDriver' should be the driver from the existing pairing
        if (activeTab === "sendParcel") {
          foundDriver = await DeliverParcel.findById(
            pairedDriver.driverRequestId
          );
        } else if (activeTab === "joinRide") {
          foundDriver = await Driver.findById(pairedDriver.driverRequestId);
        }

        if (!foundDriver) {
          console.warn(
            `Paired driver (ID: ${pairedDriver.driverRequestId}) not found in its respective collection.`
          );
          // Fallback to random if the paired driver somehow doesn't exist
          const randomIndex = Math.floor(
            Math.random() * availableDrivers.length
          );
          foundDriver = availableDrivers[randomIndex];
          driverSelectionMethod = "random_fallback";
          console.log(
            `Random driver assigned as fallback. Driver ID: ${foundDriver._id}.`
          );
        } else {
          driverSelectionMethod = "existing_paired";
          console.log(
            `Existing paired driver re-used. Driver ID: ${foundDriver._id}.`
          );
        }
      } else {
        console.log(
          "No existing paired driver found for this customer request. Randomly selecting a new one."
        );
        // If no existing pairing and it's not a 'new' request, we still need a driver.
        // So, we proceed to randomly select one.
        const randomIndex = Math.floor(Math.random() * availableDrivers.length);
        foundDriver = availableDrivers[randomIndex];
        driverSelectionMethod = "random_new";
        console.log(`Random driver assigned. Driver ID: ${foundDriver._id}.`);
      }
    }

    // If no driver was found even after the above logic (shouldn't happen if availableDrivers > 0)
    if (!foundDriver) {
      console.log("No drivers found after selection logic, returning 404.");
      return res.status(404).json({
        success: false,
        message: "No available drivers found at all, please try again later.",
      });
    }

    // --- Prepare Response based on Pairing Status ---
    let pairedDriverInstance = null;
    let isDriverPaired = false;
    let responseMessage = "";

    if (
      isNew ||
      (driverSelectionMethod === "random_new" && !pairedDriverInstance)
    ) {
      // If it's a new request for a driver, or we randomly selected a new driver because no prior pairing existed
      console.log(
        `Creating new paired driver for customer ${dataModel._id} and selected driver ${foundDriver._id}.`
      );
      pairedDriverInstance = new PairedDriver({
        customerRequestId: dataModel._id,
        customerRequestModel:
          activeTab === "sendParcel" ? "SendParcel" : "PassengerRequest",
        driverRequestId: foundDriver._id,
        driverRequestModel:
          activeTab === "sendParcel" ? "DeliverParcel" : "Driver",
        customerUserId: dataModel.userId,
        driverUserId: foundDriver.userId,
        price: foundDriver.price || 0,
      });

      await pairedDriverInstance.save();
      isDriverPaired = true;
      responseMessage = `Random driver assigned and new pairing created successfully.`;
      console.log(
        "New paired driver saved successfully:",
        pairedDriverInstance._id
      );
    } else if (driverSelectionMethod === "existing_paired") {
      // If we found and reused an existing paired driver
      pairedDriverInstance = await PairedDriver.findOne({
        customerRequestId: id,
      }); // Re-fetch to ensure we have the correct object
      isDriverPaired = true;
      responseMessage = "Existing paired driver found and reused.";
    } else if (driverSelectionMethod === "random_fallback") {
      // This case means a paired driver was expected but not found, so a random one was assigned
      // We still need to create a new pairing for this fallback random driver
      console.log(
        `Creating new paired driver (fallback) for customer ${dataModel._id} and selected driver ${foundDriver._id}.`
      );
      pairedDriverInstance = new PairedDriver({
        customerRequestId: dataModel._id,
        customerRequestModel:
          activeTab === "sendParcel" ? "SendParcel" : "PassengerRequest",
        driverRequestId: foundDriver._id,
        driverRequestModel:
          activeTab === "sendParcel" ? "DeliverParcel" : "Driver",
        customerUserId: dataModel.userId,
        driverUserId: foundDriver.userId,
        price: foundDriver.price || 0,
      });
      await pairedDriverInstance.save();
      isDriverPaired = true;
      responseMessage =
        "Existing paired driver not found, new random driver assigned and paired.";
      console.log(
        "Fallback new paired driver saved successfully:",
        pairedDriverInstance._id
      );
    } else {
      // This scenario would be if isNew is false, no existing pairing, and a random driver was just "found"
      // without an explicit "new" request. We should still create a pairing.
      console.log(
        `No prior pairing, creating new paired driver for customer ${dataModel._id} and selected driver ${foundDriver._id}.`
      );
      pairedDriverInstance = new PairedDriver({
        customerRequestId: dataModel._id,
        customerRequestModel:
          activeTab === "sendParcel" ? "SendParcel" : "PassengerRequest",
        driverRequestId: foundDriver._id,
        driverRequestModel:
          activeTab === "sendParcel" ? "DeliverParcel" : "Driver",
        customerUserId: dataModel.userId,
        driverUserId: foundDriver.userId,
        price: foundDriver.price || 0,
      });
      await pairedDriverInstance.save();
      isDriverPaired = true;
      responseMessage = "New random driver assigned and paired successfully.";
      console.log(
        "New paired driver saved successfully:",
        pairedDriverInstance._id
      );
    }

    res.status(200).json({
      success: true,
      data: dataModel, // Original customer request data
      isDriverPaired: isDriverPaired, // Indicates if a pairing has been established
      pairedDriver: pairedDriverInstance, // The relevant paired request object
      closestDriver: foundDriver, // The selected driver (random or existing)
      message: responseMessage,
    });
    console.log("Response sent: 200 OK for driver selection/pairing.");
  } catch (error) {
    console.error("Critical error in /find-nearest-driver:", error.message);
    res.status(500).json({ success: false, error: error.message });
    console.log("Response sent: 500 Internal Server Error due to exception.");
  }
});

// Other routes (no changes)
router.get("/", async (req, res) => {
  console.log("GET / - Received request for all parcels.");
  try {
    const parcels = await SendParcel.find();
    console.log(`Found ${parcels.length} parcels.`);
    res.status(200).json({ success: true, parcels });
    console.log("Response sent: 200 OK for all parcels.");
  } catch (error) {
    console.error("Error getting all parcels:", error.message);
    res.status(500).json({ success: false, error: error.message });
    console.log("Response sent: 500 Internal Server Error for all parcels.");
  }
});

router.get("/:id", async (req, res) => {
  const parcelId = req.params.id;
  console.log(`GET /${parcelId} - Received request for parcel by ID.`);
  try {
    const parcel = await SendParcel.findById(parcelId);
    if (!parcel) {
      console.log(`Parcel with ID ${parcelId} not found.`);
      return res
        .status(404)
        .json({ success: false, message: "Parcel not found" });
    }
    console.log(`Parcel with ID ${parcelId} found.`);
    res.status(200).json({ success: true, data: parcel });
    console.log(`Response sent: 200 OK for parcel ${parcelId}.`);
  } catch (error) {
    console.error(`Error getting parcel by ID ${parcelId}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
    console.log(
      `Response sent: 500 Internal Server Error for parcel ${parcelId}.`
    );
  }
});

router.get("/user/:userId", async (req, res) => {
  const userId = req.params.userId;
  console.log(`GET /user/${userId} - Received request for parcels by user ID.`);
  try {
    const parcels = await SendParcel.find({ userId: userId });
    if (!parcels || parcels.length === 0) {
      console.log(`No parcels found for user ID ${userId}.`);
      return res
        .status(404)
        .json({ success: false, message: "No parcels found for this user" });
    }
    console.log(`Found ${parcels.length} parcels for user ID ${userId}.`);
    res.status(200).json({ success: true, data: parcels });
    console.log(`Response sent: 200 OK for user ${userId} parcels.`);
  } catch (error) {
    console.error(`Error getting parcels by user ID ${userId}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
    console.log(
      `Response sent: 500 Internal Server Error for user ${userId} parcels.`
    );
  }
});

router.put("/:id", async (req, res) => {
  const parcelId = req.params.id;
  console.log(`PUT /${parcelId} - Received request to update parcel by ID.`);
  try {
    const updatedParcel = await SendParcel.findByIdAndUpdate(
      parcelId,
      req.body,
      { new: true } // Return the updated document
    );
    if (!updatedParcel) {
      console.log(`Parcel with ID ${parcelId} not found for update.`);
      return res
        .status(404)
        .json({ success: false, message: "Parcel not found" });
    }
    console.log(`Parcel with ID ${parcelId} updated successfully.`);
    res.status(200).json({ success: true, data: updatedParcel });
    console.log(`Response sent: 200 OK for updated parcel ${parcelId}.`);
  } catch (error) {
    console.error(`Error updating parcel ${parcelId}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
    console.log(
      `Response sent: 500 Internal Server Error for updating parcel ${parcelId}.`
    );
  }
});

router.delete("/:id", async (req, res) => {
  const parcelId = req.params.id;
  console.log(`DELETE /${parcelId} - Received request to delete parcel by ID.`);
  try {
    const deletedParcel = await SendParcel.findByIdAndDelete(parcelId);
    if (!deletedParcel) {
      console.log(`Parcel with ID ${parcelId} not found for deletion.`);
      return res
        .status(404)
        .json({ success: false, message: "Parcel not found" });
    }
    console.log(`Parcel with ID ${parcelId} deleted successfully.`);
    res
      .status(200)
      .json({ success: true, message: "Parcel deleted successfully" });
    console.log(`Response sent: 200 OK for deleted parcel ${parcelId}.`);
  } catch (error) {
    console.error(`Error deleting parcel ${parcelId}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
    console.log(
      `Response sent: 500 Internal Server Error for deleting parcel ${parcelId}.`
    );
  }
});

module.exports = router;
