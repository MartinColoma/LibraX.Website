const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "2m";

function generateHistoryId() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

function generateToken(user) {
  const payload = {
    userId: user.user_id,
    email: user.email,
    userType: user.user_type,
    role: user.role,
    fullName: `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim(),
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

const authRoutes = (app) => {
  // ===== LOGIN =====
  app.post("/api/login/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      // Find user by email
      const { data: users, error: findErr } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .limit(1);

      if (findErr) throw findErr;
      if (!users || users.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const user = users[0];

      // Validate password hash
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Update last login timestamp
      await supabase
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("user_id", user.user_id);

      // Insert login history
      const historyId = generateHistoryId();
      const ip =
        (Array.isArray(req.headers["x-forwarded-for"])
          ? req.headers["x-forwarded-for"][0]
          : req.headers["x-forwarded-for"]) ||
        req.socket.remoteAddress ||
        "Unknown";
      const userAgent = req.headers["user-agent"] || "Unknown";

      await supabase.from("login_history").insert([
        {
          history_id: historyId,
          user_id: user.user_id,
          user_type: user.user_type,
          ip_address: ip,
          user_agent: userAgent,
        },
      ]);

      // Generate JWT token
      const token = generateToken(user);

      // Clean user object before sending back
      delete user.password_hash;
      user.full_name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();

      return res.status(200).json({
        message: "✅ Login successful",
        token,
        user,
        login_history_id: historyId,
      });
    } catch (err) {
      console.error("❌ Login error:", err);
      return res.status(500).json({
        message: "❌ Login failed",
        error: err.message || String(err),
      });
    }
  });

  // ===== LOGOUT =====
  app.post("/api/auth/logout", (req, res) => {
    // With JWT, logout is handled client-side by removing the token
    return res.status(200).json({ message: "✅ Logged out successfully" });
  });

  // ===== CHECK EMAIL EXISTENCE =====
  app.get("/api/auth/check-email", async (req, res) => {
    try {
      const email = req.query.email;
      if (!email)
        return res
          .status(400)
          .json({ error: "Email query parameter required" });

      const { data, error: checkErr } = await supabase
        .from("users")
        .select("email")
        .eq("email", email)
        .limit(1);

      if (checkErr) throw checkErr;
      return res.status(200).json({ exists: data.length > 0 });
    } catch (err) {
      console.error("❌ Check email error:", err);
      return res.status(500).json({
        message: "❌ Check email failed",
        error: err.message || String(err),
      });
    }
  });
};

module.exports = authRoutes;
