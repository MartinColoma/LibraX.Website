const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/register-user", async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    role,
    gender,
    birthday,
    address,
    phone,
    idNumber,
  } = req.body;

  try {
    // 🔐 Generate secure temporary password (8 characters)
    const tempPassword = crypto.randomBytes(4).toString("hex");

    // ✅ Setup Gmail transporter (App Password required)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "librax.kiosk@gmail.com",
        pass: "llzt ayck bagd yxfd", // Gmail App Password
      },
    });

    // 📨 Send registration email with all user info
    await transporter.sendMail({
      from: "axisfive.solution@gmail.com",
      to: email,
      subject: "LibraX Registration - Temporary Password and Account Details",
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

    // ✅ Return password to frontend silently (not to be displayed)
    res.json({
      message: "Account request sent! Details and temporary password emailed to user.",
      tempPassword, // Return for backend integration later
    });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ message: "Failed to send temporary password email." });
  }
});

app.listen(3000, () => console.log("✅ Node Server running on http://localhost:3000"));
