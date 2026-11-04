const mongoose = require('mongoose');

let isConnecting = false;

module.exports = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  if (isConnecting) {
    while (isConnecting && mongoose.connection.readyState === 0) {
      await new Promise(r => setTimeout(r, 100));
    }
    return;
  }

  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/job_portal';
  try {
    isConnecting = true;
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    isConnecting = false;
    // Ensure Application indexes exist for duplicate protection
    await require('../models/Application').init();
    console.log(`✓ MongoDB connected successfully`);
  } catch (err) {
    isConnecting = false;
    console.error('❌ MongoDB Connection Error:', err.message);
    throw err;
  }
};
