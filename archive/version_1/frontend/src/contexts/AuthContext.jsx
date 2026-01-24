import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';
import jwtDecode from 'jwt-decode';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth on mount
    const storedToken = authService.getToken();
    const storedUser = authService.getUser();

    if (storedToken && storedUser) {
      // Verify token is not expired
      try {
        const decoded = jwtDecode(storedToken);
        const isExpired = decoded.exp * 1000 < Date.now();

        if (!isExpired) {
          setToken(storedToken);
          setUser(storedUser);
          setIsAuthenticated(true);
        } else {
          authService.logout();
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        authService.logout();
      }
    }

    setLoading(false);
  }, []);

  const login = (token, userData) => {
    authService.storeAuth(token, userData);
    setToken(token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
