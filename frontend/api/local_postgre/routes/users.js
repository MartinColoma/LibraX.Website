// server/routes/users.js
import express from "express";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import nodemailer from "nodemailer";
import crypto from "crypto";

const router = express.Router();

// Helper: Generate User ID based on role and year
function generateUserId(role) {
  const prefixMap = {
    Student: "S",
    Faculty: "F",
    Librarian: "L",
    Admin: "A",
  };

  const prefix = prefixMap[role] || "U";
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${year}${randomDigits}`;
}

// 🧠 Register new user (duplicates ignored for testing)
router.post("/register-user", async (req, res) => {
  const { role, firstName, lastName, gender, birthday, address, phone, idNumber, email } = req.body;

  try {
    // Generate unique ID + temp password
    const userId = generateUserId(role);
    const tempPassword = crypto.randomBytes(4).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Insert into PostgreSQL
    const result = await pool.query(
      `INSERT INTO users (
        user_id, user_type, role, first_name, last_name, gender, birthday, address,
        email, phone_number, student_faculty_id, password_hash, status, date_registered
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Active',CURRENT_DATE)
      RETURNING *`,
      [userId, "member", role, firstName, lastName, gender, birthday, address, email, phone, idNumber, passwordHash]
    );

    // Send email with account details
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "librax.kiosk@gmail.com",
        pass: "llzt ayck bagd yxfd", // Gmail App Password
      },
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
      message: "✅ User registered successfully (duplicates ignored for testing)",
      userId,
      tempPassword,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error inserting user:", err);
    res.status(500).json({ message: "❌ Failed to register user" });
  }
});

export default router;
