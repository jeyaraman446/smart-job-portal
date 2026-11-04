// server/controllers/profileController.js
const User = require('../models/User');
const { extractSkillsFromText, normalizeSkill } = require('../utils/matcher');
const { parsePdfBuffer } = require('../utils/resumeParser');

function isValidUrl(str) {
  if (!str) return true;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// GET /api/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/profile
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const {
      name,
      phone,
      github,
      linkedin,
      skills,
      interests,
      languages,
      degree,
      cgpa,
      education,
    } = req.body;

    // Validate URLs
    if (github && !isValidUrl(github)) {
      return res.status(400).json({ message: 'Invalid GitHub URL format. Must start with http:// or https://' });
    }
    if (linkedin && !isValidUrl(linkedin)) {
      return res.status(400).json({ message: 'Invalid LinkedIn URL format. Must start with http:// or https://' });
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone ? phone.trim() : undefined;
    if (github !== undefined) user.github = github.trim();
    if (linkedin !== undefined) user.linkedin = linkedin.trim();

    if (Array.isArray(skills)) {
      // Deduplicate skills case-insensitively
      const set = new Set();
      skills.forEach(s => {
        if (s && typeof s === 'string') set.add(normalizeSkill(s));
      });
      user.skills = Array.from(set);
    }

    if (Array.isArray(interests)) {
      user.interests = Array.from(new Set(interests.map(i => i.trim().toLowerCase()).filter(Boolean)));
    }

    if (languages) {
      user.languages = {
        spoken: Array.from(new Set((languages.spoken || []).map(s => s.trim().toLowerCase()).filter(Boolean))),
        programming: Array.from(new Set((languages.programming || []).map(p => normalizeSkill(p)).filter(Boolean))),
      };
    }

    if (degree) user.degree = { ...user.degree, ...degree };
    if (cgpa !== undefined) user.cgpa = Number(cgpa);
    if (Array.isArray(education)) user.education = education;

    await user.save();
    const updated = await User.findById(user._id).select('-password');
    res.json({ message: 'Profile updated successfully', user: updated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Phone number already registered with another account' });
    }
    res.status(500).json({ message: err.message });
  }
};

// --- SKILLS SUB-CRUD ---
exports.addSkill = async (req, res) => {
  try {
    const { skill } = req.body;
    if (!skill || !skill.trim()) return res.status(400).json({ message: 'Skill name is required' });

    const normalized = normalizeSkill(skill);
    const user = await User.findById(req.user.id);

    if (user.skills.map(s => normalizeSkill(s)).includes(normalized)) {
      return res.status(409).json({ message: `Skill "${skill}" is already added to your profile (duplicate prevention)` });
    }

    user.skills.push(normalized);
    await user.save();
    res.status(201).json({ message: 'Skill added', skills: user.skills });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteSkill = async (req, res) => {
  try {
    const targetSkill = normalizeSkill(decodeURIComponent(req.params.skill));
    const user = await User.findById(req.user.id);
    user.skills = user.skills.filter(s => normalizeSkill(s) !== targetSkill);
    await user.save();
    res.json({ message: 'Skill removed', skills: user.skills });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- PROJECTS SUB-CRUD ---
exports.addProject = async (req, res) => {
  try {
    const { title, description, techStack, link } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: 'Project title is required' });

    if (link && !isValidUrl(link)) {
      return res.status(400).json({ message: 'Invalid project link URL' });
    }

    const user = await User.findById(req.user.id);
    const cleanTitle = title.trim().toLowerCase();

    // Duplicate check
    const isDup = user.projects.some(p => p.title.trim().toLowerCase() === cleanTitle);
    if (isDup) {
      return res.status(409).json({ message: `A project titled "${title}" already exists on your profile` });
    }

    user.projects.push({
      title: title.trim(),
      description: description ? description.trim() : '',
      techStack: Array.isArray(techStack) ? techStack.map(normalizeSkill).filter(Boolean) : [],
      link: link ? link.trim() : '',
    });

    await user.save();
    res.status(201).json({ message: 'Project added', projects: user.projects });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const proj = user.projects.id(req.params.id);
    if (!proj) return res.status(404).json({ message: 'Project not found' });

    const { title, description, techStack, link } = req.body;
    if (link && !isValidUrl(link)) return res.status(400).json({ message: 'Invalid link URL' });

    if (title) proj.title = title.trim();
    if (description !== undefined) proj.description = description.trim();
    if (Array.isArray(techStack)) proj.techStack = techStack.map(normalizeSkill);
    if (link !== undefined) proj.link = link.trim();

    await user.save();
    res.json({ message: 'Project updated', projects: user.projects });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const proj = user.projects.id(req.params.id);
    if (!proj) return res.status(404).json({ message: 'Project not found' });

    user.projects.pull(req.params.id);
    await user.save();
    res.json({ message: 'Project deleted', projects: user.projects });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- HACKATHONS SUB-CRUD ---
exports.addHackathon = async (req, res) => {
  try {
    const { name, year, status, position, techUsed } = req.body;
    if (!name || !name.trim() || !year) {
      return res.status(400).json({ message: 'Hackathon name and year are required' });
    }

    const user = await User.findById(req.user.id);
    const cleanName = name.trim().toLowerCase();
    const cleanYear = Number(year);

    const isDup = user.hackathons.some(h =>
      h.name.trim().toLowerCase() === cleanName && h.year === cleanYear
    );
    if (isDup) {
      return res.status(409).json({ message: `Hackathon "${name}" (${year}) already listed on your profile` });
    }

    user.hackathons.push({
      name: name.trim(),
      year: cleanYear,
      status: status === 'won' ? 'won' : 'participated',
      position: position ? position.trim() : '',
      techUsed: Array.isArray(techUsed) ? techUsed.map(normalizeSkill).filter(Boolean) : [],
    });

    await user.save();
    res.status(201).json({ message: 'Hackathon added', hackathons: user.hackathons });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateHackathon = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const item = user.hackathons.id(req.params.id);
    if (!item) return res.status(404).json({ message: 'Hackathon entry not found' });

    const { name, year, status, position, techUsed } = req.body;
    if (name) item.name = name.trim();
    if (year) item.year = Number(year);
    if (status) item.status = status;
    if (position !== undefined) item.position = position.trim();
    if (Array.isArray(techUsed)) item.techUsed = techUsed.map(normalizeSkill);

    await user.save();
    res.json({ message: 'Hackathon updated', hackathons: user.hackathons });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteHackathon = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const item = user.hackathons.id(req.params.id);
    if (!item) return res.status(404).json({ message: 'Hackathon entry not found' });

    user.hackathons.pull(req.params.id);
    await user.save();
    res.json({ message: 'Hackathon removed', hackathons: user.hackathons });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- EXPERIENCE SUB-CRUD ---
exports.addExperience = async (req, res) => {
  try {
    const { company, role, years, months, description } = req.body;
    if (!company || !role) {
      return res.status(400).json({ message: 'Company and role are required' });
    }

    const user = await User.findById(req.user.id);
    user.experience.push({
      company: company.trim(),
      role: role.trim(),
      years: Number(years) || 0,
      months: Number(months) || 0,
      description: description ? description.trim() : '',
    });

    await user.save();
    res.status(201).json({ message: 'Experience added', experience: user.experience, totalExperienceYears: user.totalExperienceYears });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateExperience = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const item = user.experience.id(req.params.id);
    if (!item) return res.status(404).json({ message: 'Experience entry not found' });

    const { company, role, years, months, description } = req.body;
    if (company) item.company = company.trim();
    if (role) item.role = role.trim();
    if (years !== undefined) item.years = Number(years);
    if (months !== undefined) item.months = Number(months);
    if (description !== undefined) item.description = description.trim();

    await user.save();
    res.json({ message: 'Experience updated', experience: user.experience, totalExperienceYears: user.totalExperienceYears });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteExperience = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const item = user.experience.id(req.params.id);
    if (!item) return res.status(404).json({ message: 'Experience entry not found' });

    user.experience.pull(req.params.id);
    await user.save();
    res.json({ message: 'Experience removed', experience: user.experience, totalExperienceYears: user.totalExperienceYears });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- INTERNSHIPS SUB-CRUD ---
exports.addInternship = async (req, res) => {
  try {
    const { company, role, duration, durationMonths, description } = req.body;
    if (!company || !role) {
      return res.status(400).json({ message: 'Company and role are required' });
    }

    const user = await User.findById(req.user.id);
    user.internships.push({
      company: company.trim(),
      role: role.trim(),
      duration: duration ? duration.trim() : `${durationMonths || 3} months`,
      durationMonths: Number(durationMonths) || 3,
      description: description ? description.trim() : '',
    });

    await user.save();
    res.status(201).json({ message: 'Internship added', internships: user.internships });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateInternship = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const item = user.internships.id(req.params.id);
    if (!item) return res.status(404).json({ message: 'Internship not found' });

    const { company, role, duration, durationMonths, description } = req.body;
    if (company) item.company = company.trim();
    if (role) item.role = role.trim();
    if (duration !== undefined) item.duration = duration.trim();
    if (durationMonths !== undefined) item.durationMonths = Number(durationMonths);
    if (description !== undefined) item.description = description.trim();

    await user.save();
    res.json({ message: 'Internship updated', internships: user.internships });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteInternship = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const item = user.internships.id(req.params.id);
    if (!item) return res.status(404).json({ message: 'Internship not found' });

    user.internships.pull(req.params.id);
    await user.save();
    res.json({ message: 'Internship removed', internships: user.internships });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- EDUCATION SUB-CRUD ---
exports.addEducation = async (req, res) => {
  try {
    const { level, boardOrUniversity, percentageOrCgpa, year } = req.body;
    if (!level) return res.status(400).json({ message: 'Education level (e.g. 10th, 12th, Degree) is required' });

    const user = await User.findById(req.user.id);
    user.education.push({
      level: level.trim(),
      boardOrUniversity: boardOrUniversity ? boardOrUniversity.trim() : '',
      percentageOrCgpa: Number(percentageOrCgpa) || 0,
      year: Number(year) || undefined,
    });

    await user.save();
    res.status(201).json({ message: 'Education added', education: user.education });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteEducation = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const item = user.education.id(req.params.id);
    if (!item) return res.status(404).json({ message: 'Education entry not found' });

    user.education.pull(req.params.id);
    await user.save();
    res.json({ message: 'Education removed', education: user.education });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- RESUME UPLOAD & PARSE ---
exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Please attach a PDF resume file' });

    const user = await User.findById(req.user.id);
    user.resumeUrl = req.file.path;
    user.resumeFileName = req.file.originalname;

    // Parse skills from PDF buffer or file
    let detectedSkills = [];
    try {
      const parsedText = await parsePdfBuffer(req.file.path);
      detectedSkills = extractSkillsFromText(parsedText);
      if (detectedSkills.length > 0) {
        user.skills = Array.from(new Set([...user.skills, ...detectedSkills]));
      }
    } catch (parseErr) {
      console.warn('PDF parse notice:', parseErr.message);
    }

    await user.save();
    res.json({
      message: `Resume uploaded successfully. Extracted ${detectedSkills.length} technical skills.`,
      resumeUrl: user.resumeUrl,
      resumeFileName: user.resumeFileName,
      detectedSkills,
      skills: user.skills,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/profile (Reset profile)
exports.resetProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.skills = [];
    user.hackathons = [];
    user.projects = [];
    user.experience = [];
    user.internships = [];
    user.interests = [];
    user.languages = { spoken: [], programming: [] };
    user.education = [];
    user.github = '';
    user.linkedin = '';
    user.cgpa = 0;
    await user.save();
    res.json({ message: 'Profile reset successfully', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
