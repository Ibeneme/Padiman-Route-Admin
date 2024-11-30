const express = require("express");
const axios = require("axios");

const router = express.Router();

// Replace with your actual Termii API key
const TERMII_API_KEY =
  "TLfDidZA8O75gO1yxmwQfvIQZ5RFmVOegdKBZwlQ5Cxg6coTdZC4NiZ1U1IqAJ";
const TERMII_API_URL = "https://api.ng.termii.com/api/sms/send";

router.post("/send-sms", async (req, res) => {
  const { to, message, from } = req.body;

  if (!to || !message) {
    return res
      .status(400)
      .json({ error: "Recipient phone number and message are required" });
  }

  try {
    const response = await axios.post(TERMII_API_URL, {
      to,
      sms: message,
      type: "plain", // or 'flash' depending on your needs
      channel: "generic",
      api_key: TERMII_API_KEY,
      from: "ChatWazobia",
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "Error sending SMS:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: "Failed to send SMS" });
  }
});

module.exports = router;
