// server/config/emailBlocklist.js
// Blocklist of public free mail domains that companies cannot use

const FREE_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.co.uk',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'mail.com',
  'aol.com',
  'yandex.com',
  'gmx.com',
  'live.com',
  'msn.com',
  'inbox.com',
];

function isFreeEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return false;
  return FREE_EMAIL_DOMAINS.includes(parts[1]);
}

module.exports = {
  FREE_EMAIL_DOMAINS,
  isFreeEmail,
};
