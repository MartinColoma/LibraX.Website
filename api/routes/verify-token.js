const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

const verifyTokenRoutes = (app) => {
  // ===== VERIFY JWT TOKEN - POST (Body) =====
  app.post("/api/auth/verify-token", (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(401).json({
          valid: false,
          error: "No token provided",
        });
      }

      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Token is valid
      return res.status(200).json({
        valid: true,
        user: {
          userId: decoded.userId,
          email: decoded.email,
          userType: decoded.userType,
          role: decoded.role,
          fullName: decoded.fullName,
        },
      });
    } catch (error) {
      console.error("Token verification error:", error);

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          valid: false,
          error: "Token expired",
        });
      }

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          valid: false,
          error: "Invalid token",
        });
      }

      return res.status(500).json({
        valid: false,
        error: "Token verification failed",
      });
    }
  });

  // ===== VERIFY JWT TOKEN - GET (Header) =====
  app.get("/api/auth/verify-token", (req, res) => {
    try {
      const auth = req.headers["authorization"];
      if (!auth) {
        return res.status(401).json({
          valid: false,
          message: "No token provided",
        });
      }

      const token = auth.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      return res.status(200).json({
        valid: true,
        user: {
          userId: decoded.userId,
          email: decoded.email,
          userType: decoded.userType,
          role: decoded.role,
          fullName: decoded.fullName,
        },
      });
    } catch (error) {
      console.error("Token verification error:", error);

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          valid: false,
          error: "Token expired",
        });
      }

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          valid: false,
          error: "Invalid token",
        });
      }

      return res.status(500).json({
        valid: false,
        error: "Token verification failed",
      });
    }
  });
};

module.exports = verifyTokenRoutes;
