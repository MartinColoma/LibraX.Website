import React, { useState, useRef, useEffect } from "react";
import "./Register.css"; // optional, you can reuse the same styling as before

const Register: React.FC = () => {
  const [form, setForm] = useState({
    role: "",
    firstName: "",
    lastName: "",
    gender: "",
    birthday: "",
    address: "",
    phone: "",
    idNumber: "",
    email: "",
    nfcUid: "",
  });

  const [loading, setLoading] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const [nfcMessage, setNfcMessage] = useState("");
  const [usbNFCMode, setUsbNFCMode] = useState(false);
  const nfcAbortControllerRef = useRef<AbortController | null>(null);
  const nfcInputRef = useRef<HTMLInputElement>(null);
  const ndefReaderRef = useRef<any>(null);

  useEffect(() => {
    const checkNFCSupport = async () => {
      if ("NDEFReader" in window) {
        try {
          const permission = await navigator.permissions.query({
            name: "nfc" as any,
          });
          setNfcSupported(permission.state !== "denied");
          console.log("✅ Native NFC (Web NFC API) is supported");
          setUsbNFCMode(false);
        } catch {
          console.log("⚠️ Native NFC not supported, switching to USB NFC mode");
          setNfcSupported(false);
          setUsbNFCMode(true);
        }
      } else {
        console.log("❌ Native NFC not supported, enabling USB NFC mode");
        setUsbNFCMode(true);
      }
    };
    checkNFCSupport();
  }, []);

  const handleNFCKeyboardInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const nfcData = (e.target as HTMLInputElement).value.trim();
      if (nfcData) {
        console.log("✅ USB NFC Reader UID:", nfcData);
        setForm((prev) => ({ ...prev, nfcUid: nfcData }));
        setNfcMessage(`✅ USB NFC Reader: ${nfcData}`);
        (e.target as HTMLInputElement).value = "";
      }
    }
  };

  const startNFCReading = async () => {
    if (!nfcSupported) {
      alert("Native NFC is not supported. Using USB NFC Reader mode.");
      return;
    }
    setNfcReading(true);
    setNfcMessage("📱 Waiting for NFC tag... Please hold near device.");
    nfcAbortControllerRef.current = new AbortController();

    try {
      const ndef = new (window as any).NDEFReader();
      ndefReaderRef.current = ndef;
      console.log("🔍 Starting NFC scan...");

      ndef.onreading = (event: any) => {
        console.log("📖 NFC tag detected:", event);
        const { message } = event;
        let nfcData = "";

        if (message && message.records) {
          for (const record of message.records) {
            if (record.recordType === "text" || record.recordType === "uri") {
              try {
                const decoder = new TextDecoder();
                nfcData = decoder.decode(record.data);
                break;
              } catch (e) {
                console.error("Error decoding record:", e);
              }
            }
          }
        }

        if (!nfcData && event.serialNumber) {
          nfcData = event.serialNumber;
        }

        if (nfcData) {
          setForm((prev) => ({ ...prev, nfcUid: nfcData }));
          setNfcMessage(`✅ NFC tag read successfully: ${nfcData}`);
          stopNFCReading();
        } else {
          setNfcMessage("⚠️ NFC tag read but no data found.");
        }
      };

      ndef.onreadingerror = (error: any) => {
        console.error("❌ NFC reading error:", error);
        setNfcMessage("❌ Error reading NFC tag.");
      };

      await ndef.scan({ signal: nfcAbortControllerRef.current.signal });
      console.log("✅ NFC scan started successfully");
    } catch (error: any) {
      console.error("NFC error:", error);
      if (error.name === "AbortError") {
        setNfcMessage("⏹️ NFC reading cancelled");
      } else if (error.name === "NotAllowedError") {
        setNfcMessage("❌ NFC permission denied.");
      } else {
        setNfcMessage(`❌ Error: ${error.message}`);
      }
      setNfcReading(false);
    }
  };

  const stopNFCReading = () => {
    if (nfcAbortControllerRef.current) {
      nfcAbortControllerRef.current.abort();
    }
    setNfcReading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("https://librax-website-frontend.onrender.com/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        setForm({
          role: "",
          firstName: "",
          lastName: "",
          gender: "",
          birthday: "",
          address: "",
          phone: "",
          idNumber: "",
          email: "",
          nfcUid: "",
        });
      } else {
        alert(data.message || "Failed to register user");
      }
    } catch (error) {
      alert("Failed to register user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-form-container">
      <h2>Register New Member</h2>
      <form className="register-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            Membership Type (Role):
            <select name="role" value={form.role} onChange={handleChange} required>
              <option value="">Select Membership Type</option>
              <option value="Student">Student</option>
              <option value="Faculty">Faculty</option>
              <option value="Librarian">Librarian</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            First Name:
            <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required />
          </label>
          <label>
            Last Name:
            <input type="text" name="lastName" value={form.lastName} onChange={handleChange} required />
          </label>
        </div>

        <div className="form-row">
          <label>
            Gender:
            <select name="gender" value={form.gender} onChange={handleChange} required>
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </label>
          <label>
            Birthday:
            <input type="date" name="birthday" value={form.birthday} onChange={handleChange} required />
          </label>
        </div>

        <div className="form-row">
          <label>
            Address:
            <input type="text" name="address" value={form.address} onChange={handleChange} />
          </label>
          <label>
            Phone Number:
            <input type="text" name="phone" value={form.phone} onChange={handleChange} />
          </label>
        </div>

        <div className="form-row">
          <label>
            Email Address:
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </label>
          <label>
            Student/Faculty ID:
            <input type="text" name="idNumber" value={form.idNumber} onChange={handleChange} required />
          </label>
        </div>

        <div className="nfc-section">
          <h3>{nfcSupported ? "📱 Native NFC" : "🖥️ USB NFC Reader"}</h3>
          <label>
            NFC Card UID (Optional):
            <input
              ref={nfcInputRef}
              name="nfcUid"
              type="text"
              placeholder={usbNFCMode ? "Hold USB reader near card" : "Will be filled automatically"}
              value={form.nfcUid}
              onChange={handleChange}
              onKeyDown={usbNFCMode ? handleNFCKeyboardInput : undefined}
              readOnly={!usbNFCMode}
              style={{
                backgroundColor: form.nfcUid ? "#e8f5e9" : "#f5f5f5",
                borderColor: form.nfcUid ? "green" : "#ccc",
              }}
            />
          </label>

          {nfcSupported && (
            <button
              type="button"
              onClick={nfcReading ? stopNFCReading : startNFCReading}
              className="nfc-btn"
            >
              {nfcReading ? "🛑 Stop NFC Reading" : "📱 Start NFC Reading"}
            </button>
          )}

          {nfcMessage && <p className="nfc-message">{nfcMessage}</p>}
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Register;
