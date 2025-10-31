const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const { v4: uuidv4 } = require("uuid");

// ====================
// 🔹 MARC Parsing Dependencies
// ====================
const multer = require("multer");
const { Readable } = require("stream");
const { parseSync } = require("marcjs");

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

// ====================
// 🔹 Helper: Safe Get (Like Python version)
// ====================
function safeGet(record, tag, code = null) {
  try {
    if (!record || !record.fields) return "";

    // Get all fields with this tag
    const fields = record.fields.filter(f => f.tag === tag);
    if (fields.length === 0) return "";

    const field = fields[0];

    // Control fields (001, 005, 008, etc.)
    if (field.data !== undefined) {
      return String(field.data || "").trim();
    }

    // Data fields with subfields
    if (code && field.subfields) {
      const subfield = field.subfields.find(sf => sf.code === code);
      if (subfield && subfield.value) {
        return String(subfield.value).replace(/[\/\:;,.\s]+$/, "").trim();
      }
      return "";
    }

    // No code specified - concatenate all subfields
    if (field.subfields) {
      return field.subfields
        .map(sf => String(sf.value || "").trim())
        .filter(Boolean)
        .join(" ")
        .replace(/[\/\:;,.\s]+$/, "")
        .trim();
    }

    return "";
  } catch (err) {
    console.error(`Error extracting ${tag}${code ? `$${code}` : ""}:`, err.message);
    return "";
  }
}

// ====================
// 🔹 Helper: Get All Subfields
// ====================
function getAllSubjects(record, tag) {
  try {
    if (!record || !record.fields) return [];
    
    const fields = record.fields.filter(f => f.tag === tag);
    const subjects = [];
    
    for (const field of fields) {
      if (field.subfields) {
        const subfield = field.subfields.find(sf => sf.code === "a");
        if (subfield && subfield.value) {
          subjects.push(String(subfield.value).trim());
        }
      }
    }
    
    return subjects;
  } catch (err) {
    console.error(`Error extracting subjects from ${tag}:`, err.message);
    return [];
  }
}

// ====================
// 🔹 Helper: Get All Authors (700 fields)
// ====================
function getAllContributors(record) {
  try {
    if (!record || !record.fields) return [];
    
    const fields = record.fields.filter(f => f.tag === "700");
    const contributors = [];
    
    for (const field of fields) {
      if (field.subfields) {
        const subfield = field.subfields.find(sf => sf.code === "a");
        if (subfield && subfield.value) {
          const name = String(subfield.value).replace(/[,.\s]+$/, "").trim();
          if (name) contributors.push(name);
        }
      }
    }
    
    return contributors;
  } catch (err) {
    console.error("Error extracting contributors:", err.message);
    return [];
  }
}

// ====================
// 🔹 Helper: Extract Year
// ====================
function extractYear(dateString) {
  if (!dateString) return "";
  const yearMatch = String(dateString).match(/\d{4}/);
  return yearMatch ? yearMatch[0] : "";
}

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
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log("📄 Parsing MARC file...");

      // Parse MARC file synchronously
      const parsedRecords = parseSync(req.file.buffer);
      
      if (!parsedRecords || parsedRecords.length === 0) {
        return res.status(400).json({ message: "No valid MARC records found" });
      }

      const records = [];

      for (const record of parsedRecords) {
        try {
          console.log("🔍 Processing record:", JSON.stringify(record, null, 2));

          // Extract fields exactly like Python version
          const title = safeGet(record, "245", "a");
          const subtitle = safeGet(record, "245", "b");
          
          // Main author (100 or 110)
          const mainAuthor = safeGet(record, "100", "a") || safeGet(record, "110", "a");
          
          // Additional authors (700 fields)
          const contributors = getAllContributors(record);
          
          // Combine all authors
          const allAuthors = [mainAuthor, ...contributors].filter(Boolean);
          
          // Publisher (260 or 264)
          const publisher = safeGet(record, "260", "b") || safeGet(record, "264", "b");
          
          // Publication year (260 or 264)
          const rawYear = safeGet(record, "260", "c") || safeGet(record, "264", "c");
          const publicationYear = extractYear(rawYear);
          
          // ISBN
          const isbn = safeGet(record, "020", "a");
          
          // Subjects
          const subjects = getAllSubjects(record, "650");
          
          // Control fields
          const controlNumber = safeGet(record, "001");
          const timestamp = safeGet(record, "005");
          const fixedData = safeGet(record, "008");
          
          // Other metadata
          const edition = safeGet(record, "250", "a");
          const description = safeGet(record, "300", "a");
          const notes = safeGet(record, "500", "a");
          const series = safeGet(record, "490", "a");
          const language = safeGet(record, "041", "a");
          const place = safeGet(record, "260", "a") || safeGet(record, "264", "a");
          
          // LC and Dewey classifications
          const lcClassification = safeGet(record, "050", "a");
          const deweyClassification = safeGet(record, "082", "a");

          const parsed = {
            // Main bibliographic info
            title,
            subtitle,
            isbn,
            authors: allAuthors.length > 0 ? allAuthors : [""],
            publisher,
            publicationYear,
            edition,
            language,
            description,
            
            // Classification & subjects
            lcClassification,
            deweyClassification,
            subject: subjects.join(", "),
            
            // Additional metadata
            series,
            notes,
            place,
            
            // Control fields
            controlNumber,
            timestamp,
            fixedData,
          };

          console.log("✅ Extracted MARC data:");
          console.log(`   Title: ${parsed.title}`);
          console.log(`   Authors: ${parsed.authors.join(", ")}`);
          console.log(`   Publisher: ${parsed.publisher}`);
          console.log(`   Year: ${parsed.publicationYear}`);
          console.log(`   ISBN: ${parsed.isbn}`);
          console.log(`   Edition: ${parsed.edition}`);
          console.log(`   Language: ${parsed.language}`);

          records.push(parsed);
        } catch (err) {
          console.error("❌ Error parsing individual record:", err);
          console.error("Stack:", err.stack);
        }
      }

      if (records.length === 0) {
        return res.status(400).json({ 
          message: "Failed to extract data from MARC file" 
        });
      }

      console.log(`✅ Successfully parsed ${records.length} record(s)`);
      res.status(200).json({ records });

    } catch (err) {
      console.error("❌ MARC parsing error:", err);
      console.error("Stack:", err.stack);
      res.status(500).json({ 
        message: "Failed to parse MARC file",
        error: err.message 
      });
    }
  });

  // ====================
  // 🔹 Mount Router
  // ====================
  app.use("/api/librarian/quick_actions/newbooks", router);
};