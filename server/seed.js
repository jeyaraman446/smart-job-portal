// server/seed.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const fs = require('fs');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('./models/User');
const Company = require('./models/Company');
const Job = require('./models/Job');
const Application = require('./models/Application');
const Notification = require('./models/Notification');
const { calculateMatch } = require('./utils/matcher');
const { hashFile } = require('./utils/resumeParser');

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/job_portal';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB for seeding...');

  // Ensure upload directory and sample PDF
  const resumesDir = path.resolve(__dirname, 'uploads/resumes');
  if (!fs.existsSync(resumesDir)) {
    fs.mkdirSync(resumesDir, { recursive: true });
  }

  const samplePdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 75 >> stream
BT /F1 12 Tf 72 712 Td (Smart Job Portal Candidate Resume - Verified Portfolio Document) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000210 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
336
%%EOF`;

  const sampleResumePath = path.join(resumesDir, 'sample-resume.pdf');
  if (!fs.existsSync(sampleResumePath)) {
    fs.writeFileSync(sampleResumePath, samplePdfContent);
  }
  const sampleHash = hashFile(sampleResumePath);

  // Clear existing collections & stale indexes
  try {
    await mongoose.connection.db.dropDatabase();
    console.log('Database reset: dropped old indexes and collections.');
  } catch (dropErr) {
    await Promise.all([
      Application.deleteMany({}),
      Job.deleteMany({}),
      Company.deleteMany({}),
      User.deleteMany({}),
      Notification.deleteMany({}),
    ]);
  }

  const hashedPassword = await bcrypt.hash('Password123', 10);

  // 1. Create 2 Companies
  const company1 = await Company.create({
    name: 'TechCorp Cloud Systems',
    location: 'San Francisco, CA',
    mail_id: 'recruiting@techcorp.io',
    password: hashedPassword,
    website: 'https://techcorp.io',
    industry: 'Cloud Infrastructure & Enterprise SaaS',
    size: '250-500 employees',
    description: 'TechCorp builds scalable cloud infrastructure and developer-first platform tools.',
    role: 'company',
  });

  const company2 = await Company.create({
    name: 'FinScale Payments',
    location: 'New York, NY',
    mail_id: 'careers@finscale.com',
    password: hashedPassword,
    website: 'https://finscale.com',
    industry: 'Financial Technology & Global Payments',
    size: '100-250 employees',
    description: 'FinScale engineers high-throughput transaction routing and fraud detection APIs.',
    role: 'company',
  });
  console.log('Created 2 Companies.');

  // 2. Create 5 Job Openings
  const job1 = await Job.create({
    company: company1._id,
    title: 'Senior Full Stack MERN Developer',
    description: 'Lead the architecture of our cloud portal, engineer resilient microservices with Node.js and MongoDB, and craft high-performance React UI components.',
    location: 'San Francisco, CA (Hybrid / Remote)',
    vacancies: 3,
    salaryRange: { min: 130000, max: 175000 },
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'open',
    requiredSkills: ['react', 'node', 'mongodb', 'typescript', 'express'],
    preferredSkills: ['docker', 'aws', 'redis'],
    languagesKnown: { programming: ['javascript', 'typescript'], spoken: ['english'] },
    minExperience: 2,
    minCgpa: 7.0,
    githubRequired: true,
    projectsRequired: true,
  });

  const job2 = await Job.create({
    company: company1._id,
    title: 'DevOps & Cloud Infrastructure Engineer',
    description: 'Design CI/CD pipelines, manage Kubernetes clusters, automate multi-region AWS cloud deployments, and optimize system reliability.',
    location: 'Remote',
    vacancies: 2,
    salaryRange: { min: 140000, max: 185000 },
    deadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
    status: 'open',
    requiredSkills: ['aws', 'docker', 'kubernetes', 'linux', 'ci/cd'],
    preferredSkills: ['terraform', 'python', 'go'],
    languagesKnown: { programming: ['python', 'go'], spoken: ['english'] },
    minExperience: 3,
    githubRequired: true,
  });

  const job3 = await Job.create({
    company: company2._id,
    title: 'Backend Node.js & Microservices Engineer',
    description: 'Build low-latency payment processing APIs, distributed message queues, and transactional data pipelines.',
    location: 'New York, NY',
    vacancies: 2,
    salaryRange: { min: 125000, max: 165000 },
    deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    status: 'open',
    requiredSkills: ['node', 'express', 'postgresql', 'redis', 'rest api'],
    preferredSkills: ['docker', 'typescript', 'microservices'],
    minExperience: 2,
    minCgpa: 6.5,
    projectsRequired: true,
  });

  const job4 = await Job.create({
    company: company2._id,
    title: 'Frontend React & UI Engineer',
    description: 'Deliver pixel-perfect, accessible, and responsive dashboards using modern React, Tailwind CSS, TypeScript, and state management.',
    location: 'New York, NY (Hybrid)',
    vacancies: 2,
    salaryRange: { min: 105000, max: 145000 },
    deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
    status: 'open',
    requiredSkills: ['react', 'typescript', 'tailwind', 'html', 'css'],
    preferredSkills: ['redux', 'nextjs', 'jest'],
    languagesKnown: { programming: ['javascript', 'typescript'], spoken: ['english'] },
    minExperience: 1,
    githubRequired: true,
    linkedinRequired: true,
  });

  const job5 = await Job.create({
    company: company1._id,
    title: 'Junior Software Engineer (Full Stack)',
    description: 'Collaborate with senior mentors to build web modules, write unit tests, and contribute to production cloud services.',
    location: 'Austin, TX / Remote',
    vacancies: 4,
    salaryRange: { min: 70000, max: 92000 },
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    status: 'open',
    requiredSkills: ['javascript', 'node', 'react', 'git'],
    preferredSkills: ['mongodb', 'html', 'css'],
    minExperience: 0,
    minCgpa: 6.0,
  });
  console.log('Created 5 Job Openings.');

  // 3. Create 10 Job Seekers with varied profiles
  const seekers = await User.create([
    {
      name: 'Arun Kumar',
      mail_id: 'arun@example.com',
      password: hashedPassword,
      phone: '+1 555-010-0001',
      skills: ['react', 'node', 'mongodb', 'typescript', 'express', 'docker', 'aws', 'redis'],
      github: 'https://github.com/arunkumar-dev',
      linkedin: 'https://linkedin.com/in/arunkumar-dev',
      cgpa: 8.9,
      degree: { degree: 'B.Tech Computer Science', institute: 'NIT', status: 'completed', yearOfCompletion: 2022 },
      experience: [{ company: 'CloudWorks', role: 'Full Stack Developer', years: 2, months: 6, description: 'Engineered MERN dashboards.' }],
      internships: [{ company: 'FinTech Labs', role: 'Software Intern', durationMonths: 6, description: 'Built Node REST APIs.' }],
      projects: [
        { title: 'SaaS Analytics Suite', description: 'React and Node metrics portal', techStack: ['react', 'node', 'mongodb', 'docker'], link: 'https://github.com/arun/saas' },
        { title: 'Payment Webhook Service', description: 'Redis cached transaction router', techStack: ['typescript', 'node', 'redis'], link: 'https://github.com/arun/pay' },
      ],
      hackathons: [{ name: 'National Hackfest 2024', status: 'won', position: '1st place', year: 2024, techUsed: ['react', 'node', 'mongodb'] }],
      languages: { programming: ['javascript', 'typescript', 'python'], spoken: ['english'] },
      interests: ['cloud architecture', 'distributed systems', 'full stack web'],
    },
    {
      name: 'Priya Sharma',
      mail_id: 'priya@example.com',
      password: hashedPassword,
      phone: '+1 555-010-0002',
      skills: ['react', 'typescript', 'tailwind', 'html', 'css', 'redux', 'nextjs', 'jest'],
      github: 'https://github.com/priyasharma-ui',
      linkedin: 'https://linkedin.com/in/priyasharma-ui',
      cgpa: 9.1,
      degree: { degree: 'B.E. Information Technology', institute: 'Anna University', status: 'completed', yearOfCompletion: 2023 },
      experience: [{ company: 'DesignCraft Interactive', role: 'Frontend Developer', years: 1, months: 8, description: 'Designed React component libraries.' }],
      internships: [{ company: 'WebStudio', role: 'UI Intern', durationMonths: 4, description: 'Responsive layouts.' }],
      projects: [
        { title: 'Infinite Whiteboard App', description: 'Real-time React canvas', techStack: ['react', 'typescript', 'tailwind'], link: 'https://github.com/priya/canvas' },
      ],
      hackathons: [{ name: 'UI/UX Global Sprint', status: 'won', position: 'Best UI Award', year: 2024, techUsed: ['react', 'tailwind'] }],
      languages: { programming: ['javascript', 'typescript'], spoken: ['english', 'hindi'] },
      interests: ['design systems', 'web performance', 'frontend'],
    },
    {
      name: 'Vikram Patel',
      mail_id: 'vikram@example.com',
      password: hashedPassword,
      phone: '+1 555-010-0003',
      skills: ['javascript', 'node', 'react', 'git', 'mongodb', 'html', 'css'],
      github: 'https://github.com/vikrampatel-cs',
      linkedin: 'https://linkedin.com/in/vikrampatel-cs',
      cgpa: 7.8,
      degree: { degree: 'B.S. Software Engineering', institute: 'UT Austin', status: 'completed', yearOfCompletion: 2024 },
      experience: [],
      internships: [{ company: 'StartupLaunch', role: 'Junior Intern', durationMonths: 4, description: 'Assisted in REST API unit tests.' }],
      projects: [
        { title: 'Algorithm Visualizer', description: 'Interactive sorting demo', techStack: ['javascript', 'react', 'html'], link: 'https://github.com/vikram/algo' },
      ],
      hackathons: [{ name: 'University CodeDay', status: 'participated', year: 2024, techUsed: ['javascript', 'node'] }],
      languages: { programming: ['javascript', 'python'], spoken: ['english'] },
      interests: ['algorithms', 'web development'],
    },
    {
      name: 'Sarah Jenkins',
      mail_id: 'sarah.j@example.com',
      password: hashedPassword,
      phone: '+1 555-010-0004',
      skills: ['aws', 'docker', 'kubernetes', 'linux', 'ci/cd', 'terraform', 'python', 'git'],
      github: 'https://github.com/sarahjenkins-cloud',
      linkedin: 'https://linkedin.com/in/sarahjenkins-cloud',
      cgpa: 8.4,
      degree: { degree: 'B.Tech IT', institute: 'Cal Poly', status: 'completed', yearOfCompletion: 2021 },
      experience: [{ company: 'CloudOps Agency', role: 'DevOps Engineer', years: 3, months: 2, description: 'Terraform AWS automations.' }],
      internships: [{ company: 'DataHost', role: 'Linux Sysadmin Intern', durationMonths: 6, description: 'Server monitoring.' }],
      projects: [
        { title: 'Multi-Cluster K8s GitOps', description: 'ArgoCD cluster automation', techStack: ['kubernetes', 'docker', 'aws'], link: 'https://github.com/sarah/k8s' },
      ],
      hackathons: [{ name: 'AWS Cloud Hackathon', status: 'won', position: '2nd place', year: 2023, techUsed: ['aws', 'python'] }],
      languages: { programming: ['python', 'bash'], spoken: ['english'] },
      interests: ['cloud security', 'devops', 'kubernetes'],
    },
    {
      name: 'Rohan Mehta',
      mail_id: 'rohan.m@example.com',
      password: hashedPassword,
      phone: '+1 555-010-0005',
      skills: ['node', 'express', 'postgresql', 'redis', 'rest api', 'docker', 'typescript', 'microservices'],
      github: 'https://github.com/rohanmehta-backend',
      linkedin: 'https://linkedin.com/in/rohanmehta-backend',
      cgpa: 8.2,
      degree: { degree: 'B.Tech CS', institute: 'BITS Pilani', status: 'completed', yearOfCompletion: 2022 },
      experience: [{ company: 'PayPulse', role: 'Backend Developer', years: 2, months: 4, description: 'Transaction settlement pipelines.' }],
      internships: [{ company: 'FinCore', role: 'Backend Intern', durationMonths: 5, description: 'Postgres query optimizations.' }],
      projects: [
        { title: 'Distributed Event Bus', description: 'Kafka and Redis queue wrapper', techStack: ['node', 'redis', 'postgresql'], link: 'https://github.com/rohan/eventbus' },
      ],
      hackathons: [{ name: 'FinTech Disrupt Hackathon', status: 'won', position: '1st place', year: 2024, techUsed: ['node', 'postgresql'] }],
      languages: { programming: ['javascript', 'typescript', 'sql'], spoken: ['english'] },
      interests: ['distributed systems', 'backend', 'high concurrency'],
    },
    {
      name: 'Neha Gupta',
      mail_id: 'neha.g@example.com',
      password: hashedPassword,
      phone: '+1 555-010-0006',
      skills: ['react', 'node', 'python', 'mongodb', 'rest api', 'git', 'html', 'css'],
      github: 'https://github.com/nehagupta-dev',
      linkedin: 'https://linkedin.com/in/nehagupta-dev',
      cgpa: 8.0,
      degree: { degree: 'B.E. Computer Science', institute: 'Delhi University', status: 'completed', yearOfCompletion: 2023 },
      experience: [{ company: 'InfoSys Labs', role: 'Associate Developer', years: 1, months: 2, description: 'Built client internal web tools.' }],
      internships: [],
      projects: [
        { title: 'DocuSigner Web Service', description: 'PDF signature verification', techStack: ['react', 'node', 'mongodb'], link: 'https://github.com/neha/signer' },
      ],
      hackathons: [],
      languages: { programming: ['javascript', 'python'], spoken: ['english', 'hindi'] },
      interests: ['web applications', 'fullstack'],
    },
    {
      name: 'David Miller',
      mail_id: 'david.m@example.com',
      password: hashedPassword,
      phone: '+1 555-010-0007',
      skills: ['python', 'postgresql', 'rest api', 'docker', 'git', 'linux'],
      github: 'https://github.com/davidmiller-py',
      linkedin: 'https://linkedin.com/in/davidmiller-py',
      cgpa: 7.5,
      degree: { degree: 'B.S. Data Science', institute: 'UW Seattle', status: 'completed', yearOfCompletion: 2023 },
      experience: [{ company: 'DataStream Corp', role: 'Junior Python Engineer', years: 1, months: 0, description: 'FastAPI microservices.' }],
      internships: [{ company: 'BioTech Analytics', role: 'Data Intern', durationMonths: 3, description: 'SQL reporting.' }],
      projects: [
        { title: 'Async Data Scraper', description: 'High throughput pipeline', techStack: ['python', 'postgresql'], link: 'https://github.com/david/scraper' },
      ],
      hackathons: [{ name: 'Open Data Hack', status: 'participated', year: 2023, techUsed: ['python'] }],
      languages: { programming: ['python', 'sql'], spoken: ['english'] },
      interests: ['data engineering', 'backend'],
    },
    {
      name: 'Ananya Rao',
      mail_id: 'ananya.r@example.com',
      password: hashedPassword,
      phone: '+1 555-010-0008',
      skills: ['react', 'html', 'css', 'javascript', 'tailwind', 'git', 'figma'],
      github: 'https://github.com/ananyarao-ui',
      linkedin: 'https://linkedin.com/in/ananyarao-ui',
      cgpa: 8.5,
      degree: { degree: 'B.Des & CS Minor', institute: 'NID', status: 'completed', yearOfCompletion: 2023 },
      experience: [{ company: 'Studio Craft', role: 'UI Engineer', years: 1, months: 1, description: 'Design implementation.' }],
      internships: [],
      projects: [
        { title: 'E-Commerce Component Catalog', description: 'Accessible UI library', techStack: ['react', 'tailwind'], link: 'https://github.com/ananya/ui' },
      ],
      hackathons: [{ name: 'Women in Tech Hackathon', status: 'won', position: 'Runner Up', year: 2024, techUsed: ['react', 'figma'] }],
      languages: { programming: ['javascript'], spoken: ['english'] },
      interests: ['ui/ux', 'frontend', 'accessibility'],
    },
    {
      name: 'Karthik Subramanian',
      mail_id: 'karthik.s@example.com',
      password: hashedPassword,
      phone: '+1 555-010-0009',
      skills: ['javascript', 'react', 'git', 'html', 'css'],
      github: 'https://github.com/karthik-sub',
      linkedin: '',
      cgpa: 7.2,
      degree: { degree: 'B.Tech IT', institute: 'SRM Institute', status: 'pursuing', yearOfCompletion: 2025 },
      experience: [],
      internships: [{ company: 'Campus Dev Club', role: 'Web Lead', durationMonths: 3, description: 'Maintained college portal.' }],
      projects: [
        { title: 'Event Ticketing App', description: 'Simple campus registration', techStack: ['javascript', 'react'], link: 'https://github.com/karthik/tickets' },
      ],
      hackathons: [{ name: 'SRM HackFest', status: 'participated', year: 2024, techUsed: ['react'] }],
      languages: { programming: ['javascript'], spoken: ['english', 'tamil'] },
      interests: ['web development'],
    },
    {
      name: 'Elena Rostova',
      mail_id: 'elena.r@example.com',
      password: hashedPassword,
      phone: '+1 555-010-0010',
      skills: ['react', 'node', 'mongodb', 'typescript', 'docker', 'aws', 'kubernetes', 'postgresql', 'ci/cd', 'redis'],
      github: 'https://github.com/elenarostova-tech',
      linkedin: 'https://linkedin.com/in/elenarostova-tech',
      cgpa: 9.4,
      degree: { degree: 'M.S. Computer Engineering', institute: 'Georgia Tech', status: 'completed', yearOfCompletion: 2018 },
      experience: [
        { company: 'Global Cloud Systems', role: 'Staff Software Engineer', years: 4, months: 0, description: 'Led cloud migration of enterprise systems.' },
        { company: 'RapidTech', role: 'Senior Engineer', years: 2, months: 6, description: 'Engineered high availability microservices.' },
      ],
      internships: [],
      projects: [
        { title: 'Distributed Log Aggregator', description: 'Processes 50k logs/sec', techStack: ['go', 'docker', 'aws'], link: 'https://github.com/elena/logs' },
      ],
      hackathons: [{ name: 'TechCrunch Disrupt', status: 'won', position: 'Winner (Grand Prize)', year: 2022, techUsed: ['aws', 'node', 'react'] }],
      languages: { programming: ['typescript', 'javascript', 'go', 'python'], spoken: ['english', 'russian'] },
      interests: ['distributed architecture', 'cloud computing', 'system design'],
    },
  ]);
  console.log('Created 10 Seekers with varied profiles.');

  // 4. Seed Applications with calculated Match Scores
  // Arun applies to Job 1 (Senior MERN) -> High fit
  const matchArunJob1 = calculateMatch(seekers[0], job1);
  await Application.create({
    job: job1._id,
    applicant: seekers[0]._id,
    company: company1._id,
    profileSnapshot: seekers[0].toObject(),
    resumeUrl: 'uploads/resumes/sample-resume.pdf',
    resumeFileName: 'Arun_Kumar_MERN_Resume.pdf',
    resumeHash: sampleHash + '_arun',
    fingerprint: {
      email: seekers[0].mail_id,
      phone: seekers[0].phone,
      github: seekers[0].github,
      linkedin: seekers[0].linkedin,
    },
    matchScore: matchArunJob1.total,
    breakdown: matchArunJob1.breakdown,
    matchedSkills: matchArunJob1.matchedSkills,
    missingSkills: matchArunJob1.missingSkills,
    improvementSuggestions: matchArunJob1.improvementSuggestions,
    status: 'shortlisted',
    interviewDetails: {
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      time: '10:30 AM PST',
      mode: 'Google Meet',
      message: 'Excited about your MERN architecture projects! Looking forward to discussing the role.',
    },
  });

  // Priya applies to Job 4 (Frontend React) -> High fit
  const matchPriyaJob4 = calculateMatch(seekers[1], job4);
  await Application.create({
    job: job4._id,
    applicant: seekers[1]._id,
    company: company2._id,
    profileSnapshot: seekers[1].toObject(),
    resumeUrl: 'uploads/resumes/sample-resume.pdf',
    resumeFileName: 'Priya_Sharma_Frontend_Resume.pdf',
    resumeHash: sampleHash + '_priya',
    fingerprint: {
      email: seekers[1].mail_id,
      phone: seekers[1].phone,
      github: seekers[1].github,
      linkedin: seekers[1].linkedin,
    },
    matchScore: matchPriyaJob4.total,
    breakdown: matchPriyaJob4.breakdown,
    matchedSkills: matchPriyaJob4.matchedSkills,
    missingSkills: matchPriyaJob4.missingSkills,
    improvementSuggestions: matchPriyaJob4.improvementSuggestions,
    status: 'interview',
    interviewDetails: {
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      time: '2:00 PM EST',
      mode: 'Zoom Video Call',
      message: 'Your UI portfolio and hackathon win stood out. Technical frontend round scheduled.',
    },
  });

  // Vikram applies to Job 5 (Junior SWE) -> High fit for Junior
  const matchVikramJob5 = calculateMatch(seekers[2], job5);
  await Application.create({
    job: job5._id,
    applicant: seekers[2]._id,
    company: company1._id,
    profileSnapshot: seekers[2].toObject(),
    resumeUrl: 'uploads/resumes/sample-resume.pdf',
    resumeFileName: 'Vikram_Patel_CS_Resume.pdf',
    resumeHash: sampleHash + '_vikram',
    fingerprint: {
      email: seekers[2].mail_id,
      phone: seekers[2].phone,
      github: seekers[2].github,
      linkedin: seekers[2].linkedin,
    },
    matchScore: matchVikramJob5.total,
    breakdown: matchVikramJob5.breakdown,
    matchedSkills: matchVikramJob5.matchedSkills,
    missingSkills: matchVikramJob5.missingSkills,
    improvementSuggestions: matchVikramJob5.improvementSuggestions,
    status: 'applied',
  });

  // Rohan applies to Job 3 (Backend Node.js) -> High fit
  const matchRohanJob3 = calculateMatch(seekers[4], job3);
  await Application.create({
    job: job3._id,
    applicant: seekers[4]._id,
    company: company2._id,
    profileSnapshot: seekers[4].toObject(),
    resumeUrl: 'uploads/resumes/sample-resume.pdf',
    resumeFileName: 'Rohan_Mehta_Backend_Resume.pdf',
    resumeHash: sampleHash + '_rohan',
    fingerprint: {
      email: seekers[4].mail_id,
      phone: seekers[4].phone,
      github: seekers[4].github,
      linkedin: seekers[4].linkedin,
    },
    matchScore: matchRohanJob3.total,
    breakdown: matchRohanJob3.breakdown,
    matchedSkills: matchRohanJob3.matchedSkills,
    missingSkills: matchRohanJob3.missingSkills,
    improvementSuggestions: matchRohanJob3.improvementSuggestions,
    status: 'applied',
  });

  // Neha applies to Job 1 (Senior MERN) -> Missing some experience / deep tools -> Rejected with reasons
  const matchNehaJob1 = calculateMatch(seekers[5], job1);
  await Application.create({
    job: job1._id,
    applicant: seekers[5]._id,
    company: company1._id,
    profileSnapshot: seekers[5].toObject(),
    resumeUrl: 'uploads/resumes/sample-resume.pdf',
    resumeFileName: 'Neha_Gupta_Resume.pdf',
    resumeHash: sampleHash + '_neha',
    fingerprint: {
      email: seekers[5].mail_id,
      phone: seekers[5].phone,
      github: seekers[5].github,
      linkedin: seekers[5].linkedin,
    },
    matchScore: matchNehaJob1.total,
    breakdown: matchNehaJob1.breakdown,
    matchedSkills: matchNehaJob1.matchedSkills,
    missingSkills: matchNehaJob1.missingSkills,
    improvementSuggestions: matchNehaJob1.improvementSuggestions,
    status: 'rejected',
    rejectionReasons: [
      'Role requires 2+ years of senior full-stack experience (current profile: 1.2 years).',
      'Missing core proficiency in TypeScript and Docker containerization.',
    ],
    companyNote: 'Encouraged to reapply once you build more hands-on microservices projects.',
  });

  console.log('Created sample applications with pre-computed smart match scores and lifecycle statuses.');

  // Create in-portal notifications for seekers
  await Notification.create([
    {
      user: seekers[0]._id,
      type: 'shortlisted',
      title: 'Interview Call: Senior Full Stack MERN Developer at TechCorp Cloud Systems',
      message: 'Congratulations! You have been shortlisted. Interview scheduled for 10:30 AM PST.',
      link: '/applications',
      read: false,
    },
    {
      user: seekers[1]._id,
      type: 'interview',
      title: 'Interview Call: Frontend React & UI Engineer at FinScale Payments',
      message: 'Your UI portfolio stood out. Technical interview round scheduled via Zoom.',
      link: '/applications',
      read: false,
    },
    {
      user: seekers[5]._id,
      type: 'rejected',
      title: 'Application Status Update: Senior Full Stack MERN Developer',
      message: 'Your application was reviewed. We have shared actionable improvement areas in your portal.',
      link: '/applications',
      read: true,
    },
  ]);
  console.log('Created sample notifications.');

  console.log('\n======================================================');
  console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  console.log('Company Logins (Admin Portal):');
  console.log('  1. TechCorp: recruiting@techcorp.io / Password123');
  console.log('  2. FinScale: careers@finscale.com    / Password123');
  console.log('\nSeeker Logins:');
  console.log('  1. Arun Kumar (Senior MERN):  arun@example.com   / Password123');
  console.log('  2. Priya Sharma (Frontend):   priya@example.com  / Password123');
  console.log('  3. Vikram Patel (Junior SWE): vikram@example.com / Password123');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

if (require.main === module) {
  seed().catch(err => {
    console.error('Seed execution error:', err);
    process.exit(1);
  });
}

module.exports = seed;
