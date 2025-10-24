// frontend/api/supa/register-user.js
import express from "express";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Resolve root directory (to load .env correctly)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const router = express.Router();

// Debug check (optional, remove in production)
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase credentials. Check your .env path.");
  process.exit(1);
}

// 🧠 Helper: Generate User ID
function generateUserId(role) {
  const prefixMap = { Student: "S", Faculty: "F", Librarian: "L", Admin: "A" };
  const prefix = prefixMap[role] || "U";
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${year}${randomDigits}`;
}

// 📦 Main handler (Vercel-style)
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method Not Allowed" });

  const {
    role,
    firstName,
    lastName,
    gender,
    birthday,
    address,
    phone,
    idNumber,
    email,
  } = req.body;

  try {
    const userId = generateUserId(role);
    const tempPassword = crypto.randomBytes(4).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // 🧾 Insert user into Supabase
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          user_id: userId,
          user_type: "member",
          role,
          first_name: firstName,
          last_name: lastName,
          gender,
          birthday,
          address,
          email,
          phone_number: phone,
          student_faculty_id: idNumber,
          password_hash: passwordHash,
          status: "Active",
          date_registered: new Date().toISOString().split("T")[0],
        },
      ])
      .select();

    if (error) throw error;

    // 📧 Send email with temporary password
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    });

    await transporter.sendMail({
      from: "librax.kiosk@gmail.com",
      to: email,
      subject: "LibraX Registration - Temporary Password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: #6d1f25;">LibraX Library Registration</h2>
          <p>Hello <strong>${firstName} ${lastName}</strong>,</p>
          <p>Thank you for registering for the <strong>LibraX Library System</strong>. Below are your submitted details:</p>
          <table style="border-collapse: collapse; width: 100%; margin: 10px 0;">
            <tbody>
              <tr><td><strong>Membership Type:</strong></td><td>${role}</td></tr>
              <tr><td><strong>Full Name:</strong></td><td>${firstName} ${lastName}</td></tr>
              <tr><td><strong>Gender:</strong></td><td>${gender}</td></tr>
              <tr><td><strong>Birthday:</strong></td><td>${birthday}</td></tr>
              <tr><td><strong>Address:</strong></td><td>${address}</td></tr>
              <tr><td><strong>Phone Number:</strong></td><td>${phone}</td></tr>
              <tr><td><strong>Email Address:</strong></td><td>${email}</td></tr>
              <tr><td><strong>Student/Faculty ID:</strong></td><td>${idNumber}</td></tr>
            </tbody>
          </table>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">
          <p>Your temporary password is:</p>
          <h2 style="color: #6d1f25; letter-spacing: 1px;">${tempPassword}</h2>
          <p>Please wait for the administrator to approve your account.<br>
          Once approved, you will be prompted to change your password on first login.</p>
          <br>
          <p style="font-size: 14px; color: #555;">
            Regards,<br>
            <strong>Martin - LibraX Library Team</strong><br>
            <em>AIoT Library Kiosk</em>
          </p>
        </div>
      `,
    });

    res.status(200).json({
      message: "✅ User registered successfully",
      userId,
      tempPassword,
      data: data[0],
    });
  } catch (err) {
    console.error("❌ Supabase registration error:", err);
    res.status(500).json({ message: "❌ Failed to register user", error: err.message });
  }
}
