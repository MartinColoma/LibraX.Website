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
// 🔹 IMPROVED HELPER: Safe Get with Better Validation
// ====================
function safeGet(record, tag, code = null) {
  try {
    // Validate inputs
    if (!record || typeof record !== 'object') {
      console.warn(`safeGet: Invalid record object for tag ${tag}`);
      return "";
    }
    
    if (!record.fields || !Array.isArray(record.fields)) {
      console.warn(`safeGet: Record has no fields array for tag ${tag}`);
      return "";
    }

    // Get all fields with this tag
    const fields = record.fields.filter(f => f && f.tag === tag);
    if (fields.length === 0) return "";

    const field = fields[0];

    // Control fields (001, 005, 008, etc.) - no subfields
    if (tag.match(/^00[0-9]$/)) {
      if (field.data !== undefined && field.data !== null) {
        return String(field.data).trim();
      }
      return "";
    }

    // Data fields with subfields
    if (code && field.subfields && Array.isArray(field.subfields)) {
      const subfield = field.subfields.find(sf => sf && sf.code === code);
      if (subfield && subfield.value !== undefined && subfield.value !== null) {
        return String(subfield.value).replace(/[\/\:;,.\s]+$/, "").trim();
      }
      return "";
    }

    // No code specified - concatenate all subfields
    if (!code && field.subfields && Array.isArray(field.subfields)) {
      return field.subfields
        .filter(sf => sf && sf.value)
        .map(sf => String(sf.value).trim())
        .filter(Boolean)
        .join(" ")
        .replace(/[\/\:;,.\s]+$/, "")
        .trim();
    }

    return "";
  } catch (err) {
    console.error(`Error extracting ${tag}${code ? `${code}` : ""}:`, err.message);
    return "";
  }
}
// ====================
// 🔹 MARC Parsing with Multiple Format Support
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
      console.log("Detected XML format - marcjs doesn't support MARCXML directly");
      errors.push("MARCXML format detected but not supported by marcjs. Please convert to MARC21 binary format.");
      throw new Error("MARCXML not supported");
    }
    
    // Try parsing as text
    const records = parseSync(text);
    if (records && records.length > 0) {
      console.log("✅ Method 2 succeeded!");
      return records;
    }
  } catch (err) {
    console.log("❌ Method 2 failed:", err.message);
    errors.push(`Text parse: ${err.message}`);
  }
  
  // Method 3: Try with different encodings
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
    
    // Check for common format indicators
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
        
        // Log available tags for debugging
        const availableTags = [...new Set(record.fields.map(f => f.tag))].sort();
        console.log(`   Available tags: ${availableTags.join(', ')}`);

        // Extract fields
        const title = safeGet(record, "245", "a");
        const subtitle = safeGet(record, "245", "b");
        
        // Skip records without a title
        if (!title) {
          console.warn(`   ⚠️ Record ${idx + 1} has no title (245$a), skipping`);
          continue;
        }
        
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
        
        // ISBN - try both $a and $z (invalid/cancelled ISBNs)
        let isbn = safeGet(record, "020", "a");
        if (!isbn) isbn = safeGet(record, "020", "z");
        
        // Clean ISBN (remove hyphens and text)
        if (isbn) {
          isbn = isbn.replace(/[-\s]/g, '').match(/\d{10,13}/)?.[0] || isbn;
        }
        
        // Subjects
        const subjects = getAllSubjects(record, "650");
        
        // Control fields
        const controlNumber = safeGet(record, "001");
        const timestamp = safeGet(record, "005");
        const fixedData = safeGet(record, "008");
        
        // Extract language from 008 field if not in 041
        let language = safeGet(record, "041", "a");
        if (!language && fixedData && fixedData.length >= 38) {
          language = fixedData.substring(35, 38); // Language code is at positions 35-37
        }
        
        // Other metadata
        const edition = safeGet(record, "250", "a");
        const description = safeGet(record, "300", "a");
        const notes = safeGet(record, "500", "a");
        const series = safeGet(record, "490", "a");
        const place = safeGet(record, "260", "a") || safeGet(record, "264", "a");
        
        // LC and Dewey classifications
        const lcClassification = safeGet(record, "050", "a");
        const deweyClassification = safeGet(record, "082", "a");

        const parsed = {
          // Main bibliographic info
          title,
          subtitle,
          isbn,
          authors: allAuthors.length > 0 ? allAuthors : ["Unknown Author"],
          publisher,
          publicationYear,
          edition,
          language,
          description,
          
          // Classification & subjects
          lcClassification,
          deweyClassification,
          subject: subjects.join("; "),
          
          // Additional metadata
          series,
          notes,
          place,
          
          // Control fields (for reference)
          controlNumber,
          timestamp,
          fixedData,
        };

        console.log("   ✅ Extracted:");
        console.log(`      Title: ${parsed.title}`);
        console.log(`      Authors: ${parsed.authors.join(", ")}`);
        console.log(`      Publisher: ${parsed.publisher || 'N/A'}`);
        console.log(`      Year: ${parsed.publicationYear || 'N/A'}`);
        console.log(`      ISBN: ${parsed.isbn || 'N/A'}`);
        console.log(`      Language: ${parsed.language || 'N/A'}`);

        records.push(parsed);
        
      } catch (err) {
        console.error(`❌ Error processing record ${idx + 1}:`, err.message);
        console.error("Stack:", err.stack);
        // Continue with next record
      }
    }

    if (records.length === 0) {
      return res.status(400).json({ 
        message: "No usable bibliographic data found",
        hint: "The file was parsed but no records contained the required title field (245$a)"
      });
    }

    console.log(`\n✅ Successfully extracted ${records.length} of ${parsedRecords.length} record(s)\n`);
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
  // 🔹 IMPROVED HELPER FUNCTIONS
  // ====================
  function safeGet(record, tag, code = null) {
    try {
      if (!record || !record.fields || !Array.isArray(record.fields)) {
        return "";
      }

      const fields = record.fields.filter(f => f && f.tag === tag);
      if (fields.length === 0) return "";

      const field = fields[0];

      // Control fields (001-009)
      if (tag.match(/^00[0-9]$/)) {
        if (field.data !== undefined && field.data !== null) {
          return String(field.data).trim();
        }
        return "";
      }

      // Data fields with subfields
      if (code && field.subfields && Array.isArray(field.subfields)) {
        const subfield = field.subfields.find(sf => sf && sf.code === code);
        if (subfield && subfield.value !== undefined && subfield.value !== null) {
          return String(subfield.value).replace(/[\/\:;,.\s]+$/, "").trim();
        }
        return "";
      }

      // No code - concatenate all subfields
      if (!code && field.subfields && Array.isArray(field.subfields)) {
        return field.subfields
          .filter(sf => sf && sf.value)
          .map(sf => String(sf.value).trim())
          .filter(Boolean)
          .join(" ")
          .replace(/[\/\:;,.\s]+$/, "")
          .trim();
      }

      return "";
    } catch (err) {
      console.error(`Error in safeGet(${tag}, ${code}):`, err.message);
      return "";
    }
  }

  function getAllSubjects(record, tag) {
    try {
      if (!record || !record.fields || !Array.isArray(record.fields)) {
        return [];
      }
      
      const fields = record.fields.filter(f => f && f.tag === tag);
      const subjects = [];
      
      for (const field of fields) {
        if (field.subfields && Array.isArray(field.subfields)) {
          const subfield = field.subfields.find(sf => sf && sf.code === "a");
          if (subfield && subfield.value) {
            subjects.push(String(subfield.value).trim());
          }
        }
      }
      
      return subjects;
    } catch (err) {
      console.error(`Error in getAllSubjects(${tag}):`, err.message);
      return [];
    }
  }

  function getAllContributors(record) {
    try {
      if (!record || !record.fields || !Array.isArray(record.fields)) {
        return [];
      }
      
      const fields = record.fields.filter(f => f && f.tag === "700");
      const contributors = [];
      
      for (const field of fields) {
        if (field.subfields && Array.isArray(field.subfields)) {
          const subfield = field.subfields.find(sf => sf && sf.code === "a");
          if (subfield && subfield.value) {
            const name = String(subfield.value).replace(/[,.\s]+$/, "").trim();
            if (name) contributors.push(name);
          }
        }
      }
      
      return contributors;
    } catch (err) {
      console.error("Error in getAllContributors:", err.message);
      return [];
    }
  }

  function extractYear(dateString) {
    if (!dateString) return "";
    const yearMatch = String(dateString).match(/\d{4}/);
    return yearMatch ? yearMatch[0] : "";
  }
  // ====================
  // 🔹 Mount Router
  // ====================
  app.use("/api/librarian/quick_actions/newbooks", router);
};