const ALIASES = {
  js: 'javascript',
  'node.js': 'node',
  nodejs: 'node',
  'react.js': 'react',
  reactjs: 'react',
  mongo: 'mongodb',
  ts: 'typescript',
  'express.js': 'express',
  cpp: 'c++',
  'c plus plus': 'c++',
  golang: 'go',
  postgres: 'postgresql',
  psql: 'postgresql',
  k8s: 'kubernetes',
  'amazon web services': 'aws',
  'google cloud': 'gcp',
  'next.js': 'nextjs',
  next: 'nextjs',
  'vue.js': 'vue',
  vuejs: 'vue',
  'angular.js': 'angular',
  angularjs: 'angular',
  'tailwind css': 'tailwind',
  tailwindcss: 'tailwind',
  ml: 'machine learning',
  ai: 'artificial intelligence',
  dsa: 'data structures',
  'data structures and algorithms': 'data structures',
};

const norm = s => {
  if (!s) return '';
  const k = String(s).toLowerCase().trim().replace(/[-_]/g, ' ');
  return ALIASES[k] || k;
};

const toSet = arr => new Set((arr || []).map(norm).filter(Boolean));

const getIntersection = (setA, setB) => {
  const common = [];
  setA.forEach(item => {
    if (setB.has(item)) common.push(item);
  });
  return common;
};

exports.calculateMatch = (user, job) => {
  if (!user || !job) {
    return { total: 0, missingSkills: [], matchedSkills: [], breakdown: {}, tier: 'Low Fit' };
  }

  const required = toSet(job.requiredSkills);
  const preferred = toSet(job.preferredSkills);
  const allJobSkills = new Set([...required, ...preferred]);
  const userSkills = toSet(user.skills);

  // 1. Required Skills (40 points max)
  let skillScore = 40;
  let matchedRequired = [];
  let missingSkills = [];
  if (required.size > 0) {
    matchedRequired = getIntersection(required, userSkills);
    skillScore = (matchedRequired.length / required.size) * 40;
    missingSkills = [...required].filter(s => !userSkills.has(s));
  } else {
    // If no specific required skills, default full required score
    skillScore = 40;
  }

  // 2. Preferred Skills (15 points max)
  let prefScore = 0;
  let matchedPreferred = [];
  if (preferred.size > 0) {
    matchedPreferred = getIntersection(preferred, userSkills);
    prefScore = (matchedPreferred.length / preferred.size) * 15;
  } else {
    // If job didn't specify preferred skills, grant base 10 points
    prefScore = 10;
  }

  // 3. Projects Built (15 points max)
  // Evaluates quantity, tech stack overlap with job requirements, and live links
  const projects = user.projects || [];
  let projectScore = 0;
  if (projects.length > 0) {
    let relevantCount = 0;
    let hasLinksCount = 0;

    projects.forEach(p => {
      const pTech = (p.techStack || []).map(norm);
      const isRelevant = pTech.some(t => allJobSkills.has(t) || userSkills.has(t));
      if (isRelevant) relevantCount++;
      if (p.link && p.link.trim().length > 0) hasLinksCount++;
    });

    // Base score for having completed projects
    const baseProjectScore = Math.min(projects.length / 2, 1) * 7;
    // Relevance score for matching job skills
    const relevanceScore = Math.min(relevantCount / 2, 1) * 6;
    // Bonus for providing GitHub/demo links
    const linkBonus = Math.min(hasLinksCount / 2, 1) * 2;

    projectScore = Math.min(baseProjectScore + relevanceScore + linkBonus, 15);
  }

  // 4. Experience & Internships (15 points max)
  // Split into Full-time Experience (8 pts) and Internships (7 pts)
  const userExpYears = Number(user.experienceYears) || 0;
  const jobMinExp = Number(job.minExperience) || 0;
  let expScore = 0;
  if (jobMinExp === 0) {
    expScore = 8;
  } else if (userExpYears >= jobMinExp) {
    expScore = 8;
  } else {
    expScore = Math.max(0, (userExpYears / jobMinExp) * 8);
  }

  const internships = user.internships || [];
  let internScore = 0;
  if (internships.length > 0) {
    const hasRelevantInternship = internships.some(i =>
      (i.techStack || []).some(t => allJobSkills.has(norm(t)))
    );
    // Base 4 pts for having internships + 3 pts for tech/domain relevance
    internScore = Math.min(internships.length * 3, 4) + (hasRelevantInternship ? 3 : 1);
    internScore = Math.min(internScore, 7);
  } else if (userExpYears >= 2) {
    // If experienced professional without internships listed, convert to experience credit
    internScore = 5;
  }

  // 5. Hackathons (10 points max)
  // Fulfills hackathon evaluation: participation, winning/finalist position, tech used
  const hackathons = user.hackathons || [];
  let hackScore = 0;
  if (hackathons.length > 0) {
    const participationScore = Math.min(hackathons.length * 3, 5);
    const hasPodium = hackathons.some(h => {
      const pos = (h.position || '').toLowerCase();
      return pos.includes('win') || pos.includes('1st') || pos.includes('2nd') ||
             pos.includes('3rd') || pos.includes('top') || pos.includes('final');
    });
    const positionBonus = hasPodium ? 3 : 1;
    const hasRelevantTech = hackathons.some(h =>
      (h.techUsed || []).some(t => allJobSkills.has(norm(t)))
    );
    const techBonus = hasRelevantTech ? 2 : 1;

    hackScore = Math.min(participationScore + positionBonus + techBonus, 10);
  }

  // 6. Competitive Exams & Problem Solving (5 points max)
  // Fulfills competitive exams evaluation: rank, score/percentile
  const exams = user.competitiveExams || [];
  let examScore = 0;
  if (exams.length > 0) {
    const hasTopRank = exams.some(e => e.rank && Number(e.rank) > 0 && Number(e.rank) <= 2000);
    const hasHighScore = exams.some(e => e.score && Number(e.score) >= 80);

    if (hasTopRank || hasHighScore) {
      examScore = 5;
    } else {
      examScore = Math.min(exams.length * 2 + 1, 4);
    }
  }

  const totalRaw = skillScore + prefScore + projectScore + expScore + internScore + hackScore + examScore;
  const total = Math.min(100, Math.round(totalRaw));

  let tier = 'Developing Match';
  if (total >= 85) tier = 'Exceptional Match';
  else if (total >= 70) tier = 'Strong Match';
  else if (total >= 50) tier = 'Moderate Match';

  return {
    total,
    tier,
    missingSkills,
    matchedSkills: matchedRequired,
    matchedPreferredSkills: matchedPreferred,
    breakdown: {
      requiredSkills: Math.round(skillScore),
      preferredSkills: Math.round(prefScore),
      projects: Math.round(projectScore),
      experience: Math.round(expScore),
      internships: Math.round(internScore),
      hackathons: Math.round(hackScore),
      exams: Math.round(examScore),
    },
  };
};
