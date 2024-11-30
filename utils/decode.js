const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey"; // Same secret used to sign the token

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from 'Bearer <token>'
  if (!token) {
    return res.status(401).json({ message: "Token missing. Unauthorized." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach decoded payload to request
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    res
      .status(403)
      .json({ message: "Invalid or expired token.", error: error.message });
  }
};

module.exports = authMiddleware;
