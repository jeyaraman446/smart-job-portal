// server/controllers/authController.js
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');
const { signToken } = require('../middleware/auth');
const { isFreeEmail } = require('../config/emailBlocklist');
const { sendWelcomeEmail } = require('../utils/emailService');

function validatePasswordRule(password) {
  if (!password || typeof password !== 'string') return false;
  // At least 8 characters, with at least 1 letter and 1 number
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 1. Seeker Registration
exports.seekerRegister = async (req, res) => {
  try {
    const { name, mail_id, email, password, confirmPassword, phone } = req.body;
    const targetEmail = (mail_id || email || '').trim().toLowerCase();

    if (!name || !targetEmail || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Name, mail ID, password, and confirm password are required' });
    }

    if (!validateEmail(targetEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address (e.g. user@domain.com)' });
    }

    if (!validatePasswordRule(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and contain at least one letter and one number',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Confirm password does not match password' });
    }

    // Check duplicate
    const existing = await User.findOne({ mail_id: targetEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this mail ID already exists' });
    }

    if (phone && phone.trim()) {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone) {
        return res.status(409).json({ message: 'An account with this phone number already exists' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      mail_id: targetEmail,
      password: hashedPassword,
      phone: phone ? phone.trim() : undefined,
      role: 'seeker',
    });

    const token = signToken({ id: user._id, role: 'seeker' });

    // Send welcome email asynchronously (non-blocking)
    sendWelcomeEmail({ to: user.mail_id, name: user.name, role: 'seeker' }).catch(() => {});

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({
      message: 'Seeker registered successfully',
      token,
      user: userObj,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Duplicate account details: mail ID or phone already registered' });
    }
    res.status(500).json({ message: err.message });
  }
};

// 2. Seeker Login
exports.seekerLogin = async (req, res) => {
  try {
    const { mail_id, email, password } = req.body;
    const targetEmail = (mail_id || email || '').trim().toLowerCase();

    if (!targetEmail || !password) {
      return res.status(400).json({ message: 'Mail ID and password are required' });
    }

    const user = await User.findOne({ mail_id: targetEmail });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid mail ID or password' });
    }

    const token = signToken({ id: user._id, role: 'seeker' });
    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      message: 'Signed in successfully',
      token,
      user: userObj,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. Company Registration (Admin page)
exports.companyRegister = async (req, res) => {
  try {
    const { name, location, mail_id, email, password, confirmPassword, website, industry, description } = req.body;
    const targetEmail = (mail_id || email || '').trim().toLowerCase();

    if (!name || !location || !targetEmail || !password || !confirmPassword) {
      return res.status(400).json({
        message: 'Company name, area of location, company mail ID, password, and confirm password are required',
      });
    }

    if (!validateEmail(targetEmail)) {
      return res.status(400).json({ message: 'Please provide a valid company email address' });
    }

    // Corporate email enforcement: reject free providers
    if (isFreeEmail(targetEmail)) {
      return res.status(400).json({
        message: 'The mail_id must be a company email. Free providers (gmail, yahoo, outlook, hotmail, icloud, proton, etc.) are not allowed for company registration.',
      });
    }

    if (!validatePasswordRule(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and contain at least one letter and one number',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Confirm password does not match password' });
    }

    // Check duplicate company name or email
    const existingEmail = await Company.findOne({ mail_id: targetEmail });
    if (existingEmail) {
      return res.status(409).json({ message: 'A company account with this mail ID already exists' });
    }

    const existingName = await Company.findOne({ name: name.trim() });
    if (existingName) {
      return res.status(409).json({ message: 'A company with this name is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const company = await Company.create({
      name: name.trim(),
      location: location.trim(),
      mail_id: targetEmail,
      password: hashedPassword,
      website: website ? website.trim() : '',
      industry: industry ? industry.trim() : '',
      description: description ? description.trim() : '',
      role: 'company',
    });

    const token = signToken({ id: company._id, role: 'company' });

    sendWelcomeEmail({ to: company.mail_id, name: company.name, role: 'company' }).catch(() => {});

    const compObj = company.toObject();
    delete compObj.password;

    res.status(201).json({
      message: 'Company registered successfully',
      token,
      company: compObj,
      user: compObj, // convenience for frontend auth state
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Company name or mail ID already registered' });
    }
    res.status(500).json({ message: err.message });
  }
};

// 4. Company Login
exports.companyLogin = async (req, res) => {
  try {
    const { mail_id, email, password } = req.body;
    const targetEmail = (mail_id || email || '').trim().toLowerCase();

    if (!targetEmail || !password) {
      return res.status(400).json({ message: 'Company mail ID and password are required' });
    }

    const company = await Company.findOne({ mail_id: targetEmail });
    if (!company || !(await bcrypt.compare(password, company.password))) {
      return res.status(401).json({ message: 'Invalid company mail ID or password' });
    }

    const token = signToken({ id: company._id, role: 'company' });
    const compObj = company.toObject();
    delete compObj.password;

    res.json({
      message: 'Company authenticated successfully',
      token,
      company: compObj,
      user: compObj,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 5. GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    if (req.company) {
      return res.json({ role: 'company', user: req.company });
    }
    if (req.seeker) {
      return res.json({ role: 'seeker', user: req.seeker });
    }
    res.status(404).json({ message: 'Profile not found' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
