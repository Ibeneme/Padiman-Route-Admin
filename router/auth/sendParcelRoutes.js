const express = require("express");
const SendParcel = require("../../models/SendParcel");
const DeliverParcel = require("../../models/DeliverParcel");
const PassengerRequest = require("../../models/Passengers");
const Driver = require("../../models/driver");
// Correct imports
const PairedDriver = require("../../models/PairedDriverSchema");
// Adjust the path as needed
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

router.post("/find-nearest-driver", async (req, res) => {
  try {
    const { id, activeTab, new: isNew } = req.body; // Get the activeTab and new fields
    console.log("Request Body:", req.body); // Log the request body

    if (!id || !activeTab || isNew === undefined) {
      console.log("Missing required fields: ID, activeTab, or new"); // Log when required fields are missing
      return res.status(400).json({
        success: false,
        message: "ID, activeTab, and new are required",
      });
    }

    let dataModel;
    let availableDrivers = [];

    // Set isDriver based on the activeTab value
    const isDriver = activeTab === "deliverParcel" || activeTab === "offerRide";

    console.log("isDriver set to:", isDriver); // Log the value of isDriver

    console.log("Fetching data model based on activeTab:", activeTab); // Log before fetching data model

    // Fetch customer request and available drivers based on activeTab
    if (activeTab === "sendParcel") {
      dataModel = await SendParcel.findById(id);
      availableDrivers = await DeliverParcel.find(); // Fetch from DeliverParcel
    } else if (activeTab === "joinRide") {
      dataModel = await PassengerRequest.findById(id);
      availableDrivers = await Driver.find(); // Fetch from Driver model
    } else if (isDriver) {
      // If activeTab is 'deliverParcel' or 'offerRide', find the driver by driverRequestId
      const pairedDriver = await PairedDriver.findOne({
        driverRequestId: id,
      }).populate("driverRequestModel"); // Populate to get the referenced model data

      if (!pairedDriver) {
        console.log("No paired driver found for the given ID"); // Log if no paired driver is found
        return res.status(404).json({
          success: false,
          message: "No paired driver found for the given ID",
        });
      }

      // Now fetch the related customer request model (either SendParcel or PassengerRequest)
      let customerRequestModel;
      if (activeTab === "deliverParcel") {
        // Fetch SendParcel model based on customerRequestId
        customerRequestModel = await SendParcel.findById(
          pairedDriver.customerRequestId
        );
        console.log("Fetched SendParcel model:", customerRequestModel); // Log fetched SendParcel
      } else if (activeTab === "offerRide") {
        // Fetch PassengerRequest model based on customerRequestId
        customerRequestModel = await PassengerRequest.findById(
          pairedDriver.customerRequestId
        );
        console.log("Fetched PassengerRequest model:", customerRequestModel); // Log fetched PassengerRequest
      }

      return res.status(200).json({
        success: true,
        pairedDriver,
        closestDriver: customerRequestModel, // Return the customer request model based on the activeTab
      });
    } else {
      console.log("Invalid activeTab value:", activeTab); // Log invalid activeTab
      return res
        .status(400)
        .json({ success: false, message: "Invalid activeTab value" });
    }

    if (!dataModel) {
      console.log("Data model not found for ID:", id); // Log if data model is not found
      return res
        .status(404)
        .json({ success: false, message: "Data not found" });
    }

    // Extract lat and lng
    const userLat = parseFloat(dataModel.location_lat);
    const userLng = parseFloat(dataModel.location_lng);
    console.log("User coordinates:", userLat, userLng); // Log user coordinates

    if (isNaN(userLat) || isNaN(userLng)) {
      console.log("Invalid latitude or longitude:", userLat, userLng); // Log if lat or lng is invalid
      return res
        .status(400)
        .json({ success: false, message: "Invalid latitude or longitude" });
    }

    // Proceed with the logic to find the nearest driver when isDriver is false
    let closestDriver = null;
    let minDistance = Infinity;

    console.log("Calculating closest driver..."); // Log before calculating closest driver

    // Loop through all drivers and find the closest one
    availableDrivers.forEach((driver) => {
      if (driver.location_lat && driver.location_lng) {
        const driverLat = parseFloat(driver.location_lat);
        const driverLng = parseFloat(driver.location_lng);
        console.log("Driver coordinates:", driverLat, driverLng); // Log each driver's coordinates

        const distance = getDistance(userLat, userLng, driverLat, driverLng);
        console.log("Distance to driver:", distance); // Log distance calculation

        if (distance <= 1000 && distance < minDistance) {
          // Check if within 1000 km radius
          minDistance = distance;
          closestDriver = driver;
          console.log("Found closest driver:", closestDriver); // Log when a closest driver is found
        }
      }
    });

    if (isNew) {
      console.log("isNew is true, checking existing paired driver..."); // Log when creating a new paired driver

      // If `new` is true, create a new PairedDriver and delete any existing one with the same customerRequestId
      const existingPairedDriver = await PairedDriver.findOne({
        customerRequestId: id,
      });
      console.log("Existing paired driver:", existingPairedDriver); // Log existing paired driver

      if (existingPairedDriver) {
        console.log("Deleting existing paired driver..."); // Log before deleting existing paired driver
        await PairedDriver.deleteOne({ customerRequestId: id });
      }

      if (!closestDriver) {
        console.log("No closest driver found, creating a new driver..."); // Log when no closest driver is found
        // If no closest driver found, create a new driver
        const newDriver = new Driver({
          location_lat: userLat,
          location_lng: userLng,
          status: "available", // Default status, adjust as needed
          price: 100, // Example price, adjust as needed
        });

        console.log("New driver data:", newDriver); // Log new driver data
        // Save the new driver
        await newDriver.save();
        closestDriver = newDriver; // Set the newly created driver as the closest
        console.log("New driver saved:", closestDriver); // Log saved new driver
      }

      // Create PairedDriver object
      const pairedDriver = new PairedDriver({
        customerRequestId: dataModel._id,
        customerRequestModel:
          activeTab === "sendParcel" ? "SendParcel" : "PassengerRequest",
        driverRequestId: closestDriver._id,
        driverRequestModel:
          activeTab === "sendParcel" ? "DeliverParcel" : "Driver",
        customerUserId: dataModel.userId, // Adjust based on your actual data model
        driverUserId: closestDriver.userId, // Adjust based on your actual data model
        price: closestDriver.price, // Adjust as needed, this could be dynamic
      });

      console.log("Paired driver data:", pairedDriver); // Log paired driver data
      // Save paired driver
      await pairedDriver.save();

      return res.status(200).json({
        success: true,
        data: dataModel,
        isDriverPaired: true,
        pairedDriver,
        closestDriver: closestDriver,
      });
    } else {
      console.log("isNew is false, checking existing paired driver..."); // Log for non-new case

      // If `new` is false, find and return the existing PairedDriver item
      const pairedDriver = await PairedDriver.findOne({
        customerRequestId: id,
      });
      console.log("Existing paired driver:", pairedDriver); // Log existing paired driver

      if (pairedDriver) {
        return res.status(200).json({
          success: true,
          data: dataModel,
          isDriverPaired: true,
          pairedDriver,
          closestDriver: closestDriver,
        });
      } else {
        return res.status(200).json({
          success: true,
          data: dataModel,
          isDriverPaired: false,
          closestDriver: closestDriver,
        });
      }
    }
  } catch (error) {
    console.error("Error:", error); // Log error
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/find-nearest-driver", async (req, res) => {
  try {
    const { id, activeTab, new: isNew, isDriver } = req.body; // Get the new isDriver field
    console.log("Request Body:", req.body); // Log the request body

    if (!id || !activeTab || isNew === undefined || isDriver === undefined) {
      console.log("Missing required fields: ID, activeTab, new, or isDriver"); // Log when required fields are missing
      return res.status(400).json({
        success: false,
        message: "ID, activeTab, new, and isDriver are required",
      });
    }

    let dataModel;
    let availableDrivers = [];

    console.log("Fetching data model based on activeTab:", activeTab); // Log before fetching data model

    // Fetch customer request and available drivers based on activeTab
    if (activeTab === "sendParcel") {
      dataModel = await SendParcel.findById(id);
      availableDrivers = await DeliverParcel.find(); // Fetch from DeliverParcel
    } else if (activeTab === "joinRide") {
      dataModel = await PassengerRequest.findById(id);
      availableDrivers = await Driver.find(); // Fetch from Driver model
    } else if (activeTab === "deliver_parcel" || activeTab === "offer_ride") {
      if (!isDriver) {
        console.log("ActiveTab indicates driver mode, but isDriver is false");
        return res.status(400).json({
          success: false,
          message: "Invalid status for driver request.",
        });
      }
    } else {
      console.log("Invalid activeTab value:", activeTab); // Log invalid activeTab
      return res
        .status(400)
        .json({ success: false, message: "Invalid activeTab value" });
    }

    if (!dataModel) {
      console.log("Data model not found for ID:", id); // Log if data model is not found
      return res
        .status(404)
        .json({ success: false, message: "Data not found" });
    }

    // Extract lat and lng
    const userLat = parseFloat(dataModel.location_lat);
    const userLng = parseFloat(dataModel.location_lng);
    console.log("User coordinates:", userLat, userLng); // Log user coordinates

    if (isNaN(userLat) || isNaN(userLng)) {
      console.log("Invalid latitude or longitude:", userLat, userLng); // Log if lat or lng is invalid
      return res
        .status(400)
        .json({ success: false, message: "Invalid latitude or longitude" });
    }

    // If isDriver is true, fetch the existing paired driver
    if (isDriver) {
      console.log("isDriver is true, fetching paired driver..."); // Log when fetching paired driver
      const pairedDriver = await PairedDriver.findOne({
        driverRequestId: id,
      });

      if (!pairedDriver) {
        console.log("No paired driver found for the given ID"); // Log if no paired driver is found
        return res.status(404).json({
          success: false,
          message: "No paired driver found for the given ID",
        });
      }

      return res.status(200).json({
        success: true,
        data: dataModel,
        isDriverPaired: true,
        pairedDriver,
      });
    }

    // Proceed with the logic to find the nearest driver when isDriver is false
    let closestDriver = null;
    let minDistance = Infinity;

    console.log("Calculating closest driver..."); // Log before calculating closest driver

    // Loop through all drivers and find the closest one
    availableDrivers.forEach((driver) => {
      if (driver.location_lat && driver.location_lng) {
        const driverLat = parseFloat(driver.location_lat);
        const driverLng = parseFloat(driver.location_lng);
        console.log("Driver coordinates:", driverLat, driverLng); // Log each driver's coordinates

        const distance = getDistance(userLat, userLng, driverLat, driverLng);
        console.log("Distance to driver:", distance); // Log distance calculation

        if (distance <= 1000 && distance < minDistance) {
          // Check if within 1000 km radius
          minDistance = distance;
          closestDriver = driver;
          console.log("Found closest driver:", closestDriver); // Log when a closest driver is found
        }
      }
    });

    if (isNew) {
      console.log("isNew is true, checking existing paired driver..."); // Log when creating a new paired driver

      // If `new` is true, create a new PairedDriver and delete any existing one with the same customerRequestId
      const existingPairedDriver = await PairedDriver.findOne({
        customerRequestId: id,
      });
      console.log("Existing paired driver:", existingPairedDriver); // Log existing paired driver

      if (existingPairedDriver) {
        console.log("Deleting existing paired driver..."); // Log before deleting existing paired driver
        await PairedDriver.deleteOne({ customerRequestId: id });
      }

      if (!closestDriver) {
        console.log("No closest driver found, creating a new driver..."); // Log when no closest driver is found
        // If no closest driver found, create a new driver
        const newDriver = new Driver({
          location_lat: userLat,
          location_lng: userLng,
          status: "available", // Default status, adjust as needed
          price: 100, // Example price, adjust as needed
        });

        console.log("New driver data:", newDriver); // Log new driver data
        // Save the new driver
        await newDriver.save();
        closestDriver = newDriver; // Set the newly created driver as the closest
        console.log("New driver saved:", closestDriver); // Log saved new driver
      }

      // Create PairedDriver object
      const pairedDriver = new PairedDriver({
        customerRequestId: dataModel._id,
        customerRequestModel:
          activeTab === "sendParcel" ? "SendParcel" : "PassengerRequest",
        driverRequestId: closestDriver._id,
        driverRequestModel:
          activeTab === "sendParcel" ? "DeliverParcel" : "Driver",
        customerUserId: dataModel.userId, // Adjust based on your actual data model
        driverUserId: closestDriver.userId, // Adjust based on your actual data model
        price: closestDriver.price, // Adjust as needed, this could be dynamic
      });

      console.log("Paired driver data:", pairedDriver); // Log paired driver data
      // Save paired driver
      await pairedDriver.save();

      return res.status(200).json({
        success: true,
        data: dataModel,
        isDriverPaired: true,
        pairedDriver,
        closestDriver: closestDriver,
      });
    } else {
      console.log("isNew is false, checking existing paired driver..."); // Log for non-new case

      // If `new` is false, find and return the existing PairedDriver item
      const pairedDriver = await PairedDriver.findOne({
        customerRequestId: id,
      });
      console.log("Existing paired driver:", pairedDriver); // Log existing paired driver

      if (pairedDriver) {
        return res.status(200).json({
          success: true,
          data: dataModel,
          isDriverPaired: true,
          pairedDriver,
          closestDriver: closestDriver,
        });
      } else {
        return res.status(200).json({
          success: true,
          data: dataModel,
          isDriverPaired: false,
          closestDriver: closestDriver,
        });
      }
    }
  } catch (error) {
    console.error("Error:", error); // Log the error to see where the issue is
    res.status(500).json({ success: false, error: error.message });
  }
});
// Get all parcels
router.get("/", async (req, res) => {
  try {
    const parcels = await SendParcel.find();
    res.status(200).json({ success: true, parcels });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get a parcel by ID
router.get("/:id", async (req, res) => {
  try {
    const parcel = await SendParcel.findById(req.params.id);
    if (!parcel) {
      return res
        .status(404)
        .json({ success: false, message: "Parcel not found" });
    }
    res.status(200).json({ success: true, data: parcel });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get parcels by user ID
router.get("/user/:userId", async (req, res) => {
  try {
    console.log("view");
    const parcels = await SendParcel.find({ userId: req.params.userId });
    if (!parcels || parcels.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No parcels found for this user" });
    }
    res.status(200).json({ success: true, data: parcels });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a parcel by ID
router.put("/:id", async (req, res) => {
  try {
    const updatedParcel = await SendParcel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedParcel) {
      return res
        .status(404)
        .json({ success: false, message: "Parcel not found" });
    }
    res.status(200).json({ success: true, data: updatedParcel });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a parcel by ID
router.delete("/:id", async (req, res) => {
  try {
    const deletedParcel = await SendParcel.findByIdAndDelete(req.params.id);
    if (!deletedParcel) {
      return res
        .status(404)
        .json({ success: false, message: "Parcel not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Parcel deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
