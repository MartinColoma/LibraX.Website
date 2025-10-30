const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = (app) => {
  const router = express.Router();

  /**
   * POST /api/librarian/quick_actions/newbooks
   * Adds a new book and related data (authors, category, copies)
   */
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
        authors = [],
        copies = 1,
      } = req.body;

      if (!title || !isbn) {
        return res.status(400).json({ message: "Title and ISBN are required." });
      }

      // === 1️⃣ Insert book ===
      const { data: bookData, error: bookErr } = await supabase
        .from("books")
        .insert([
          {
            book_id: isbn,
            title,
            subtitle,
            isbn,
            description,
            publisher,
            publication_year: publicationYear || null,
            edition,
            language,
            category_id: categoryId || null,
          },
        ])
        .select();

      if (bookErr) throw bookErr;
      const newBook = bookData[0];

      // === 2️⃣ Insert or fetch authors ===
      let authorIds = [];
      for (const authorName of authors) {
        if (!authorName.trim()) continue;

        const { data: existingAuthor, error: findErr } = await supabase
          .from("authors")
          .select("author_id")
          .eq("name", authorName.trim())
          .maybeSingle();

        if (findErr) throw findErr;

        let authorId;
        if (existingAuthor) {
          authorId = existingAuthor.author_id;
        } else {
          const { data: newAuthor, error: insertErr } = await supabase
            .from("authors")
            .insert([{ name: authorName.trim() }])
            .select()
            .single();

          if (insertErr) throw insertErr;
          authorId = newAuthor.author_id;
        }

        authorIds.push(authorId);
      }

      // === 3️⃣ Link authors to the book ===
      if (authorIds.length > 0) {
        const authorLinks = authorIds.map((id) => ({
          book_id: newBook.book_id,
          author_id: id,
        }));

        const { error: linkErr } = await supabase
          .from("book_authors")
          .insert(authorLinks);

        if (linkErr) throw linkErr;
      }

      // === 4️⃣ Add book copies ===
      const copiesArr = Array.from({ length: copies }, () => {
        const copyId = uuidv4().replace(/-/g, "").slice(0, 11); // Trim to 11 chars
        return {
          copy_id: copyId,
          book_id: newBook.book_id,
          nfc_uid: copyId, // temporary placeholder since NOT NULL
          status: "Available",
        };
      });

      const { error: copyErr } = await supabase
        .from("book_copies")
        .insert(copiesArr);

      if (copyErr) throw copyErr;

      return res.status(201).json({
        message: "✅ Book successfully added.",
        book: newBook,
        authors: authorIds,
        copiesInserted: copies,
      });
    } catch (err) {
      console.error("❌ Error adding book:", err);
      res.status(500).json({ message: err.message || "Server error." });
    }
  });

  /**
   * GET /api/librarian/quick_actions/newbooks/categories
   */
  router.get("/categories", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("category_id, category_name, category_type");

      if (error) throw error;

      res.status(200).json({ categories: data });
    } catch (err) {
      console.error("❌ Error fetching categories:", err);
      res.status(500).json({ message: err.message || "Server error." });
    }
  });

  // Mount route
  app.use("/api/librarian/quick_actions/newbooks", router);
};
