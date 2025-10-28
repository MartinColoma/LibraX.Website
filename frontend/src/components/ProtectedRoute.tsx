import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import axios from "axios";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedUserTypes?: string[];
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedUserTypes,
  allowedRoles,
}) => {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        setIsAuthenticated(false);
        setIsValidating(false);
        return;
      }

      try {
        const response = await axios.post(
          "https://librax-website-frontend.onrender.com/api/auth/verify-token",
          { token },
          { withCredentials: true }
        );

        if (response.data.valid) {
          const { user } = response.data;

          // Check user type permission
          if (allowedUserTypes && !allowedUserTypes.includes(user.userType)) {
            setIsAuthenticated(false);
            setIsValidating(false);
            return;
          }

          // Check role permission
          if (allowedRoles && !allowedRoles.includes(user.role)) {
            setIsAuthenticated(false);
            setIsValidating(false);
            return;
          }

          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("auth_token");
          sessionStorage.clear();
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Token validation error:", error);
        localStorage.removeItem("auth_token");
        sessionStorage.clear();
        setIsAuthenticated(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [allowedUserTypes, allowedRoles]);

  if (isValidating) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh" 
      }}>
        <p>Validating session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
