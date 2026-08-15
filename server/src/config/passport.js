'use strict'

const passport = require('passport')
const { Strategy: GoogleStrategy } = require('passport-google-oauth20')
const env = require('./env')
const authService = require('../services/authService')

const isGoogleConfigured = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL
)

if (isGoogleConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] && profile.emails[0].value
          if (!email) return done(new Error('Google account has no email'))
          const user = await authService.findOrCreateGoogleUser({
            googleId: profile.id,
            email,
            name: profile.displayName || email,
          })
          return done(null, user)
        } catch (e) {
          return done(e)
        }
      }
    )
  )
}

// Blocks Google routes when creds are absent (dev/CI) instead of crashing.
const googleGuard = (req, res, next) =>
  isGoogleConfigured ? next() : res.status(503).json({ error: 'Google sign-in is not configured' })

module.exports = { passport, isGoogleConfigured, googleGuard }
