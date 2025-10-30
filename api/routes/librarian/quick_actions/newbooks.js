const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const { v4: uuidv4 } = require("uuid");

// ====================
// 🔹 Env Validation
// ====================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY!");
  process.exit(1); // fail fast
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ====================
// 🔹 ID Generators
// ====================
const generateIntId = () =>
  parseInt(uuidv4().replace(/-/g, "").slice(0, 8), 16) % 2_000_000_000;

const generateCharId = () => uuidv4().replace(/-/g, "").slice(0, 11);

module.exports = (app) => {
  const router = express.Router();

  // ====================
  // 🔹 Middleware for JSON size
  // ====================
  router.use(express.json({ limit: "5mb" }));

  // ====================
  // 🔹 GET Categories
  // ====================
  router.get("/categories", async (req, res) => {
    try {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) throw error;
      res.status(200).json({ categories: data });
    } catch (err) {
      console.error("❌ Error fetching categories:", err);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // ====================
  // 🔹 GET Authors
  // ====================
  router.get("/authors", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("authors")
        .select("author_id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      res.status(200).json({ authors: data });
    } catch (err) {
      console.error("❌ Error fetching authors:", err);
      res.status(500).json({ message: "Failed to fetch authors" });
    }
  });

  // ====================
  // 🔹 POST New Book
  // ====================
  router.post("/", async (req, res) => {
    try {
      const {
        isbn,
        title,
        subtitle,
        description,
        publisher,
        publicationYear,
        edition,
        language,
        categoryId,
        authors,
        copies,
      } = req.body;

      if (!isbn || !title) {
        return res.status(400).json({ message: "Title and ISBN required" });
      }

      console.log("Adding new book:", isbn, title);

      // Insert book with upsert to prevent conflicts
      const { error: bookError } = await supabase
        .from("books")
        .upsert([
          {
            book_id: isbn,
            isbn,
            title,
            subtitle,
            description,
            publisher,
            publication_year: publicationYear,
            edition,
            language,
            category_id: categoryId,
          },
        ]);
      if (bookError) throw bookError;

      // Handle authors
      const authorIds = [];
      for (const name of authors || []) {
        if (!name.trim()) continue;

        const { data: existing, error: checkErr } = await supabase
          .from("authors")
          .select("author_id")
          .ilike("name", name.trim())
          .maybeSingle();
        if (checkErr) throw checkErr;

        let authorId;
        if (existing) {
          authorId = existing.author_id;
        } else {
          const newId = generateIntId();
          const { data: inserted, error: insertErr } = await supabase
            .from("authors")
            .insert([{ author_id: newId, name: name.trim() }])
            .select()
            .single();
          if (insertErr) throw insertErr;
          authorId = inserted.author_id;
        }

        authorIds.push(authorId);
      }

      // Map book_authors
      for (const id of authorIds) {
        const { error: mapErr } = await supabase
          .from("book_authors")
          .upsert([{ book_id: isbn, author_id: id }]);
        if (mapErr) throw mapErr;
      }

      // Insert copies
      const copiesToInsert = [];
      for (let i = 0; i < (copies || 1); i++) {
        const copyId = generateCharId();
        copiesToInsert.push({ copy_id: copyId, book_id: isbn, nfc_uid: copyId });
      }

      const { error: copyError } = await supabase
        .from("book_copies")
        .insert(copiesToInsert);
      if (copyError) throw copyError;

      res.status(200).json({ message: "✅ Book successfully added!" });
    } catch (err) {
      console.error("❌ Error adding book:", err);
      res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // ====================
  // 🔹 Mount
  // ====================
  app.use("/api/librarian/quick_actions/newbooks", router);
};
