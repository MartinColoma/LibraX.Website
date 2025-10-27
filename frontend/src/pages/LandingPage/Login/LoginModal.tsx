import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./LoginModal.module.css";
import libraryImage from "../../../images/library_cover.png";

interface Props {
  onClose: () => void;
}

const LoginPage: React.FC<Props> = ({ onClose }) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = "https://libra-x-website-api.vercel.app/api/login";

  const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    timeout: 10000,
  });

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const validateForm = () => {
    const newErrors = { email: "", password: "" };
    let isValid = true;

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email";
      isValid = false;
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = "Min 6 characters";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const checkEmailExists = async (email: string) => {
    if (!email || errors.email) return;
    setCheckingEmail(true);

    try {
      const response = await api.get(`/auth`, {
        params: { path: "check-email", email },
      });

      if (!response.data.exists) {
        setErrors((prev) => ({ ...prev, email: "Email not registered" }));
      } else {
        setErrors((prev) => ({ ...prev, email: "" }));
      }
    } catch (err) {
      console.error("Error checking email:", err);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleEmailBlur = () => {
    checkEmailExists(formData.email.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || checkingEmail || !validateForm()) return;
    if (errors.email) return;

    setIsLoading(true);

    try {
      const response = await api.post(`/auth?path=login`, {
        email: formData.email.trim(),
        password: formData.password.trim(),
      });

      console.log("Login Response:", response.data); // ✅ Debug log

      const { token, user } = response.data;

      if (!user || !token) {
        alert("Login failed: Invalid response from server");
        return;
      }

      // Store JWT token in localStorage
      localStorage.setItem("auth_token", token);

      // Store user info in sessionStorage
      const displayName =
        user.full_name || user.username || user.email || "Unknown User";

      sessionStorage.setItem("user_name", displayName);
      sessionStorage.setItem("user_role", user.role || "");
      sessionStorage.setItem("user_type", user.user_type || "");
      sessionStorage.setItem("user_id", user.user_id || "");

      console.log("User data saved:", { user_type: user.user_type, role: user.role }); // ✅ Debug log

      // ✅ CRITICAL FIX: Don't close modal immediately, let navigation happen first
      // Close modal and navigate
      onClose();

      // ✅ Use a small delay to ensure modal closes before navigation
      setTimeout(() => {
        if (user.user_type === "staff") {
          if (user.role === "Librarian") {
            console.log("Navigating to librarian dashboard");
            navigate("/librarian/dashboard/home", { replace: true });
          }
        } else if (user.user_type === "member") {
          console.log("Navigating to user dashboard");
          navigate("/user/dashboard/home", { replace: true });
        } else {
          alert("Unknown user type. Please contact admin.");
        }
      }, 100); // Small delay for modal to close

    } catch (error: any) {
      console.error("Login error:", error);

      if (error.response?.status === 401) {
        setErrors((prev) => ({
          ...prev,
          password: "Incorrect email or password",
        }));
      } else if (error.code === "ECONNABORTED") {
        alert("Request timed out. Please check your internet connection.");
      } else if (error.request) {
        alert("Cannot connect to API. Check your network or deployment.");
      } else {
        alert("Unexpected error: " + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFormInvalid =
    !formData.email ||
    !!errors.email ||
    !formData.password ||
    formData.password.length < 6;

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.modalCloseBtn} onClick={onClose}>
          <X size={18} />
        </button>

        <div className={styles.modalBody}>
          <div className={styles.imageSection}>
            <img src={libraryImage} alt="Library" className={styles.libraryImage} />
            <div className={styles.imageOverlay}>
              <h3 className={styles.welcomeText}>Welcome to</h3>
              <h2 className={styles.libraryTitle}>LibraX</h2>
              <p className={styles.librarySubtitle}>Portal Access</p>
            </div>
          </div>

          <div className={styles.formSection}>
            <h2 className={styles.modalTitle}>Login</h2>

            <form onSubmit={handleSubmit} className={styles.modalLoginForm}>
              <div className={styles.formGroup}>
                <label>Email:</label>
                {errors.email && <div className={styles.formError}>{errors.email}</div>}
                <input
                  ref={emailInputRef}
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleEmailBlur}
                  disabled={isLoading}
                />
                {checkingEmail && <small>Checking email existence...</small>}
              </div>

              <div className={styles.formGroup}>
                <label>Password:</label>
                {errors.password && <div className={styles.formError}>{errors.password}</div>}
                <div className={styles.passwordInputContainer}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.eyeBtn}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={isLoading || checkingEmail || isFormInvalid}
              >
                {isLoading ? (
                  <span className={styles.loadingSpinner}>
                    <Loader2 size={16} className={styles.animateSpin} /> Signing In...
                  </span>
                ) : (
                  "Login"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LoginPage;
