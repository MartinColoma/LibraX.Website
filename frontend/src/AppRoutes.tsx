// src/AppRoutes.tsx
import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';

// Pages
import PageNotFound from './pages/PageNotFound';
import LandingPage from './pages/LandingPage/Home/Home';
import LoginModal from './pages/LandingPage/Login/LoginModal';
import RegisterModal from './pages/LandingPage/Registration/UserRegistration';

// Import Librarian Pages
import LibHome from './pages/Dashboard/Librarian/Home/Dash_Home';

// Import User Pages
import UserHome from './pages/Dashboard/User/Home/MD_Home';

// Import ProtectedRoute
import ProtectedRoute from './components/ProtectedRoute';

// Full-page LoginPage
const LoginPage: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#fff8f0",
      }}
    >
      <LoginModal onClose={() => { window.history.back(); }} />
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const location = useLocation();

  // @ts-ignore
  const state = location.state as { backgroundLocation?: Location };
  const background = state?.backgroundLocation;

  return (
    <>
      <Routes location={background || location}>
        <Route path='*' element={<PageNotFound />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Librarian Routes */}
        <Route
          path="/librarian/dashboard/home"
          element={
            <ProtectedRoute 
              allowedUserTypes={["staff"]} 
              allowedRoles={["Librarian"]}
            >
              <LibHome />
            </ProtectedRoute>
          }
        />

        {/* Protected User Routes */}
        <Route
          path="/user/dashboard/home"
          element={
            <ProtectedRoute allowedUserTypes={["member"]}>
              <UserHome />
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* Modal pages */}
      {background && (
        <Routes>
          <Route
            path="/login"
            element={createPortal(
              <LoginModal onClose={() => window.history.back()} />,
              document.body
            )}
          />
          <Route
            path="/register"
            element={createPortal(
              <RegisterModal onClose={() => window.history.back()} />,
              document.body
            )}
          />
        </Routes>
      )}
    </>
  );
};

export default AppRoutes;
