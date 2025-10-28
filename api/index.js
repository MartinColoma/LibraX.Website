const express = require("express");
const cors = require("cors");

// Import route modules
const authRoutes = require("./routes/auth");
const registrationRoutes = require("./routes/registration");
const verifyTokenRoutes = require("./routes/verify-token");

const app = express();

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://librax-website.onrender.com", // Update this
    ],
    credentials: true,
  })
);

// ===== HEALTH CHECK =====
app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "✅ API is running" });
});

// ===== LOAD ALL ROUTES =====
authRoutes(app);
registrationRoutes(app);
verifyTokenRoutes(app);

// ===== ERROR HANDLING =====
app.use((req, res) => {
  res.status(404).json({ message: "❌ Route not found" });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
