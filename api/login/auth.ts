import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

/**
 * Initialize Supabase client with Service Role Key
 */
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Generate unique 10-digit login history ID
 */
function generateHistoryId(): string {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

/**
 * Robust CORS handler for Vercel Functions
 * Supports preflight requests and multiple origins
 */
function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  const allowedOrigins = [
    "http://localhost:5173", // for local dev (Vite default)
    "https://libra-x-website.vercel.app", // production frontend
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200, { "Content-Length": "0" });
    res.end();
    return true;
  }

  return false;
}

/**
 * Auth API Endpoint
 * Supports:
 *   - POST ?path=login
 *   - POST ?path=logout
 *   - GET ?path=check-email
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always handle CORS first
  if (handleCors(req, res)) return;

  const { path } = req.query;

  try {
    /**
     * ---------------------------
     * LOGIN
     * ---------------------------
     */
    if (req.method === "POST" && path === "login") {
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
      const ip = Array.isArray(req.headers["x-forwarded-for"])
        ? req.headers["x-forwarded-for"][0]
        : req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown";
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

      // Clean user object before sending back
      delete user.password_hash;
      user.full_name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();

      return res.status(200).json({
        message: "✅ Login successful",
        user,
        login_history_id: historyId,
      });
    }

    /**
     * ---------------------------
     * LOGOUT
     * ---------------------------
     */
    if (req.method === "POST" && path === "logout") {
      return res.status(200).json({ message: "✅ Logged out successfully" });
    }

    /**
     * ---------------------------
     * CHECK EMAIL EXISTENCE
     * ---------------------------
     */
    if (req.method === "GET" && path === "check-email") {
      const email = req.query.email as string;
      if (!email)
        return res.status(400).json({ error: "Email query parameter required" });

      const { data, error: checkErr } = await supabase
        .from("users")
        .select("email")
        .eq("email", email)
        .limit(1);

      if (checkErr) throw checkErr;
      return res.status(200).json({ exists: data.length > 0 });
    }

    /**
     * ---------------------------
     * Fallback
     * ---------------------------
     */
    return res.status(405).json({ message: "Method or path not allowed" });
  } catch (err: any) {
    console.error("❌ Auth API error:", err);
    return res.status(500).json({
      message: "❌ Auth API failed",
      error: err.message || String(err),
    });
  }
}
