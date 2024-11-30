// import express from 'express';
// import axios from 'axios';
// import dotenv from 'dotenv';
// import crypto from 'crypto';

// dotenv.config();

// const router = express.Router();

// const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// router.post('/initialize', async (req, res) => {
//   try {
//     const { email, amount, reference } = req.body;

//     const response = await axios.post('https://api.paystack.co/transaction/initialize', {
//       email,
//       amount: amount * 100, // Amount in kobo
//       reference: reference,
//     }, {
//       headers: {
//         Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
//       },
//     });

//     res.json(response.data.data);
//   } catch (error) {
//     res.status(500).json({ error: 'Payment initialization failed' });
//   }
// });

// router.post('/webhook', async (req, res) => {
//   const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(JSON.stringify(req.body)).digest('hex');
  
//   if (hash === req.headers['x-paystack-signature']) {
//     const event = req.body;
//     // Handle the event
//     console.log(event);

//     // Example: if (event.event === 'charge.success') { /* handle success */ }
//   }
  
//   res.sendStatus(200);
// });

// export default router;
