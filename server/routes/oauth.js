const express = require('express');
// Use the configured Passport instance to ensure strategies are available
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Helper function to check if a strategy is registered
const isStrategyRegistered = (strategyName) => {
  return passport._strategies && passport._strategies[strategyName];
};

// Google OAuth routes
router.get('/google', (req, res, next) => {
  if (!isStrategyRegistered('google')) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Not Available</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          .error { color: #d32f2f; margin: 20px 0; }
          .message { color: #666; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h2>Google OAuth Not Available</h2>
        <div class="error">Google OAuth is not configured.</div>
        <div class="message">Please contact the administrator to set up Google authentication.</div>
        <script>
          setTimeout(() => {
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_ERROR', message: 'Google OAuth is not configured' }, '*');
              window.close();
            }
          }, 2000);
        </script>
      </body>
      </html>
    `);
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=oauth_failed' }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { userId: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Update last login
      req.user.lastLogin = new Date();
      await req.user.save();

      // Redirect to frontend with token
      res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/login?error=oauth_failed');
    }
  }
);

// Facebook OAuth routes
router.get('/facebook', (req, res, next) => {
  if (!isStrategyRegistered('facebook')) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Not Available</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          .error { color: #d32f2f; margin: 20px 0; }
          .message { color: #666; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h2>Facebook OAuth Not Available</h2>
        <div class="error">Facebook OAuth is not configured.</div>
        <div class="message">Please contact the administrator to set up Facebook authentication.</div>
        <script>
          setTimeout(() => {
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_ERROR', message: 'Facebook OAuth is not configured' }, '*');
              window.close();
            }
          }, 2000);
        </script>
      </body>
      </html>
    `);
  }
  passport.authenticate('facebook', { scope: ['email'] })(req, res, next);
});

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login?error=oauth_failed' }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { userId: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Update last login
      req.user.lastLogin = new Date();
      await req.user.save();

      // Redirect to frontend with token
      res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/login?error=oauth_failed');
    }
  }
);

// Instagram OAuth routes
router.get('/instagram', (req, res, next) => {
  if (!isStrategyRegistered('instagram')) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Not Available</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          .error { color: #d32f2f; margin: 20px 0; }
          .message { color: #666; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h2>Instagram OAuth Not Available</h2>
        <div class="error">Instagram OAuth is not configured.</div>
        <div class="message">Please contact the administrator to set up Instagram authentication.</div>
        <script>
          setTimeout(() => {
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_ERROR', message: 'Instagram OAuth is not configured' }, '*');
              window.close();
            }
          }, 2000);
        </script>
      </body>
      </html>
    `);
  }
  passport.authenticate('instagram')(req, res, next);
});

router.get('/instagram/callback',
  passport.authenticate('instagram', { failureRedirect: '/login?error=oauth_failed' }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { userId: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Update last login
      req.user.lastLogin = new Date();
      await req.user.save();

      // Redirect to frontend with token
      res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/login?error=oauth_failed');
    }
  }
);

// Twitter OAuth routes
router.get('/twitter', (req, res, next) => {
  if (!isStrategyRegistered('twitter')) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Not Available</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          .error { color: #d32f2f; margin: 20px 0; }
          .message { color: #666; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h2>Twitter OAuth Not Available</h2>
        <div class="error">Twitter OAuth is not configured.</div>
        <div class="message">Please contact the administrator to set up Twitter authentication.</div>
        <script>
          setTimeout(() => {
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_ERROR', message: 'Twitter OAuth is not configured' }, '*');
              window.close();
            }
          }, 2000);
        </script>
      </body>
      </html>
    `);
  }
  passport.authenticate('twitter')(req, res, next);
});

router.get('/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/login?error=oauth_failed' }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { userId: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Update last login
      req.user.lastLogin = new Date();
      await req.user.save();

      // Redirect to frontend with token
      res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/login?error=oauth_failed');
    }
  }
);

// YouTube OAuth routes
router.get('/youtube', (req, res, next) => {
  if (!isStrategyRegistered('youtube')) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Not Available</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          .error { color: #d32f2f; margin: 20px 0; }
          .message { color: #666; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h2>YouTube OAuth Not Available</h2>
        <div class="error">YouTube OAuth is not configured.</div>
        <div class="message">Please contact the administrator to set up YouTube authentication.</div>
        <script>
          setTimeout(() => {
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_ERROR', message: 'YouTube OAuth is not configured' }, '*');
              window.close();
            }
          }, 2000);
        </script>
      </body>
      </html>
    `);
  }
  passport.authenticate('youtube')(req, res, next);
});

router.get('/youtube/callback',
  passport.authenticate('youtube', { failureRedirect: '/login?error=oauth_failed' }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { userId: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Update last login
      req.user.lastLogin = new Date();
      await req.user.save();

      // Redirect to frontend with token
      res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/login?error=oauth_failed');
    }
  }
);

// OAuth success route (for handling the redirect)
router.get('/success', (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.redirect('/login?error=no_token');
  }

  // Send HTML that will handle the token and close the popup
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Success</title>
    </head>
    <body>
      <script>
        // Store token in localStorage
        localStorage.setItem('token', '${token}');
        
        // If this is a popup, close it and notify parent
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_SUCCESS', token: '${token}' }, '*');
          window.close();
        } else {
          // If not a popup, redirect to dashboard
          window.location.href = '/dashboard';
        }
      </script>
      <p>Authentication successful! Redirecting...</p>
    </body>
    </html>
  `);
});

module.exports = router;