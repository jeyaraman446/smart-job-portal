// server/tests/matcher.test.js
const {
  WEIGHTS,
  normalizeSkill,
  extractSkillsFromText,
  calculateMatch,
} = require('../utils/matcher');

describe('Matching Engine (matcher.js)', () => {
  describe('Skill Normalization & Aliases', () => {
    test('normalizes aliases correctly', () => {
      expect(normalizeSkill('js')).toBe('javascript');
      expect(normalizeSkill('TS')).toBe('typescript');
      expect(normalizeSkill('reactjs')).toBe('react.js');
      expect(normalizeSkill('node')).toBe('node.js');
      expect(normalizeSkill('nodejs')).toBe('node.js');
      expect(normalizeSkill('py')).toBe('python');
      expect(normalizeSkill('mongo')).toBe('mongodb');
      expect(normalizeSkill('postgres')).toBe('postgresql');
      expect(normalizeSkill('k8s')).toBe('kubernetes');
    });

    test('handles edge case strings and null values', () => {
      expect(normalizeSkill('')).toBe('');
      expect(normalizeSkill(null)).toBe('');
      expect(normalizeSkill(undefined)).toBe('');
    });
  });

  describe('Resume Skill Extraction', () => {
    test('extracts technical skills from raw resume text', () => {
      const sampleResume = `
        Experienced Software Engineer with strong background in JavaScript, TypeScript,
        React.js, Node.js, and MongoDB. Familiar with Docker, AWS, and Git workflows.
      `;
      const extracted = extractSkillsFromText(sampleResume);
      expect(extracted).toContain('javascript');
      expect(extracted).toContain('typescript');
      expect(extracted).toContain('react.js');
      expect(extracted).toContain('node.js');
      expect(extracted).toContain('mongodb');
      expect(extracted).toContain('docker');
      expect(extracted).toContain('aws');
      expect(extracted).toContain('git');
    });
  });

  describe('calculateMatch Score & Breakdown', () => {
    const job = {
      title: 'Senior Full Stack MERN Developer',
      description: 'Building modern cloud microservices with React and Node.',
      requiredSkills: ['react', 'node', 'mongodb', 'typescript'],
      preferredSkills: ['docker', 'aws'],
      minExperience: 3,
      minCgpa: 7.5,
      languagesKnown: {
        programming: ['javascript', 'typescript'],
        spoken: ['english'],
      },
    };

    test('high-fit candidate achieves high match score (>= 85)', () => {
      const highFitCandidate = {
        skills: ['react', 'node', 'mongodb', 'typescript', 'docker', 'aws'],
        experience: [{ company: 'Acme Corp', role: 'Full Stack Dev', years: 3, months: 6 }],
        internships: [{ company: 'Startup', role: 'Intern', durationMonths: 6 }],
        projects: [
          { title: 'Cloud CRM', techStack: ['react', 'node', 'mongodb'], link: 'https://github.com' },
          { title: 'API Gateway', techStack: ['typescript', 'docker'], link: 'https://github.com' },
        ],
        hackathons: [{ name: 'HackTech 2024', status: 'won', position: '1st place' }],
        github: 'https://github.com/alexdev',
        linkedin: 'https://linkedin.com/in/alexdev',
        cgpa: 8.8,
        degree: { degree: 'B.Tech CS', status: 'completed' },
        languages: {
          programming: ['javascript', 'typescript'],
          spoken: ['english'],
        },
        interests: ['cloud architecture', 'frontend', 'microservices'],
      };

      const result = calculateMatch(highFitCandidate, job);

      expect(result.total).toBeGreaterThanOrEqual(85);
      expect(result.missingSkills.length).toBe(0);
      expect(result.matchedSkills.length).toBe(4);
      expect(result.breakdown.requiredSkills).toBe(WEIGHTS.requiredSkills);
      expect(result.breakdown.preferredSkills).toBe(WEIGHTS.preferredSkills);
      expect(result.breakdown.hackathons).toBe(WEIGHTS.hackathons);
      expect(result.breakdown.githubLinkedin).toBe(WEIGHTS.githubLinkedin);
    });

    test('low-fit candidate has low score and clear improvement suggestions', () => {
      const lowFitCandidate = {
        skills: ['python'],
        experience: [],
        internships: [],
        projects: [],
        hackathons: [],
        github: '',
        linkedin: '',
        cgpa: 6.0,
      };

      const result = calculateMatch(lowFitCandidate, job);

      expect(result.total).toBeLessThan(40);
      expect(result.missingSkills.length).toBe(4);
      expect(result.improvementSuggestions.length).toBeGreaterThan(0);

      // Verify suggestions are sorted by pointsPossible descending
      for (let i = 0; i < result.improvementSuggestions.length - 1; i++) {
        expect(result.improvementSuggestions[i].pointsPossible).toBeGreaterThanOrEqual(
          result.improvementSuggestions[i + 1].pointsPossible
        );
      }
    });

    test('fair credit redistribution when requirements are not set on job', () => {
      const minimalJob = {
        title: 'General Intern',
        description: 'Entry level internship',
        requiredSkills: [],
        preferredSkills: [],
        minExperience: 0,
        minCgpa: 0,
      };

      const candidate = {
        skills: ['javascript'],
        degree: { degree: 'B.S.', status: 'completed' },
        github: 'https://github.com/dev',
        linkedin: 'https://linkedin.com/in/dev',
      };

      const result = calculateMatch(candidate, minimalJob);
      expect(result.breakdown.requiredSkills).toBe(WEIGHTS.requiredSkills);
      expect(result.breakdown.preferredSkills).toBe(WEIGHTS.preferredSkills);
      expect(result.breakdown.experience).toBe(WEIGHTS.experience);
      expect(result.breakdown.cgpa).toBe(WEIGHTS.cgpa);
    });
  });
});
