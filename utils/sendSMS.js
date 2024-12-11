const axios = require("axios");

// Replace with your actual Termii API key
const TERMII_API_KEY =
  "TLfDidZA8O75gO1yxmwQfvIQZ5RFmVOegdKBZwlQ5Cxg6coTdZC4NiZ1U1IqAJ";
const TERMII_API_URL = "https://api.ng.termii.com/api/sms/otp/send"; // Correct OTP endpoint

async function sendOTP({ message, phoneNumber }) {
  console.log("Message:", message, "Phone Number:", phoneNumber);

  // Validate input
  if (!phoneNumber || !message) {
    return { error: "Recipient phone number and message are required" };
  }

  try {
    const response = await axios.post(TERMII_API_URL, {
      api_key: TERMII_API_KEY, // Your API key
      message_type: "NUMERIC", // You can set this to "ALPHANUMERIC" if needed
      to: 23408120710198, // Phone number in international format
      from: "ChatWazobia",
      channel: "dnd", // Message channel (can be "dnd", "WhatsApp", "generic", or "email")
      pin_attempts: 3, // Number of attempts allowed
      pin_time_to_live: 5, // PIN validity in minutes
      pin_length: 6, // Length of the generated PIN (4 to 8)
      pin_placeholder: "< 1234 >", // Placeholder for PIN in the message
      message_text: message, // Message content with PIN placeholder
      pin_type: "NUMERIC", // Type of PIN (NUMERIC)
    });

    // Check the response status
    if (response.status === 200 && response.data) {
      console.log("OTP sent successfully", response.data);
      return { success: true, message: "OTP sent successfully" };
    } else {
      console.log("OTP sent but response is empty or invalid", response);
      return { error: "OTP sent but no detailed response" };
    }
  } catch (error) {
    console.error(
      "Error sending OTP:",
      error.response ? error.response.data : error.message
    );
    return { error: "Failed to send OTP" };
  }
}

module.exports = sendOTP;