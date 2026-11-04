// server/utils/matcher.js
// Production-grade resume and candidate matching engine

const WEIGHTS = {
  requiredSkills: 35,
  preferredSkills: 10,
  languages: 5,
  projects: 15,
  experience: 10,
  hackathons: 8,
  githubLinkedin: 5,
  cgpa: 5,
  education: 4,
  interests: 3,
};

// Skill aliases for robust normalization
const SKILL_ALIASES = {
  'js': 'javascript',
  'javascript': 'javascript',
  'es6': 'javascript',
  'ts': 'typescript',
  'typescript': 'typescript',
  'node': 'node.js',
  'nodejs': 'node.js',
  'node.js': 'node.js',
  'react': 'react.js',
  'reactjs': 'react.js',
  'react.js': 'react.js',
  'next': 'next.js',
  'nextjs': 'next.js',
  'next.js': 'next.js',
  'vue': 'vue.js',
  'vuejs': 'vue.js',
  'vue.js': 'vue.js',
  'angular': 'angular',
  'angularjs': 'angular',
  'express': 'express.js',
  'expressjs': 'express.js',
  'express.js': 'express.js',
  'mongo': 'mongodb',
  'mongodb': 'mongodb',
  'postgres': 'postgresql',
  'postgresql': 'postgresql',
  'psql': 'postgresql',
  'mysql': 'mysql',
  'redis': 'redis',
  'py': 'python',
  'python': 'python',
  'python3': 'python',
  'golang': 'go',
  'go': 'go',
  'cpp': 'c++',
  'c++': 'c++',
  'csharp': 'c#',
  'c#': 'c#',
  'aws': 'aws',
  'amazon web services': 'aws',
  'gcp': 'google cloud',
  'google cloud': 'google cloud',
  'azure': 'azure',
  'docker': 'docker',
  'k8s': 'kubernetes',
  'kubernetes': 'kubernetes',
  'git': 'git',
  'github': 'git',
  'graphql': 'graphql',
  'rest': 'rest api',
  'rest api': 'rest api',
  'restful': 'rest api',
  'tailwind': 'tailwind css',
  'tailwindcss': 'tailwind css',
  'tailwind css': 'tailwind css',
  'html': 'html',
  'html5': 'html',
  'css': 'css',
  'css3': 'css',
  'redux': 'redux',
  'jest': 'jest',
  'mocha': 'mocha',
  'cypress': 'cypress',
  'ci/cd': 'ci/cd',
  'cicd': 'ci/cd',
  'linux': 'linux',
};

// Dictionary of technical skills to extract from resume PDF text
const KNOWN_SKILLS_DICTIONARY = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
  'react.js', 'next.js', 'vue.js', 'angular', 'node.js', 'express.js', 'django', 'flask', 'fastapi', 'spring boot',
  'mongodb', 'postgresql', 'mysql', 'redis', 'sqlite', 'elasticsearch', 'cassandra', 'dynamodb',
  'docker', 'kubernetes', 'aws', 'google cloud', 'azure', 'git', 'ci/cd', 'terraform', 'linux',
  'graphql', 'rest api', 'microservices', 'html', 'css', 'tailwind css', 'redux', 'jest', 'cypress',
  'machine learning', 'deep learning', 'pandas', 'numpy', 'tensorflow', 'pytorch',
];

function normalizeSkill(s) {
  if (!s || typeof s !== 'string') return '';
  const clean = s.trim().toLowerCase().replace(/[\-_]/g, ' ');
  return SKILL_ALIASES[clean] || clean;
}

function extractSkillsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const lower = text.toLowerCase();
  const found = new Set();

  KNOWN_SKILLS_DICTIONARY.forEach(skill => {
    // Word boundary check or delimiter-separated token check (including period, comma, colon, semicolon, etc.)
    const escaped = skill.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s,;()/'"•\\-_])${escaped}(?:$|[\\s,;()/'"•.:?!\\-_])`, 'i');
    if (regex.test(lower)) {
      found.add(normalizeSkill(skill));
    }
  });

  return Array.from(found);
}

/**
 * Calculates candidate match score out of 100 against a job.
 * @param {Object} candidate - Seeker profile object
 * @param {Object} job - Job document/object with requirements
 * @param {Object} options - { resumeText?: string }
 * @returns {Object} { total, breakdown, matchedSkills, missingSkills, improvementSuggestions }
 */
function calculateMatch(candidate, job, options = {}) {
  const breakdown = {};
  const improvementSuggestions = [];

  // Normalize candidate profile skills
  const profileSkills = Array.isArray(candidate?.skills)
    ? candidate.skills.map(normalizeSkill).filter(Boolean)
    : [];

  // Extract resume skills if text provided
  let resumeSkills = [];
  if (options.resumeText) {
    resumeSkills = extractSkillsFromText(options.resumeText);
  }

  // Combined unique skills
  const allCandidateSkillsSet = new Set([...profileSkills, ...resumeSkills]);
  const allCandidateSkills = Array.from(allCandidateSkillsSet);

  // 1. Required Skills (35 points)
  const jobRequiredSkills = Array.isArray(job?.requiredSkills)
    ? job.requiredSkills.map(normalizeSkill).filter(Boolean)
    : [];

  const matchedSkills = [];
  const missingSkills = [];

  if (jobRequiredSkills.length === 0) {
    breakdown.requiredSkills = WEIGHTS.requiredSkills; // full credit when not specified
  } else {
    jobRequiredSkills.forEach(skill => {
      if (allCandidateSkillsSet.has(skill)) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    });

    const ratio = matchedSkills.length / jobRequiredSkills.length;
    breakdown.requiredSkills = Number((ratio * WEIGHTS.requiredSkills).toFixed(1));

    if (missingSkills.length > 0) {
      const perSkillPts = Number((WEIGHTS.requiredSkills / jobRequiredSkills.length).toFixed(1));
      missingSkills.forEach(skill => {
        improvementSuggestions.push({
          category: 'Required Skills',
          suggestion: `Add or develop verified capability in "${skill}" to satisfy a mandatory role requirement.`,
          pointsPossible: perSkillPts,
        });
      });
    }
  }

  // 2. Preferred Skills (10 points)
  const jobPreferredSkills = Array.isArray(job?.preferredSkills)
    ? job.preferredSkills.map(normalizeSkill).filter(Boolean)
    : [];

  if (jobPreferredSkills.length === 0) {
    breakdown.preferredSkills = WEIGHTS.preferredSkills;
  } else {
    let matchedPreferred = 0;
    const missingPreferred = [];
    jobPreferredSkills.forEach(skill => {
      if (allCandidateSkillsSet.has(skill)) {
        matchedPreferred++;
      } else {
        missingPreferred.push(skill);
      }
    });

    const prefRatio = matchedPreferred / jobPreferredSkills.length;
    breakdown.preferredSkills = Number((prefRatio * WEIGHTS.preferredSkills).toFixed(1));

    if (missingPreferred.length > 0) {
      const perPrefPts = Number((WEIGHTS.preferredSkills / jobPreferredSkills.length).toFixed(1));
      improvementSuggestions.push({
        category: 'Preferred Skills',
        suggestion: `Bonus points available: demonstrate familiarity with preferred tools (${missingPreferred.slice(0, 3).join(', ')}).`,
        pointsPossible: perPrefPts * Math.min(2, missingPreferred.length),
      });
    }
  }

  // 3. Languages (5 points)
  const jobProgLangs = job?.languagesKnown?.programming || [];
  const jobSpokenLangs = job?.languagesKnown?.spoken || [];
  const hasLangReq = jobProgLangs.length > 0 || jobSpokenLangs.length > 0;

  if (!hasLangReq) {
    breakdown.languages = WEIGHTS.languages;
  } else {
    let langPoints = 0;
    const candProg = (candidate?.languages?.programming || []).map(normalizeSkill);
    const candSpoken = (candidate?.languages?.spoken || []).map(s => s.trim().toLowerCase());

    if (jobProgLangs.length > 0) {
      const matchedProg = jobProgLangs.filter(l => candProg.includes(normalizeSkill(l)));
      langPoints += (matchedProg.length / jobProgLangs.length) * 3;
      if (matchedProg.length < jobProgLangs.length) {
        improvementSuggestions.push({
          category: 'Languages',
          suggestion: `Add required programming languages (${jobProgLangs.filter(l => !candProg.includes(normalizeSkill(l))).join(', ')}) to your languages section.`,
          pointsPossible: 3,
        });
      }
    } else {
      langPoints += 3;
    }

    if (jobSpokenLangs.length > 0) {
      const matchedSpoken = jobSpokenLangs.filter(l => candSpoken.includes(l.toLowerCase()));
      langPoints += (matchedSpoken.length / jobSpokenLangs.length) * 2;
    } else {
      langPoints += 2;
    }

    breakdown.languages = Number(langPoints.toFixed(1));
  }

  // 4. Projects (15 points)
  const candidateProjects = Array.isArray(candidate?.projects) ? candidate.projects : [];
  if (candidateProjects.length === 0) {
    breakdown.projects = 0;
    improvementSuggestions.push({
      category: 'Projects',
      suggestion: 'Add at least 1-2 portfolio projects demonstrating hands-on experience with the job tech stack.',
      pointsPossible: WEIGHTS.projects,
    });
  } else {
    // Check relevance: techStack overlaps with job required/preferred skills
    let relevantCount = 0;
    candidateProjects.forEach(proj => {
      const projStack = (proj.techStack || []).map(normalizeSkill);
      const isRelevant = projStack.some(t =>
        jobRequiredSkills.includes(t) || jobPreferredSkills.includes(t) || allCandidateSkillsSet.has(t)
      );
      if (isRelevant || candidateProjects.length >= 2) relevantCount++;
    });

    const projectScore = Math.min(WEIGHTS.projects, Math.max(5, relevantCount * 7.5));
    breakdown.projects = Number(projectScore.toFixed(1));

    if (breakdown.projects < WEIGHTS.projects) {
      improvementSuggestions.push({
        category: 'Projects',
        suggestion: `Showcase another production-ready project featuring ${jobRequiredSkills[0] || 'core technologies'}.`,
        pointsPossible: Number((WEIGHTS.projects - breakdown.projects).toFixed(1)),
      });
    }
  }

  // 5. Experience & Internships (10 points)
  let totalYears = 0;
  if (Array.isArray(candidate?.experience)) {
    candidate.experience.forEach(exp => {
      totalYears += (exp.years || 0) + ((exp.months || 0) / 12);
    });
  }
  if (Array.isArray(candidate?.internships)) {
    candidate.internships.forEach(intern => {
      if (intern.durationMonths) totalYears += intern.durationMonths / 12;
      else totalYears += 0.3; // Default 3.6 months credit per internship
    });
  }
  totalYears = Number(totalYears.toFixed(1));

  const minExp = job?.minExperience || 0;
  if (minExp === 0) {
    breakdown.experience = WEIGHTS.experience;
  } else if (totalYears >= minExp) {
    breakdown.experience = WEIGHTS.experience;
  } else {
    const expRatio = totalYears / minExp;
    breakdown.experience = Number((expRatio * WEIGHTS.experience).toFixed(1));
    const gap = Number((minExp - totalYears).toFixed(1));
    improvementSuggestions.push({
      category: 'Experience',
      suggestion: `Role requires ${minExp} years of experience (your current profile has ~${totalYears} years). Highlight relevant freelance or internship work to close the ${gap} year gap.`,
      pointsPossible: Number((WEIGHTS.experience - breakdown.experience).toFixed(1)),
    });
  }

  // 6. Hackathons (8 points: 5 for participation, +3 bonus for winning)
  const hackathons = Array.isArray(candidate?.hackathons) ? candidate.hackathons : [];
  if (hackathons.length === 0) {
    breakdown.hackathons = 0;
    improvementSuggestions.push({
      category: 'Hackathons',
      suggestion: 'Participating in hackathons demonstrates proactive engineering and problem-solving skills.',
      pointsPossible: WEIGHTS.hackathons,
    });
  } else {
    const hasWon = hackathons.some(h =>
      h.status === 'won' ||
      /winner|1st|first|runner|2nd|3rd|champion/i.test(h.position || '')
    );
    const hackScore = hasWon ? WEIGHTS.hackathons : 5;
    breakdown.hackathons = hackScore;
    if (!hasWon) {
      improvementSuggestions.push({
        category: 'Hackathons',
        suggestion: 'Detail competitive hackathon achievements or contest rankings to earn the remaining 3 points.',
        pointsPossible: 3,
      });
    }
  }

  // 7. GitHub and LinkedIn present (5 points: 2.5 each)
  let linkPts = 0;
  const hasGithub = Boolean(candidate?.github && candidate.github.trim());
  const hasLinkedin = Boolean(candidate?.linkedin && candidate.linkedin.trim());

  if (hasGithub) linkPts += 2.5;
  else {
    improvementSuggestions.push({
      category: 'Profile Links',
      suggestion: 'Add your active GitHub profile URL to showcase open-source code and commits.',
      pointsPossible: 2.5,
    });
  }

  if (hasLinkedin) linkPts += 2.5;
  else {
    improvementSuggestions.push({
      category: 'Profile Links',
      suggestion: 'Add your verified LinkedIn profile URL for recruiter identity validation.',
      pointsPossible: 2.5,
    });
  }
  breakdown.githubLinkedin = linkPts;

  // 8. CGPA meets minimum (5 points)
  const minCgpa = job?.minCgpa || 0;
  const candCgpa = candidate?.cgpa || 0;

  if (minCgpa === 0) {
    breakdown.cgpa = WEIGHTS.cgpa;
  } else if (candCgpa >= minCgpa) {
    breakdown.cgpa = WEIGHTS.cgpa;
  } else {
    const cgpaRatio = candCgpa > 0 ? (candCgpa / minCgpa) : 0;
    breakdown.cgpa = Number((cgpaRatio * WEIGHTS.cgpa).toFixed(1));
    improvementSuggestions.push({
      category: 'Academics',
      suggestion: `This position prefers a minimum CGPA of ${minCgpa} (yours is ${candCgpa}). Complement with strong projects or certifications.`,
      pointsPossible: Number((WEIGHTS.cgpa - breakdown.cgpa).toFixed(1)),
    });
  }

  // 9. Education / Degree Completion (4 points)
  const deg = candidate?.degree;
  if (deg && (deg.status === 'completed' || deg.degree)) {
    breakdown.education = WEIGHTS.education;
  } else if (Array.isArray(candidate?.education) && candidate.education.length > 0) {
    breakdown.education = WEIGHTS.education;
  } else {
    breakdown.education = 1;
    improvementSuggestions.push({
      category: 'Education',
      suggestion: 'Complete your degree and institutional education history details.',
      pointsPossible: 3,
    });
  }

  // 10. Interests Overlap with Job Domain (3 points)
  const interests = (candidate?.interests || []).map(i => i.trim().toLowerCase());
  const jobText = `${job?.title || ''} ${job?.description || ''}`.toLowerCase();

  const domainTokens = ['frontend', 'backend', 'fullstack', 'full stack', 'cloud', 'ai', 'mobile', 'devops', 'web', 'data', 'security', 'software'];
  const relevantInterests = interests.filter(i =>
    jobText.includes(i) || domainTokens.some(d => i.includes(d) && jobText.includes(d))
  );

  if (interests.length === 0) {
    breakdown.interests = 1;
    improvementSuggestions.push({
      category: 'Interests',
      suggestion: 'List domain interests (e.g. distributed systems, cloud computing, frontend architecture) that align with this role.',
      pointsPossible: 2,
    });
  } else if (relevantInterests.length > 0 || jobRequiredSkills.some(s => interests.includes(s))) {
    breakdown.interests = WEIGHTS.interests;
  } else {
    breakdown.interests = 2;
  }

  // Total score calculation (clamped 0 to 100)
  let total = Object.values(breakdown).reduce((sum, val) => sum + (Number(val) || 0), 0);
  total = Math.min(100, Math.max(0, Math.round(total)));

  // Order suggestions by pointsPossible descending
  improvementSuggestions.sort((a, b) => (b.pointsPossible || 0) - (a.pointsPossible || 0));

  return {
    total,
    breakdown,
    matchedSkills,
    missingSkills,
    improvementSuggestions,
  };
}

module.exports = {
  WEIGHTS,
  SKILL_ALIASES,
  normalizeSkill,
  extractSkillsFromText,
  calculateMatch,
};
