const express = require('express');
const mongoose = require('mongoose');
const PassengerRequest = require('../../models/Passengers');

const router = express.Router();

// Create a new passenger request
router.post('/create', async (req, res) => {
  try {
    const newRequest = new PassengerRequest({
      destination: req.body.destination,
      travelling_date: req.body.travelling_date,
      current_city: req.body.current_city,
      userId: req.body.userId,
      user_first_name: req.body.user_first_name,
      user_last_name: req.body.user_last_name,
      users_phone_number: req.body.users_phone_number,
      paid: req.body.paid,
      amount: req.body.amount,
      time_paid: req.body.time_paid,
      driver: req.body.driver,
      driver_first_name: req.body.driver_first_name,
      driver_last_name: req.body.driver_last_name,
      driver_phone_number: req.body.driver_phone_number,
    });

    await newRequest.save();
    res.status(201).json({ success: true, data: newRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all passenger requests
router.get('/', async (req, res) => {
  try {
    const requests = await PassengerRequest.find();
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all passenger requests by userId
router.get('/user/:userId', async (req, res) => {
  try {
    const requests = await PassengerRequest.find({ userId: req.params.userId });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single passenger request by id
router.get('/:id', async (req, res) => {
  try {
    const request = await PassengerRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// {
//     "_id": "67404537a5081a76458f0165",
//     "destination": "Abia",
//     "travelling_date": "2024-11-22T00:00:00.000Z",
//     "current_city": "Umuahia",
//     "no_of_passengers": "1222",
//     "plate_no": "\"Sjjs6755\"",
//     "preferred_take_off": "Umuahia",
//     "time_of_take_off": "2024-03-01",
//     "drop_off": "Umuahia",
//     "userId": "673d640bb3db1d9ea558d405",
//     "user_first_name": "Okayyyy",
//     "user_last_name": "Rames",
//     "users_phone_number": "08120710198",
//     "__v": 0
//   }

// Update a passenger request by id
router.put('/:id', async (req, res) => {
  try {
    const updatedRequest = await PassengerRequest.findByIdAndUpdate(
      req.params.id,
      {
        destination: req.body.destination,
        travelling_date: req.body.travelling_date,
        current_city: req.body.current_city,
        userId: req.body.userId,
        user_first_name: req.body.user_first_name,
        user_last_name: req.body.user_last_name,
        users_phone_number: req.body.users_phone_number,
        paid: req.body.paid,
        amount: req.body.amount,
        time_paid: req.body.time_paid,
        driver: req.body.driver,
        driver_first_name: req.body.driver_first_name,
        driver_last_name: req.body.driver_last_name,
        driver_phone_number: req.body.driver_phone_number,
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.status(200).json(updatedRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a passenger request by id
router.delete('/:id', async (req, res) => {
  try {
    const deletedRequest = await PassengerRequest.findByIdAndDelete(req.params.id);
    if (!deletedRequest) {
      return res.status(404).json({ message: 'Request not found' });
    }
    res.status(200).json({ message: 'Request deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;