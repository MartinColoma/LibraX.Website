import React, { useState, useEffect, useRef } from "react";
import "./NewBooks.css";
import { Loader2, Upload, Plus, X, ChevronDown } from "lucide-react";
import usePageMeta from "../../../../../../hooks/usePageMeta";

const NewBooks: React.FC = () => {
  usePageMeta("Home - Add New Books", "/LibraX Square Logo 1.png");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<any[]>([]);
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [showTypeList, setShowTypeList] = useState(false);
  const [allAuthors, setAllAuthors] = useState<any[]>([]);

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
  const [authors, setAuthors] = useState<string[]>([""]);

  // === MARC METADATA (for display purposes) ===
  const [marcMetadata, setMarcMetadata] = useState<{
    lcClassification?: string;
    deweyClassification?: string;
    subject?: string;
    series?: string;
  }>({});

  // === NFC STATES ===
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const [nfcMessage, setNfcMessage] = useState("");
  const [scannedUIDs, setScannedUIDs] = useState<string[]>([]);
  const nfcAbortControllerRef = useRef<AbortController | null>(null);
  const ndefReaderRef = useRef<any>(null);

  // === MARC INPUT REF ===
  const marcInputRef = useRef<HTMLInputElement | null>(null);

  // === LANGUAGE MAPPING ===
  const languageMap: { [key: string]: string } = {
    eng: "English",
    spa: "Spanish",
    fre: "French",
    ger: "German",
    ita: "Italian",
    por: "Portuguese",
    jpn: "Japanese",
    chi: "Chinese",
    rus: "Russian",
    ara: "Arabic",
    hin: "Hindi",
    tgl: "Tagalog",
    fil: "Filipino",
  };

  const mapLanguageCode = (code: string): string => {
    if (!code) return "";
    const lowerCode = code.toLowerCase().trim();
    return languageMap[lowerCode] || code;
  };

  // === FETCH AUTHORS ===
  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const res = await fetch(
          "https://librax-website-frontend.onrender.com/api/librarian/quick_actions/newbooks/authors"
        );
        const data = await res.json();
        setAllAuthors(data.authors || []);
      } catch (err) {
        console.error("❌ Failed to fetch authors:", err);
      }
    };
    fetchAuthors();
  }, []);

  // === FETCH CATEGORIES ===
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(
          "https://librax-website-frontend.onrender.com/api/librarian/quick_actions/newbooks/categories"
        );
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (err) {
        console.error("❌ Failed to fetch categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // === FILTER CATEGORIES BY TYPE ===
  useEffect(() => {
    if (book.categoryType) {
      const filtered = categories.filter(
        (c) => c.category_type.toLowerCase() === book.categoryType.toLowerCase()
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories([]);
    }
  }, [book.categoryType, categories]);

  // === CHECK NFC SUPPORT ===
  useEffect(() => {
    const checkNFCSupport = async () => {
      if ("NDEFReader" in window) {
        try {
          const permission = await navigator.permissions.query({ name: "nfc" as any });
          setNfcSupported(permission.state !== "denied");
        } catch {
          setNfcSupported(false);
        }
      } else {
        setNfcSupported(false);
      }
    };
    checkNFCSupport();
  }, []);

  // === NFC HANDLERS ===
  const startNFCReading = async () => {
    if (!nfcSupported) {
      alert("Native NFC not supported. Use USB reader instead.");
      return;
    }
    setNfcReading(true);
    setNfcMessage("📱 Waiting for NFC tag... Hold card near device.");
    nfcAbortControllerRef.current = new AbortController();

    try {
      const ndef = new (window as any).NDEFReader();
      ndefReaderRef.current = ndef;
      await ndef.scan({ signal: nfcAbortControllerRef.current.signal });

      ndef.onreading = (event: any) => {
        let uid = event.serialNumber || "";
        if (!uid && event.message && event.message.records) {
          for (const record of event.message.records) {
            if (record.recordType === "text" || record.recordType === "uri") {
              uid = new TextDecoder().decode(record.data);
              break;
            }
          }
        }

        if (uid) {
          if (!scannedUIDs.includes(uid)) {
            setScannedUIDs((prev) => [...prev, uid]);
            setNfcMessage(`✅ NFC tag added: ${uid}`);
          } else {
            setNfcMessage(`⚠️ Duplicate NFC UID: ${uid}`);
          }
        } else {
          setNfcMessage("⚠️ NFC tag detected but no UID found.");
        }
      };

      ndef.onreadingerror = () => {
        setNfcMessage("❌ Error reading NFC tag.");
      };
    } catch (error: any) {
      console.error("NFC error:", error);
      setNfcMessage(`❌ NFC Error: ${error.message}`);
      setNfcReading(false);
    }
  };

  const stopNFCReading = () => {
    if (nfcAbortControllerRef.current) nfcAbortControllerRef.current.abort();
    setNfcReading(false);
  };

  // === FORM HANDLERS ===
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBook((prev) => ({ ...prev, [name]: value }));
  };

  const handleAuthorChange = (index: number, value: string) => {
    const updated = [...authors];
    updated[index] = value;
    setAuthors(updated);
  };

  const addAuthorField = () => setAuthors([...authors, ""]);
  const removeAuthorField = (index: number) => setAuthors(authors.filter((_, i) => i !== index));

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
    setScannedUIDs([]);
    setNfcMessage("");
    setMarcMetadata({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const pubYear = book.publicationYear
        ? parseInt(book.publicationYear.split("-")[0])
        : null;

      const res = await fetch(
        "https://librax-website-frontend.onrender.com/api/librarian/quick_actions/newbooks",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isbn: book.isbn.trim(),
            title: book.title.trim(),
            subtitle: book.subtitle.trim(),
            description: book.description.trim(),
            publisher: book.publisher.trim(),
            publicationYear: pubYear,
            edition: book.edition.trim(),
            language: book.language.trim(),
            categoryId: parseInt(book.category) || null,
            authors: authors.filter((a) => a.trim() !== ""),
            copies: scannedUIDs.length || parseInt(book.copies) || 1,
            nfcUids: scannedUIDs,
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

  const handleMarcButtonClick = () => marcInputRef.current?.click();

const handleMarcFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file extension
  const validExtensions = ['.mrc', '.marc', '.dat', '.bin'];
  const fileName = file.name.toLowerCase();
  const hasValidExt = validExtensions.some(ext => fileName.endsWith(ext));
  
  if (!hasValidExt) {
    const proceed = window.confirm(
      `The file "${file.name}" doesn't have a standard MARC extension (.mrc, .marc).\n\n` +
      `Do you want to try uploading it anyway?`
    );
    if (!proceed) {
      if (marcInputRef.current) marcInputRef.current.value = "";
      return;
    }
  }

  setLoading(true);
  setMessage("📄 Uploading and parsing MARC file...");

  try {
    const formData = new FormData();
    formData.append("file", file);

    console.log("📤 Uploading MARC file:", file.name, `(${file.size} bytes)`);

    const res = await fetch(
      "https://librax-website-frontend.onrender.com/api/librarian/quick_actions/newbooks/marc",
      { method: "POST", body: formData }
    );

    const data = await res.json();
    
    if (!res.ok) {
      // Handle specific error cases with helpful messages
      let errorMessage = data.message || "Failed to parse MARC file";
      
      if (data.hints && Array.isArray(data.hints)) {
        errorMessage += "\n\n💡 Suggestions:\n" + data.hints.map((h: string) => `• ${h}`).join("\n");
      } else if (data.hint) {
        errorMessage += "\n\n💡 " + data.hint;
      }
      
      if (data.details) {
        console.error("MARC parsing details:", data.details);
      }
      
      throw new Error(errorMessage);
    }

    const record = data.records?.[0];
    if (!record) {
      throw new Error("No MARC record found in file");
    }

    console.log("📖 Received MARC record:", record);

    // === Extract and validate data ===
    
    // Title (required)
    const title = record.title?.trim() || "";
    if (!title) {
      throw new Error("MARC record contains no title. Please check the file.");
    }

    // Subtitle
    const subtitle = record.subtitle?.trim() || "";

    // ISBN - clean it up
    const isbn = record.isbn?.trim() || "";

    // Publisher - clean trailing punctuation
    const publisher = record.publisher?.trim() || "";

    // Publication year - format for date input
    let formattedYear = "";
    if (record.publicationYear) {
      const year = record.publicationYear.match(/\d{4}/)?.[0];
      if (year) {
        formattedYear = `${year}-01-01`; // Format as YYYY-MM-DD for date input
      }
    }

    // Edition
    const edition = record.edition?.trim() || "";

    // Language - map code to full name
    const languageCode = record.language?.trim() || "";
    const language = mapLanguageCode(languageCode);

    // Description - use summary, notes, or physical description
    const description = record.description?.trim() || "";

    // Authors - filter out "Unknown Author" and empty strings
    let marcAuthors = record.authors || [];
    
    // Remove "Unknown Author" placeholder
    marcAuthors = marcAuthors.filter((a: string) => {
      const cleaned = a.trim();
      return cleaned !== "" && cleaned.toLowerCase() !== "unknown author";
    });

    // If no authors found, start with one empty field
    if (marcAuthors.length === 0) {
      marcAuthors = [""];
    }

    console.log("✅ Extracted data:");
    console.log("  Title:", title);
    console.log("  Authors:", marcAuthors);
    console.log("  Publisher:", publisher);
    console.log("  Year:", record.publicationYear);
    console.log("  ISBN:", isbn);
    console.log("  Language:", language);

    // === Update form with MARC data ===
    setBook({
      title,
      subtitle,
      isbn,
      publisher,
      publicationYear: formattedYear,
      edition,
      language,
      description,
      category: "",
      categoryType: "",
      copies: "1",
    });

    // === Set authors ===
    setAuthors(marcAuthors);

    // === Store MARC metadata for reference ===
    setMarcMetadata({
      lcClassification: record.lcClassification,
      deweyClassification: record.deweyClassification,
      subject: record.subject,
      series: record.series,
    });

    // === Success message with summary ===
    const summary = [
      title,
      marcAuthors.length > 0 && marcAuthors[0] ? `by ${marcAuthors.join(", ")}` : "",
      publisher ? `(${publisher})` : "",
      record.publicationYear || ""
    ].filter(Boolean).join(" ");

    setMessage(`✅ MARC file parsed successfully!\n\n${summary}\n\nPlease verify the data and select a category.`);
    
  } catch (err: any) {
    console.error("❌ MARC upload error:", err);
    
    // Format error message for display
    const errorLines = err.message.split("\n");
    const mainError = errorLines[0];
    const details = errorLines.slice(1).join("\n");
    
    setMessage(`❌ ${mainError}`);
    
    // Show detailed error in alert if available
    if (details) {
      setTimeout(() => {
        alert(`MARC Upload Failed\n\n${mainError}\n${details}`);
      }, 100);
    }
    
  } finally {
    setLoading(false);
    if (marcInputRef.current) marcInputRef.current.value = "";
  }
};

  const totalCopies = Number(book.copies) || scannedUIDs.length;
  const allCopiesScanned = scannedUIDs.length >= totalCopies;

  // === RENDER STEPS ===
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="form-header">
              <h2>Add New Book</h2>
              <button type="button" className="marc-upload-btn" onClick={handleMarcButtonClick}>
                MARC Upload <Upload size={16} />
              </button>
              <input
                type="file"
                ref={marcInputRef}
                accept=".mrc,.marc"
                style={{ display: "none" }}
                onChange={handleMarcFileChange}
              />
            </div>

            {/* Display MARC metadata if available */}
            {(marcMetadata.lcClassification || marcMetadata.deweyClassification || marcMetadata.subject) && (
              <div style={{ 
                background: "#f0f9ff", 
                padding: "12px", 
                borderRadius: "6px", 
                marginBottom: "16px",
                fontSize: "0.9em"
              }}>
                <strong>📚 MARC Classification Info:</strong>
                {marcMetadata.lcClassification && (
                  <div>• LC: {marcMetadata.lcClassification}</div>
                )}
                {marcMetadata.deweyClassification && (
                  <div>• Dewey: {marcMetadata.deweyClassification}</div>
                )}
                {marcMetadata.subject && (
                  <div>• Subject: {marcMetadata.subject}</div>
                )}
                {marcMetadata.series && (
                  <div>• Series: {marcMetadata.series}</div>
                )}
              </div>
            )}

            <label>Book Title: *</label>
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
              rows={4}
            />
          </>
        );
      case 2:
        const uniqueCategoryTypes = Array.from(
          new Set(categories.map((c) => c.category_type))
        );
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
            <label>Category Type: *</label>
            <div className="combobox">
              <input
                name="categoryType"
                value={book.categoryType}
                onChange={handleChange}
                placeholder="Select or type a category type"
                onFocus={() => setShowTypeList(true)}
                onBlur={() => setTimeout(() => setShowTypeList(false), 200)}
                required
              />
              <ChevronDown className="dropdown-icon" />
              {showTypeList && (
                <ul className="dropdown-list">
                  {uniqueCategoryTypes.map((type) => (
                    <li
                      key={type}
                      onClick={() => {
                        setBook((prev) => ({
                          ...prev,
                          categoryType: type,
                          category: "",
                        }));
                        setShowTypeList(false);
                      }}
                    >
                      {type}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label>Category: *</label>
            <div className="combobox">
              <input
                name="category"
                value={
                  book.category
                    ? filteredCategories.find((c) => c.category_id === parseInt(book.category))
                        ?.category_name || book.category
                    : ""
                }
                onChange={handleChange}
                placeholder={
                  book.categoryType
                    ? "Select a category"
                    : "Please select category type first"
                }
                onFocus={() => setShowCategoryList(true)}
                onBlur={() => setTimeout(() => setShowCategoryList(false), 200)}
                disabled={!book.categoryType}
                required
              />
              <ChevronDown className="dropdown-icon" />
              {showCategoryList && filteredCategories.length > 0 && (
                <ul className="dropdown-list">
                  {filteredCategories.map((cat) => (
                    <li
                      key={cat.category_id}
                      onClick={() => {
                        setBook((prev) => ({
                          ...prev,
                          category: String(cat.category_id),
                        }));
                        setShowCategoryList(false);
                      }}
                    >
                      {cat.category_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

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
            <label>Author(s): *</label>
            {authors.map((author, index) => (
              <div key={index} className="author-input-group">
                <div className="combobox">
                  <input
                    value={author}
                    onChange={(e) => handleAuthorChange(index, e.target.value)}
                    placeholder={`Author ${index + 1}`}
                    list={`author-suggestions-${index}`}
                    required={index === 0}
                  />
                  <datalist id={`author-suggestions-${index}`}>
                    {allAuthors
                      .filter((a) =>
                        a.name.toLowerCase().includes(author.toLowerCase())
                      )
                      .map((a) => (
                        <option key={a.author_id} value={a.name} />
                      ))}
                  </datalist>
                </div>
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
            <button type="button" className="add-author-btn" onClick={addAuthorField}>
              <Plus size={16} /> Add Another Author
            </button>

            <label>Quantity Available: *</label>
            <input
              type="number"
              name="copies"
              value={book.copies}
              onChange={handleChange}
              placeholder="Enter total number of copies"
              min="1"
              required
            />
          </>
        );
      case 4:
        return (
          <>
            <h2>Scan NFC Tags</h2>
            <p>Total Copies to Scan: {book.copies || "N/A"}</p>
            <div className="nfc-section">
              <h3>📱 NFC Scanner</h3>

              {nfcSupported ? (
                <button
                  type="button"
                  onClick={nfcReading ? stopNFCReading : startNFCReading}
                  className="nfc-btn"
                >
                  {nfcReading ? "🛑 Stop NFC Reading" : "📱 Start NFC Reading"}
                </button>
              ) : (
                <p>NFC not supported on this device.</p>
              )}

              <p className="nfc-message">
                Scanned Copies: {scannedUIDs.length} / {book.copies || "N/A"}
              </p>
              {nfcMessage && <p className="nfc-message">{nfcMessage}</p>}

              <ul className="nfc-uid-list">
                {scannedUIDs.map((uid, i) => (
                  <li key={i}>{uid}</li>
                ))}
              </ul>
            </div>
          </>
        );
    }
  };

  return (
    <div className="newBooks-wrapper">
      <form
        className="form-section"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 4) handleSubmit(e);
        }}
      >
        {renderStep()}

        <div className="form-buttons">
          {step > 1 && (
            <button
              type="button"
              className="back-btn"
              onClick={(e) => {
                e.preventDefault();
                setStep(step - 1);
              }}
            >
              Back
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              className="next-btn"
              onClick={(e) => {
                e.preventDefault();
                setStep(step + 1);
              }}
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              className="add-btn"
              disabled={loading || !allCopiesScanned}
            >
              {loading ? <Loader2 className="spin" size={20} /> : "Add Book"}
            </button>
          )}
        </div>

        {message && <p className="status-msg">{message}</p>}
      </form>

      {/* === LIVE PREVIEW === */}
      <div className="preview-section">
        <h2>New Book Preview</h2>
        <p>
          <strong>Book Title:</strong> {book.title || "[The Title of the Book]"}
        </p>
        <p>
          <strong>Subtitle:</strong> {book.subtitle || "[Subtitle of the book]"}
        </p>
        <p>
          <strong>ISBN Number:</strong> {book.isbn || "0000000000"}
        </p>
        <p>
          <strong>Author(s):</strong>{" "}
          {authors.filter(Boolean).join(", ") || "[Author(s) Names]"}
        </p>
        <p>
          <strong>Publisher:</strong> {book.publisher || "[Publisher names]"}
        </p>
        <p>
          <strong>Publication Year:</strong>{" "}
          {book.publicationYear ? new Date(book.publicationYear).getFullYear() : "[YYYY]"}
        </p>
        <p>
          <strong>Edition:</strong> {book.edition || "[Edition]"}
        </p>
        <p>
          <strong>Category:</strong>{" "}
          {book.category
            ? filteredCategories.find((c) => c.category_id === parseInt(book.category))
                ?.category_name || "[Category]"
            : "[Category]"}
        </p>
        <p>
          <strong>Category Type:</strong> {book.categoryType || "[Category Type]"}
        </p>
        <p>
          <strong>Language:</strong> {book.language || "[Language]"}
        </p>
        <p>
          <strong>Quantity Available:</strong> {scannedUIDs.length || book.copies || "0"}
        </p>
        <p>
          <strong>Description:</strong> {book.description || "[Description of the book]"}
        </p>
      </div>
    </div>
  );
};

export default NewBooks;