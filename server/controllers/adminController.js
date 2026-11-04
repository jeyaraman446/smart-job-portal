const User = require('../models/User');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Application = require('../models/Application');

// GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    const [
      totalSeekers,
      totalHrs,
      totalAdmins,
      totalCompanies,
      pendingCompanies,
      verifiedCompanies,
      rejectedCompanies,
      totalJobs,
      activeJobs,
      totalApplications,
      recentApplications,
    ] = await Promise.all([
      User.countDocuments({ role: 'seeker' }),
      User.countDocuments({ role: 'hr' }),
      User.countDocuments({ role: 'admin' }),
      Company.countDocuments(),
      Company.countDocuments({ verificationStatus: 'pending' }),
      Company.countDocuments({ verificationStatus: 'verified' }),
      Company.countDocuments({ verificationStatus: 'rejected' }),
      Job.countDocuments(),
      Job.countDocuments({ status: 'open' }),
      Application.countDocuments(),
      Application.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('job', 'title company')
        .populate('applicant', 'name email'),
    ]);

    res.json({
      users: {
        seekers: totalSeekers,
        hrs: totalHrs,
        admins: totalAdmins,
        total: totalSeekers + totalHrs + totalAdmins,
      },
      companies: {
        total: totalCompanies,
        pending: pendingCompanies,
        verified: verifiedCompanies,
        rejected: rejectedCompanies,
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
        closed: totalJobs - activeJobs,
      },
      applications: {
        total: totalApplications,
        recent: recentApplications,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/companies
exports.getCompanies = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      filter.verificationStatus = status;
    }
    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    const companies = await Company.find(filter)
      .populate('registeredBy', 'name email phone createdAt')
      .sort({ createdAt: -1 });

    res.json(companies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/companies/:id/verify
exports.verifyCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['verified', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid verification status' });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    company.verificationStatus = status;
    company.verified = status === 'verified';
    company.verifiedAt = status === 'verified' ? new Date() : null;
    if (notes !== undefined) {
      company.verificationNotes = notes.trim();
    }

    await company.save();

    res.json({
      message: `Company "${company.name}" verification status updated to ${status}.`,
      company,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    const filter = {};
    if (role && role !== 'all') {
      filter.role = role;
    }
    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('company', 'name verificationStatus verified')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Cascade cleanups
    if (targetUser.role === 'hr') {
      await Job.deleteMany({ postedBy: targetUser._id });
      await Company.deleteOne({ registeredBy: targetUser._id });
    } else if (targetUser.role === 'seeker') {
      await Application.deleteMany({ applicant: targetUser._id });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: `User "${targetUser.name}" and associated records removed successfully.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/jobs
exports.getJobs = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search && search.trim()) {
      filter.title = { $regex: search.trim(), $options: 'i' };
    }

    const jobs = await Job.find(filter)
      .populate('company', 'name verificationStatus')
      .populate('postedBy', 'name email')
      .sort({ createdAt: -1 });

    // Include applicant counts
    const jobsWithCounts = await Promise.all(
      jobs.map(async job => {
        const applicantCount = await Application.countDocuments({ job: job._id });
        return {
          ...job.toObject(),
          applicantCount,
        };
      })
    );

    res.json(jobsWithCounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/jobs/:id/status
exports.updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Status must be "open" or "closed"' });
    }

    const job = await Job.findByIdAndUpdate(id, { status }, { new: true });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    res.json({ message: `Job status changed to ${status}`, job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/jobs/:id
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    await Application.deleteMany({ job: id });
    await Job.findByIdAndDelete(id);

    res.json({ message: `Job "${job.title}" and its applications deleted successfully.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
