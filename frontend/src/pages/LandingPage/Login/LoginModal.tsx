import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { Eye, EyeOff, Loader2, X, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./LoginModal.module.css";
import libraryImage from "../../../images/library_cover1.jpg";

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
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  // New state for password change step
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePassError, setChangePassError] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = "https://librax-website-frontend.onrender.com/api";

  const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    timeout: 60000,
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
      const response = await api.get(`/check-email`, { params: { email } });
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
      const response = await api.post(`/login`, {
        email: formData.email.trim(),
        password: formData.password.trim(),
      });

      const { token, user, login_history_id, first_login } = response.data;

      localStorage.setItem("auth_token", token);
      if (login_history_id) {
        sessionStorage.setItem("login_history_id", login_history_id);
      }

      sessionStorage.setItem("user_name", user.full_name || user.email);
      sessionStorage.setItem("user_role", user.role || "");
      sessionStorage.setItem("user_type", user.user_type || "");
      sessionStorage.setItem("user_id", user.user_id || "");

      if (first_login) {
        setIsFirstLogin(true);
        return; // Stop here and show change password form
      }

      onClose();
      navigateToDashboard(user);
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

  const navigateToDashboard = (user: any) => {
    setTimeout(() => {
      if (user.user_type === "staff" && user.role === "Librarian") {
        navigate("/librarian/dashboard/home", { replace: true });
      } else if (user.user_type === "member") {
        navigate("/user/dashboard/home", { replace: true });
      } else {
        alert("Unknown user type. Please contact admin.");
      }
    }, 200);
  };

  // --- CHANGE PASSWORD HANDLER ---
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword)
      return setChangePassError("All fields are required.");
    if (newPassword.length < 6)
      return setChangePassError("Password must be at least 6 characters.");
    if (newPassword !== confirmPassword)
      return setChangePassError("Passwords do not match.");

    setIsChanging(true);
    setChangePassError("");

    const user_id = sessionStorage.getItem("user_id");

    try {
      const res = await api.post(`/change-password-first-login`, {
        user_id,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (res.data.password_changed) {
        alert("✅ Password changed successfully. Proceeding to dashboard...");
        onClose();
        navigateToDashboard({
          user_type: sessionStorage.getItem("user_type"),
          role: sessionStorage.getItem("user_role"),
        });
      }
    } catch (err: any) {
      console.error("Change password error:", err);
      setChangePassError(
        err.response?.data?.error || "Failed to change password."
      );
    } finally {
      setIsChanging(false);
    }
  };

  const isFormInvalid =
    !formData.email ||
    !!errors.email ||
    !formData.password ||
    formData.password.length < 6;

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay}>
      {(isLoading || checkingEmail || isChanging) && (
        <div className={styles.loadingOverlay}>
          <Loader2 size={48} className={styles.animateSpin} />
        </div>
      )}

      <div className={styles.modalContent}>
        <button className={styles.modalCloseBtn} onClick={onClose} disabled={isLoading}>
          <X size={18} />
        </button>

        <div className={styles.modalBody}>
          <div className={styles.imageSection}>
            <img src={libraryImage} alt="Library" className={styles.libraryImage} />
            <div className={styles.imageOverlay}>
              <h3 className={styles.welcomeText}>Welcome to</h3>
              <h2 className={styles.libraryTitle}>LibraX</h2>
              <p className={styles.librarySubtitle}>
                {isFirstLogin ? "Secure your account" : "Portal Access"}
              </p>
            </div>
          </div>

          <div className={styles.formSection}>
            {!isFirstLogin ? (
              <>
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
              </>
            ) : (
              <>
                <h2 className={styles.modalTitle}>
                  <Lock size={20} /> Change Password
                </h2>
                <form onSubmit={handlePasswordChange} className={styles.modalLoginForm}>
                  {changePassError && (
                    <div className={styles.formError}>{changePassError}</div>
                  )}

                  <div className={styles.formGroup}>
                    <label>New Password:</label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isChanging}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Confirm Password:</label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isChanging}
                    />
                  </div>

                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={isChanging || !newPassword || !confirmPassword}
                  >
                    {isChanging ? (
                      <span className={styles.loadingSpinner}>
                        <Loader2 size={16} className={styles.animateSpin} /> Changing...
                      </span>
                    ) : (
                      "Change Password"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LoginPage;
