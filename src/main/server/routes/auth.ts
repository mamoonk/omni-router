import { Router } from 'express'
import bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { createUser, getUserByEmail, getUserById, getUserByGoogleId, updateUserGoogle } from '../db/index'

export const authRouter = Router()

// Initialise Google OAuth strategy once (guarded so it only runs when credentials are set)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${BASE_URL}/api/auth/google/callback`,
    },
    (_accessToken, _refreshToken, profile, done) => {
      try {
        const googleId = profile.id
        const email = profile.emails?.[0]?.value || ''
        const name = profile.displayName || ''
        const avatar = profile.photos?.[0]?.value || ''

        let user = getUserByGoogleId(googleId)
        if (user) {
          updateUserGoogle(user.id, googleId, name, avatar)
          return done(null, { id: user.id, email: user.email, name, avatar })
        }

        // Check if email already registered (email/password account — link it)
        const existing = email ? getUserByEmail(email) : null
        if (existing) {
          updateUserGoogle(existing.id, googleId, name, avatar)
          return done(null, { id: existing.id, email: existing.email, name, avatar })
        }

        // New user
        const id = randomUUID()
        createUser(id, email, null, { googleId, name, avatar })
        return done(null, { id, email, name, avatar })
      } catch (err: any) {
        return done(err)
      }
    }
  ))
}

authRouter.use(passport.initialize())

// Google OAuth — redirects to Google consent screen
authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }))

// Google OAuth — callback after user grants permission
authRouter.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/?error=google_auth_failed' }),
  (req, res) => {
    const user = req.user as any
    if (!user) {
      res.redirect('/?error=google_auth_failed')
      return
    }
    req.session.userId = user.id
    res.redirect('/')
  }
)

authRouter.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body as { email?: string; password?: string; name?: string }
    if (!email || !password || password.length < 8) {
      res.status(400).json({ error: 'Email and a password of at least 8 characters are required' })
      return
    }
    if (getUserByEmail(email)) {
      res.status(409).json({ error: 'An account with that email already exists' })
      return
    }

    const id = randomUUID()
    const passwordHash = await bcrypt.hash(password, 12)
    createUser(id, email, passwordHash, { name: name || '' })

    req.session.userId = id
    res.json({ id, email, name: name || '' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }
    const user = email ? getUserByEmail(email) : null
    if (!user || !user.passwordHash || !(await bcrypt.compare(password || '', user.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    req.session.userId = user.id
    res.json({ id: user.id, email: user.email, name: user.name, avatar: user.avatar })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true })
  })
})

authRouter.get('/me', (req, res) => {
  const userId = req.session.userId
  const user = userId ? getUserById(userId) : null
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }
  res.json(user)
})
