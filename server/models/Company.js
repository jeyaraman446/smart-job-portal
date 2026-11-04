const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  location: { type: String, required: true, trim: true }, // area of location
  mail_id: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: 'company' },

  website: { type: String, trim: true },
  industry: { type: String, trim: true },
  size: { type: String, trim: true },
  description: { type: String, trim: true },
  logoUrl: { type: String, trim: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Sync email and mail_id before validation & saving
companySchema.pre('validate', function (next) {
  if (this.mail_id && !this.email) this.email = this.mail_id;
  if (this.email && !this.mail_id) this.mail_id = this.email;
  next();
});

module.exports = mongoose.model('Company', companySchema);
