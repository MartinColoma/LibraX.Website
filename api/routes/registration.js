const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

function getUserType(role) {
  const staffRoles = ["Librarian", "Admin"];
  return staffRoles.includes(role) ? "staff" : "member";
}

module.exports = function registrationRoutes(app) {
  app.post("/api/register", async (req, res) => {
    // CORS and method validation are handled globally
    try {
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
        nfcUid,
      } = req.body;

      if (!email || !role || !firstName || !lastName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check NFC UID uniqueness
      if (nfcUid) {
        const { data: existingNFC } = await supabase
          .from("users")
          .select("user_id")
          .eq("nfc_uid", nfcUid)
          .single();
        if (existingNFC) {
          return res.status(400).json({ message: "❌ NFC UID already registered" });
        }
      }

      // Check email uniqueness
      const { data: existingEmail } = await supabase
        .from("users")
        .select("user_id")
        .eq("email", email)
        .single();
      if (existingEmail) {
        return res.status(400).json({ message: "❌ Email already registered" });
      }

      // Generate ID, password, user_type
      const userId = generateUserId(role);
      const tempPassword = crypto.randomBytes(4).toString("hex");
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      const userType = getUserType(role);

      // Insert into database
      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            user_id: userId,
            user_type: userType,
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
            nfc_uid: nfcUid || null,
            status: "Active",
            date_registered: new Date().toISOString().split("T")[0],
          },
        ])
        .select();

      if (error) throw error;

      // Send registration email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
      });

      await transporter.sendMail({
        from: `"LibraX Kiosk" <${process.env.GMAIL_USER}>`,
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
              ${nfcUid ? `<tr><td><strong>NFC Card UID:</strong></td><td>${nfcUid}</td></tr>` : ""}
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

      return res.status(200).json({ message: "✅ User registered successfully", userId, tempPassword, data: data[0] });
    } catch (err) {
      console.error("❌ Error registering user:", err);
      return res.status(500).json({ message: "❌ Failed to register user", error: err.message });
    }
  });
};
