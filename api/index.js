const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ===== IMPORT ROUTE MODULES =====
const authRoutes = require("./routes/auth");
const registrationRoutes = require("./routes/registration");
const verifyTokenRoutes = require("./routes/verify-token");
const librarianOverviewRoutes = require("./routes/librarian/home_overview/overview"); // ✅ NEW IMPORT

// ===== STATIC FILES =====
app.use(express.static(path.join(__dirname, "..", "dist")));

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://librax-website.onrender.com", // Your Render frontend
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
librarianOverviewRoutes(app); // ✅ ADDED ROUTE HERE

// ===== SPA CATCH-ALL ROUTE =====
// This should be placed AFTER all API routes, BEFORE error handling
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
});

// ===== ERROR HANDLING =====
app.use((req, res) => {
  res.status(404).json({ message: "❌ Route not found" });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
