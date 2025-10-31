const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const { v4: uuidv4 } = require("uuid");

// ====================
// 🔹 MARC Parsing Dependencies
// ====================
const multer = require("multer");
const { Readable } = require("stream");
const Marc = require("marcjs").Marc;
const Iso2709Parser = require("marcjs").Iso2709Parser;

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
  // 🔹 POST New Book (NFC-aware)
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
        nfcUids = [],
      } = req.body;

      if (!title) return res.status(400).json({ message: "Title is required" });

      console.log("📘 Adding new book:", title);

      const bookId = generateBookId();
      const totalCopies = copies && copies > 0 ? copies : 1;

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
          total_copies: totalCopies,
          available_copies: totalCopies,
        },
      ]);
      if (bookError) throw bookError;

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
        if (existing) authorId = existing.author_id;
        else {
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

      for (const id of authorIds) {
        const { error: mapErr } = await supabase
          .from("book_authors")
          .upsert([{ book_id: bookId, author_id: id }]);
        if (mapErr) throw mapErr;
      }

      const copiesToInsert = [];
      for (let i = 0; i < totalCopies; i++) {
        const suffix = String(i + 1).padStart(5, "0");
        copiesToInsert.push({
          copy_id: `${bookId}${suffix}`,
          book_id: bookId,
          nfc_uid: nfcUids[i] || null,
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
  // 🔹 POST MARC Upload & Parse
  // ====================
  const upload = multer({ storage: multer.memoryStorage() });

    router.post("/marc", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const stream = Readable.from(req.file.buffer);
      const records = [];
      const parser = new Iso2709Parser();

      function safeGet(record, tag, subfield) {
        const field = record.get(tag);
        if (!field) return "";

        if (subfield) return field[subfield] || "";

        if (field && typeof field === "object") {
          return Object.values(field).join(" ").trim();
        }

        return String(field || "").trim();
      }

      parser.on("data", (record) => {
        const parsed = {
          title: safeGet(record, "245", "a"),
          subtitle: safeGet(record, "245", "b"),
          isbn: safeGet(record, "020", "a"),
          authors: [
            safeGet(record, "100", "a") || safeGet(record, "110", "a")
          ].filter(Boolean),
          publisher: safeGet(record, "260", "b") || safeGet(record, "264", "b"),
          publicationYear: safeGet(record, "260", "c") || safeGet(record, "264", "c"),
          edition: safeGet(record, "250", "a"),
          language: safeGet(record, "041", "a"),
          description: safeGet(record, "300", "a"),
          notes: safeGet(record, "500", "a"),
          series: safeGet(record, "490", "a"),
          control_001: safeGet(record, "001"),
          control_005: safeGet(record, "005"),
          control_008: safeGet(record, "008"),
        };

        console.log("📄 Parsed MARC record:", parsed); // <-- DEBUG LOG

        records.push(parsed);
      });

      parser.on("end", () => {
        console.log(`✅ Finished parsing ${records.length} record(s)`);
        res.status(200).json({ records });
      });

      parser.on("error", (err) => {
        console.error("❌ MARC parsing error:", err);
        res.status(500).json({ message: "Failed to parse MARC file" });
      });

      stream.pipe(parser);
    } catch (err) {
      console.error("❌ MARC route error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ====================
  // 🔹 Mount Router
  // ====================
  app.use("/api/librarian/quick_actions/newbooks", router);
};
