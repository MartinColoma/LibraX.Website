import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MD_Home.css";
import usePageMeta from '../../../../hooks/usePageMeta';

const MemberDashboard: React.FC = () => {
  usePageMeta("User Dashboard - Home", "/LibraX Square Logo 1.png");
  const navigate = useNavigate();

  const [memberName, setMemberName] = useState<string>("");
  const [sessionTimeout, setSessionTimeout] = useState<ReturnType<typeof setTimeout> | null>(null); // ✅ FIXED

  // Function to handle logout
  const handleSessionExpired = () => {
    console.log("Session expired, logging out...");
    
    // Clear all stored data
    localStorage.removeItem("auth_token");
    sessionStorage.clear();
    
    // Show alert and redirect
    alert("Your session has expired. Please log in again.");
    navigate("/login", { replace: true });
  };

  // Function to reset inactivity timer
  const resetInactivityTimer = () => {
    // Clear existing timer
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }

    // Set new timer - logout after 30 minutes of inactivity
    const timer = setTimeout(() => {
      handleSessionExpired();
    }, 30 * 60 * 1000); // 30 minutes in milliseconds

    setSessionTimeout(timer);
  };

  // Setup inactivity listeners
  useEffect(() => {
    // Check if user is still logged in
    const userType = sessionStorage.getItem("user_type");
    if (userType !== "member") {
      navigate("/login", { replace: true });
      return;
    }

    const name = sessionStorage.getItem("user_name") || "Member";
    setMemberName(name);

    // Initialize inactivity timer
    resetInactivityTimer();

    // Add event listeners for user activity
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    
    events.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    // Cleanup function
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
      
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
    };
  }, [navigate]);

  // Check token validity periodically
  useEffect(() => {
    const checkTokenValidity = async () => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        handleSessionExpired();
        return;
      }

      try {
        const response = await fetch(
          "https://libra-x-website-api.vercel.app/api/verifytoken",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
            credentials: "include",
          }
        );

        if (!response.ok || !(await response.json()).valid) {
          handleSessionExpired();
        }
      } catch (error) {
        console.error("Token check failed:", error);
        handleSessionExpired();
      }
    };

    // Check token every 5 minutes
    const tokenCheckInterval = setInterval(checkTokenValidity, 5 * 60 * 1000);

    return () => clearInterval(tokenCheckInterval);
  }, []);

  // Optional: greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="page-layout">
      <main className="main-content">
        <div className="dashboard-container">
          <div className="welcome-card">
            <h1>
              {getGreeting()}, {memberName} 👋
            </h1>
            <p>Welcome to your library dashboard. Explore resources, check your reservations, and stay updated with library news.</p>
          </div>

          {/* Placeholder for future member features */}
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
