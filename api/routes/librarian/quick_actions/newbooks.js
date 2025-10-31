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

// ====================
// 🔹 Helper: Extract Year from Publication Date
// ====================
function extractYear(dateString) {
  if (!dateString) return "";
  const yearMatch = String(dateString).match(/\d{4}/);
  return yearMatch ? yearMatch[0] : "";
}

// ====================
// 🔹 Helper: Clean ISBN
// ====================
function cleanISBN(isbn) {
  if (!isbn) return "";
  // Remove any text after ISBN, keep only numbers and hyphens
  return isbn.split(/[\s(]/)[0].trim();
}

// ====================
// 🔹 Helper: Clean Publisher Name
// ====================
function cleanPublisher(publisher) {
  if (!publisher) return "";
  // Remove trailing commas, colons, and semicolons
  return publisher.replace(/[,:;]+$/, "").trim();
}

// ====================
// 🔹 Helper: Extract Multiple Authors
// ====================
function extractAuthors(record, safeGet) {
  const authors = [];
  
  // Main author (100 or 110)
  const mainAuthor = safeGet(record, "100", "a") || safeGet(record, "110", "a");
  if (mainAuthor) authors.push(mainAuthor.replace(/[,.]$/, "").trim());
  
  // Additional authors (700 field - can be multiple)
  const additionalFields = record.fields.filter(f => f.tag === "700");
  for (const field of additionalFields) {
    const author = field.subfields?.find(sf => sf.code === "a")?.value;
    if (author) {
      const cleanedAuthor = author.replace(/[,.]$/, "").trim();
      if (!authors.includes(cleanedAuthor)) {
        authors.push(cleanedAuthor);
      }
    }
  }
  
  return authors.filter(Boolean);
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
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const stream = Readable.from(req.file.buffer);
      const records = [];
      const parser = new Iso2709Parser();

      function safeGet(record, tag, subfield) {
        try {
          const field = record.get(tag);
          if (!field) return "";

          if (subfield) {
            // Handle subfield extraction
            if (Array.isArray(field)) {
              for (const f of field) {
                if (f && f[subfield]) return String(f[subfield]).trim();
              }
              return "";
            }
            return field[subfield] ? String(field[subfield]).trim() : "";
          }

          // No subfield specified - return the whole field
          if (typeof field === "string") return field.trim();
          if (Array.isArray(field)) return field.join(" ").trim();
          if (typeof field === "object") {
            return Object.values(field).filter(v => v).join(" ").trim();
          }

          return String(field || "").trim();
        } catch (err) {
          console.error(`Error extracting tag ${tag}${subfield ? `:${subfield}` : ""}:`, err);
          return "";
        }
      }

      parser.on("data", (record) => {
        try {
          // Extract title and subtitle
          const title = safeGet(record, "245", "a").replace(/[\/:]$/, "").trim();
          const subtitle = safeGet(record, "245", "b").replace(/[\/.]$/, "").trim();
          
          // Extract ISBN and clean it
          const rawISBN = safeGet(record, "020", "a");
          const isbn = cleanISBN(rawISBN);
          
          // Extract authors (can be multiple)
          const authors = extractAuthors(record, safeGet);
          
          // Extract publisher and clean it
          const rawPublisher = safeGet(record, "260", "b") || safeGet(record, "264", "b");
          const publisher = cleanPublisher(rawPublisher);
          
          // Extract publication year
          const rawPubDate = safeGet(record, "260", "c") || safeGet(record, "264", "c");
          const publicationYear = extractYear(rawPubDate);
          
          // Extract edition
          const edition = safeGet(record, "250", "a").replace(/[\/.]$/, "").trim();
          
          // Extract language (3-letter code)
          const language = safeGet(record, "041", "a") || safeGet(record, "008").substring(35, 38);
          
          // Extract physical description
          const physicalDesc = safeGet(record, "300", "a");
          
          // Extract notes and summary
          const notes = safeGet(record, "500", "a");
          const summary = safeGet(record, "520", "a");
          const description = summary || notes || physicalDesc;
          
          // Extract classification numbers for potential category mapping
          const lcClassification = safeGet(record, "050", "a"); // Library of Congress
          const deweyClassification = safeGet(record, "082", "a"); // Dewey Decimal
          const subject = safeGet(record, "650", "a"); // Subject heading
          
          // Extract series information
          const series = safeGet(record, "490", "a");
          
          const parsed = {
            title,
            subtitle,
            isbn,
            authors: authors.length > 0 ? authors : [""],
            publisher,
            publicationYear,
            edition,
            language,
            description,
            // Additional metadata
            lcClassification,
            deweyClassification,
            subject,
            series,
            notes,
            physicalDescription: physicalDesc,
            // Control fields for reference
            controlNumber: safeGet(record, "001"),
            lastModified: safeGet(record, "005"),
          };

          console.log("📄 Parsed MARC record:", JSON.stringify(parsed, null, 2));
          records.push(parsed);
        } catch (err) {
          console.error("❌ Error parsing individual record:", err);
        }
      });

      parser.on("end", () => {
        console.log(`✅ Finished parsing ${records.length} record(s)`);
        if (records.length === 0) {
          return res.status(400).json({ 
            message: "No valid records found in MARC file" 
          });
        }
        res.status(200).json({ records });
      });

      parser.on("error", (err) => {
        console.error("❌ MARC parsing error:", err);
        res.status(500).json({ 
          message: "Failed to parse MARC file",
          error: err.message 
        });
      });

      stream.pipe(parser);
    } catch (err) {
      console.error("❌ MARC route error:", err);
      res.status(500).json({ 
        message: "Internal server error",
        error: err.message 
      });
    }
  });

  // ====================
  // 🔹 Mount Router
  // ====================
  app.use("/api/librarian/quick_actions/newbooks", router);
};