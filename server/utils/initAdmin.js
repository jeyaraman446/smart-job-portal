const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function initAdmin() {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const email = (process.env.ADMIN_EMAIL || 'admin@jobportal.com').toLowerCase().trim();
      const password = process.env.ADMIN_PASSWORD || 'Admin@123';
      const hashedPassword = await bcrypt.hash(password, 10);

      await User.create({
        name: 'System Administrator',
        email,
        password: hashedPassword,
        role: 'admin',
        phone: '+1 555-010-9999',
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      });

      console.log(`🛡️ Initialized default System Administrator: ${email}`);
    } else {
      console.log(`🛡️ System Administrator account active: ${adminExists.email}`);
    }
  } catch (err) {
    console.error('Failed to initialize admin user:', err.message);
  }
}

module.exports = initAdmin;
