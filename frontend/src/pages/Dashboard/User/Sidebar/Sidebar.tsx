import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  LayoutDashboard,
  Bell,
  MoreHorizontal,
  Menu,
  X,
} from "lucide-react";
import "./Sidebar.css";

interface SidebarProps {
  onCollapse?: (collapsed: boolean) => void;
}

const MergedSidebar: React.FC<SidebarProps> = ({ onCollapse }) => {
  const [collapsed, setCollapsed] = useState(
    sessionStorage.getItem("sidebarCollapsed") === "true"
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [username, setUsername] = useState(
    sessionStorage.getItem("user_name") || "Unknown User"
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // ✅ Handle sidebar collapse toggle
  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    sessionStorage.setItem("sidebarCollapsed", String(newState));
    if (onCollapse) onCollapse(newState);
  };

  // ✅ Listen for session name updates (multi-tab sync)
  useEffect(() => {
    const handleStorageChange = () => {
      setUsername(sessionStorage.getItem("user_name") || "Unknown User");
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // ✅ Handle outside click for dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Handle window resize for responsive mode
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false); // auto-close when switching to desktop
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ Navigation items
  const navItems = [
    { name: "Home", path: "/user/dashboard/home", icon: <LayoutDashboard size={18} /> },
    { name: "My Books", path: "/member/dashboard/books", icon: <BookOpen size={18} /> },
    { name: "Library News", path: "/member/dashboard/news", icon: <Bell size={18} /> },
  ];

  // ✅ Session-safe logout logic (kept same as before)
  const handleLogout = async () => {
    try {
      console.log("🔒 Logging out...");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("member");
      sessionStorage.clear();
      navigate("/login", { replace: true });
      console.log("✅ Successfully logged out and redirected.");
    } catch (error) {
      console.error("❌ Logout failed:", error);
    }
  };

  return (
    <>
      {/* ✅ Mobile hamburger toggle */}
      {isMobile && (
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${
          isMobile ? (mobileOpen ? "mobile-open" : "mobile-closed") : ""
        }`}
      >
        {/* ==== Header Section ==== */}
        <div className="sidebar-header">
          <div className="logo">
            {!collapsed ? (
              <img
                src="/LibraX Rectangle Logo 6.png"
                alt="LibraX Logo"
                className="logo-img expanded"
              />
            ) : (
              <img
                src="/LibraX Square Logo 2.png"
                alt="LibraX Logo"
                className="logo-img collapsed"
              />
            )}
          </div>

          {/* Floating collapse button (desktop only) */}
          {!isMobile && (
            <button className="collapse-btn floating" onClick={toggleCollapsed}>
              {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          )}
        </div>

        {/* ==== Navigation ==== */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
              data-tooltip={item.name}
              onClick={() => {
                if (isMobile) setMobileOpen(false);
              }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-text">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* ==== Footer / User Info ==== */}
        <div className="sidebar-footer" ref={dropdownRef}>
          <div className="user-info">
            <div className="username">
              <small>Logged in as</small>
              <div className="staff-name">{username}</div>
            </div>
            <button
              className="menu-toggle-btn"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <MoreHorizontal size={20} />
            </button>
          </div>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="user-dropdown">
              {collapsed && <div className="dropdown-user">{username}</div>}

              <button
                className="dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/user/dashboard/profile");
                }}
              >
                Profile
              </button>

              <button className="dropdown-item" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default MergedSidebar;
