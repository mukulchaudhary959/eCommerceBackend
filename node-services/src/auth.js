import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function issueToken(user) {
  return jwt.sign({ sub: String(user._id), email: user.email, roles: user.roles }, config.jwtSecret, { expiresIn: '1h', issuer: 'ecommerce-user-service' });
}

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try { req.user = jwt.verify(token, config.jwtSecret); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}

export const allow = (...roles) => (req, res, next) =>
  req.user?.roles?.some(role => roles.includes(role)) ? next() : res.status(403).json({ error: 'Insufficient role' });

