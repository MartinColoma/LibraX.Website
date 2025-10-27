import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MD_Home.css";
import usePageMeta from '../../../../hooks/usePageMeta';

const MemberDashboard: React.FC = () => {
  usePageMeta("User Dashboard - Home", "/LibraX Square Logo 1.png");
  const navigate = useNavigate();

  const [memberName, setMemberName] = useState<string>("");
  const [sessionTimeout, setSessionTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // ✅ Function to handle logout
  const handleSessionExpired = () => {
    console.log("🔒 Session expired, logging out...");
    
    // Clear all stored data
    localStorage.removeItem("auth_token");
    sessionStorage.clear();
    
    // Redirect to login
    navigate("/login", { replace: true });
    
    // Optional: Show notification
    alert("Your session has expired. Please log in again.");
  };

  // ✅ Function to check if token is expired
  const isTokenExpired = (token: string): boolean => {
    try {
      // Decode JWT payload (middle part)
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      const payload = JSON.parse(atob(parts[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();

      const isExpired = currentTime > expirationTime;
      console.log(`Token expiration check: Expired: ${isExpired}, Exp: ${new Date(expirationTime).toLocaleString()}, Now: ${new Date(currentTime).toLocaleString()}`);
      
      return isExpired;
    } catch (error) {
      console.error("Error checking token expiration:", error);
      return true; // Treat as expired if error
    }
  };

  // ✅ Function to reset inactivity timer (30 minutes)
  const resetInactivityTimer = () => {
    // Clear existing timer
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }

    // Set new timer - logout after 30 minutes of inactivity
    const timer = setTimeout(() => {
      console.log("⏱️ Inactivity timeout reached");
      handleSessionExpired();
    }, 30 * 1000); // 30 minutes

    setSessionTimeout(timer);
    console.log("⏰ Inactivity timer reset (30 minutes)");
  };

  // ✅ Setup main effect
  useEffect(() => {
    // Check if user is still logged in
    const userType = sessionStorage.getItem("user_type");
    if (userType !== "member") {
      console.log("❌ Not a member, redirecting to login");
      navigate("/login", { replace: true });
      return;
    }

    const name = sessionStorage.getItem("user_name") || "Member";
    setMemberName(name);

    console.log("✅ Member dashboard loaded");

    // Initialize inactivity timer
    resetInactivityTimer();

    // Add event listeners for user activity
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    
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

  // ✅ Check token expiration every 1 minute
  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        console.log("❌ No token found");
        handleSessionExpired();
        return;
      }

      // Check if token is expired
      if (isTokenExpired(token)) {
        console.log("⚠️ Token has expired");
        handleSessionExpired();
        return;
      }

      console.log("✅ Token is still valid");
    };

    // Check token expiration immediately and then every 1 minute
    checkTokenExpiration();
    const tokenCheckInterval = setInterval(checkTokenExpiration, 1 * 60 * 1000); // Check every 1 minute

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
