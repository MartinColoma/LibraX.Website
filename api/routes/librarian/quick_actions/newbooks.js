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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ====================
// 🔹 ID Generators
// ====================
const generateIntId = () =>
  parseInt(uuidv4().replace(/-/g, "").slice(0, 8), 16) % 2_000_000_000;

const generateBookId = () => uuidv4().replace(/-/g, "").slice(0, 11);

module.exports = (app) => {
  const router = express.Router();
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

      console.log("📘 Adding new book:", title);

      // Step 1️⃣: Generate Book ID
      const bookId = generateBookId();

      // Step 2️⃣: Insert book
      const { error: bookError } = await supabase.from("books").insert([
        {
          book_id: bookId,
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

      // Step 3️⃣: Handle authors (reuse if existing, insert if new)
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

      // Step 4️⃣: Link authors to book
      for (const id of authorIds) {
        const { error: mapErr } = await supabase
          .from("book_authors")
          .upsert([{ book_id: bookId, author_id: id }]);
        if (mapErr) throw mapErr;
      }

      // Step 5️⃣: Insert book copies (auto-increment style IDs)
      const totalCopies = copies && copies > 0 ? copies : 1;
      const copiesToInsert = [];

      for (let i = 1; i <= totalCopies; i++) {
        const suffix = String(i).padStart(5, "0"); // e.g., 00001
        const copyId = `${bookId}${suffix}`;
        copiesToInsert.push({
          copy_id: copyId,
          book_id: bookId,
          nfc_uid: null, // will be populated later via NFC scan
        });
      }

      const { error: copyError } = await supabase
        .from("book_copies")
        .insert(copiesToInsert);
      if (copyError) throw copyError;

      res.status(200).json({
        message: "✅ Book successfully added!",
        bookId,
        copiesAdded: copiesToInsert.length,
      });
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
