import React, { useEffect, useState } from "react";
//import Sidebar from "../NavBar/Sidebar";
import { useNavigate } from "react-router-dom";
import "./MD_Home.css";
//import usePageMeta from '../../../../hooks/usePageMeta';

const MemberDashboard: React.FC = () => {
  //usePageMeta("User Dashboard - Home", "/LibraX Square Logo 1.png");
  const navigate = useNavigate();
  // const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
  //   sessionStorage.getItem("sidebarCollapsed") === "true"
  // );

  const [memberName, setMemberName] = useState<string>("");

  useEffect(() => {
    const userType = sessionStorage.getItem("user_type");
    if (userType !== "member") {
      navigate("/login", { replace: true });
    }

    const name = sessionStorage.getItem("user_name") || "Member";
    setMemberName(name);
  }, [navigate]);

  // Optional: greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="page-layout">
      {/* <Sidebar
        onCollapse={(state: boolean) => {
          setSidebarCollapsed(state);
          sessionStorage.setItem("sidebarCollapsed", String(state));
          window.dispatchEvent(new Event("storage"));
        }}
      /> */}

      <main
        className="main-content"
        // style={{
        //   marginLeft: sidebarCollapsed ? "85px" : "250px",
        //   transition: "margin 0.3s ease",
        // }}
      >
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
