const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && 
    process.env.GOOGLE_CLIENT_ID !== 'placeholder-google-client-id') {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        return done(null, user);
      }
      
      // Check if user exists with same email
      user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // Link Google account to existing user
        user.googleId = profile.id;
        user.provider = 'google';
        await user.save();
        return done(null, user);
      }
      
      // Create new user
      user = new User({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        provider: 'google'
      });
      
      await user.save();
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
  try {
    const id = String(process.env.GOOGLE_CLIENT_ID);
    const masked = id.length > 12 ? `${id.slice(0,8)}…${id.slice(-6)}` : 'set';
    console.log(`✅ Google OAuth strategy enabled (Client ID: ${masked})`);
  } catch (_) {}
}

module.exports = passport;

// Facebook OAuth Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET && 
    process.env.FACEBOOK_APP_ID !== 'placeholder-facebook-app-id') {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'emails']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ facebookId: profile.id });
      if (user) {
        return done(null, user);
      }

      const email = Array.isArray(profile.emails) && profile.emails[0]?.value ? profile.emails[0].value : null;
      if (email) {
        user = await User.findOne({ email });
        if (user) {
          user.facebookId = profile.id;
          user.provider = 'facebook';
          await user.save();
          return done(null, user);
        }
      }

      user = new User({
        facebookId: profile.id,
        name: profile.displayName || 'Facebook User',
        email: email || undefined,
        provider: 'facebook'
      });
      await user.save();
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
  try {
    const id = String(process.env.FACEBOOK_APP_ID);
    const masked = id.length > 12 ? `${id.slice(0,8)}…${id.slice(-6)}` : 'set';
    console.log(`✅ Facebook OAuth strategy enabled (App ID: ${masked})`);
  } catch (_) {}
}