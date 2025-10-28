import React from 'react';
import AppRoutes from './AppRoutes';
import { HashRouter as Router } from "react-router-dom";
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
};

export default App;
