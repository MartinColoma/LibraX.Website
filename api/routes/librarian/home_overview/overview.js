const express = require("express");
const router = express.Router();
const pool = require("../../../db"); // adjust if you use Supabase or pg client

// 🧠 Fetch users summary for overview
router.get("/api/librarian/overview", async (req, res) => {
  try {
    const totalUsers = await pool.query("SELECT COUNT(*) FROM users");
    const activeUsers = await pool.query("SELECT COUNT(*) FROM users WHERE status = 'Active'");
    const inactiveUsers = await pool.query("SELECT COUNT(*) FROM users WHERE status = 'Inactive'");
    const totalStudents = await pool.query("SELECT COUNT(*) FROM users WHERE user_type = 'student'");
    const totalFaculty = await pool.query("SELECT COUNT(*) FROM users WHERE user_type = 'faculty'");
    const totalStaff = await pool.query("SELECT COUNT(*) FROM users WHERE user_type = 'staff'");

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers.rows[0].count,
        activeUsers: activeUsers.rows[0].count,
        inactiveUsers: inactiveUsers.rows[0].count,
        totalStudents: totalStudents.rows[0].count,
        totalFaculty: totalFaculty.rows[0].count,
        totalStaff: totalStaff.rows[0].count,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching overview data:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = (app) => {
  app.use(router);
};
