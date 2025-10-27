import { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * CORS handler
 */
function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  const allowedOrigins = [
    "http://localhost:5173",
    "https://libra-x-website.vercel.app",
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.writeHead(200, { "Content-Length": "0" });
    res.end();
    return true;
  }

  return false;
}

/**
 * Verify JWT Token Endpoint
 * POST /api/verifytoken
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ 
        valid: false, 
        error: "No token provided" 
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      userType: string;
      role: string;
      fullName: string;
      iat: number;
      exp: number;
    };

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
  } catch (error: any) {
    console.error("Token verification error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        valid: false, 
        error: "Token expired" 
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ 
        valid: false, 
        error: "Invalid token" 
      });
    }

    return res.status(500).json({ 
      valid: false, 
      error: "Token verification failed" 
    });
  }
}
