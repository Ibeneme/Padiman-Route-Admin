const jwtSecretKey = "ibenemechatwazobia"; // Define your secret key here

const jwt = require("jsonwebtoken");

const genAuthToken = (user) => {
  const token = jwt.sign(
    {
      _id: user._id,
      phoneNumber: user?.phoneNumber,
    },
    jwtSecretKey 
  );
  console.log(token, "token");
  return token;
};

module.exports = genAuthToken;
