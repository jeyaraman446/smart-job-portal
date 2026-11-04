const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  vacancies: { type: Number, default: 1, min: 1 },
  salaryRange: {
    min: { type: Number },
    max: { type: Number },
  },
  deadline: { type: Date },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },

  // Requirements that company can set
  requiredSkills: [{ type: String, lowercase: true, trim: true }],
  preferredSkills: [{ type: String, lowercase: true, trim: true }],
  languagesKnown: {
    spoken: [{ type: String, lowercase: true, trim: true }],
    programming: [{ type: String, lowercase: true, trim: true }],
  },
  minProjects: { type: Number, default: 0 },
  projectsRequired: { type: Boolean, default: false },
  githubRequired: { type: Boolean, default: false },
  linkedinRequired: { type: Boolean, default: false },
  minExperience: { type: Number, default: 0 },
  minCgpa: { type: Number, default: 0 },
  degreeRequired: { type: String, trim: true },

  // Precomputed list of requirements that are active/mandatory for applicants
  mandatoryFields: [{ type: String }],
}, {
  timestamps: true,
});

// Middleware to compute mandatoryFields automatically
jobSchema.pre('save', function (next) {
  const mandatory = [];
  if (this.requiredSkills && this.requiredSkills.length > 0) mandatory.push('requiredSkills');
  if (this.minExperience && this.minExperience > 0) mandatory.push('minExperience');
  if (this.minCgpa && this.minCgpa > 0) mandatory.push('minCgpa');
  if (this.githubRequired) mandatory.push('github');
  if (this.linkedinRequired) mandatory.push('linkedin');
  if (this.projectsRequired || (this.minProjects && this.minProjects > 0)) mandatory.push('projects');
  if (this.languagesKnown?.programming && this.languagesKnown.programming.length > 0) mandatory.push('programmingLanguages');
  if (this.languagesKnown?.spoken && this.languagesKnown.spoken.length > 0) mandatory.push('spokenLanguages');
  if (this.degreeRequired && this.degreeRequired.trim().length > 0) mandatory.push('degree');

  this.mandatoryFields = mandatory;
  next();
});

jobSchema.index({ requiredSkills: 1 });
jobSchema.index({ company: 1, createdAt: -1 });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Job', jobSchema);
