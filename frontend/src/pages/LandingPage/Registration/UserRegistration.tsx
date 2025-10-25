import React, { useState } from "react";
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
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    const res = await fetch(
      `https://libra-x-api.vercel.app/api/LandingPage/registration`,
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
