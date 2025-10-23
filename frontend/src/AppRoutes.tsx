import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
// pang modal itong line 4
import { createPortal } from 'react-dom'; 

//Pages
import PageNotFound from './pages/PageNotFound';
import LandingPage from './pages/LandingPage/Home/Home'
import LoginModal from './pages/LandingPage/Login/LoginModal';
import RegisterModal from './pages/LandingPage/Registration/UserRegistration'

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

            </Routes>
            {/* modal pages */}
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