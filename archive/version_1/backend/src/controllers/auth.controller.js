const passport = require('passport');

/**
 * Initiate Google OAuth login
 */
function googleLogin(req, res, next) {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })(req, res, next);
}

/**
 * Handle Google OAuth callback
 */
function googleCallback(req, res, next) {
  passport.authenticate('google', { session: false }, (err, data, info) => {
    if (err) {
      console.error('OAuth error:', err);
      return res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
    }

    if (!data || !data.token) {
      return res.redirect(`${process.env.FRONTEND_URL}?error=no_token`);
    }

    // Redirect to frontend with token
    const { token, user } = data;
    res.redirect(`${process.env.FRONTEND_URL}?token=${token}&name=${encodeURIComponent(user.name)}`);
  })(req, res, next);
}

/**
 * Get current user info (protected route)
 */
function getCurrentUser(req, res) {
  res.json({
    user: req.user
  });
}

/**
 * Logout (client-side token removal)
 */
function logout(req, res) {
  res.json({ message: 'Logged out successfully' });
}

module.exports = {
  googleLogin,
  googleCallback,
  getCurrentUser,
  logout
};
