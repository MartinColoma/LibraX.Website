import React, { useState } from "react";
import "./NewBooks.css";
import { Loader2, Upload, Plus, X } from "lucide-react";
import usePageMeta from "../../../../../../hooks/usePageMeta";

const NewBooks: React.FC = () => {
  usePageMeta("Librarian - Add New Books", "/LibraX Square Logo 1.png");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // === FORM STATES ===
  const [book, setBook] = useState({
    title: "",
    subtitle: "",
    isbn: "",
    description: "",
    publisher: "",
    publicationYear: "",
    edition: "",
    category: "",
    categoryType: "",
    language: "",
    copies: "",
  });

  // Dynamic authors array
  const [authors, setAuthors] = useState<string[]>([""]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBook((prev) => ({ ...prev, [name]: value }));
  };

  const handleAuthorChange = (index: number, value: string) => {
    const updated = [...authors];
    updated[index] = value;
    setAuthors(updated);
  };

  const addAuthorField = () => {
    setAuthors([...authors, ""]);
  };

  const removeAuthorField = (index: number) => {
    setAuthors(authors.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setBook({
      title: "",
      subtitle: "",
      isbn: "",
      description: "",
      publisher: "",
      publicationYear: "",
      edition: "",
      category: "",
      categoryType: "",
      language: "",
      copies: "",
    });
    setAuthors([""]);
    setMessage(null);
    setStep(1);
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
            isbn: book.isbn,
            title: book.title,
            subtitle: book.subtitle,
            description: book.description,
            publisher: book.publisher,
            publicationYear: book.publicationYear,
            edition: book.edition,
            language: book.language,
            categoryId: book.category,
            authors: authors.filter((a) => a.trim() !== ""), // ← dynamic author array
            copies: parseInt(book.copies) || 1,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add book");

      setMessage("✅ Book successfully added!");
      clearAll();
    } catch (err: any) {
      console.error("❌ Error adding book:", err);
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // === RENDER FORM STEPS ===
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="form-header">
              <h2>Add New Book</h2>
              <button type="button" className="marc-upload-btn">
                MARC Upload <Upload size={16} />
              </button>
            </div>
            <label>Book Title:</label>
            <input
              name="title"
              value={book.title}
              onChange={handleChange}
              placeholder="Enter the full title of the book"
              required
            />
            <label>Subtitle:</label>
            <input
              name="subtitle"
              value={book.subtitle}
              onChange={handleChange}
              placeholder="Enter the subtitle of the book"
            />
            <label>ISBN Number:</label>
            <input
              name="isbn"
              value={book.isbn}
              onChange={handleChange}
              placeholder="Enter ISBN number of the book"
            />
            <label>Description (optional):</label>
            <textarea
              name="description"
              value={book.description}
              onChange={handleChange}
              placeholder="Type any special marks, notes, or restrictions."
            />
          </>
        );

      case 2:
        return (
          <>
            <h2>Add New Book</h2>
            <label>Publisher:</label>
            <input
              name="publisher"
              value={book.publisher}
              onChange={handleChange}
              placeholder="Enter publisher names"
            />
            <label>Publication Year:</label>
            <input
              type="date"
              name="publicationYear"
              value={book.publicationYear}
              onChange={handleChange}
            />
            <label>Edition:</label>
            <input
              name="edition"
              value={book.edition}
              onChange={handleChange}
              placeholder="Enter book edition"
            />
            <label>Category:</label>
            <input
              name="category"
              value={book.category}
              onChange={handleChange}
              placeholder="Choose a category/genre"
            />
            <label>Category Type:</label>
            <input
              name="categoryType"
              value={book.categoryType}
              onChange={handleChange}
              placeholder="Choose a category type"
            />
            <label>Language:</label>
            <input
              name="language"
              value={book.language}
              onChange={handleChange}
              placeholder="e.g. English, Tagalog, Spanish..."
            />
          </>
        );

      case 3:
        return (
          <>
            <h2>Add New Book</h2>
            <label>Author(s):</label>
            {authors.map((author, index) => (
              <div key={index} className="author-input-group">
                <input
                  value={author}
                  onChange={(e) => handleAuthorChange(index, e.target.value)}
                  placeholder={`Author ${index + 1}`}
                />
                {authors.length > 1 && (
                  <button
                    type="button"
                    className="remove-author-btn"
                    onClick={() => removeAuthorField(index)}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="add-author-btn"
              onClick={addAuthorField}
            >
              <Plus size={16} /> Add Another Author
            </button>

            <label>Quantity Available:</label>
            <input
              type="number"
              name="copies"
              value={book.copies}
              onChange={handleChange}
              placeholder="Enter the total number of copies"
            />
          </>
        );
    }
  };

  return (
    <div className="newBooks-wrapper">
      <form className="form-section" onSubmit={handleSubmit}>
        {renderStep()}

        <div className="form-buttons">
          <button type="button" className="clear-btn" onClick={clearAll}>
            Clear All Fields
          </button>

          {step > 1 && (
            <button type="button" className="back-btn" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}

          {step < 3 ? (
            <button type="button" className="next-btn" onClick={() => setStep(step + 1)}>
              Next
            </button>
          ) : (
            <button type="submit" className="add-btn" disabled={loading}>
              {loading ? <Loader2 className="spin" size={20} /> : "Add Book"}
            </button>
          )}
        </div>

        {message && <p className="status-msg">{message}</p>}
      </form>

      {/* === LIVE PREVIEW === */}
      <div className="preview-section">
        <h2>New Book Preview</h2>
        <p><strong>Book Title:</strong> {book.title || "[The Title of the Book]"}</p>
        <p><strong>Subtitle:</strong> {book.subtitle || "[Subtitle of the book]"}</p>
        <p><strong>ISBN Number:</strong> {book.isbn || "0000000000"}</p>
        <p><strong>Author(s):</strong> {authors.filter(Boolean).join(", ") || "[Author(s) Names]"}</p>
        <p><strong>Publisher:</strong> {book.publisher || "[Publisher names]"}</p>
        <p><strong>Publication Year:</strong> {book.publicationYear || "[YYYY-MM-DD]"}</p>
        <p><strong>Edition:</strong> {book.edition || "[Edition]"}</p>
        <p><strong>Category:</strong> {book.category || "[Category]"}</p>
        <p><strong>Category Type:</strong> {book.categoryType || "[Category Type]"}</p>
        <p><strong>Language:</strong> {book.language || "[Language]"}</p>
        <p><strong>Quantity Available:</strong> {book.copies || "0"}</p>
        <p><strong>Description:</strong> {book.description || "[Description of the book]"} </p>
      </div>
    </div>
  );
};

export default NewBooks;
