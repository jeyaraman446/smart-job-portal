// Generic free / consumer email domains disallowed for HR / Employer accounts
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'mail.com',
  'gmx.com',
  'yandex.com',
  'fastmail.com',
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.isValidEmail = email => {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim().toLowerCase());
};

exports.isCompanyEmail = email => {
  if (!exports.isValidEmail(email)) return false;
  const domain = email.trim().toLowerCase().split('@')[1];
  if (!domain) return false;
  return !PUBLIC_EMAIL_DOMAINS.has(domain);
};

exports.extractEmailDomain = email => {
  if (!email || !email.includes('@')) return '';
  return email.trim().toLowerCase().split('@')[1] || '';
};
