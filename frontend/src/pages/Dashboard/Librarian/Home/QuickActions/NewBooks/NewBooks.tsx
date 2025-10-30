import React, { useState } from "react";
import "./NewBooks.css";
import { Loader2, Plus, X } from "lucide-react";
import usePageMeta from "../../../../../../hooks/usePageMeta";

const NewBooks: React.FC = () => {
  usePageMeta("Librarian - Add New Books", "/LibraX Square Logo 1.png");

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [isbn, setIsbn] = useState("");
  const [description, setDescription] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publicationYear, setPublicationYear] = useState("");
  const [edition, setEdition] = useState("");
  const [language, setLanguage] = useState("English");
  const [category, setCategory] = useState("");
  const [authors, setAuthors] = useState<string[]>([""]);
  const [copies, setCopies] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleAddAuthor = () => setAuthors([...authors, ""]);
  const handleRemoveAuthor = (i: number) => setAuthors(authors.filter((_, idx) => idx !== i));
  const handleAuthorChange = (i: number, v: string) => {
    const updated = [...authors];
    updated[i] = v;
    setAuthors(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(
        "https://librax-website-frontend.onrender.com/api/librarian/quick_actions/newbooks",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            isbn,
            title,
            subtitle,
            description,
            publisher,
            publicationYear,
            edition,
            language,
            categoryId: category, // ✅ correct key
            authors,
            copies,
            }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add book");

      setMessage("✅ Book successfully added!");
      setTitle("");
      setSubtitle("");
      setIsbn("");
      setDescription("");
      setPublisher("");
      setPublicationYear("");
      setEdition("");
      setLanguage("English");
      setCategory("");
      setAuthors([""]);
      setCopies(1);
    } catch (err: any) {
      console.error("❌ Error adding book:", err);
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="newBooks-page">
      <div className="newBooks-container">
        <h2>Add New Book</h2>
        <form className="newBooks-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter book title"
              required
            />

            <label>Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Enter subtitle (optional)"
            />

            <label>ISBN</label>
            <input
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="Enter ISBN"
            />

            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a short description"
            />
          </div>

          <div className="form-row">
            <label>Publisher</label>
            <input
              type="text"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="Publisher name"
            />

            <label>Publication Year</label>
            <input
              type="number"
              value={publicationYear}
              onChange={(e) => setPublicationYear(e.target.value)}
              placeholder="e.g. 2025"
            />

            <label>Edition</label>
            <input
              type="text"
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
              placeholder="e.g. 2nd Edition"
            />

            <label>Language</label>
            <input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />

            <label>Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category name"
            />

            <label>Number of Copies</label>
            <input
              type="number"
              min={1}
              value={copies}
              onChange={(e) => setCopies(parseInt(e.target.value))}
            />
          </div>

          <div className="authors-section">
            <label>Authors *</label>
            {authors.map((author, i) => (
              <div key={i} className="author-field">
                <input
                  type="text"
                  value={author}
                  onChange={(e) => handleAuthorChange(i, e.target.value)}
                  placeholder={`Author ${i + 1}`}
                  required
                />
                {authors.length > 1 && (
                  <button
                    type="button"
                    className="remove-author-btn"
                    onClick={() => handleRemoveAuthor(i)}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="add-author-btn" onClick={handleAddAuthor}>
              <Plus size={16} /> Add Author
            </button>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? <Loader2 className="spin" size={20} /> : "Add Book"}
            </button>
            {message && <p className="status-msg">{message}</p>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewBooks;
