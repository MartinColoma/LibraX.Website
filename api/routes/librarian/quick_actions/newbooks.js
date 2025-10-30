const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateBookId() {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(100000 + Math.random() * 900000);
  return `B${year}${random}`; // e.g. B2501234
}

function generateCopyId(bookId, index) {
  return `${bookId}-C${String(index + 1).padStart(3, "0")}`;
}

function generateLogId() {
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `LOG-${random}`;
}

module.exports = function newBooksRoute(app) {
  app.post("/api/librarian/quick_actions/newbooks", async (req, res) => {
    const {
      isbn,
      title,
      subtitle,
      description,
      publisher,
      publicationYear,
      edition,
      categoryId,
      language,
      authors = [],
      copies = 1,
      performedBy = "Librarian",
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "❌ Missing required field: title" });
    }

    const bookId = generateBookId();

    try {
      // 1️⃣ Insert into books
      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .insert([
          {
            book_id: bookId,
            isbn: isbn || null,
            title,
            subtitle: subtitle || null,
            description: description || null,
            publisher: publisher || null,
            publication_year: publicationYear || null,
            edition: edition || null,
            category_id: categoryId || null,
            language: language || "English",
          },
        ])
        .select()
        .single();

      if (bookError) throw bookError;

      // 2️⃣ Handle Authors
      const authorLinks = [];
      for (const authorName of authors) {
        // Check if author exists
        const { data: existingAuthor } = await supabase
          .from("authors")
          .select("author_id")
          .eq("name", authorName)
          .single();

        let authorId;
        if (existingAuthor) {
          authorId = existingAuthor.author_id;
        } else {
          // Insert new author
          const { data: newAuthor, error: authorError } = await supabase
            .from("authors")
            .insert([{ name: authorName }])
            .select("author_id")
            .single();

          if (authorError) throw authorError;
          authorId = newAuthor.author_id;
        }

        // Link author to book
        const { error: linkError } = await supabase
          .from("book_authors")
          .insert([{ book_id: bookId, author_id: authorId }]);
        if (linkError) throw linkError;

        authorLinks.push(authorId);
      }

      // 3️⃣ Create Copies
      const copyEntries = [];
      for (let i = 0; i < copies; i++) {
        const copyId = generateCopyId(bookId, i);
        const barcode = Math.floor(100000000000 + Math.random() * 900000000000);

        const { error: copyError } = await supabase
          .from("book_copies")
          .insert([
            {
              copy_id: copyId,
              book_id: bookId,
              barcode,
              status: "Available",
              book_condition: "Good",
              location: "Main Shelf",
            },
          ]);
        if (copyError) throw copyError;

        // Log entry
        const logId = generateLogId();
        const { error: logError } = await supabase
          .from("inventory_logs")
          .insert([
            {
              log_id: logId,
              copy_id: copyId,
              action: "Added",
              performed_by: performedBy,
            },
          ]);
        if (logError) throw logError;

        copyEntries.push(copyId);
      }

      return res.status(200).json({
        message: "✅ New book successfully added",
        book: bookData,
        authors: authorLinks,
        copies: copyEntries,
      });
    } catch (err) {
      console.error("❌ Error adding new book:", err);
      return res.status(500).json({
        message: "❌ Failed to add new book",
        error: err.message,
      });
    }
  });
};
