import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, IdCard } from 'lucide-react';
import './Home.css';
import usePageMeta from  '../../../hooks/usePageMeta';
import LoginPage from '../Login/LoginModal';
import RegisterPage from '../Registration/UserRegistration';


const Home: React.FC = () => {
  usePageMeta("LibraX | AIoT Library Kiosk", "LibraX Square Logo 1.png");
  const navigate = useNavigate();
  const location = useLocation();



    const loginmodal = location.pathname === '/login';
    const registermodal = location.pathname === '/register';

  return (
    <>
      <div className="landing-page">
        <div className="landing-background">
          <div className="landing-gradient"></div>
        </div>

        {/* Page header */}
        <div className="title-section">
          <h1 className="main-title">
            LibraX<br />
          </h1>
          <p className="subtitle">AIoT Library Kiosk</p>
        </div>

        {/* Login and Tap ID buttons */}
        <div className="button-container">
          <button
            className="landing-btn member-btn"
            onClick={() =>
              navigate('/login', {
                state: { backgroundLocation: location },
              })
            }
          >
            <LogIn size={24} />
            LOGIN
          </button>

          <button
            className="landing-btn guest-btn"
            onClick={() =>
              navigate('/register', {
                state: { backgroundLocation: location },
              })
            }          >
            <IdCard size={24} />
            Register Account
          </button>
        </div>
      </div>

      {loginmodal && (
        <LoginPage
          onClose={() =>
            navigate(location.state?.backgroundLocation || '/login')
          }
        />
      )}
      {registermodal && (
        <RegisterPage
          onClose={() =>
            navigate(location.state?.backgroundLocation || '/register')
          }
        />
      )}
    </>
  );
};

export default Home;
