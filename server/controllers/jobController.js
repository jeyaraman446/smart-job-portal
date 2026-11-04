// server/controllers/jobController.js
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');
const { calculateMatch } = require('../utils/matcher');

// --- SEEKER ENDPOINTS ---

// GET /api/jobs (Seeker view)
exports.getJobsForSeeker = async (req, res) => {
  try {
    const { title, location, skill, search } = req.query;
    const filter = { status: 'open' };

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } },
        { requiredSkills: { $regex: q, $options: 'i' } },
      ];
    } else {
      if (title && title.trim()) filter.title = { $regex: title.trim(), $options: 'i' };
      if (location && location.trim()) filter.location = { $regex: location.trim(), $options: 'i' };
      if (skill && skill.trim()) filter.requiredSkills = { $in: [skill.trim().toLowerCase()] };
    }

    const jobs = await Job.find(filter)
      .populate('company', 'name location website industry logoUrl')
      .sort({ createdAt: -1 });

    let seeker = null;
    let appliedJobIds = new Set();

    if (req.user && (req.user.role === 'seeker' || req.user.role === 'user')) {
      seeker = await User.findById(req.user.id);
      const myApps = await Application.find({ applicant: req.user.id }).select('job');
      appliedJobIds = new Set(myApps.map(a => a.job.toString()));
    }

    // Attach scores and alreadyApplied flag
    const scoredJobs = jobs.map(job => {
      const jObj = job.toObject();
      jObj.alreadyApplied = appliedJobIds.has(job._id.toString());

      if (seeker) {
        const match = calculateMatch(seeker, job);
        jObj.matchScore = match.total;
        jObj.matchedSkills = match.matchedSkills;
        jObj.missingSkills = match.missingSkills;
      } else {
        jObj.matchScore = null;
      }

      return jObj;
    });

    // Rank jobs by match score descending if seeker is authenticated
    if (seeker) {
      scoredJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    res.json(scoredJobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/jobs/:id (Seeker detail view)
exports.getJobDetail = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('company', 'name location website industry description logoUrl');

    if (!job) return res.status(404).json({ message: 'Job not found' });

    const jObj = job.toObject();

    if (req.user && (req.user.role === 'seeker' || req.user.role === 'user')) {
      const seeker = await User.findById(req.user.id);
      const app = await Application.findOne({ job: job._id, applicant: req.user.id });
      jObj.alreadyApplied = Boolean(app);
      jObj.applicationStatus = app ? app.status : null;

      if (seeker) {
        const match = calculateMatch(seeker, job);
        jObj.matchScore = match.total;
        jObj.breakdown = match.breakdown;
        jObj.matchedSkills = match.matchedSkills;
        jObj.missingSkills = match.missingSkills;
        jObj.improvementSuggestions = match.improvementSuggestions;
      }
    }

    res.json(jObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- COMPANY ENDPOINTS ---

// POST /api/company/jobs
exports.createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      vacancies,
      salaryRange,
      deadline,
      requiredSkills,
      preferredSkills,
      languagesKnown,
      minProjects,
      projectsRequired,
      githubRequired,
      linkedinRequired,
      minExperience,
      minCgpa,
      degreeRequired,
    } = req.body;

    if (!title || !description || !location) {
      return res.status(400).json({ message: 'Job title, description, and location are required' });
    }

    const job = new Job({
      company: req.company._id,
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      vacancies: Number(vacancies) || 1,
      salaryRange: salaryRange || undefined,
      deadline: deadline ? new Date(deadline) : undefined,
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills.map(s => s.trim().toLowerCase()).filter(Boolean) : [],
      preferredSkills: Array.isArray(preferredSkills) ? preferredSkills.map(s => s.trim().toLowerCase()).filter(Boolean) : [],
      languagesKnown: languagesKnown || { spoken: [], programming: [] },
      minProjects: Number(minProjects) || 0,
      projectsRequired: Boolean(projectsRequired),
      githubRequired: Boolean(githubRequired),
      linkedinRequired: Boolean(linkedinRequired),
      minExperience: Number(minExperience) || 0,
      minCgpa: Number(minCgpa) || 0,
      degreeRequired: degreeRequired ? degreeRequired.trim() : undefined,
    });

    await job.save();
    res.status(201).json({ message: 'Job vacancy published successfully', job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/company/jobs
exports.getCompanyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ company: req.company._id }).sort({ createdAt: -1 });

    const jobsWithCounts = await Promise.all(
      jobs.map(async job => {
        const applicantCount = await Application.countDocuments({ job: job._id });
        const shortlistedCount = await Application.countDocuments({ job: job._id, status: { $in: ['shortlisted', 'interview', 'hired'] } });
        return {
          ...job.toObject(),
          applicantCount,
          shortlistedCount,
        };
      })
    );

    res.json(jobsWithCounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/company/jobs/:id
exports.getCompanyJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (job.company.toString() !== req.company._id.toString()) {
      return res.status(403).json({ message: 'Access forbidden: you do not own this job posting' });
    }

    const applicantCount = await Application.countDocuments({ job: job._id });
    res.json({ ...job.toObject(), applicantCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/company/jobs/:id
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (job.company.toString() !== req.company._id.toString()) {
      return res.status(403).json({ message: 'Access forbidden: you do not own this job posting' });
    }

    const updatable = [
      'title', 'description', 'location', 'vacancies', 'salaryRange', 'deadline',
      'status', 'requiredSkills', 'preferredSkills', 'languagesKnown', 'minProjects',
      'projectsRequired', 'githubRequired', 'linkedinRequired', 'minExperience',
      'minCgpa', 'degreeRequired',
    ];

    updatable.forEach(k => {
      if (req.body[k] !== undefined) job[k] = req.body[k];
    });

    await job.save();
    res.json({ message: 'Job updated successfully', job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/company/jobs/:id/status
exports.toggleJobStatus = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (job.company.toString() !== req.company._id.toString()) {
      return res.status(403).json({ message: 'Access forbidden: you do not own this job posting' });
    }

    const targetStatus = req.body.status || (job.status === 'open' ? 'closed' : 'open');
    job.status = targetStatus;
    await job.save();

    res.json({ message: `Job status updated to ${targetStatus}`, job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/company/jobs/:id
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (job.company.toString() !== req.company._id.toString()) {
      return res.status(403).json({ message: 'Access forbidden: you do not own this job posting' });
    }

    // Cascade delete applications for this job
    await Application.deleteMany({ job: job._id });
    await Job.findByIdAndDelete(job._id);

    res.json({ message: `Job "${job.title}" and all associated applications removed.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
