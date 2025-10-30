import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./User_Home.css";
import usePageMeta from "../../../../hooks/usePageMeta";
import Sidebar from "../Sidebar/Sidebar";

const MemberDashboard: React.FC = () => {
  usePageMeta("User Dashboard - Home", "/LibraX Square Logo 1.png");
  const navigate = useNavigate();

  const [memberName, setMemberName] = useState<string>("");

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    sessionStorage.getItem("sidebarCollapsed") === "true"
  );

  // Session state
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const sessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🔧 Configurable durations
  const SESSION_DURATION_MINUTES = 45; // total session length
  const WARNING_BEFORE_EXPIRY_MINUTES = 5; // show warning 5 mins before expiry

  const handleSessionExpired = () => {
    console.log("🔒 Session expired, logging out...");
    localStorage.removeItem("auth_token");
    sessionStorage.clear();
    setShowSessionWarning(false);
    setShowSessionExpiredModal(true);

    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 2000);
  };

  const resetInactivityTimer = () => {
    // Clear existing timers
    if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);

    // Warning timer
    warningTimeoutRef.current = setTimeout(() => {
      console.log("⚠️ Session will expire soon");
      setShowSessionWarning(true);
    }, (SESSION_DURATION_MINUTES - WARNING_BEFORE_EXPIRY_MINUTES) * 60 * 1000);

    // Expiration timer
    sessionTimeoutRef.current = setTimeout(() => {
      handleSessionExpired();
    }, SESSION_DURATION_MINUTES * 60 * 1000);
  };

  useEffect(() => {
    const userType = sessionStorage.getItem("user_type");
    if (userType !== "member") return;

    setMemberName(sessionStorage.getItem("user_name") || "Member");

    resetInactivityTimer();

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click", "mousemove"];
    events.forEach((event) => document.addEventListener(event, resetInactivityTimer, true));

    return () => {
      events.forEach((event) => document.removeEventListener(event, resetInactivityTimer, true));
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="page-layout">
      {/* ⚠️ Session Warning Modal */}
      {showSessionWarning && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "8px",
              textAlign: "center",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            }}
          >
            <h2>Session Expiring Soon</h2>
            <p>Your session will expire in {WARNING_BEFORE_EXPIRY_MINUTES} minutes.</p>
            <button
              onClick={() => {
                setShowSessionWarning(false);
                resetInactivityTimer();
              }}
              style={{ marginTop: "15px", padding: "8px 16px" }}
            >
              Stay Logged In
            </button>
          </div>
        </div>
      )}

      {/* 🔒 Session Expired Modal */}
      {showSessionExpiredModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "8px",
              textAlign: "center",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            }}
          >
            <h2>Session Expired</h2>
            <p>Your session has expired. Redirecting to login...</p>
          </div>
        </div>
      )}

      <Sidebar
        onCollapse={(state: boolean) => {
          setSidebarCollapsed(state);
          sessionStorage.setItem("sidebarCollapsed", String(state));
          window.dispatchEvent(new Event("storage"));
        }}
      />

      <main
        className="main-content"
        style={{
          marginLeft: sidebarCollapsed ? "85px" : "250px",
          transition: "margin 0.3s ease",
        }}
      >
        <div className="dashboard-container">
          <div className="welcome-card">
            <h1>
              {getGreeting()}, {memberName} 👋
            </h1>
            <p>
              Welcome to your library dashboard. Explore resources, check your reservations,
              and stay updated with library news.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MemberDashboard;
