import React, { useState, useRef, useEffect } from "react";
import "./Register.css";
import usePageMeta from "../../../../../../hooks/usePageMeta";


const Register: React.FC = () => {
    usePageMeta("Home - Register New user", "/LibraX Square Logo 1.png");

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

  // Detect NFC support on mount
  useEffect(() => {
    const checkNFCSupport = async () => {
      if ("NDEFReader" in window) {
        try {
          const permission = await navigator.permissions.query({
            name: "nfc" as any,
          });
          setNfcSupported(permission.state !== "denied");
          console.log("✅ Native NFC supported");
          setUsbNFCMode(false);
        } catch {
          console.log("⚠️ Native NFC not supported — switching to USB mode");
          setNfcSupported(false);
          setUsbNFCMode(true);
        }
      } else {
        console.log("❌ No Web NFC support — using USB NFC reader");
        setUsbNFCMode(true);
      }
    };

    checkNFCSupport();
  }, []);

  // Handle USB NFC keyboard-based readers
  const handleNFCKeyboardInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const nfcData = (e.target as HTMLInputElement).value.trim();
      if (nfcData) {
        console.log("✅ USB NFC Reader UID:", nfcData);
        setForm((prev) => ({ ...prev, nfcUid: nfcData }));
        setNfcMessage(`✅ USB NFC Reader detected UID: ${nfcData}`);
        (e.target as HTMLInputElement).value = "";
      }
    }
  };

  // Start NFC Reading
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
        console.log("📖 NFC Tag Detected:", event);
        const { message, serialNumber } = event;
        let nfcData = "";

        if (message && message.records) {
          for (const record of message.records) {
            if (record.recordType === "text" || record.recordType === "uri") {
              const decoder = new TextDecoder();
              nfcData = decoder.decode(record.data);
              break;
            }
          }
        }

        if (!nfcData && serialNumber) nfcData = serialNumber;

        if (nfcData) {
          setForm((prev) => ({ ...prev, nfcUid: nfcData }));
          setNfcMessage(`✅ NFC tag read: ${nfcData}`);
          stopNFCReading();
        } else {
          setNfcMessage("⚠️ NFC tag detected but no data found.");
        }
      };

      ndef.onreadingerror = () => {
        setNfcMessage("❌ Error reading NFC tag. Try again.");
      };

      console.log("✅ NFC scan started.");
    } catch (error: any) {
      console.error("NFC error:", error);
      if (error.name === "AbortError") {
        setNfcMessage("⏹️ NFC reading cancelled.");
      } else if (error.name === "NotAllowedError") {
        setNfcMessage("❌ NFC permission denied.");
      } else {
        setNfcMessage(`❌ Error: ${error.message}`);
      }
      setNfcReading(false);
    }
  };

  const stopNFCReading = () => {
    if (nfcAbortControllerRef.current) nfcAbortControllerRef.current.abort();
    setNfcReading(false);
  };

  // Form handlers
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
        setNfcMessage("");
      } else {
        alert(data.message || "Registration failed");
      }
    } catch {
      alert("Failed to register user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-form-container">
      <h2>Register New Member</h2>
      <form className="register-form" onSubmit={handleSubmit}>
        {/* Role Selection */}
        <div className="form-row">
          <label>
            Membership Type:
            <select name="role" value={form.role} onChange={handleChange} required>
              <option value="">Select</option>
              <option value="Student">Student</option>
              <option value="Faculty">Faculty</option>
              <option value="Librarian">Librarian</option>
            </select>
          </label>
        </div>

        {/* Basic Info */}
        <div className="form-row">
          <label>
            First Name:
            <input type="text" 
            name="firstName" 
            value={form.firstName} 
            onChange={handleChange} required 
            placeholder="Enter first name"/>
          </label>
          <label>
            Last Name:
            <input type="text" 
            name="lastName" 
            value={form.lastName} 
            onChange={handleChange} required 
            placeholder="Enter last name"/>

          </label>
        </div>

        <div className="form-row">
          <label>
            Gender:
            <select name="gender" value={form.gender} onChange={handleChange} required>
              <option value="">Select</option>
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
            <input type="text" 
            name="address" 
            value={form.address} 
            onChange={handleChange} 
            placeholder="Enter address"/>
          </label>
          <label>
            Phone:
            <input type="text" 
            name="phone" value={form.phone} 
            onChange={handleChange} 
            placeholder="Enter phone number"/>
          </label>
        </div>

        <div className="form-row">
          <label>
            Email:
            <input type="email" 
            name="email" 
            value={form.email} 
            onChange={handleChange} required 
            placeholder="Enter email address"/>
          </label>
          <label>
            ID Number:
            <input type="text" 
            name="idNumber" 
            value={form.idNumber} 
            onChange={handleChange} required 
            placeholder="Enter student/faculty id number"/>
          </label>
        </div>

        {/* NFC Section */}
        <div className="nfc-section">
          <h3>{nfcSupported ? "📱 Native NFC" : "🖥️ USB NFC Reader"}</h3>

          <label>
            NFC UID:
            <input
              ref={nfcInputRef}
              name="nfcUid"
              type="text"
              value={form.nfcUid}
              readOnly
              onKeyDown={usbNFCMode ? handleNFCKeyboardInput : undefined}
              placeholder={
                usbNFCMode
                  ? "Hold USB reader near card"
                  : "Click 'Start NFC Reading' to scan"
              }
              className="nfc-input"
              style={{
                backgroundColor: form.nfcUid ? "#e8f5e9" : "#f5f5f5",
                borderColor: form.nfcUid ? "green" : "#ccc",
                cursor: "not-allowed",
              }}
            />
          </label>

          {/* Start/Stop NFC Button */}
          {nfcSupported && (
            <button
              type="button"
              onClick={nfcReading ? stopNFCReading : startNFCReading}
              className="nfc-btn"
            >
              {nfcReading ? "🛑 Stop NFC Reading" : "📱 Start NFC Reading"}
            </button>
          )}

          {usbNFCMode && !nfcSupported && (
            <p className="nfc-message">💡 USB Reader: Hold card near device to scan</p>
          )}

          {nfcMessage && <p className="nfc-message">{nfcMessage}</p>}
        </div>

        {/* Submit */}
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
