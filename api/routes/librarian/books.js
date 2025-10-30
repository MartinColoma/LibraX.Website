const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ========== ID GENERATORS ==========
function generateBookId() {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(100000 + Math.random() * 900000);
  return `B${year}${random}`; // e.g. B2503456
}

function generateCopyId(bookId, index) {
  return `${bookId}-C${String(index + 1).padStart(3, "0")}`;
}

function generateLogId() {
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `LOG-${random}`;
}

// ========== MAIN ROUTE EXPORT ==========
module.exports = function newBooksRoute(app) {
  // ======== 🟢 Add Book ========
  app.post("/api/librarian/books/add", async (req, res) => {
    const {
      isbn,
      title,
      subtitle,
      description,
      publisher,
      publication_year,
      edition,
      category_id,
      language,
      authors = [],
      numCopies = 1,
      performed_by = "Librarian",
    } = req.body;

    if (!isbn || !title) {
      return res.status(400).json({ message: "❌ ISBN and Title are required." });
    }

    const book_id = generateBookId();

    try {
      // 1️⃣ Insert Book
      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .insert([
          {
            book_id,
            isbn,
            title,
            subtitle: subtitle || null,
            description: description || null,
            publisher: publisher || null,
            publication_year: publication_year || null,
            edition: edition || null,
            category_id: category_id || null,
            language: language || "English",
          },
        ])
        .select()
        .single();

      if (bookError) throw bookError;

      // 2️⃣ Process Authors
      const authorIds = [];
      for (const name of authors.map((a) => a.trim()).filter(Boolean)) {
        // Check if author already exists
        const { data: existing, error: findErr } = await supabase
          .from("authors")
          .select("author_id")
          .eq("name", name)
          .maybeSingle();
        if (findErr) throw findErr;

        let author_id;
        if (!existing) {
          // Insert new author
          const { data: newAuthor, error: authorErr } = await supabase
            .from("authors")
            .insert([{ name }])
            .select("author_id")
            .single();
          if (authorErr) throw authorErr;
          author_id = newAuthor.author_id;
        } else {
          author_id = existing.author_id;
        }

        // Link author to book
        const { error: linkErr } = await supabase
          .from("book_authors")
          .insert([{ book_id, author_id }]);
        if (linkErr) throw linkErr;

        authorIds.push(author_id);
      }

      // 3️⃣ Insert Book Copies & Logs
      const createdCopies = [];
      for (let i = 0; i < numCopies; i++) {
        const copy_id = generateCopyId(book_id, i);
        const nfc_uid = crypto.randomBytes(4).toString("hex").toUpperCase();
        const log_id = generateLogId();

        // Insert book copy
        const { error: copyError } = await supabase.from("book_copies").insert([
          {
            copy_id,
            book_id,
            nfc_uid,
            status: "Available",
            book_condition: "Good",
            location: "Main Shelf",
          },
        ]);
        if (copyError) throw copyError;

        // Insert inventory log
        const { error: logError } = await supabase.from("inventory_logs").insert([
          {
            log_id,
            copy_id,
            action: "Added",
            performed_by,
          },
        ]);
        if (logError) throw logError;

        createdCopies.push(copy_id);
      }

      res.status(201).json({
        message: "✅ Book added successfully!",
        book: bookData,
        authors: authorIds,
        copiesCreated: createdCopies,
      });
    } catch (err) {
      console.error("❌ Error adding book:", err);
      res.status(500).json({
        message: "❌ Failed to add book",
        error: err.message,
      });
    }
  });

  // ======== 🟡 Get All Books (Paginated + Search) ========
  app.get("/api/librarian/books", async (req, res) => {
    const limit = parseInt(req.query.limit) || 5;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || "";

    try {
      // Main query
      const { data: books, error: fetchError } = await supabase
        .from("books")
        .select(
          `
          book_id,
          title,
          language,
          date_added,
          category_id,
          categories(category_name),
          book_copies(copy_id)
        `
        )
        .ilike("title", `%${search}%`)
        .order("date_added", { ascending: false })
        .range(offset, offset + limit - 1);

      if (fetchError) throw fetchError;

      // Count total books
      const { count, error: countError } = await supabase
        .from("books")
        .select("book_id", { count: "exact", head: true })
        .ilike("title", `%${search}%`);
      if (countError) throw countError;

      // Aggregate quantity per book
      const booksWithCounts = books.map((b) => ({
        ...b,
        category_name: b.categories?.category_name || "Uncategorized",
        quantity: b.book_copies?.length || 0,
      }));

      res.json({ books: booksWithCounts, total: count });
    } catch (err) {
      console.error("❌ Error fetching books:", err);
      res.status(500).json({ message: "❌ Failed to fetch books" });
    }
  });

  // ======== 🔵 Get Book Details ========
  app.get("/api/librarian/books/:book_id", async (req, res) => {
    const { book_id } = req.params;

    try {
      // Fetch book + category
      const { data: book, error: bookErr } = await supabase
        .from("books")
        .select(
          `
          *,
          categories(category_name, category_type)
        `
        )
        .eq("book_id", book_id)
        .single();
      if (bookErr) throw bookErr;

      // Fetch authors
      const { data: authors, error: authorErr } = await supabase
        .from("book_authors")
        .select("authors(name)")
        .eq("book_id", book_id);
      if (authorErr) throw authorErr;

      // Fetch copy stats
      const { data: copies, error: copyErr } = await supabase
        .from("book_copies")
        .select("status")
        .eq("book_id", book_id);
      if (copyErr) throw copyErr;

      const stats = {
        total: copies.length,
        available: copies.filter((c) => c.status === "Available").length,
        borrowed: copies.filter((c) => c.status === "Borrowed").length,
        unavailable: copies.filter((c) =>
          ["Lost", "Damaged"].includes(c.status)
        ).length,
      };

      res.json({
        ...book,
        authors: authors.map((a) => a.authors.name),
        ...stats,
      });
    } catch (err) {
      console.error("❌ Error fetching book details:", err);
      res.status(500).json({ message: "❌ Failed to fetch book details" });
    }
  });

  // ======== 🔴 Delete Book ========
  app.delete("/api/librarian/books/:book_id", async (req, res) => {
    const { book_id } = req.params;

    try {
      // Delete logs first
      await supabase.rpc("delete_book_relations", { bid: book_id }); // optional custom RPC cleanup

      // Manual cascade delete
      await supabase.from("inventory_logs").delete().in(
        "copy_id",
        supabase
          .from("book_copies")
          .select("copy_id")
          .eq("book_id", book_id)
      );
      await supabase.from("book_copies").delete().eq("book_id", book_id);
      await supabase.from("book_authors").delete().eq("book_id", book_id);
      const { error: deleteError } = await supabase
        .from("books")
        .delete()
        .eq("book_id", book_id);

      if (deleteError) throw deleteError;
      res.json({ message: "✅ Book deleted successfully!" });
    } catch (err) {
      console.error("❌ Error deleting book:", err);
      res.status(500).json({ message: "❌ Failed to delete book" });
    }
  });
};
