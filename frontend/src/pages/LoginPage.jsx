import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import './LoginPage.css';

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    // Check if redirected from OAuth with token
    const token = searchParams.get('token');
    const name = searchParams.get('name');
    const error = searchParams.get('error');

    if (error) {
      alert(`Authentication failed: ${error}`);
      return;
    }

    if (token) {
      // Decode user info from JWT (simple version - in production use jwt-decode)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userData = {
          userId: payload.userId,
          email: payload.email,
          name: payload.name,
          picture: payload.picture
        };
        login(token, userData);
        navigate('/region');
      } catch (error) {
        console.error('Error processing token:', error);
        alert('Failed to process authentication');
      }
    }
  }, [searchParams, login, navigate]);

  useEffect(() => {
    // If already authenticated, redirect to region selection
    if (isAuthenticated) {
      navigate('/region');
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = () => {
    authService.loginWithGoogle();
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Bird Submission Tracker</h1>
        <p className="subtitle">Track the birds you've spotted each month</p>

        <div className="features-top">
          <div className="feature-item">✓ Select up to 31 birds per submission</div>
          <div className="feature-item">✓ Track birds by region</div>
          <div className="feature-item">✓ Previously submitted birds are automatically marked</div>
          <div className="feature-item">✓ All submissions saved to your account</div>
        </div>

        <div className="login-card">
          <button className="google-login-btn" onClick={handleGoogleLogin}>
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              className="google-icon"
            />
            Sign in with Google
          </button>
        </div>

        <div className="featured-bird">
          <img
            src="/ruddy.jpg"
            alt="Ruddy Turnstone"
            className="bird-image"
          />
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
