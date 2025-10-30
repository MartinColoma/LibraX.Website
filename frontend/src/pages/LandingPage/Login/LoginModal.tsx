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

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordChangeErrors, setPasswordChangeErrors] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tempUserData, setTempUserData] = useState<any>(null);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);

  const API_BASE = "https://librax-website-frontend.onrender.com/api";

  const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    timeout: 60000,
  });

  useEffect(() => {
    if (showPasswordChange && newPasswordRef.current) {
      newPasswordRef.current.focus();
    } else if (!showPasswordChange && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [showPasswordChange]);

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

  const validatePasswordChange = () => {
    const newErrors = { newPassword: "", confirmPassword: "" };
    let isValid = true;

    if (!passwordChangeData.newPassword.trim()) {
      newErrors.newPassword = "New password is required";
      isValid = false;
    } else if (passwordChangeData.newPassword.length < 8) {
      newErrors.newPassword = "Min 8 characters";
      isValid = false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordChangeData.newPassword)) {
      newErrors.newPassword = "Must contain uppercase, lowercase, and number";
      isValid = false;
    }

    if (!passwordChangeData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirm your password";
      isValid = false;
    } else if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    setPasswordChangeErrors(newErrors);
    return isValid;
  };

  const checkEmailExists = async (email: string) => {
    if (!email || errors.email) return;
    setCheckingEmail(true);

    try {
      const response = await api.get(`/check-email`, {
        params: { email },
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

  const handlePasswordChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordChangeData((prev) => ({ ...prev, [name]: value }));

    if (passwordChangeErrors[name as keyof typeof passwordChangeErrors]) {
      setPasswordChangeErrors((prev) => ({ ...prev, [name]: "" }));
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

      console.log("Login Response:", response.data);

      const { token, user, login_history_id, is_first_login } = response.data;

      // Handle API error response format
      if (response.data.error) {
        setErrors((prev) => ({
          ...prev,
          password: response.data.error,
        }));
        return;
      }

      // Check if this is first time login
      if (is_first_login === true) {
        console.log("First time login detected - prompting password change");
        setTempUserData({ token, user, login_history_id });
        setShowPasswordChange(true);
        setIsLoading(false);
        return;
      }

      // Normal login flow
      completeLogin(token, user, login_history_id);
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

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !validatePasswordChange()) return;

    setIsLoading(true);

    try {
      // Call change password API
      const response = await api.post(
        `/change-password`,
        {
          user_id: tempUserData.user.user_id,
          new_password: passwordChangeData.newPassword.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${tempUserData.token}`,
          },
        }
      );

      console.log("Password change response:", response.data);

      // Complete login after password change
      completeLogin(tempUserData.token, tempUserData.user, tempUserData.login_history_id);
    } catch (error: any) {
      console.error("Password change error:", error);

      if (error.response?.data?.message) {
        setPasswordChangeErrors((prev) => ({
          ...prev,
          newPassword: error.response.data.message,
        }));
      } else {
        alert("Failed to change password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const completeLogin = (token: string, user: any, login_history_id: string) => {
    localStorage.setItem("auth_token", token);
    
    if (login_history_id) {
      sessionStorage.setItem("login_history_id", login_history_id);
    } else {
      console.warn("⚠️ Login history ID missing from response.");
    }

    const displayName = user.full_name || user.username || user.email || "Unknown User";

    sessionStorage.setItem("user_name", displayName);
    sessionStorage.setItem("user_role", user.role || "");
    sessionStorage.setItem("user_type", user.user_type || "");
    sessionStorage.setItem("user_id", user.user_id || "");

    console.log("User data saved:", {
      user_type: user.user_type,
      role: user.role,
    });

    onClose();

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
    }, 100);
  };

  const isFormInvalid =
    !formData.email || !!errors.email || !formData.password || formData.password.length < 6;

  const isPasswordChangeInvalid =
    !passwordChangeData.newPassword ||
    !passwordChangeData.confirmPassword ||
    passwordChangeData.newPassword.length < 8 ||
    passwordChangeData.newPassword !== passwordChangeData.confirmPassword;

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay}>
      {(isLoading || checkingEmail) && (
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
                {showPasswordChange ? "Security Update" : "Portal Access"}
              </p>
            </div>
          </div>

          <div className={styles.formSection}>
            {!showPasswordChange ? (
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
                <div className={styles.passwordChangeHeader}>
                  <Lock size={32} className={styles.lockIcon} />
                  <h2 className={styles.modalTitle}>Change Password</h2>
                  <p className={styles.passwordChangeSubtext}>
                    For security, please set a new password for your first login
                  </p>
                </div>

                <form onSubmit={handlePasswordChangeSubmit} className={styles.modalLoginForm}>
                  <div className={styles.formGroup}>
                    <label>New Password:</label>
                    {passwordChangeErrors.newPassword && (
                      <div className={styles.formError}>{passwordChangeErrors.newPassword}</div>
                    )}
                    <div className={styles.passwordInputContainer}>
                      <input
                        ref={newPasswordRef}
                        type={showNewPassword ? "text" : "password"}
                        name="newPassword"
                        placeholder="Enter new password"
                        value={passwordChangeData.newPassword}
                        onChange={handlePasswordChangeInput}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className={styles.eyeBtn}
                        disabled={isLoading}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <small className={styles.passwordHint}>
                      Min 8 characters with uppercase, lowercase, and number
                    </small>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Confirm Password:</label>
                    {passwordChangeErrors.confirmPassword && (
                      <div className={styles.formError}>
                        {passwordChangeErrors.confirmPassword}
                      </div>
                    )}
                    <div className={styles.passwordInputContainer}>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Confirm new password"
                        value={passwordChangeData.confirmPassword}
                        onChange={handlePasswordChangeInput}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={styles.eyeBtn}
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={isLoading || isPasswordChangeInvalid}
                  >
                    {isLoading ? (
                      <span className={styles.loadingSpinner}>
                        <Loader2 size={16} className={styles.animateSpin} /> Updating Password...
                      </span>
                    ) : (
                      "Update Password"
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
