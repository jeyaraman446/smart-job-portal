// server/controllers/applicationController.js
const fs = require('fs');
const path = require('path');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { hashFile, parsePdfBuffer } = require('../utils/resumeParser');
const { calculateMatch, normalizeSkill } = require('../utils/matcher');
const {
  sendApplicationReceivedEmail,
  sendInterviewCallEmail,
  sendRejectionEmail,
} = require('../utils/emailService');

// Helper to check mandatory requirements
function validateMandatoryRequirements(seeker, job) {
  const missing = [];

  // Required skills (normalized)
  if (job.requiredSkills && job.requiredSkills.length > 0) {
    const seekerSkills = (seeker.skills || []).map(normalizeSkill);
    const jobSkills = job.requiredSkills.map(normalizeSkill);
    const missingSkills = jobSkills.filter(s => !seekerSkills.includes(s));
    if (missingSkills.length === jobSkills.length) {
      missing.push(`Required skills: missing core competencies (${missingSkills.slice(0, 3).join(', ')})`);
    }
  }

  // Minimum experience
  if (job.minExperience && job.minExperience > 0) {
    const candidateExp = seeker.totalExperienceYears || 0;
    if (candidateExp < job.minExperience) {
      missing.push(`Minimum experience: requires ${job.minExperience} years (your profile has ${candidateExp} years)`);
    }
  }

  // Minimum CGPA
  if (job.minCgpa && job.minCgpa > 0) {
    const candidateCgpa = seeker.cgpa || 0;
    if (candidateCgpa < job.minCgpa) {
      missing.push(`Minimum CGPA: requires ${job.minCgpa} (your profile has ${candidateCgpa})`);
    }
  }

  // GitHub required
  if (job.githubRequired && (!seeker.github || !seeker.github.trim())) {
    missing.push('GitHub profile URL is mandatory for this role');
  }

  // LinkedIn required
  if (job.linkedinRequired && (!seeker.linkedin || !seeker.linkedin.trim())) {
    missing.push('LinkedIn profile URL is mandatory for this role');
  }

  // Projects required
  const minProj = job.minProjects || (job.projectsRequired ? 1 : 0);
  if (minProj > 0 && (!seeker.projects || seeker.projects.length < minProj)) {
    missing.push(`Portfolio projects: requires at least ${minProj} projects (you have ${seeker.projects?.length || 0})`);
  }

  // Programming languages required
  const requiredProg = job.languagesKnown?.programming || [];
  if (requiredProg.length > 0) {
    const candProg = (seeker.languages?.programming || []).map(p => p.toLowerCase());
    const missingProg = requiredProg.filter(p => !candProg.includes(p.toLowerCase()));
    if (missingProg.length > 0) {
      missing.push(`Programming languages: requires ${missingProg.join(', ')}`);
    }
  }

  return missing;
}

// POST /api/jobs/:id/apply (Seeker apply)
exports.apply = async (req, res) => {
  try {
    const jobId = req.params.id;
    const seekerId = req.user.id;

    const job = await Job.findById(jobId).populate('company');
    if (!job) return res.status(404).json({ message: 'Job posting not found' });
    if (job.status === 'closed') {
      return res.status(400).json({ message: 'This job vacancy has been closed by the employer' });
    }

    const seeker = await User.findById(seekerId);
    if (!seeker) return res.status(404).json({ message: 'Seeker profile not found' });

    // Validate mandatory requirements before allowing apply
    const missingRequirements = validateMandatoryRequirements(seeker, job);
    if (missingRequirements.length > 0) {
      return res.status(400).json({
        message: 'Your profile does not satisfy the mandatory requirements set by the employer for this role.',
        missingRequirements,
      });
    }

    // Require resume file (multipart)
    if (!req.file) {
      return res.status(400).json({ message: 'A PDF resume file is required to apply' });
    }

    // Generate SHA-256 hash of the uploaded resume
    const resumeHash = hashFile(req.file.path);
    if (!resumeHash) {
      return res.status(400).json({ message: 'Failed to process resume file checksum' });
    }

    // Duplicate Rule 1: One application per user per job
    const existingUserApp = await Application.findOne({ job: job._id, applicant: seeker._id });
    if (existingUserApp) {
      return res.status(409).json({
        message: 'You have already submitted an application for this job opening (duplicate application blocked)',
      });
    }

    // Duplicate Rule 2: Same resume file cannot be submitted twice to the same job (even by different accounts)
    const existingResumeApp = await Application.findOne({ job: job._id, resumeHash });
    if (existingResumeApp) {
      return res.status(409).json({
        message: 'This exact resume document has already been submitted for this job vacancy (duplicate resume blocked)',
      });
    }

    // Duplicate Rule 3: Normalized profile fingerprint (email, github, linkedin, phone)
    const fingerprint = {
      email: (seeker.mail_id || '').toLowerCase().trim(),
      phone: (seeker.phone || '').trim(),
      github: (seeker.github || '').toLowerCase().trim(),
      linkedin: (seeker.linkedin || '').toLowerCase().trim(),
    };

    if (fingerprint.github || fingerprint.linkedin) {
      const orClauses = [];
      if (fingerprint.github) orClauses.push({ 'fingerprint.github': fingerprint.github });
      if (fingerprint.linkedin) orClauses.push({ 'fingerprint.linkedin': fingerprint.linkedin });

      const duplicateProfileApp = await Application.findOne({
        job: job._id,
        $or: orClauses,
      });

      if (duplicateProfileApp && duplicateProfileApp.applicant.toString() !== seeker._id.toString()) {
        return res.status(409).json({
          message: 'An application with the same GitHub or LinkedIn profile link already exists for this job opening (duplicate candidate identity blocked)',
        });
      }
    }

    // Parse resume text for skill extraction
    let resumeText = '';
    try {
      resumeText = await parsePdfBuffer(req.file.path);
    } catch {}

    // Compute server-side match score against job
    const match = calculateMatch(seeker, job, { resumeText });

    // Snapshot full seeker profile at apply time
    const profileSnapshot = seeker.toObject();
    delete profileSnapshot.password;

    const application = await Application.create({
      job: job._id,
      applicant: seeker._id,
      company: job.company._id,
      profileSnapshot,
      resumeUrl: req.file.path,
      resumeFileName: req.file.originalname,
      resumeHash,
      fingerprint,
      matchScore: match.total,
      breakdown: match.breakdown,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      improvementSuggestions: match.improvementSuggestions,
      status: 'applied',
    });

    // In-portal notification
    await Notification.create({
      user: seeker._id,
      type: 'application_submitted',
      title: `Application Submitted: ${job.title}`,
      message: `Your application for "${job.title}" at ${job.company.name} was successfully received. Match score: ${match.total}%.`,
      link: '/applications',
    });

    // Send confirmation email asynchronously
    sendApplicationReceivedEmail({
      to: seeker.mail_id,
      seekerName: seeker.name,
      jobTitle: job.title,
      companyName: job.company.name,
      matchScore: match.total,
    }).catch(() => {});

    res.status(201).json({
      message: 'Application submitted successfully!',
      applicationId: application._id,
      matchScore: match.total,
      breakdown: match.breakdown,
      improvementSuggestions: match.improvementSuggestions,
    });
  } catch (err) {
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.resumeHash) {
        return res.status(409).json({ message: 'Duplicate resume file detected for this job opening' });
      }
      return res.status(409).json({ message: 'You have already applied for this job opening' });
    }
    res.status(500).json({ message: err.message });
  }
};

// GET /api/applications/mine (Seeker applications)
exports.getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user.id })
      .populate('job', 'title location salaryRange status company')
      .populate('company', 'name location website logoUrl')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/company/jobs/:id/applicants (Company review applicants)
exports.getJobApplicants = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (job.company.toString() !== req.company._id.toString()) {
      return res.status(403).json({ message: 'Access forbidden: you do not own this job posting' });
    }

    const { status, minScore, minExp } = req.query;
    const filter = { job: job._id };

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (minScore) {
      filter.matchScore = { $gte: Number(minScore) };
    }

    let applicants = await Application.find(filter)
      .populate('applicant', 'name mail_id phone')
      .sort({ matchScore: -1, createdAt: 1 });

    // Optional in-memory experience filter
    if (minExp) {
      const expThresh = Number(minExp);
      applicants = applicants.filter(app => {
        const totalExp = app.profileSnapshot?.totalExperienceYears || 0;
        return totalExp >= expThresh;
      });
    }

    res.json(applicants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Helper function for applying status changes, notifications, and emails
async function applyStatusChange({ application, job, companyName, status, interviewDetails, companyNote }) {
  application.status = status;
  application.reviewedAt = new Date();
  if (companyNote !== undefined) application.companyNote = companyNote;

  const seekerId = application.applicant._id || application.applicant;
  const seeker = await User.findById(seekerId);

  if (status === 'shortlisted' || status === 'interview') {
    if (interviewDetails) {
      application.interviewDetails = interviewDetails;
    }

    // Portal notification
    await Notification.create({
      user: seekerId,
      type: status,
      title: `Interview Call: ${job.title} at ${companyName}`,
      message: `Congratulations! You have been ${status === 'interview' ? 'selected for an interview' : 'shortlisted'} for "${job.title}". ${interviewDetails?.message || companyNote || 'Check your interview details.'}`,
      link: '/applications',
    });

    // Email dispatch
    if (seeker?.mail_id) {
      sendInterviewCallEmail({
        to: seeker.mail_id,
        seekerName: seeker.name,
        jobTitle: job.title,
        companyName,
        interviewDetails: application.interviewDetails,
        companyNote,
      }).catch(() => {});
    }
  } else if (status === 'rejected') {
    // Auto-generate reasons from score breakdown & missing skills
    const reasons = [];
    if (application.missingSkills && application.missingSkills.length > 0) {
      reasons.push(`Core skills gap: missing ${application.missingSkills.join(', ')}`);
    }
    if (application.improvementSuggestions && application.improvementSuggestions.length > 0) {
      application.improvementSuggestions.slice(0, 3).forEach(s => {
        reasons.push(s.suggestion);
      });
    }
    if (reasons.length === 0) {
      reasons.push('Qualifications did not align closely with this specific role opening.');
    }

    application.rejectionReasons = reasons;

    // Portal notification
    await Notification.create({
      user: seekerId,
      type: 'rejected',
      title: `Application Status Update: ${job.title}`,
      message: `Your application for "${job.title}" at ${companyName} was not shortlisted. We have provided feedback and actionable areas to improve.`,
      link: '/applications',
    });

    // Email dispatch
    if (seeker?.mail_id) {
      sendRejectionEmail({
        to: seeker.mail_id,
        seekerName: seeker.name,
        jobTitle: job.title,
        companyName,
        rejectionReasons: reasons,
        companyNote,
        improvementSuggestions: application.improvementSuggestions,
      }).catch(() => {});
    }
  } else if (status === 'hired') {
    await Notification.create({
      user: seekerId,
      type: 'hired',
      title: `Offer Extended: ${job.title} at ${companyName}!`,
      message: `Congratulations! ${companyName} has updated your status to Hired for the ${job.title} position!`,
      link: '/applications',
    });
  }

  await application.save();
}

// PATCH /api/company/applications/:id/status (Manual single status change)
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status, interviewDetails, companyNote } = req.body;
    if (!['applied', 'shortlisted', 'interview', 'rejected', 'hired'].includes(status)) {
      return res.status(400).json({ message: 'Invalid application status value' });
    }

    const application = await Application.findById(req.params.id).populate('job');
    if (!application) return res.status(404).json({ message: 'Application not found' });

    const job = await Job.findById(application.job._id || application.job);
    if (!job || job.company.toString() !== req.company._id.toString()) {
      return res.status(403).json({ message: 'Access forbidden: you do not own the job for this application' });
    }

    await applyStatusChange({
      application,
      job,
      companyName: req.company.name,
      status,
      interviewDetails,
      companyNote,
    });

    res.json({ message: `Application status updated to ${status}`, application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/company/jobs/:id/auto-shortlist (Auto-shortlist by score threshold)
exports.autoShortlistByThreshold = async (req, res) => {
  try {
    const { threshold, interviewDetails, companyNote, rejectBelow } = req.body;
    const minThreshold = Number(threshold);

    if (isNaN(minThreshold) || minThreshold < 0 || minThreshold > 100) {
      return res.status(400).json({ message: 'Threshold must be a valid number between 0 and 100' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (job.company.toString() !== req.company._id.toString()) {
      return res.status(403).json({ message: 'Access forbidden: you do not own this job posting' });
    }

    // Load applications for this job in 'applied' status
    const pendingApps = await Application.find({ job: job._id, status: 'applied' });

    let shortlistedCount = 0;
    let rejectedCount = 0;

    for (const app of pendingApps) {
      if (app.matchScore >= minThreshold) {
        await applyStatusChange({
          application: app,
          job,
          companyName: req.company.name,
          status: 'shortlisted',
          interviewDetails,
          companyNote: companyNote || `Auto-shortlisted with match score of ${app.matchScore}%`,
        });
        shortlistedCount++;
      } else if (rejectBelow) {
        await applyStatusChange({
          application: app,
          job,
          companyName: req.company.name,
          status: 'rejected',
          companyNote: companyNote || `Match score (${app.matchScore}%) was below the role auto-shortlist threshold (${minThreshold}%).`,
        });
        rejectedCount++;
      }
    }

    const updatedApps = await Application.find({ job: job._id }).sort({ matchScore: -1 });

    res.json({
      message: `Auto-shortlist complete: ${shortlistedCount} candidates shortlisted${rejectBelow ? `, ${rejectedCount} rejected` : ''}.`,
      shortlistedCount,
      rejectedCount,
      applications: updatedApps,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/company/jobs/:id/bulk-status (Bulk shortlist or reject selected)
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { applicationIds, status, interviewDetails, companyNote } = req.body;
    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ message: 'applicationIds array is required' });
    }
    if (!['shortlisted', 'interview', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be "shortlisted", "interview", or "rejected"' });
    }

    const job = await Job.findById(req.params.id);
    if (!job || job.company.toString() !== req.company._id.toString()) {
      return res.status(403).json({ message: 'Access forbidden: you do not own this job posting' });
    }

    let updatedCount = 0;
    for (const id of applicationIds) {
      const app = await Application.findOne({ _id: id, job: job._id });
      if (app) {
        await applyStatusChange({
          application: app,
          job,
          companyName: req.company.name,
          status,
          interviewDetails,
          companyNote,
        });
        updatedCount++;
      }
    }

    const apps = await Application.find({ job: job._id }).sort({ matchScore: -1 });
    res.json({ message: `Successfully updated ${updatedCount} applications to ${status}.`, applications: apps });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/applications/:id/resume (Authorized resume download)
exports.downloadResume = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate('job');
    if (!application) return res.status(404).json({ message: 'Application not found' });

    // Authorization check: owner seeker or job's company
    const isOwnerSeeker = req.user.role === 'seeker' && application.applicant.toString() === req.user.id.toString();
    const isOwnerCompany = req.user.role === 'company' && application.company.toString() === req.user.id.toString();

    if (!isOwnerSeeker && !isOwnerCompany) {
      return res.status(403).json({ message: 'Access forbidden: you are not authorized to view this resume document' });
    }

    const filePath = path.resolve(application.resumeUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Resume file not found on server storage' });
    }

    res.download(filePath, application.resumeFileName || 'Candidate_Resume.pdf');
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
