import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import './Dash_Home.css';
import usePageMeta from '../../../../hooks/usePageMeta';

const Dash_Home: React.FC = () => {
  usePageMeta("Librarian Dashboard - Home", "LibraX_Square_Logo_1.png");

  // const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
  //   sessionStorage.getItem("sidebarCollapsed") === "true"
  // );

  const [userName, setUserName] = useState<string>(
    sessionStorage.getItem("user_name") || "User"
  );

  const navigate = useNavigate();

  // Redirect if not staff
  useEffect(() => {
    const userType = sessionStorage.getItem("user_type");
    if (userType !== "staff") {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // Optional: update greeting if sessionStorage changes in another tab
  useEffect(() => {
    const handleStorageChange = () => {
      setUserName(sessionStorage.getItem("user_name") || "User");
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <div className="page-layout">
      {/* <Sidebar onCollapse={(state: boolean) => {
        setSidebarCollapsed(state);
        sessionStorage.setItem("sidebarCollapsed", String(state));
        window.dispatchEvent(new Event("storage")); // trigger other tabs/pages
      }} /> */}
      
      <main
        className="main-content"
        // style={{
        //   marginLeft: sidebarCollapsed ? "85px" : "250px", 
        //   transition: "margin 0.3s ease",
        // }}
      >
        <h1 className="title-header">Library Dashboard</h1>

        {/* Introductory message */}
        <div className="intro-message">
          <h2>Welcome back, {userName}!</h2>
        </div>

      </main>
    </div>
  );
};

export default Dash_Home;
