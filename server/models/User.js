const mongoose = require('mongoose');

const hackathonSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  year: { type: Number, required: true },
  status: { type: String, enum: ['participated', 'won'], default: 'participated' },
  position: { type: String, trim: true }, // e.g. "1st place", "Runner up", "Finalist"
  techUsed: [{ type: String, lowercase: true, trim: true }],
}, { _id: true });

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  techStack: [{ type: String, lowercase: true, trim: true }],
  link: { type: String, trim: true },
}, { _id: true });

const experienceSchema = new mongoose.Schema({
  company: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  years: { type: Number, default: 0 },
  months: { type: Number, default: 0 },
  description: { type: String, trim: true },
}, { _id: true });

const internshipSchema = new mongoose.Schema({
  company: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  duration: { type: String, trim: true }, // e.g. "6 months"
  durationMonths: { type: Number, default: 0 },
  description: { type: String, trim: true },
}, { _id: true });

const educationItemSchema = new mongoose.Schema({
  level: { type: String, required: true, trim: true }, // "10th", "12th", "Degree", "Post Graduate"
  boardOrUniversity: { type: String, trim: true },
  percentageOrCgpa: { type: Number },
  year: { type: Number },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mail_id: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  role: { type: String, enum: ['seeker', 'user'], default: 'seeker' },

  // Portfolio & Profile details
  skills: [{ type: String, lowercase: true, trim: true }],
  hackathons: [hackathonSchema],
  github: { type: String, trim: true },
  linkedin: { type: String, trim: true },
  projects: [projectSchema],
  experience: [experienceSchema],
  internships: [internshipSchema],
  languages: {
    spoken: [{ type: String, lowercase: true, trim: true }],
    programming: [{ type: String, lowercase: true, trim: true }],
  },
  interests: [{ type: String, lowercase: true, trim: true }],
  degree: {
    degree: { type: String, trim: true },
    branch: { type: String, trim: true },
    institute: { type: String, trim: true },
    yearOfCompletion: { type: Number },
    status: { type: String, enum: ['completed', 'pursuing', 'dropped'], default: 'completed' },
  },
  cgpa: { type: Number, min: 0, max: 10 },
  education: [educationItemSchema],

  // Virtual/helper fields
  resumeUrl: String,
  resumeFileName: String,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Sync email and mail_id before validation & saving
userSchema.pre('validate', function (next) {
  if (this.mail_id && !this.email) this.email = this.mail_id;
  if (this.email && !this.mail_id) this.mail_id = this.email;
  next();
});

// Compute total years of experience (experience entries + internship duration)
userSchema.virtual('totalExperienceYears').get(function () {
  let totalYears = 0;
  if (this.experience && this.experience.length > 0) {
    this.experience.forEach(exp => {
      totalYears += (exp.years || 0) + ((exp.months || 0) / 12);
    });
  }
  if (this.internships && this.internships.length > 0) {
    this.internships.forEach(intern => {
      if (intern.durationMonths) {
        totalYears += intern.durationMonths / 12;
      }
    });
  }
  return Number(totalYears.toFixed(1));
});

module.exports = mongoose.model('User', userSchema);
