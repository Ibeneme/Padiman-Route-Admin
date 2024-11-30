const express = require("express");
const jwt = require("jsonwebtoken");

const adminMiddleware = (req, res, next) => {
  const secretKey = "ibenemeCloneKraft";
  try {
    const token = req.headers.authorization.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ error: "Authentication Failed: No token provided" });
    }

    jwt.verify(token, secretKey, (err, decodedToken) => {
      if (err) {
        return res
          .status(401)
          .json({ error: "Authentication Failed: Invalid token" });
      } else {
        req.user = decodedToken;
        console.log(decodedToken, "admindecoded");
        next();
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error no token provided" });
  }
};

module.exports = adminMiddleware;
