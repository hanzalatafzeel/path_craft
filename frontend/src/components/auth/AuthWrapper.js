import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Login from './Login';
import Register from './Register';

const AuthWrapper = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);

  const toggleMode = () => setIsLoginMode(!isLoginMode);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return isLoginMode ? (
      <Login onToggleMode={toggleMode} />
    ) : (
      <Register onToggleMode={toggleMode} />
    );
  }

  return children;
};

export default AuthWrapper;