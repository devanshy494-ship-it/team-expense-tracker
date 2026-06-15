import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../db/index.js';
import {
  generateAccessToken, generateRefreshToken,
  storeRefreshToken, revokeRefreshToken,
  isRefreshTokenValid, verifyRefreshToken,
  revokeAllUserTokens
} from '../utils/jwt.js';
import { sendVerificationEmail } from '../utils/email.js';
import { validationResult } from 'express-validator';

export async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password } = req.body;
  try {
    console.log('1. Starting registration for:', email);

    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email = $1', [email.toLowerCase()]
    );
    console.log('2. Existing check done, found:', existing.length);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered. Please sign in or use a different email.' });
    }

    console.log('3. Hashing password...');
    const hash = await bcrypt.hash(password, 12);

    console.log('4. Generating token...');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    console.log('5. Inserting user into DB...');
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, verification_token, token_expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email`,
      [name.trim(), email.toLowerCase(), hash, verificationToken, tokenExpiry]
    );
    console.log('6. User created:', rows[0].id);

    console.log('7. Sending verification email...');
    await sendVerificationEmail(rows[0].email, rows[0].name, verificationToken);
    console.log('8. Email sent successfully');

    res.status(201).json({
      message: 'Account created. Please check your email to verify your account.',
      email: rows[0].email,
    });
  } catch (err) {
    console.error('REGISTER ERROR:', err.message);
    console.error('FULL ERROR:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function verifyEmail(req, res) {
  const { token } = req.query;
  console.log('Verify token received:', token); 
  if (!token) return res.status(400).json({ error: 'Token required' });

  try {
    const { rows } = await pool.query(
      `SELECT id FROM users
       WHERE verification_token = $1 AND token_expires_at > NOW() AND is_verified = FALSE`,
      [token]
    );

    if (!rows[0]) {
      return res.status(400).json({ error: 'Invalid or expired verification link.' });
    }

    await pool.query(
      `UPDATE users SET is_verified = TRUE, verification_token = NULL, token_expires_at = NULL
       WHERE id = $1`,
      [rows[0].id]
    );

    // Redirect to login with success flag
    res.redirect(`${process.env.CLIENT_ORIGIN}/login?verified=true`);
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, password, is_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const fakeHash = '$2a$12$invalidhashfortimingnormalization000000000000000000000';
    const user = rows[0];
    const isValid = await bcrypt.compare(password, user ? user.password : fakeHash);

    if (!user || !isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        error: 'Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    await storeRefreshToken(user.id, refreshToken);

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function resendVerification(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, is_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always return success — don't leak whether email exists
    if (!rows[0] || rows[0].is_verified) {
      return res.json({ message: 'If that email exists and is unverified, we sent a new link.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'UPDATE users SET verification_token=$1, token_expires_at=$2 WHERE id=$3',
      [token, expiry, rows[0].id]
    );

    await sendVerificationEmail(rows[0].email, rows[0].name, token);

    res.json({ message: 'If that email exists and is unverified, we sent a new link.' });
  } catch (err) {
    console.error('Resend error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.type !== 'refresh') throw new Error('Wrong token type');

    const valid = await isRefreshTokenValid(refreshToken);
    if (!valid) return res.status(401).json({ error: 'Token revoked or expired' });

    await revokeRefreshToken(refreshToken);
    const newAccess = generateAccessToken(payload.sub);
    const newRefresh = generateRefreshToken(payload.sub);
    await storeRefreshToken(payload.sub, newRefresh);

    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}

export async function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) await revokeRefreshToken(refreshToken);
  res.json({ message: 'Logged out' });
}

export async function logoutAll(req, res) {
  await revokeAllUserTokens(req.userId);
  res.json({ message: 'Logged out from all devices' });
}

export async function getMe(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
