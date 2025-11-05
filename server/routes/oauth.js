const express = require('express');
// Use the configured Passport instance to ensure strategies are available
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Helper function to check if a strategy is registered
const isStrategyRegistered = (strategyName) => {
  return passport._strategies && passport._strategies[strategyName];
};

// Diagnostic: OAuth configuration status (does not leak secrets)
router.get('/status', (req, res) => {
  const env = process.env;
  const safeValue = (val) => (val ? true : false);
  const isNonPlaceholder = (val) => Boolean(val && val !== 'placeholder-google-client-id');

  const providers = {
    google: Boolean(isStrategyRegistered('google'))
  };

  const config = {
    nodeEnv: env.NODE_ENV || 'development',
    clientUrl: env.CLIENT_URL || null,
    clientUrls: (env.CLIENT_URLS || '').split(',').map(s => s.trim()).filter(Boolean),
    google: {
      clientIdSet: isNonPlaceholder(env.GOOGLE_CLIENT_ID),
      clientSecretSet: safeValue(env.GOOGLE_CLIENT_SECRET)
    }
  };

  res.json({ providers, config });
});

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

// Removed non-Google OAuth routes (Facebook) to keep only Google login

// Removed non-Google OAuth routes (Instagram) to keep only Google login

// Removed non-Google OAuth routes (Twitter) to keep only Google login

// Removed non-Google OAuth routes (YouTube) to keep only Google login

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