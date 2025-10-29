import React, { useEffect, useState } from "react"; // useRef
import { useNavigate } from "react-router-dom";
import "./User_Home.css";
import usePageMeta from '../../../../hooks/usePageMeta';
import Sidebar from "../Sidebar/Sidebar";

const MemberDashboard: React.FC = () => {
  usePageMeta("User Dashboard - Home", "/LibraX Square Logo 1.png");
  const navigate = useNavigate();

  const [memberName, setMemberName] = useState<string>("");

  // ✅ Integrated Sidebar Collapse State (from former version)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    sessionStorage.getItem("sidebarCollapsed") === "true"
  );

  //const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  // const sessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // ✅ Disabled inactivity timer ref

  /* 
  // 🚪 Function to handle logout (DISABLED)
  const handleSessionExpired = () => {
    console.log("🔒 Session expired, logging out...");
    
    localStorage.removeItem("auth_token");
    sessionStorage.clear();
    
    setShowSessionExpiredModal(true);
    
    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 2000);
  };
  */

  // ✅ Function to check if token is expired (still active but no logout call)
  const isTokenExpired = (token: string): boolean => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      const payload = JSON.parse(atob(parts[1]));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();

      return currentTime > expirationTime;
    } catch (error) {
      console.error("Error checking token expiration:", error);
      return true;
    }
  };

  /*
  // 💤 Function to reset inactivity timer (DISABLED)
  const resetInactivityTimer = () => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }

    const timer = setTimeout(() => {
      console.log("⏱️ Inactivity timeout reached");
      handleSessionExpired();
    }, 30 * 1000); // 30 seconds

    sessionTimeoutRef.current = timer;
  };
  */

  // ✅ Setup user verification - ONLY on mount
  useEffect(() => {
    const userType = sessionStorage.getItem("user_type");
    if (userType !== "member") {
      console.log("❌ Not a member, redirecting to login");
      // navigate("/login", { replace: true }); // 🚫 Disabled auto-redirect
      return;
    }

    const name = sessionStorage.getItem("user_name") || "Member";
    setMemberName(name);

    console.log("✅ Member dashboard loaded");

    // 💤 Disabled inactivity timer setup
    /*
    resetInactivityTimer();

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click", "mousemove"];
    events.forEach(event => {
      document.addEventListener(event, resetInactivityTimer, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer, true);
      });
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
    */
  }, [navigate]);

  // ✅ Token expiration check (no longer logs out or redirects)
  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        console.log("❌ No token found (auto-logout disabled)");
        // handleSessionExpired(); // 🚫 Disabled
        return;
      }

      if (isTokenExpired(token)) {
        console.log("⚠️ Token has expired (auto-logout disabled)");
        // handleSessionExpired(); // 🚫 Disabled
        return;
      }

      console.log("✅ Token is still valid");
    };

    checkTokenExpiration();
    const tokenCheckInterval = setInterval(checkTokenExpiration, 1 * 60 * 1000);

    return () => clearInterval(tokenCheckInterval);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="page-layout">
      {/* 🚫 Disabled Session Expired Modal */}
      {/* 
      {showSessionExpiredModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div style={{
            background: "white",
            padding: "30px",
            borderRadius: "8px",
            textAlign: "center",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <h2>Session Expired</h2>
            <p>Your session has expired. Redirecting to login...</p>
          </div>
        </div>
      )}
      */}

      {/* ✅ Integrated Sidebar with Collapse Persistence */}
      <Sidebar
        onCollapse={(state: boolean) => {
          setSidebarCollapsed(state);
          sessionStorage.setItem("sidebarCollapsed", String(state));
          window.dispatchEvent(new Event("storage"));
        }}
      />

      {/* ✅ Responsive main content margin */}
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

          <div className="features-grid">
            <div className="feature-card">
              <h3>My Books</h3>
              <p>View borrowed books and due dates.</p>
            </div>
            <div className="feature-card">
              <h3>Reservations</h3>
              <p>Check and manage your reservations.</p>
            </div>
            <div className="feature-card">
              <h3>Library News</h3>
              <p>Stay updated with announcements and events.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MemberDashboard;
