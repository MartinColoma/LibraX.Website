import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import ReactDOM from "react-dom";
import axios from "axios";
import { Eye, EyeOff, Loader2, X } from "lucide-react";
import styles from "./LoginModal.module.css";
import libraryImage from "../../../images/library_cover.png";

interface Props {
  onClose: () => void;
}

const LoginPage: React.FC<Props> = ({ onClose }) => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

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
      const response = await axios.get("http://localhost:5001/auth/check-email", {
        params: { email },
      });
      if (!response.data.exists) {
        setErrors((prev) => ({ ...prev, email: "Email not registered" }));
      } else {
        setErrors((prev) => ({ ...prev, email: "" }));
      }
    } catch (error) {
      console.error("Error checking email:", error);
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
      console.log("Attempting login with email:", formData.email);

      const response = await axios.post(
        "http://localhost:5001/auth/login",
        {
          email: formData.email.trim(),
          password: formData.password.trim(),
        },
        { withCredentials: true }
      );

      console.log("Login response received:", response.data);

      const user = response.data.user;

      if (!user) {
        console.error("No user object in response");
        alert("Login failed: Invalid response from server");
        return;
      }

      console.log("User data:", {
        user_type: user.user_type,
        role: user.role,
        full_name: user.full_name,
      });

      const displayName =
        user?.full_name || user?.username || user?.email || "Unknown User";

      // Store user info in sessionStorage
      try {
        sessionStorage.setItem("user_name", displayName);
        sessionStorage.setItem("user_role", user.role || "");
        sessionStorage.setItem("user_type", user.user_type || "");
        console.log("User data stored in sessionStorage");
      } catch (storageError) {
        console.error("SessionStorage error:", storageError);
      }


      if (user.user_type === "staff") {
        if (user.role === "librarian") {
          window.location.href = "/librarian/dashboard/home"; // guaranteed to redirect
        } 
        else{
          window.location.href = "/librarian/dashboard/home"; // guaranteed to redirect
        }
      } else if (user.user_type === "member") {
          window.location.href = "/member/dashboard/home"; // guaranteed to redirect
      }



    } catch (error: any) {
      console.error("Login error:", error);

      if (error.response?.status === 401) {
        setErrors((prev) => ({
          ...prev,
          password: "Incorrect email or password",
        }));
      } else if (error.request) {
        alert(
          "Unable to connect to the server. Check your network and ensure the backend is running on port 5001."
        );
      } else {
        console.error("Axios error:", error.message);
        alert("Unexpected error occurred: " + error.message);
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
          {/* Left side - Library Image */}
          <div className={styles.imageSection}>
            <img
              src={libraryImage}
              alt="Library"
              className={styles.libraryImage}
            />
            <div className={styles.imageOverlay}>
              <h3 className={styles.welcomeText}>Welcome to</h3>
              <h2 className={styles.libraryTitle}>LibraX</h2>
              <p className={styles.librarySubtitle}>Portal Access</p>
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className={styles.formSection}>
            <h2 className={styles.modalTitle}>Login</h2>

            <form onSubmit={handleSubmit} className={styles.modalLoginForm}>
              <div className={styles.formGroup}>
                <label>Email:</label>
                {errors.email && (
                  <div className={styles.formError}>{errors.email}</div>
                )}
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
                {checkingEmail && (
                  <small style={{ color: "#666" }}>
                    Checking email existence...
                  </small>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>Password:</label>
                {errors.password && (
                  <div className={styles.formError}>{errors.password}</div>
                )}
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
                    <Loader2 size={16} className={styles.animateSpin} /> Signing
                    In...
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
