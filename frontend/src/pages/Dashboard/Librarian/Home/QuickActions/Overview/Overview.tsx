import React, { useEffect, useState } from "react";
import "./Overview.css";

interface OverviewData {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalStudents: number;
  totalFaculty: number;
  totalStaff: number;
}

const Overview: React.FC = () => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/librarian/overview`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Error fetching overview:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  if (loading) return <p>Loading overview data...</p>;

  return (
    <div className="overview-container">
      <h2>📊 User Overview</h2>
      <div className="overview-grid">
        <div className="overview-card" style={{ backgroundColor: "var(--muji-red)" }}>
          <h3>Total Users</h3>
          <p>{data?.totalUsers}</p>
        </div>
        <div className="overview-card" style={{ backgroundColor: "var(--muji-brown)" }}>
          <h3>Active Users</h3>
          <p>{data?.activeUsers}</p>
        </div>
        <div className="overview-card" style={{ backgroundColor: "var(--muji-grey)", color: "var(--muji-dark)" }}>
          <h3>Inactive Users</h3>
          <p>{data?.inactiveUsers}</p>
        </div>
        <div className="overview-card" style={{ backgroundColor: "var(--muji-ivory)", color: "var(--muji-dark)" }}>
          <h3>Students</h3>
          <p>{data?.totalStudents}</p>
        </div>
        <div className="overview-card" style={{ backgroundColor: "var(--muji-brown)" }}>
          <h3>Faculty</h3>
          <p>{data?.totalFaculty}</p>
        </div>
        <div className="overview-card" style={{ backgroundColor: "var(--muji-red)" }}>
          <h3>Staff</h3>
          <p>{data?.totalStaff}</p>
        </div>
      </div>
    </div>
  );
};

export default Overview;
