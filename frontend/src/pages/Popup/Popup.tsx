import React, { useEffect } from "react";
import styles from "./Popup.module.css";

interface PopupProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
  duration?: number; // ms before auto close, default 3000
}

const Popup: React.FC<PopupProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={styles.backdrop}>
      <div className={`${styles.popup} ${type === "success" ? styles.success : styles.error}`}>
        <p>{message}</p>
        <button onClick={onClose} className={styles.closeBtn}>&times;</button>
      </div>
    </div>
  );
};

export default Popup;
