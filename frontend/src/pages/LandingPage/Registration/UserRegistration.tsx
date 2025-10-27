import React, { useState, useRef, useEffect } from "react";
import styles from "./UserRegistration.module.css";

interface Props {
  onClose: () => void;
}

const UserRegistration: React.FC<Props> = ({ onClose }) => {
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
    nfcUid: "", // ✅ NEW: Store NFC UID
  });

  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const [nfcMessage, setNfcMessage] = useState("");
  const nfcAbortControllerRef = useRef<AbortController | null>(null);

  // ✅ Check if device supports NFC
  useEffect(() => {
    const checkNFCSupport = async () => {
      if ("NDEFReader" in window) {
        try {
          const permission = await navigator.permissions.query({
            name: "nfc" as any,
          });
          setNfcSupported(permission.state !== "denied");
          console.log("✅ NFC is supported on this device");
        } catch (error) {
          console.log("⚠️ NFC support check failed:", error);
          setNfcSupported(false);
        }
      } else {
        console.log("❌ NFC is not supported on this device");
        setNfcSupported(false);
      }
    };

    checkNFCSupport();
  }, []);

  // ✅ Start NFC reading
  const startNFCReading = async () => {
    if (!nfcSupported) {
      alert("NFC is not supported on this device. Please enter ID manually.");
      return;
    }

    setNfcReading(true);
    setNfcMessage("📱 Waiting for NFC tag... Please hold device near NFC tag");
    nfcAbortControllerRef.current = new AbortController();

    try {
      const ndef = new (window as any).NDEFReader();
      
      await ndef.scan({ signal: nfcAbortControllerRef.current.signal });

      ndef.onreading = (event: any) => {
        const { message } = event;
        let nfcData = "";

        for (const record of message.records) {
          if (record.recordType === "text") {
            const decoder = new TextDecoder();
            nfcData = decoder.decode(record.data);
            break;
          } else if (record.recordType === "uri") {
            const decoder = new TextDecoder();
            nfcData = decoder.decode(record.data);
            break;
          }
        }

        if (nfcData) {
          console.log("✅ NFC tag read:", nfcData);
          setForm((prev) => ({ ...prev, nfcUid: nfcData }));
          setNfcMessage(`✅ NFC tag read successfully: ${nfcData}`);
          setNfcReading(false);
          stopNFCReading();
        }
      };

      ndef.onreadingerror = () => {
        setNfcMessage("❌ Error reading NFC tag. Please try again.");
        setNfcReading(false);
      };
    } catch (error: any) {
      if (error.name === "AbortError") {
        setNfcMessage("⏹️ NFC reading cancelled");
      } else if (error.name === "NotAllowedError") {
        setNfcMessage("❌ NFC permission denied. Please enable NFC access.");
      } else if (error.name === "NotSupportedError") {
        setNfcMessage("❌ NFC is not supported on this device.");
        setNfcSupported(false);
      } else {
        console.error("NFC error:", error);
        setNfcMessage(`❌ Error: ${error.message}`);
      }
      setNfcReading(false);
    }
  };

  // ✅ Stop NFC reading
  const stopNFCReading = () => {
    if (nfcAbortControllerRef.current) {
      nfcAbortControllerRef.current.abort();
      setNfcReading(false);
      setNfcMessage("");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(
        "https://libra-x-website-api.vercel.app/api/reg/registration",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (res.ok) {
        console.log("Temporary password (hidden use only):", data.tempPassword);
        alert(data.message);
        onClose();
      } else {
        alert(data.message || "Failed to register user");
      }
    } catch (error) {
      console.error("❌ Failed to register user:", error);
      alert("Failed to register user");
    }
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.formSection}>
          <h2 className={styles.title}>Register New User Account</h2>

          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Membership Type */}
            <div className={styles.row1}>
              <label>
                Membership Type (Role):
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Membership Type</option>
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Librarian">Librarian</option>
                </select>
              </label>
            </div>

            {/* First + Last Name */}
            <div className={styles.row2}>
              <label>
                First Name:
                <input
                  name="firstName"
                  type="text"
                  placeholder="Enter first name"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                Last Name:
                <input
                  name="lastName"
                  type="text"
                  placeholder="Enter last name"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            {/* Gender + Birthday */}
            <div className={styles.row2}>
              <label>
                Gender:
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>
              <label>
                Birthday:
                <input
                  name="birthday"
                  type="date"
                  value={form.birthday}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            {/* Address + Phone Number */}
            <div className={styles.row2}>
              <label>
                Address:
                <input
                  name="address"
                  type="text"
                  placeholder="Enter address"
                  value={form.address}
                  onChange={handleChange}
                />
              </label>
              <label>
                Phone Number:
                <input
                  name="phone"
                  type="text"
                  placeholder="Enter phone number"
                  value={form.phone}
                  onChange={handleChange}
                />
              </label>
            </div>

            {/* Email + Student/Faculty ID */}
            <div className={styles.row2}>
              <label>
                Email Address:
                <input
                  name="email"
                  type="email"
                  placeholder="Enter email address"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                Student/Faculty ID:
                <input
                  name="idNumber"
                  type="text"
                  placeholder="Enter student/faculty ID"
                  value={form.idNumber}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            {/* ✅ NFC Section */}
            {nfcSupported && (
              <div
                style={{
                  padding: "15px",
                  backgroundColor: "#f0f8ff",
                  borderRadius: "8px",
                  marginBottom: "15px",
                  border: "1px solid #6d1f25",
                }}
              >
                <label style={{ display: "block", marginBottom: "10px" }}>
                  NFC Card UID (Optional):
                  <input
                    name="nfcUid"
                    type="text"
                    placeholder="Will be populated by NFC read"
                    value={form.nfcUid}
                    onChange={handleChange}
                    readOnly
                    style={{ backgroundColor: "#f5f5f5" }}
                  />
                </label>
                <button
                  type="button"
                  onClick={nfcReading ? stopNFCReading : startNFCReading}
                  style={{
                    padding: "10px 15px",
                    backgroundColor: nfcReading ? "#d9534f" : "#6d1f25",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  {nfcReading ? "🛑 Stop NFC Reading" : "📱 Start NFC Reading"}
                </button>
                {nfcMessage && (
                  <p
                    style={{
                      marginTop: "10px",
                      fontSize: "14px",
                      color: nfcMessage.includes("✅") ? "green" : "orange",
                    }}
                  >
                    {nfcMessage}
                  </p>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" className={styles.createBtn}>
                Create Account
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserRegistration;
