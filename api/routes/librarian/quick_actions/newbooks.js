// api/routes/librarian/quick_actions/newbooks.js
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const { v4: uuidv4 } = require("uuid");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function generateAuthorId() {
  const num = parseInt(uuidv4().replace(/-/g, "").slice(0, 11), 16);
  return num % 100000000000;
}

module.exports = (app) => {
  const router = express.Router();

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

      if (!isbn || !title)
        return res.status(400).json({ message: "Title and ISBN are required." });

      const { error: bookError } = await supabase.from("books").insert([
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

      const authorIds = [];
      for (const authorName of authors || []) {
        if (!authorName.trim()) continue;

        const { data: existing, error: checkErr } = await supabase
          .from("authors")
          .select("author_id")
          .ilike("name", authorName.trim())
          .maybeSingle();
        if (checkErr) throw checkErr;

        let authorId;
        if (existing) {
          authorId = existing.author_id;
        } else {
          const newId = generateAuthorId();
          const { data: inserted, error: insertErr } = await supabase
            .from("authors")
            .insert([{ author_id: newId, name: authorName.trim() }])
            .select()
            .single();
          if (insertErr) throw insertErr;
          authorId = inserted.author_id;
        }

        authorIds.push(authorId);
      }

      for (const id of authorIds) {
        const { error: mapErr } = await supabase
          .from("book_authors")
          .insert([{ book_id: isbn, author_id: id }]);
        if (mapErr) throw mapErr;
      }

      const copiesToInsert = [];
      for (let i = 0; i < (copies || 1); i++) {
        const copyId = uuidv4().replace(/-/g, "").slice(0, 11);
        copiesToInsert.push({
          copy_id: copyId,
          book_id: isbn,
          nfc_uid: copyId,
        });
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

  app.use("/api/librarian/quick_actions/newbooks", router);
};
