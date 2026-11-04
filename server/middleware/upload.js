// server/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isServerless = !!process.env.VERCEL;
const baseUploads = isServerless ? path.join(os.tmpdir(), 'uploads') : path.resolve(__dirname, '../uploads');
const resumesDir = path.join(baseUploads, 'resumes');
try {
  if (!fs.existsSync(resumesDir)) {
    fs.mkdirSync(resumesDir, { recursive: true });
  }
} catch (e) {}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });
    } catch (e) {}
    cb(null, resumesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `resume-${req.user?.id || 'guest'}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF format resumes are permitted (max 2 MB).'));
  }
};

module.exports = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit per brief Section 3.3
  fileFilter,
});
