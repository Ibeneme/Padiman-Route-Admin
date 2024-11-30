// const axios = require("axios");

// // Replace with your actual Termii API key
// const TERMII_API_KEY =
//   "TLfDidZA8O75gO1yxmwQfvIQZ5RFmVOegdKBZwlQ5Cxg6coTdZC4NiZ1U1IqAJ";
// const TERMII_API_URL = "https://api.ng.termii.com/api/sms/send";

// async function sendSMS({message, phoneNumber}) {
//   console.log(message, "message phoneNumber", phoneNumber);
//   if (!phoneNumber || !message) {
//     throw new Error("Recipient phone number and message are required");
//   }

//   try {
//     const response = await axios.post(TERMII_API_URL, {
//       to: phoneNumber,
//       sms: message,
//       type: "plain", // or 'flash' depending on your needs
//       channel: "generic",
//       api_key: TERMII_API_KEY,
//       from: "ChatWazobia",
//     });

//     return response.data;
//   } catch (error) {
//     console.error("Error sending SMS:", error.response ? error.response.data : error.message);
//     throw new Error("Failed to send SMS");
//   }
// }

// module.exports = {
//   sendSMS
// };

const axios = require("axios");

// Replace with your actual Termii API key
const TERMII_API_KEY =
  "TLfDidZA8O75gO1yxmwQfvIQZ5RFmVOegdKBZwlQ5Cxg6coTdZC4NiZ1U1IqAJ";
const TERMII_API_URL = "https://api.ng.termii.com/api/sms/send";

async function sendSMS({ message, phoneNumber }) {
  console.log(message, "message phoneNumber", phoneNumber);
  if (!phoneNumber || !message) {
    return { error: "Recipient phone number and message are required" };
  }

  try {
    const response = await axios.post(TERMII_API_URL, {
      to: phoneNumber,
      sms: message,
      type: "plain", // or 'flash' depending on your needs
      channel: "generic",
      api_key: TERMII_API_KEY,
      from: "ChatWazobia",
    });

    return response.data;
  } catch (error) {
    console.error(
      "Error sending SMS:",
      error.response ? error.response.data : error.message
    );
    return { error: "Failed to send SMS" };
  }
}

module.exports = {
  sendSMS,
};
