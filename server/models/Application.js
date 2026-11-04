const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },

  // Snapshot of seeker profile at apply time so subsequent edits don't mutate review state
  profileSnapshot: { type: Object, required: true },

  // Resume file details
  resumeUrl: { type: String, required: true },
  resumeFileName: { type: String },
  resumeHash: { type: String, required: true },

  // Normalized fingerprint to prevent duplicate application via different accounts with same profiles
  fingerprint: {
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    github: { type: String, lowercase: true, trim: true },
    linkedin: { type: String, lowercase: true, trim: true },
  },

  // Match score & intelligence breakdown
  matchScore: { type: Number, required: true, min: 0, max: 100 },
  breakdown: { type: Object, default: {} },
  matchedSkills: [{ type: String }],
  missingSkills: [{ type: String }],
  improvementSuggestions: [{
    category: String,
    suggestion: String,
    pointsPossible: Number,
  }],

  // Application lifecycle status
  status: {
    type: String,
    enum: ['applied', 'shortlisted', 'interview', 'rejected', 'hired'],
    default: 'applied',
  },
  interviewDetails: {
    date: { type: Date },
    time: { type: String },
    mode: { type: String }, // e.g. "Google Meet", "In-person", "Phone"
    message: { type: String },
  },
  rejectionReasons: [{ type: String }],
  companyNote: { type: String },
  reviewedAt: { type: Date },
}, {
  timestamps: true,
});

// Rule 1: One application per user per job
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

// Rule 2: Same resume file cannot be submitted twice to the same job (even by different accounts)
applicationSchema.index({ job: 1, resumeHash: 1 }, { unique: true });

// Performance & ranking indexes
applicationSchema.index({ job: 1, status: 1, matchScore: -1 });
applicationSchema.index({ applicant: 1, createdAt: -1 });
applicationSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);
