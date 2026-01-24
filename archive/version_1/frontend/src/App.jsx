import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BirdProvider } from './contexts/BirdContext';
import LoginPage from './pages/LoginPage';
import RegionSelectionPage from './pages/RegionSelectionPage';
import BirdSubmissionPage from './pages/BirdSubmissionPage';
import SuccessPage from './pages/SuccessPage';
import './App.css';

// Protected Route component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BirdProvider>
          <div className="app">
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route
                path="/region"
                element={
                  <ProtectedRoute>
                    <RegionSelectionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/submit"
                element={
                  <ProtectedRoute>
                    <BirdSubmissionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/success"
                element={
                  <ProtectedRoute>
                    <SuccessPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </BirdProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
