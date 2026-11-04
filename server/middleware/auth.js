// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');

const JWT_SECRET = process.env.JWT_SECRET || 'smart_job_portal_super_secret_jwt_key_2026';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

async function protect(req, res, next) {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role }

    if (decoded.role === 'company') {
      const company = await Company.findById(decoded.id).select('-password');
      if (!company) {
        return res.status(401).json({ message: 'Company account not found or has been deleted' });
      }
      req.company = company;
    } else {
      const seeker = await User.findById(decoded.id).select('-password');
      if (!seeker) {
        return res.status(401).json({ message: 'User account not found or has been deleted' });
      }
      req.seeker = seeker;
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session token. Please sign in again.' });
  }
}

function allow(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access forbidden: insufficient account privileges' });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  signToken,
  protect,
  allow,
};
