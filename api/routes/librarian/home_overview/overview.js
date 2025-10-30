const express = require("express");
const router = express.Router();

// 🧠 Fetch recent users for librarian overview
router.get("/api/librarian/overview/recent-users", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        user_id AS id,
        CONCAT(first_name, ' ', last_name) AS name,
        email,
        user_type AS role,
        status,
        created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("❌ Error fetching recent users:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = (app) => {
  app.use(router);
};
