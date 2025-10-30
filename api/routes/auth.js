const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "2m";

// Generate a 10-digit history ID
function generateHistoryId() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

// Create signed JWT
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

// Utility: get current Manila time (UTC+8)
function getManilaTimeISO() {
  const now = new Date();
  const manilaOffsetMs = 8 * 60 * 60 * 1000;
  const manilaTime = new Date(now.getTime() + manilaOffsetMs);
  return manilaTime.toISOString().replace("Z", "+08:00");
}

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

const authRoutes = (app) => {
  // ===== LOGIN with First-Time Detection =====
  app.post("/api/login", async (req, res) => {
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

      // Check if account is active (if status field exists)
      if (user.status && user.status !== 'active') {
        console.log(`⚠️ Account status check failed for ${email}: status = ${user.status}`);
        return res.status(403).json({ 
          error: `Account is ${user.status}. Please contact admin.` 
        });
      }

      // Validate password hash
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // 🔍 Check login history count for first-time login detection
      const { data: loginHistory, error: historyErr } = await supabase
        .from("login_history")
        .select("history_id")
        .eq("user_id", user.user_id);

      if (historyErr) throw historyErr;

      const loginCount = loginHistory ? loginHistory.length : 0;
      const isFirstLogin = loginCount === 0;

      // Update last login timestamp (Manila time)
      const manilaNow = getManilaTimeISO();
      await supabase
        .from("users")
        .update({ last_login: manilaNow })
        .eq("user_id", user.user_id);

      // Insert login history record
      const historyId = generateHistoryId();
      const ip =
        (Array.isArray(req.headers["x-forwarded-for"])
          ? req.headers["x-forwarded-for"][0]
          : req.headers["x-forwarded-for"]) ||
        req.socket.remoteAddress ||
        "Unknown";
      const userAgent = req.headers["user-agent"] || "Unknown";

      const { error: insertErr } = await supabase.from("login_history").insert([
        {
          history_id: historyId,
          user_id: user.user_id,
          user_type: user.user_type,
          ip_address: ip,
          user_agent: userAgent,
          login_time: manilaNow,
        },
      ]);

      if (insertErr) throw insertErr;

      // Generate JWT token
      const token = generateToken(user);

      // Clean user object before sending back
      delete user.password_hash;
      user.full_name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();

      console.log(`✅ Login successful for ${user.email} | First login: ${isFirstLogin}`);

      return res.status(200).json({
        message: "✅ Login successful",
        token,
        user,
        login_history_id: historyId,
        is_first_login: isFirstLogin, // 🆕 Flag for frontend
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
  app.post("/api/logout", async (req, res) => {
    try {
      const { token, login_history_id } = req.body;

      // Decode token to identify user (optional)
      let decoded = null;
      try {
        decoded = token ? jwt.verify(token, JWT_SECRET) : null;
      } catch (err) {
        console.warn("⚠️ Invalid or expired token during logout");
      }

      if (!login_history_id) {
        return res.status(400).json({
          error: "Missing login_history_id. Cannot record logout time.",
        });
      }

      // Update logout_time (Manila time)
      const manilaLogout = getManilaTimeISO();
      const { error: updateErr } = await supabase
        .from("login_history")
        .update({ logout_time: manilaLogout })
        .eq("history_id", login_history_id);

      if (updateErr) throw updateErr;

      console.log(
        `✅ Logout recorded for user ${
          decoded?.email || "unknown"
        } (history_id: ${login_history_id}) at ${manilaLogout}`
      );

      return res.status(200).json({
        message: "✅ Logged out successfully",
        logout_recorded: true,
        history_id: login_history_id,
      });
    } catch (err) {
      console.error("❌ Logout error:", err);
      return res.status(500).json({
        message: "❌ Logout failed",
        error: err.message || String(err),
      });
    }
  });

  // ===== CHECK EMAIL EXISTENCE =====
  app.get("/api/check-email", async (req, res) => {
    try {
      const email = req.query.email;
      if (!email)
        return res.status(400).json({ error: "Email query parameter required" });

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

  // ===== CHANGE PASSWORD (First-Time Login & Authenticated Users) =====
  app.post("/api/change-password", authenticateToken, async (req, res) => {
    try {
      const { user_id, new_password } = req.body;

      // Validate input
      if (!user_id || !new_password) {
        return res.status(400).json({ 
          error: "User ID and new password are required" 
        });
      }

      // Validate that the authenticated user matches the user_id
      if (req.user.userId !== user_id) {
        return res.status(403).json({ 
          error: "Unauthorized to change this password" 
        });
      }

      // Validate password strength
      if (new_password.length < 8) {
        return res.status(400).json({ 
          error: "Password must be at least 8 characters" 
        });
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(new_password)) {
        return res.status(400).json({ 
          error: "Password must contain uppercase, lowercase, and number" 
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 10);

      // Update password in database
      const { data, error: updateErr } = await supabase
        .from("users")
        .update({ 
          password_hash: hashedPassword,
          updated_at: getManilaTimeISO()
        })
        .eq("user_id", user_id)
        .select("user_id");

      if (updateErr) throw updateErr;

      if (!data || data.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log(`✅ Password changed successfully for user_id: ${user_id}`);

      return res.status(200).json({
        message: "✅ Password changed successfully",
        user_id: data[0].user_id,
      });
    } catch (err) {
      console.error("❌ Password change error:", err);
      return res.status(500).json({
        message: "❌ Failed to change password",
        error: err.message || String(err),
      });
    }
  });

  // ===== LEGACY: FIRST LOGIN PASSWORD CHANGE (Keep for backward compatibility) =====
  app.post("/api/change-password-first-login", async (req, res) => {
    try {
      const { user_id, new_password, confirm_password } = req.body;

      if (!user_id || !new_password || !confirm_password) {
        return res.status(400).json({ error: "All fields are required." });
      }

      if (new_password !== confirm_password) {
        return res.status(400).json({ error: "Passwords do not match." });
      }

      // Check login history for this user
      const { data: loginHistory, error: historyErr } = await supabase
        .from("login_history")
        .select("history_id")
        .eq("user_id", user_id);

      if (historyErr) throw historyErr;

      if (!loginHistory || loginHistory.length === 0) {
        return res.status(404).json({
          error: "No login record found for this user. Cannot change password.",
        });
      }

      // Only allow password change if first login (1 record only)
      if (loginHistory.length > 1) {
        return res.status(403).json({
          error: "Password change only allowed on first login.",
        });
      }

      // Validate password strength
      if (new_password.length < 8) {
        return res.status(400).json({ 
          error: "Password must be at least 8 characters" 
        });
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(new_password)) {
        return res.status(400).json({ 
          error: "Password must contain uppercase, lowercase, and number" 
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 10);

      // Update user's password
      const { error: updateErr } = await supabase
        .from("users")
        .update({ 
          password_hash: hashedPassword,
          updated_at: getManilaTimeISO()
        })
        .eq("user_id", user_id);

      if (updateErr) throw updateErr;

      console.log(`✅ Password changed successfully for user_id: ${user_id}`);

      return res.status(200).json({
        message: "✅ Password changed successfully.",
        password_changed: true,
      });
    } catch (err) {
      console.error("❌ Change password error:", err);
      return res.status(500).json({
        message: "❌ Failed to change password.",
        error: err.message || String(err),
      });
    }
  });
};

module.exports = authRoutes;