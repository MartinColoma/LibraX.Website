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
// 🔹 MARCJS ARRAY FORMAT HELPERS
// ====================
// marcjs returns fields as flat arrays: ["245", "14", "a", "Title", "b", "Subtitle"]

/**
 * Get control field value (001, 005, 008)
 * Format: ["001", "13798376"]
 */
function getControlField(record, tag) {
  try {
    if (!record || !record.fields || !Array.isArray(record.fields)) return "";
    
    const field = record.fields.find(f => Array.isArray(f) && f[0] === tag);
    if (!field || field.length < 2) return "";
    
    return String(field[1] || "").trim();
  } catch (err) {
    console.error(`❌ Error extracting control field ${tag}:`, err.message);
    return "";
  }
}

/**
 * Get data field with specific subfield
 * Format: ["245", "14", "a", "The broker /", "c", "John Grisham."]
 */
function getField(record, tag, subfield = null) {
  try {
    if (!record || !record.fields || !Array.isArray(record.fields)) return "";
    
    // Find all fields with matching tag
    const matchingFields = record.fields.filter(f => 
      Array.isArray(f) && f.length > 2 && f[0] === tag
    );
    
    if (matchingFields.length === 0) return "";
    
    const values = [];
    
    for (const field of matchingFields) {
      // field[0] = tag, field[1] = indicators, field[2+] = alternating codes and values
      
      if (subfield) {
        // Extract specific subfield
        for (let i = 2; i < field.length; i += 2) {
          if (field[i] === subfield && field[i + 1]) {
            values.push(String(field[i + 1]).trim());
          }
        }
      } else {
        // No subfield - concatenate all values (skip codes)
        for (let i = 3; i < field.length; i += 2) {
          if (field[i]) {
            values.push(String(field[i]).trim());
          }
        }
      }
    }
    
    return values.join(" ").trim();
  } catch (err) {
    console.error(`❌ Error extracting ${tag}${subfield ? `$${subfield}` : ""}:`, err.message);
    return "";
  }
}

/**
 * Get all occurrences of a specific subfield
 */
function getAllFieldValues(record, tag, subfield) {
  try {
    if (!record || !record.fields || !Array.isArray(record.fields)) return [];
    
    const matchingFields = record.fields.filter(f => 
      Array.isArray(f) && f.length > 2 && f[0] === tag
    );
    
    const values = [];
    
    for (const field of matchingFields) {
      for (let i = 2; i < field.length; i += 2) {
        if (field[i] === subfield && field[i + 1]) {
          const value = String(field[i + 1]).trim();
          if (value) values.push(value);
        }
      }
    }
    
    return values;
  } catch (err) {
    console.error(`❌ Error extracting all ${tag}$${subfield}:`, err.message);
    return [];
  }
}

/**
 * Extract all authors
 */
function extractAuthors(record) {
  try {
    const authors = [];
    
    // Main author (100 or 110)
    const mainAuthor = getField(record, "100", "a") || getField(record, "110", "a");
    if (mainAuthor) {
      authors.push(cleanText(mainAuthor));
    }
    
    // Additional authors (700$a)
    const additionalAuthors = getAllFieldValues(record, "700", "a");
    for (const author of additionalAuthors) {
      const cleaned = cleanText(author);
      if (cleaned && !authors.includes(cleaned)) {
        authors.push(cleaned);
      }
    }
    
    return authors;
  } catch (err) {
    console.error("❌ Error extracting authors:", err.message);
    return [];
  }
}

// ====================
// 🔹 Text Cleaning Helpers
// ====================
function cleanText(text) {
  if (!text) return "";
  return String(text).replace(/[\/.:,;]+$/, "").trim();
}

function cleanPublisher(publisher) {
  if (!publisher) return "";
  return publisher.replace(/[,:;]+$/, "").trim();
}

function cleanISBN(isbn) {
  if (!isbn) return "";
  const cleaned = isbn.split(/[\s(]/)[0].trim();
  return cleaned.replace(/[-\s]/g, '').match(/\d{10,13}/)?.[0] || cleaned;
}

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

  // Try multiple parsing approaches
  function tryParseMARC(buffer) {
    const errors = [];
    
    // Method 1: Direct parseSync (binary MARC21)
    try {
      console.log("Trying Method 1: Binary MARC21 with parseSync...");
      const records = parseSync(buffer);
      if (records && records.length > 0) {
        console.log("✅ Method 1 succeeded!");
        return records;
      }
    } catch (err) {
      console.log("❌ Method 1 failed:", err.message);
      errors.push(`Binary parse: ${err.message}`);
    }
    
    // Method 2: Try as string (MARCXML or text)
    try {
      console.log("Trying Method 2: Text/XML MARC...");
      const text = buffer.toString('utf8');
      
      // Check if it's XML
      if (text.includes('<record>') || text.includes('<collection>')) {
        console.log("Detected XML format");
        errors.push("MARCXML format detected but not supported by marcjs. Please convert to MARC21 binary format.");
        throw new Error("MARCXML not supported");
      }
      
      const records = parseSync(text);
      if (records && records.length > 0) {
        console.log("✅ Method 2 succeeded!");
        return records;
      }
    } catch (err) {
      console.log("❌ Method 2 failed:", err.message);
      errors.push(`Text parse: ${err.message}`);
    }
    
    // Method 3: Try with latin1 encoding
    try {
      console.log("Trying Method 3: Latin1 encoding...");
      const text = buffer.toString('latin1');
      const records = parseSync(text);
      if (records && records.length > 0) {
        console.log("✅ Method 3 succeeded!");
        return records;
      }
    } catch (err) {
      console.log("❌ Method 3 failed:", err.message);
      errors.push(`Latin1 parse: ${err.message}`);
    }
    
    throw new Error(`All parsing methods failed:\n${errors.join('\n')}`);
  }

  router.post("/marc", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log("\n📄 ========== MARC FILE UPLOAD ==========");
      console.log("File name:", req.file.originalname);
      console.log("File size:", req.file.size, "bytes");
      console.log("File mimetype:", req.file.mimetype);

      // Validate file size
      if (req.file.size === 0) {
        return res.status(400).json({ message: "Empty MARC file uploaded" });
      }

      // Check file extension
      const fileName = req.file.originalname.toLowerCase();
      const validExtensions = ['.mrc', '.marc', '.dat', '.bin'];
      const hasValidExt = validExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExt) {
        console.warn("⚠️ Unusual file extension:", fileName);
      }

      // Log first 200 bytes for debugging
      const preview = req.file.buffer.slice(0, 200);
      console.log("\n📋 File Preview (first 200 bytes):");
      console.log("HEX:", preview.toString('hex').substring(0, 100) + "...");
      console.log("ASCII:", preview.toString('utf8', 0, 50).replace(/[^\x20-\x7E]/g, '.') + "...");
      
      // Check for MARCXML
      const headerStr = preview.toString('utf8', 0, 50);
      if (headerStr.includes('<?xml')) {
        return res.status(400).json({ 
          message: "MARCXML format detected",
          hint: "This appears to be a MARCXML file. Please convert it to MARC21 binary format (.mrc) using a tool like MarcEdit."
        });
      }

      // Try parsing with multiple methods
      let parsedRecords;
      try {
        parsedRecords = tryParseMARC(req.file.buffer);
      } catch (parseError) {
        console.error("❌ All parsing attempts failed:", parseError.message);
        
        return res.status(400).json({ 
          message: "Invalid MARC file format",
          details: parseError.message,
          hints: [
            "Ensure the file is in MARC21 binary format (.mrc or .marc)",
            "If you have a MARCXML file, convert it using MarcEdit or similar tool",
            "Try exporting from your library system in 'MARC binary' format",
            "The file may be corrupted or truncated"
          ]
        });
      }
      
      // Validate parsed records
      if (!parsedRecords || !Array.isArray(parsedRecords) || parsedRecords.length === 0) {
        console.error("❌ No valid MARC records found");
        return res.status(400).json({ 
          message: "No valid MARC records found in file",
          hint: "The file was parsed but contains no usable records"
        });
      }

      console.log(`\n📚 Found ${parsedRecords.length} MARC record(s)`);
      console.log("========================================\n");

      const records = [];

      for (let idx = 0; idx < parsedRecords.length; idx++) {
        const record = parsedRecords[idx];
        
        try {
          console.log(`🔍 Processing record ${idx + 1}/${parsedRecords.length}`);
          
          // Validate record structure
          if (!record || typeof record !== 'object') {
            console.warn(`   ⚠️ Record ${idx + 1} is not an object, skipping`);
            continue;
          }
          
          if (!record.fields || !Array.isArray(record.fields)) {
            console.warn(`   ⚠️ Record ${idx + 1} has no fields array, skipping`);
            continue;
          }
          
          console.log(`   Fields count: ${record.fields.length}`);
          
          // Log sample fields for debugging
          if (record.fields.length > 0) {
            console.log(`   Sample field:`, JSON.stringify(record.fields[0]));
          }

          // Extract title and subtitle
          const title = cleanText(getField(record, "245", "a"));
          const subtitle = cleanText(getField(record, "245", "b"));
          
          console.log(`   Title: ${title || 'NOT FOUND'}`);
          
          if (!title) {
            console.warn(`   ⚠️ No title found, skipping record`);
            continue;
          }
          
          // Extract ISBN
          let isbn = getField(record, "020", "a");
          if (!isbn) isbn = getField(record, "020", "z");
          isbn = cleanISBN(isbn);
          console.log(`   ISBN: ${isbn || 'N/A'}`);
          
          // Extract authors
          const authors = extractAuthors(record);
          console.log(`   Authors: ${authors.join(", ") || 'N/A'}`);
          
          // Extract publisher
          const rawPublisher = getField(record, "260", "b") || getField(record, "264", "b");
          const publisher = cleanPublisher(rawPublisher);
          console.log(`   Publisher: ${publisher || 'N/A'}`);
          
          // Extract publication year
          const rawPubDate = getField(record, "260", "c") || getField(record, "264", "c");
          const publicationYear = extractYear(rawPubDate);
          console.log(`   Year: ${publicationYear || 'N/A'}`);
          
          // Extract edition
          const edition = cleanText(getField(record, "250", "a"));
          
          // Extract language
          let language = getField(record, "041", "a");
          if (!language) {
            const field008 = getControlField(record, "008");
            if (field008 && field008.length >= 38) {
              language = field008.substring(35, 38).trim();
            }
          }
          console.log(`   Language: ${language || 'N/A'}`);
          
          // Extract descriptions
          const physicalDesc = getField(record, "300", "a");
          const notes = getField(record, "500", "a");
          const summary = getField(record, "520", "a");
          const description = summary || notes || physicalDesc;
          
          // Extract classifications
          const lcClassification = getField(record, "050", "a");
          const deweyClassification = getField(record, "082", "a");
          
          // Extract subjects (all 650$a)
          const subjects = getAllFieldValues(record, "650", "a");
          const subject = subjects.map(s => cleanText(s)).join("; ");
          
          // Extract series
          const series = getField(record, "490", "a");
          
          // Control fields
          const controlNumber = getControlField(record, "001");
          const lastModified = getControlField(record, "005");

          const parsed = {
            title,
            subtitle,
            isbn,
            authors: authors.length > 0 ? authors : ["Unknown Author"],
            publisher,
            publicationYear,
            edition,
            language,
            description,
            lcClassification,
            deweyClassification,
            subject,
            series,
            notes,
            physicalDescription: physicalDesc,
            controlNumber,
            lastModified,
          };

          console.log("   ✅ Successfully extracted record\n");
          records.push(parsed);
          
        } catch (err) {
          console.error(`❌ Error processing record ${idx + 1}:`, err.message);
          console.error("Stack:", err.stack);
        }
      }

      if (records.length === 0) {
        return res.status(400).json({ 
          message: "No usable bibliographic data found",
          hint: "The file was parsed but no records contained valid title data"
        });
      }

      console.log(`✅ Successfully extracted ${records.length} of ${parsedRecords.length} record(s)\n`);
      res.status(200).json({ records });

    } catch (err) {
      console.error("\n❌ Unexpected error:", err);
      console.error("Stack:", err.stack);
      
      res.status(500).json({ 
        message: "Unexpected server error while processing MARC file",
        error: err.message
      });
    }
  });

  // ====================
  // 🔹 Mount Router
  // ====================
  app.use("/api/librarian/quick_actions/newbooks", router);
};