const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const assert = require('assert');
const mongoose = require('mongoose');

const User = require('./models/User');
const Company = require('./models/Company');
const Job = require('./models/Job');
const Application = require('./models/Application');
const { calculateMatch } = require('./utils/skillMatcher');
const { isValidEmail, isCompanyEmail, extractEmailDomain } = require('./utils/emailValidator');

async function runTests() {
  console.log('🧪 Starting Smart Job Portal Verification Tests...\n');
  await mongoose.connect(process.env.MONGO_URI);

  // 1. Verify Email Validation Rules (Candidate email vs HR corporate email)
  console.log('Test 1: Testing Email Validation & Corporate Email Enforcement...');
  assert.strictEqual(isValidEmail('candidate@example.com'), true, 'Valid email should pass');
  assert.strictEqual(isValidEmail('not-an-email'), false, 'Malformed email should fail');
  assert.strictEqual(isValidEmail('user@'), false, 'Incomplete email should fail');

  assert.strictEqual(isCompanyEmail('sarah@techcorp.com'), true, 'Corporate domain should pass HR check');
  assert.strictEqual(isCompanyEmail('recruiter@stripe.io'), true, 'Custom startup domain should pass HR check');
  assert.strictEqual(isCompanyEmail('recruiter@gmail.com'), false, 'Gmail must be blocked for HR');
  assert.strictEqual(isCompanyEmail('recruiter@yahoo.com'), false, 'Yahoo must be blocked for HR');
  assert.strictEqual(isCompanyEmail('recruiter@hotmail.com'), false, 'Hotmail must be blocked for HR');

  assert.strictEqual(extractEmailDomain('hr@google.com'), 'google.com');
  console.log('  ✓ Corporate work email and candidate email validation passed!\n');

  // 1b. Verify OTP Generation & Lifecycle
  console.log('Test 1b: Testing OTP Generation, Verification & Forgot Password Flow...');
  const { generateOtp } = require('./utils/mailer');
  const bcrypt = require('bcryptjs');

  const testOtp = generateOtp();
  assert.strictEqual(testOtp.length, 6, 'Generated OTP must be 6 digits');
  assert(/^\d{6}$/.test(testOtp), 'OTP must be purely numeric');

  // Clean up any previous test user
  await User.deleteOne({ email: 'otp-tester@example.com' });

  // Create unverified user with OTP
  const tempUser = await User.create({
    name: 'OTP Tester',
    email: 'otp-tester@example.com',
    password: await bcrypt.hash('initialPass123', 10),
    role: 'seeker',
    isEmailVerified: false,
    otpCode: testOtp,
    otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    otpPurpose: 'verify_email',
  });

  assert.strictEqual(tempUser.isEmailVerified, false, 'User must initially be unverified');
  assert.strictEqual(tempUser.otpCode, testOtp, 'Stored OTP must match generated OTP');

  // Verify OTP
  tempUser.isEmailVerified = true;
  tempUser.emailVerifiedAt = new Date();
  tempUser.otpCode = undefined;
  tempUser.otpExpiresAt = undefined;
  tempUser.otpPurpose = undefined;
  await tempUser.save();

  const verifiedUser = await User.findById(tempUser._id);
  assert.strictEqual(verifiedUser.isEmailVerified, true, 'User email must now be marked verified');
  assert.strictEqual(verifiedUser.otpCode, undefined, 'OTP code must be cleared after verification');

  // Simulate Forgot Password flow
  const resetOtp = generateOtp();
  verifiedUser.otpCode = resetOtp;
  verifiedUser.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  verifiedUser.otpPurpose = 'reset_password';
  await verifiedUser.save();

  assert.strictEqual(verifiedUser.otpPurpose, 'reset_password', 'OTP purpose must be reset_password');

  // Apply new password
  const newHashed = await bcrypt.hash('newSecurePass456', 10);
  verifiedUser.password = newHashed;
  verifiedUser.otpCode = undefined;
  verifiedUser.otpExpiresAt = undefined;
  verifiedUser.otpPurpose = undefined;
  await verifiedUser.save();

  const passCheck = await bcrypt.compare('newSecurePass456', verifiedUser.password);
  assert.strictEqual(passCheck, true, 'New password must verify successfully with bcrypt');
  console.log('  ✓ OTP generation, email verification, and password reset verified!\n');

  // 2. Verify Company ID Proof and Verification Workflow
  console.log('Test 2: Verifying Company Business ID Proof & Verification Model...');
  const company = await Company.findOne({ name: 'TechCorp Solutions' });
  assert(company, 'TechCorp company must exist');
  assert(company.taxId, 'Company must have Tax ID / Registration #');
  assert(company.idProofUrl, 'Company must have uploaded ID proof document');
  assert(company.idProofType, 'Company must have ID proof document type');
  assert.strictEqual(company.verificationStatus, 'verified');
  assert.strictEqual(company.verified, true);
  console.log(`  -> Verified Company: ${company.name}, Tax ID: ${company.taxId}, Proof: ${company.idProofType}`);
  console.log('  ✓ Company ID proof & verification fields passed!\n');

  // 3. Verify Skill Matcher Algorithm
  console.log('Test 3: Testing Smart Skill Matcher algorithm calculation...');
  const mockJob = {
    requiredSkills: ['react', 'node', 'mongodb', 'typescript'],
    preferredSkills: ['docker', 'aws'],
    minExperience: 2,
  };

  const highFitCandidate = {
    skills: ['react', 'node', 'mongodb', 'typescript', 'docker', 'aws'],
    experienceYears: 3,
    internships: [{ company: 'ABC', role: 'Intern', techStack: ['react', 'node'], durationMonths: 6 }],
    projects: [{ title: 'App', techStack: ['react', 'node', 'mongodb'], link: 'https://github.com' }],
    hackathons: [{ name: 'Hackfest', position: 'Winner (1st)', techUsed: ['react', 'node'], year: 2024 }],
    competitiveExams: [{ name: 'GATE CS', rank: 150, score: 90, year: 2023 }],
  };

  const highMatch = calculateMatch(highFitCandidate, mockJob);
  console.log(`  -> High-fit candidate match score: ${highMatch.total}% (${highMatch.tier})`);
  assert(highMatch.total >= 85, 'High fit candidate should have score >= 85');
  assert.strictEqual(highMatch.missingSkills.length, 0, 'No missing required skills');
  assert.strictEqual(highMatch.matchedSkills.length, 4, 'Should match all 4 required skills');

  const lowFitCandidate = {
    skills: ['python'],
    experienceYears: 0,
    internships: [],
    projects: [],
    hackathons: [],
    competitiveExams: [],
  };
  const lowMatch = calculateMatch(lowFitCandidate, mockJob);
  console.log(`  -> Low-fit candidate match score: ${lowMatch.total}% (${lowMatch.tier})`);
  assert(lowMatch.total < 40, 'Low fit candidate should have score < 40');
  assert.strictEqual(lowMatch.missingSkills.length, 4, 'Should miss all 4 required skills');
  console.log('  ✓ Skill Matcher calculations passed!\n');

  // 4. Verify Database Unique Indexes for Duplicate Applications
  console.log('Test 4: Verifying Duplicate Application DB Constraints...');
  const candidate = await User.findOne({ email: 'arun@example.com' });
  const hrUser = await User.findOne({ email: 'hr@techcorp.com' });
  const job = await Job.findOne({ postedBy: hrUser._id });

  assert(candidate, 'Candidate Arun must exist');
  assert(job, 'Job vacancy must exist');

  const existing = await Application.findOne({ job: job._id, applicant: candidate._id });
  assert(existing, 'Arun should have an application for this job from seed');

  // Attempt duplicate application
  let duplicateBlocked = false;
  try {
    await Application.create({
      job: job._id,
      applicant: candidate._id,
      resumeUrl: 'uploads/resumes/sample-resume.pdf',
      matchScore: 90,
    });
  } catch (err) {
    if (err.code === 11000) {
      duplicateBlocked = true;
      console.log('  -> Duplicate application blocked with Mongo E11000 duplicate key error!');
    }
  }
  assert(duplicateBlocked, 'MongoDB unique index must reject duplicate application');
  console.log('  ✓ Duplicate Application Protection passed!\n');

  // 5. Verify HR Ranked Candidates API Query
  console.log('Test 5: Verifying Ranked Candidates sort order...');
  const apps = await Application.find({ job: job._id }).sort({ matchScore: -1 });
  console.log(`  -> Found ${apps.length} applicants for job "${job.title}"`);
  for (let i = 0; i < apps.length - 1; i++) {
    assert(
      apps[i].matchScore >= apps[i + 1].matchScore,
      `Ranked order failed: app[${i}] score ${apps[i].matchScore} < app[${i+1}] score ${apps[i+1].matchScore}`
    );
  }
  console.log('  ✓ Candidates correctly sorted in descending order of matchScore!\n');

  // 6. Verify Application Status Update with HR Feedback
  console.log('Test 6: Verifying HR Status update & Feedback...');
  existing.status = 'interview';
  existing.feedback = 'Strong portfolio projects and 1st prize in hackathon. Invited to technical round.';
  existing.reviewedAt = new Date();
  await existing.save();

  const refreshedApp = await Application.findById(existing._id);
  assert.strictEqual(refreshedApp.status, 'interview');
  assert(refreshedApp.feedback.includes('Strong portfolio'));
  console.log('  ✓ Status update and feedback persistence passed!\n');

  await mongoose.disconnect();
  console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
