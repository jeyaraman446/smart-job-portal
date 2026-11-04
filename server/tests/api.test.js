// server/tests/api.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const app = require('../server');

const User = require('../models/User');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Notification = require('../models/Notification');

let seekerToken = null;
let seekerUser = null;
let companyToken = null;
let companyObj = null;
let testJob = null;
let testJob2 = null;

const samplePdfPath = path.resolve(__dirname, '../uploads/resumes/test-sample.pdf');

beforeAll(async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/job_portal';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  // Create dummy test PDF
  const resumesDir = path.dirname(samplePdfPath);
  if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });
  fs.writeFileSync(samplePdfPath, '%PDF-1.4 sample resume test content');

  // Clean test-specific collections
  await Promise.all([
    User.deleteMany({ mail_id: /@testmail\.com$/ }),
    Company.deleteMany({ mail_id: /@testcorp\.io$/ }),
  ]);
});

afterAll(async () => {
  if (fs.existsSync(samplePdfPath)) fs.unlinkSync(samplePdfPath);
  await Promise.all([
    User.deleteMany({ mail_id: /@testmail\.com$/ }),
    Company.deleteMany({ mail_id: /@testcorp\.io$/ }),
  ]);
  await mongoose.disconnect();
});

describe('1. Authentication & Security Suite', () => {
  test('Seeker signup rejects weak password (< 8 chars or missing numbers)', async () => {
    const res = await request(app)
      .post('/api/auth/seeker/register')
      .send({
        name: 'Weak Pass',
        mail_id: 'weak@testmail.com',
        password: 'pass',
        confirmPassword: 'pass',
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 8 characters/i);
  });

  test('Seeker signup rejects mismatched passwords', async () => {
    const res = await request(app)
      .post('/api/auth/seeker/register')
      .send({
        name: 'Mismatch',
        mail_id: 'mismatch@testmail.com',
        password: 'Password123',
        confirmPassword: 'Different123',
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/confirm password does not match/i);
  });

  test('Seeker signup succeeds with valid data and returns JWT', async () => {
    const res = await request(app)
      .post('/api/auth/seeker/register')
      .send({
        name: 'Alex Developer',
        mail_id: 'alex@testmail.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        phone: '+1 555-888-0001',
      });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.mail_id).toBe('alex@testmail.com');
    expect(res.body.user.password).toBeUndefined();

    seekerToken = res.body.token;
    seekerUser = res.body.user;
  });

  test('Company signup rejects free email domains (gmail, yahoo, etc.)', async () => {
    const res = await request(app)
      .post('/api/auth/company/register')
      .send({
        name: 'Fake Startup',
        location: 'Remote',
        mail_id: 'recruiter@gmail.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/free providers/i);
  });

  test('Company signup succeeds with official corporate domain', async () => {
    const res = await request(app)
      .post('/api/auth/company/register')
      .send({
        name: 'Apex Systems Inc',
        location: 'Seattle, WA',
        mail_id: 'talent@testcorp.io',
        password: 'Password123',
        confirmPassword: 'Password123',
        website: 'https://apexsystems.testcorp.io',
      });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.company.name).toBe('Apex Systems Inc');

    companyToken = res.body.token;
    companyObj = res.body.company;
  });

  test('Duplicate account registration returns 409 conflict', async () => {
    const res = await request(app)
      .post('/api/auth/seeker/register')
      .send({
        name: 'Duplicate Alex',
        mail_id: 'alex@testmail.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('Seeker login succeeds with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/seeker/login')
      .send({
        mail_id: 'alex@testmail.com',
        password: 'Password123',
      });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('Seeker login fails with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/seeker/login')
      .send({
        mail_id: 'alex@testmail.com',
        password: 'WrongPassword!',
      });
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me returns authenticated user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${seekerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('seeker');
    expect(res.body.user.mail_id).toBe('alex@testmail.com');
  });
});

describe('2. Seeker Profile & Portfolio CRUD', () => {
  test('PUT /api/profile updates skills and portfolio details', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({
        skills: ['react', 'node', 'mongodb', 'typescript'],
        github: 'https://github.com/alex-dev-test',
        linkedin: 'https://linkedin.com/in/alex-dev-test',
        cgpa: 8.5,
        degree: { degree: 'B.S. CS', status: 'completed' },
      });
    expect(res.status).toBe(200);
    expect(res.body.user.skills).toContain('react.js'); // normalized alias
    expect(res.body.user.github).toBe('https://github.com/alex-dev-test');
  });

  test('POST /api/profile/skills prevents duplicate skill entry', async () => {
    // Add skill
    await request(app)
      .post('/api/profile/skills')
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ skill: 'docker' });

    // Attempt duplicate
    const res = await request(app)
      .post('/api/profile/skills')
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ skill: 'DOCKER' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/duplicate prevention/i);
  });

  test('POST /api/profile/projects adds a project and blocks duplicate title', async () => {
    const pRes = await request(app)
      .post('/api/profile/projects')
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({
        title: 'Microservices Portal',
        description: 'Scalable cloud backend',
        techStack: ['node', 'mongodb', 'docker'],
      });
    expect(pRes.status).toBe(201);

    // Duplicate project title
    const dupRes = await request(app)
      .post('/api/profile/projects')
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({
        title: 'microservices portal',
      });
    expect(dupRes.status).toBe(409);
  });

  test('POST /api/profile/experience adds job experience and updates total years', async () => {
    const res = await request(app)
      .post('/api/profile/experience')
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({
        company: 'Cloud Innovators',
        role: 'Full Stack Engineer',
        years: 2,
        months: 6,
      });
    expect(res.status).toBe(201);
    expect(res.body.totalExperienceYears).toBeGreaterThanOrEqual(2.5);
  });
});

describe('3. Company & Jobs Suite', () => {
  test('Company creates job opening with mandatory requirements', async () => {
    const res = await request(app)
      .post('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: 'Lead Full Stack Architect',
        description: 'Leading MERN cloud engineering',
        location: 'Seattle, WA',
        vacancies: 2,
        requiredSkills: ['react', 'node', 'mongodb'],
        minExperience: 2,
        githubRequired: true,
        minCgpa: 7.0,
      });
    expect(res.status).toBe(201);
    expect(res.body.job.mandatoryFields).toContain('requiredSkills');
    expect(res.body.job.mandatoryFields).toContain('minExperience');
    expect(res.body.job.mandatoryFields).toContain('github');
    testJob = res.body.job;

    // Create a second job for multi-apply testing
    const res2 = await request(app)
      .post('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: 'Junior React Engineer',
        description: 'Frontend UI development',
        location: 'Remote',
        vacancies: 3,
        requiredSkills: ['react', 'javascript'],
        minExperience: 0,
      });
    testJob2 = res2.body.job;
  });

  test('Seeker browses jobs and receives calculated match score', async () => {
    const res = await request(app)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${seekerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const found = res.body.find(j => j._id === testJob._id);
    expect(found).toBeDefined();
    expect(found.matchScore).toBeGreaterThanOrEqual(70);
    expect(found.alreadyApplied).toBe(false);
  });
});

describe('4. Apply Flow, Mandatory Validation & Duplicate Prevention Suite', () => {
  test('Mandatory Requirements: Blocks applicant who does not meet min experience', async () => {
    // Create an unexperienced candidate
    const freshRes = await request(app)
      .post('/api/auth/seeker/register')
      .send({
        name: 'Inexperienced Dev',
        mail_id: 'inexperienced@testmail.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    const freshToken = freshRes.body.token;

    const applyRes = await request(app)
      .post(`/api/jobs/${testJob._id}/apply`)
      .set('Authorization', `Bearer ${freshToken}`)
      .attach('resume', samplePdfPath);

    expect(applyRes.status).toBe(400);
    expect(applyRes.body.message).toMatch(/mandatory requirements/i);
    expect(applyRes.body.missingRequirements.length).toBeGreaterThan(0);
  });

  test('Valid applicant submits application successfully', async () => {
    const res = await request(app)
      .post(`/api/jobs/${testJob._id}/apply`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .attach('resume', samplePdfPath);

    expect(res.status).toBe(201);
    expect(res.body.matchScore).toBeDefined();
    expect(res.body.applicationId).toBeDefined();
  });

  test('Duplicate Prevention Rule 1: Same user applying to the same job again is rejected (409)', async () => {
    const res = await request(app)
      .post(`/api/jobs/${testJob._id}/apply`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .attach('resume', samplePdfPath);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already submitted an application/i);
  });

  test('Multi-Apply: Same user CAN apply to a DIFFERENT job opening', async () => {
    const res = await request(app)
      .post(`/api/jobs/${testJob2._id}/apply`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .attach('resume', samplePdfPath);

    expect(res.status).toBe(201);
    expect(res.body.applicationId).toBeDefined();
  });

  test('Duplicate Prevention Rule 2: Different user submitting the exact same resume file is rejected (409)', async () => {
    // Create candidate 2 with matching profile
    const cand2 = await request(app)
      .post('/api/auth/seeker/register')
      .send({
        name: 'Candidate Two',
        mail_id: 'cand2@testmail.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    const cand2Token = cand2.body.token;

    // Update cand2 profile so mandatory requirements pass
    await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${cand2Token}`)
      .send({
        skills: ['react', 'node', 'mongodb'],
        github: 'https://github.com/cand2-unique',
        cgpa: 8.0,
      });

    await request(app)
      .post('/api/profile/experience')
      .set('Authorization', `Bearer ${cand2Token}`)
      .send({ company: 'Tech', role: 'Dev', years: 3 });

    // Submit the EXACT same samplePdfPath used by candidate 1
    const res = await request(app)
      .post(`/api/jobs/${testJob._id}/apply`)
      .set('Authorization', `Bearer ${cand2Token}`)
      .attach('resume', samplePdfPath);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/duplicate resume/i);
  });

  test('Duplicate Prevention Rule 3: Parallel concurrent apply requests block duplicate', async () => {
    // Register candidate 3
    const cand3 = await request(app)
      .post('/api/auth/seeker/register')
      .send({
        name: 'Concurrent Cand',
        mail_id: 'concurrent@testmail.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    const c3Token = cand3.body.token;

    // Update cand3 with matching skills
    await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${c3Token}`)
      .send({ skills: ['react', 'javascript'] });

    // Create unique test pdf
    const c3Pdf = path.resolve(__dirname, '../uploads/resumes/c3.pdf');
    fs.writeFileSync(c3Pdf, '%PDF-1.4 unique content ' + Date.now());

    // Fire two parallel apply requests simultaneously
    const [p1, p2] = await Promise.all([
      request(app).post(`/api/jobs/${testJob2._id}/apply`).set('Authorization', `Bearer ${c3Token}`).attach('resume', c3Pdf),
      request(app).post(`/api/jobs/${testJob2._id}/apply`).set('Authorization', `Bearer ${c3Token}`).attach('resume', c3Pdf),
    ]);

    if (fs.existsSync(c3Pdf)) fs.unlinkSync(c3Pdf);

    const statuses = [p1.status, p2.status].sort();
    expect(statuses[0]).toBe(201);
    expect(statuses[1]).toBe(409); // One succeeds, the concurrent one is rejected with 409!
  });
});

describe('5. Company Review, Auto-shortlist & Notifications Suite', () => {
  test('Company reviews ranked applicant list for job', async () => {
    const res = await request(app)
      .get(`/api/company/jobs/${testJob._id}/applicants`)
      .set('Authorization', `Bearer ${companyToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].matchScore).toBeDefined();
  });

  test('Company auto-shortlists by score threshold (>= 60) and sends notification', async () => {
    const res = await request(app)
      .post(`/api/company/jobs/${testJob._id}/auto-shortlist`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        threshold: 60,
        interviewDetails: {
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          time: '11:00 AM PST',
          mode: 'Google Meet',
          message: 'Top match score! Invited to technical interview.',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.shortlistedCount).toBeGreaterThanOrEqual(1);
  });

  test('Seeker receives in-portal notification for interview call', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${seekerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const interviewNotif = res.body.find(n => n.type === 'shortlisted' || n.type === 'interview');
    expect(interviewNotif).toBeDefined();
  });

  test('Ownership Check: Unrelated company cannot access testJob applicants (403)', async () => {
    // Register Company 2 with unique credentials
    const timestamp = Date.now();
    const c2 = await request(app)
      .post('/api/auth/company/register')
      .send({
        name: `Rival Corp ${timestamp}`,
        location: 'Boston, MA',
        mail_id: `hr_${timestamp}@testcorp.io`,
        password: 'Password123',
        confirmPassword: 'Password123',
      });
    expect(c2.status).toBe(201);
    const c2Token = c2.body.token;

    const res = await request(app)
      .get(`/api/company/jobs/${testJob._id}/applicants`)
      .set('Authorization', `Bearer ${c2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/access forbidden/i);
  });
});
