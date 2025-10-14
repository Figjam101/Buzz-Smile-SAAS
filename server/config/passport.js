const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const InstagramStrategy = require('passport-instagram').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const YoutubeStrategy = require('passport-youtube-v3').Strategy;
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
}

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
      // Check if user already exists with this Facebook ID
      let user = await User.findOne({ facebookId: profile.id });
      
      if (user) {
        return done(null, user);
      }
      
      // Check if user exists with same email
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (email) {
        user = await User.findOne({ email: email });
        
        if (user) {
          // Link Facebook account to existing user
          user.facebookId = profile.id;
          user.provider = 'facebook';
          await user.save();
          return done(null, user);
        }
      }
      
      // Create new user
      user = new User({
        facebookId: profile.id,
        name: profile.displayName,
        email: email,
        provider: 'facebook'
      });
      
      await user.save();
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
}

// Instagram OAuth Strategy
if (process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET && 
    process.env.INSTAGRAM_CLIENT_ID !== 'placeholder-instagram-client-id') {
  passport.use(new InstagramStrategy({
    clientID: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    callbackURL: "/auth/instagram/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this Instagram ID
      let user = await User.findOne({ instagramId: profile.id });
      
      if (user) {
        return done(null, user);
      }
      
      // Check if user exists with same email (Instagram may not provide email)
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (email) {
        user = await User.findOne({ email: email });
        
        if (user) {
          // Link Instagram account to existing user
          user.instagramId = profile.id;
          user.provider = 'instagram';
          await user.save();
          return done(null, user);
        }
      }
      
      // Create new user
      user = new User({
        instagramId: profile.id,
        name: profile.displayName || profile.username,
        email: email,
        provider: 'instagram'
      });
      
      await user.save();
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
}

// Twitter OAuth Strategy
if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET && 
    process.env.TWITTER_CONSUMER_KEY !== 'placeholder-twitter-consumer-key') {
  passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: "/auth/twitter/callback",
    includeEmail: true
  }, async (token, tokenSecret, profile, done) => {
    try {
      // Check if user already exists with this Twitter ID
      let user = await User.findOne({ twitterId: profile.id });
      
      if (user) {
        return done(null, user);
      }
      
      // Check if user exists with same email
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (email) {
        user = await User.findOne({ email: email });
        
        if (user) {
          // Link Twitter account to existing user
          user.twitterId = profile.id;
          user.provider = 'twitter';
          await user.save();
          return done(null, user);
        }
      }
      
      // Create new user
      user = new User({
        twitterId: profile.id,
        name: profile.displayName,
        email: email,
        provider: 'twitter'
      });
      
      await user.save();
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
}

// YouTube OAuth Strategy
if (process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET && 
    process.env.YOUTUBE_CLIENT_ID !== 'placeholder-youtube-client-id') {
  passport.use(new YoutubeStrategy({
    clientID: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    callbackURL: "/auth/youtube/callback",
    scope: ['https://www.googleapis.com/auth/youtube.readonly']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this YouTube ID
      let user = await User.findOne({ youtubeId: profile.id });
      
      if (user) {
        return done(null, user);
      }
      
      // Check if user exists with same email
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (email) {
        user = await User.findOne({ email: email });
        
        if (user) {
          // Link YouTube account to existing user
          user.youtubeId = profile.id;
          user.provider = 'youtube';
          await user.save();
          return done(null, user);
        }
      }
      
      // Create new user
      user = new User({
        youtubeId: profile.id,
        name: profile.displayName,
        email: email,
        provider: 'youtube'
      });
      
      await user.save();
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));
}

module.exports = passport;