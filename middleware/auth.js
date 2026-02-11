import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protect = async (req, res, next) => {
  let token;

  // ✅ Check Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      // ✅ Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ✅ Attach user to request (without password)
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({
          success: false,
          error: "User not found",
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("Auth middleware error:", error.message);

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          error: "Token has expired",
        });
      }

      return res.status(401).json({
        success: false,
        error: "Not authorized, token invalid",
      });
    }
  } else {
    // ❌ No token
    return res.status(401).json({
      success: false,
      error: "Not authorized, no token provided",
    });
  }
};

export default protect;
