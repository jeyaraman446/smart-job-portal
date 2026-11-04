// server/routes/index.js
const router = require('express').Router();
const { protect, allow } = require('../middleware/auth');
const upload = require('../middleware/upload');

const auth = require('../controllers/authController');
const profile = require('../controllers/profileController');
const jobs = require('../controllers/jobController');
const apps = require('../controllers/applicationController');
const notifications = require('../controllers/notificationController');

// --- AUTHENTICATION ---
router.post('/auth/seeker/register', auth.seekerRegister);
router.post('/auth/register', auth.seekerRegister); // alias
router.post('/auth/seeker/login', auth.seekerLogin);
router.post('/auth/login', auth.seekerLogin); // alias
router.post('/auth/company/register', auth.companyRegister);
router.post('/auth/company/login', auth.companyLogin);
router.get('/auth/me', protect, auth.getMe);

// --- SEEKER PROFILE ---
router.get('/profile', protect, allow('seeker', 'user'), profile.getProfile);
router.put('/profile', protect, allow('seeker', 'user'), profile.updateProfile);
router.delete('/profile', protect, allow('seeker', 'user'), profile.resetProfile);

router.post('/profile/skills', protect, allow('seeker', 'user'), profile.addSkill);
router.delete('/profile/skills/:skill', protect, allow('seeker', 'user'), profile.deleteSkill);

router.post('/profile/projects', protect, allow('seeker', 'user'), profile.addProject);
router.put('/profile/projects/:id', protect, allow('seeker', 'user'), profile.updateProject);
router.delete('/profile/projects/:id', protect, allow('seeker', 'user'), profile.deleteProject);

router.post('/profile/hackathons', protect, allow('seeker', 'user'), profile.addHackathon);
router.put('/profile/hackathons/:id', protect, allow('seeker', 'user'), profile.updateHackathon);
router.delete('/profile/hackathons/:id', protect, allow('seeker', 'user'), profile.deleteHackathon);

router.post('/profile/experience', protect, allow('seeker', 'user'), profile.addExperience);
router.put('/profile/experience/:id', protect, allow('seeker', 'user'), profile.updateExperience);
router.delete('/profile/experience/:id', protect, allow('seeker', 'user'), profile.deleteExperience);

router.post('/profile/internships', protect, allow('seeker', 'user'), profile.addInternship);
router.put('/profile/internships/:id', protect, allow('seeker', 'user'), profile.updateInternship);
router.delete('/profile/internships/:id', protect, allow('seeker', 'user'), profile.deleteInternship);

router.post('/profile/education', protect, allow('seeker', 'user'), profile.addEducation);
router.delete('/profile/education/:id', protect, allow('seeker', 'user'), profile.deleteEducation);

router.post('/profile/resume', protect, allow('seeker', 'user'), upload.single('resume'), profile.uploadResume);

// --- SEEKER JOBS & APPLICATIONS ---
// Optional auth helper: allow unauthenticated or authenticated viewing of jobs
router.get('/jobs', (req, res, next) => {
  // If token is present, decode it without failing if absent
  if (req.headers.authorization) {
    return protect(req, res, next);
  }
  next();
}, jobs.getJobsForSeeker);

router.get('/jobs/:id', (req, res, next) => {
  if (req.headers.authorization) {
    return protect(req, res, next);
  }
  next();
}, jobs.getJobDetail);

router.post('/jobs/:id/apply', protect, allow('seeker', 'user'), upload.single('resume'), apps.apply);
router.get('/applications/mine', protect, allow('seeker', 'user'), apps.getMyApplications);
router.get('/applications/:id/resume', protect, apps.downloadResume);

// --- COMPANY JOBS & CANDIDATES (ADMIN PORTAL) ---
router.post('/company/jobs', protect, allow('company'), jobs.createJob);
router.get('/company/jobs', protect, allow('company'), jobs.getCompanyJobs);
router.get('/company/jobs/:id', protect, allow('company'), jobs.getCompanyJobById);
router.put('/company/jobs/:id', protect, allow('company'), jobs.updateJob);
router.patch('/company/jobs/:id/status', protect, allow('company'), jobs.toggleJobStatus);
router.delete('/company/jobs/:id', protect, allow('company'), jobs.deleteJob);

router.get('/company/jobs/:id/applicants', protect, allow('company'), apps.getJobApplicants);
router.patch('/company/applications/:id/status', protect, allow('company'), apps.updateApplicationStatus);
router.post('/company/jobs/:id/auto-shortlist', protect, allow('company'), apps.autoShortlistByThreshold);
router.post('/company/jobs/:id/bulk-status', protect, allow('company'), apps.bulkUpdateStatus);

// --- NOTIFICATIONS ---
router.get('/notifications', protect, notifications.getNotifications);
router.get('/notifications/unread-count', protect, notifications.getUnreadCount);
router.patch('/notifications/:id/read', protect, notifications.markAsRead);
router.patch('/notifications/read-all', protect, notifications.markAllAsRead);

module.exports = router;
