// server/server.js
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

// Secure upload directory (supports serverless /tmp and local directory)
const isServerless = !!process.env.VERCEL;
const uploadsDir = isServerless ? path.join(os.tmpdir(), 'uploads') : path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) {}
app.use('/uploads', express.static(uploadsDir));

// Ensure database connection for every request (cached in serverless)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Rate limit on authentication routes
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many authentication attempts, please try again later.' },
}));

// API Routes
app.use('/api', require('./routes'));

// Serve client production build if available
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);
  res.status(status).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5001;

if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Smart Job Portal API running on http://0.0.0.0:${PORT}`);
        if (fs.existsSync(clientDist)) {
          console.log(`🌐 Full-stack Web Portal accessible at http://localhost:${PORT}`);
        }
      });
    })
    .catch(err => {
      console.error('Failed to initialize server:', err.message);
      process.exit(1);
    });
}

module.exports = app;
