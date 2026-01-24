const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const authService = {
  /**
   * Redirect to Google OAuth login
   */
  loginWithGoogle() {
    window.location.href = `${API_URL}/auth/google`;
  },

  /**
   * Store token and user info
   */
  storeAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  /**
   * Get stored token
   */
  getToken() {
    return localStorage.getItem('token');
  },

  /**
   * Get stored user
   */
  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getToken();
  },

  /**
   * Logout
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};
