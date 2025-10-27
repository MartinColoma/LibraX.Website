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
    nfcUid: "",
  });

  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const [nfcMessage, setNfcMessage] = useState("");
  const [usbNFCDetected, setUsbNFCDetected] = useState(false);
  const nfcAbortControllerRef = useRef<AbortController | null>(null);
  const nfcInputRef = useRef<HTMLInputElement>(null);
  const ndefReaderRef = useRef<any>(null);

  // ✅ Check if device supports NFC
  useEffect(() => {
    const checkNFCSupport = async () => {
      if ("NDEFReader" in window) {
        try {
          const permission = await navigator.permissions.query({
            name: "nfc" as any,
          });
          setNfcSupported(permission.state !== "denied");
          console.log("Native NFC (Web NFC API) is supported");
        } catch (error) {
          console.log("Native NFC not supported, assuming USB NFC Reader");
          setNfcSupported(false);
          setUsbNFCDetected(true);
        }
      } else {
        console.log("Native NFC not supported, assuming USB NFC Reader");
        setUsbNFCDetected(true);
      }
    };

    checkNFCSupport();
  }, []);

  // ✅ Handle keyboard input from USB NFC reader
  const handleNFCKeyboardInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // USB NFC readers typically end with Enter key
    if (e.key === "Enter") {
      const nfcData = (e.target as HTMLInputElement).value.trim();
      if (nfcData) {
        console.log("USB NFC Reader detected UID:", nfcData);
        setForm((prev) => ({ ...prev, nfcUid: nfcData }));
        setNfcMessage(`Successfully read: ${nfcData}`);
        (e.target as HTMLInputElement).value = "";
      }
    }
  };

  // ✅ Start native NFC reading
  const startNFCReading = async () => {
    if (!nfcSupported) {
      alert("Native NFC is not supported. Using USB NFC Reader mode.");
      return;
    }

    setNfcReading(true);
    setNfcMessage("Waiting for NFC tag... Please hold device near NFC tag");
    nfcAbortControllerRef.current = new AbortController();

    try {
      const ndef = new (window as any).NDEFReader();
      ndefReaderRef.current = ndef;

      console.log("Starting NFC scan...");

      // ✅ Set up event handlers BEFORE scanning
      ndef.onreading = (event: any) => {
        console.log("NFC tag detected:", event);
        const { message } = event;
        let nfcData = "";

        if (message && message.records) {
          for (const record of message.records) {
            if (record.recordType === "text") {
              try {
                const decoder = new TextDecoder();
                nfcData = decoder.decode(record.data);
                console.log("Text record found:", nfcData);
                break;
              } catch (e) {
                console.error("Error decoding text:", e);
              }
            } else if (record.recordType === "uri") {
              try {
                const decoder = new TextDecoder();
                nfcData = decoder.decode(record.data);
                console.log("URI record found:", nfcData);
                break;
              } catch (e) {
                console.error("Error decoding URI:", e);
              }
            }
          }
        }

        if (!nfcData && event.serialNumber) {
          nfcData = event.serialNumber;
          console.log("Serial number found:", nfcData);
        }

        if (nfcData) {
          console.log("Final NFC UID:", nfcData);
          setForm((prev) => ({ ...prev, nfcUid: nfcData }));
          setNfcMessage(`Successfully read: ${nfcData}`);
          stopNFCReading();
        } else {
          setNfcMessage("NFC tag read but no data found. Try again.");
        }
      };

      ndef.onreadingerror = (error: any) => {
        console.error("NFC reading error:", error);
        setNfcMessage("Error reading NFC tag. Please try again.");
      };

      await ndef.scan({ signal: nfcAbortControllerRef.current.signal });
      console.log("NFC scan started successfully");
    } catch (error: any) {
      console.error("NFC error:", error);

      if (error.name === "AbortError") {
        setNfcMessage("NFC reading cancelled");
      } else if (error.name === "NotAllowedError") {
        setNfcMessage("NFC permission denied. Please enable NFC access in settings.");
      } else if (error.name === "NotSupportedError") {
        setNfcMessage("NFC is not supported on this device.");
        setNfcSupported(false);
      } else if (error.name === "SecurityError") {
        setNfcMessage("NFC requires HTTPS. Please use a secure connection.");
      } else {
        setNfcMessage(`Error: ${error.message || "Unknown NFC error"}`);
      }
      setNfcReading(false);
    }
  };

  // ✅ Stop NFC reading
  const stopNFCReading = () => {
    console.log("Stopping NFC scan...");
    if (nfcAbortControllerRef.current) {
      nfcAbortControllerRef.current.abort();
    }
    setNfcReading(false);
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
        console.log("User registered successfully");
        alert(data.message);
        onClose();
      } else {
        alert(data.message || "Failed to register user");
      }
    } catch (error) {
      console.error("Failed to register user:", error);
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

            {/* NFC Section - Only show if detected */}
            {(nfcSupported || usbNFCDetected) && (
              <div className={styles.nfcSection}>
                <h3 className={styles.nfcTitle}>NFC Card Reader</h3>

                <label>
                  NFC Card UID (Optional):
                  <input
                    ref={nfcInputRef}
                    name="nfcUid"
                    type="text"
                    placeholder={
                      usbNFCDetected && !nfcSupported
                        ? "Position reader near card to scan"
                        : "Will be populated by NFC read"
                    }
                    value={form.nfcUid}
                    onChange={handleChange}
                    onKeyDown={
                      usbNFCDetected && !nfcSupported
                        ? handleNFCKeyboardInput
                        : undefined
                    }
                    autoFocus={usbNFCDetected && !nfcSupported}
                    readOnly={true}
                    className={styles.nfcInput}
                  />
                </label>

                {nfcSupported && (
                  <button
                    type="button"
                    onClick={nfcReading ? stopNFCReading : startNFCReading}
                    className={
                      nfcReading ? styles.nfcButtonStop : styles.nfcButton
                    }
                  >
                    {nfcReading ? "Stop NFC Reading" : "Start NFC Reading"}
                  </button>
                )}

                {usbNFCDetected && !nfcSupported && (
                  <p className={styles.nfcHint}>
                    USB NFC Reader Mode: Position reader near card to scan
                  </p>
                )}

                {nfcMessage && (
                  <p
                    className={
                      nfcMessage.includes("Successfully")
                        ? styles.nfcSuccess
                        : styles.nfcError
                    }
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
