# ⚡ Smart Job Portal with Intelligent Resume Matching

[![CI Pipeline](https://github.com/jeyaraman446/job-portal/actions/workflows/ci.yml/badge.svg)](https://github.com/jeyaraman446/job-portal/actions/workflows/ci.yml)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/jeyaraman446/job-portal)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjeyaraman446%2Fjob-portal&env=MONGO_URI,JWT_SECRET)
[![Project Report](https://img.shields.io/badge/Project%20Report-45%20Pages%20PDF-blue.svg)](./Smart_Job_Portal_Project_Report.pdf)

A full-stack, production-grade **MERN (MongoDB, Express, React 18, Node.js)** enterprise talent acquisition platform featuring algorithmic resume matching, automated candidate ranking, strict multi-vector duplicate application prevention, corporate work-email enforcement, and automated interview dispatch.

**Author**: Jeyaraman S P (310624243070)  
**Department**: Department of Artificial Intelligence and Data Science  
**Institution**: Easwari Engineering College (Autonomous), Anna University, Chennai  
**Academic Report**: [Smart_Job_Portal_Project_Report.pdf](./Smart_Job_Portal_Project_Report.pdf)

---

## 🏗️ 1. Architecture & Tech Stack

- **Backend**: Node.js 18+, Express, MongoDB with Mongoose, JWT authentication, bcryptjs, Multer (PDF validation, 2 MB max), pdf-parse, Nodemailer (with Brevo/Gmail/simulation fallbacks), Helmet, express-rate-limit, CORS, dotenv, express-validator.
- **Frontend**: React 18 with Vite, React Router v6, Axios, plain responsive CSS (`styles.css`) supporting Dark/Light mode, and accessible WCAG focus states.
- **Testing**: Jest 30 & Supertest integration suite with 100% passing test coverage (31 unit and API integration tests).

```
job-portal/
├── server/
│   ├── config/              # Database connection & email domain blocklists
│   ├── controllers/         # Auth, Seeker Profile, Jobs, Applications, Notifications
│   ├── middleware/          # JWT protect, role authorization, Multer PDF upload
│   ├── models/              # User (Seeker), Company, Job, Application, Notification
│   ├── routes/              # Express API router definitions
│   ├── tests/               # Jest & Supertest automated test suites
│   ├── utils/               # Matcher engine, PDF parser, email service
│   ├── seed.js              # Database seed script (2 companies, 5 jobs, 10 seekers)
│   ├── server.js            # Express app entry point
│   ├── .env.example         # Server environment variables template
│   └── package.json
├── client/
│   ├── src/
│   │   ├── api/             # Axios instance with auth interceptor
│   │   ├── context/         # AuthContext (Seeker & Company state)
│   │   ├── pages/           # Seeker & Company pages
│   │   ├── App.jsx          # Route guards & responsive layout
│   │   ├── main.jsx
│   │   └── styles.css       # Full responsive styles with Light/Dark mode
│   ├── .env.example
│   └── package.json
├── dev.js                   # Dual dev server runner (Backend + Frontend)
├── README.md
└── package.json
```

---

## 🚀 2. Quickstart & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: v6.0+ running on `mongodb://127.0.0.1:27017`

### Step 1: Install Dependencies
```bash
# Install root, backend, and frontend packages
npm install
npm --prefix server install
npm --prefix client install
```

### Step 2: Environment Configuration
Create `.env` inside `server/`:
```bash
cp server/.env.example server/.env
```
Default configuration:
```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/job_portal
JWT_SECRET=smart_job_portal_super_secret_jwt_key_2026
CLIENT_URL=http://localhost:5173
```
*(If SMTP credentials are not supplied, transactional emails are automatically logged to the terminal via the simulation transport without crashing).*

### Step 3: Seed the Database
Populates the database with **2 verified companies**, **5 active job vacancies**, and **10 candidate profiles** with pre-computed smart match scores:
```bash
npm run seed
```

### Step 4: Run the Development Server
Starts the Express API on port `5001` and Vite frontend on `http://localhost:5173`:
```bash
npm run dev
```

---

## 🧪 3. Running Automated Tests

Run the full Jest & Supertest test suite (all 31 unit & integration tests):
```bash
npm test
```
The test suite covers:
- **Auth**: password complexity validation, corporate email blocklist, JWT signing, password comparison.
- **Profile**: subdocument CRUD, case-insensitive skill deduplication, duplicate project prevention.
- **Jobs & Mandatory Requirements**: mandatory field computation, blocking candidates lacking experience/GitHub.
- **Duplicate Prevention Rules**: same user/job duplicate block, multi-apply to different jobs, duplicate resume file hash block, duplicate profile fingerprint block, and parallel concurrent apply requests.
- **Review & Notifications**: auto-shortlist by threshold, interview calls, rejection improvement reasons, and company ownership security.

---

## 👥 4. Demo Credentials

### Company Accounts (Admin Page)
| Company Name | Mail ID | Password | Role |
| :--- | :--- | :--- | :--- |
| **TechCorp Cloud Systems** | `recruiting@techcorp.io` | `Password123` | Company Admin |
| **FinScale Payments** | `careers@finscale.com` | `Password123` | Company Admin |

### Job Seeker Accounts
| Seeker Name | Mail ID | Password | Key Strengths |
| :--- | :--- | :--- | :--- |
| **Arun Kumar** | `arun@example.com` | `Password123` | Senior MERN Developer, Hackathon Winner (High Match) |
| **Priya Sharma** | `priya@example.com` | `Password123` | Frontend React & UI Specialist (High Match for Frontend) |
| **Vikram Patel** | `vikram@example.com` | `Password123` | Junior SWE Graduate (High Match for Junior opening) |

---

## 📋 5. Step-by-Step Demo Walkthrough

### 5.1 Multi-Apply Validation
1. Sign in as **Arun Kumar** (`arun@example.com` / `Password123`).
2. Navigate to **Explore Jobs**.
3. Apply to **"Senior Full Stack MERN Developer"** using your PDF resume &rarr; Application created with 85%+ score.
4. Navigate back to **Explore Jobs** and click **"Junior Software Engineer"** &rarr; Notice that Arun can apply to multiple different job openings without restriction.

### 5.2 Duplicate Prevention Enforcement
1. While logged in as Arun, try to apply again to **"Senior Full Stack MERN Developer"**.
   - Result: Form displays "✓ Applied" and backend blocks the request with **HTTP 409: Duplicate application blocked**.
2. Register a new account (`copycat@testmail.com`) and try to submit the exact same resume PDF file to that same job.
   - Result: Blocked with **HTTP 409: Duplicate resume checksum detected**.
3. Register another account using Arun's same GitHub URL (`https://github.com/arunkumar-dev`).
   - Result: Blocked with **HTTP 409: Duplicate candidate profile fingerprint detected**.

### 5.3 Mandatory Field Enforcement
1. Create a fresh candidate account with 0 years of experience.
2. View **"Senior Full Stack MERN Developer"** (which mandates 2+ years of experience and GitHub).
3. Try to apply &rarr; Request is blocked with **HTTP 400: Mandatory requirements not satisfied (requires 2 years experience and GitHub URL)**.

### 5.4 Match Score & Ordered Improvement Suggestions
1. As Arun, open the job details for **"DevOps & Cloud Infrastructure Engineer"**.
2. View the **Smart Match Breakdown** &rarr; displays point allocations across Required Skills (35), Preferred (10), Projects (15), Experience (10), Hackathons (8), and Academics (5).
3. Inspect the **Areas to Improve** list &rarr; suggestions are strictly sorted by points gained in descending order (e.g. `+14 pts` for AWS/Kubernetes proficiency, `+3 pts` for hackathon rankings).

### 5.5 Company Review & Shortlist Interview Call
1. Sign in as **TechCorp** (`recruiting@techcorp.io` / `Password123`).
2. Open **Employer Dashboard** and click **Review Ranked Applicants** on the MERN opening.
3. Applicants are automatically sorted with the highest match score at the top.
4. Click **Update Status / Schedule** on a candidate &rarr; select **Schedule Interview**, enter Date/Time/Google Meet link, and submit.
5. Sign in as that candidate &rarr; check **Alerts (Navbar notification pill)** and **My Applications** to review the official interview call.

### 5.6 Automated Threshold Shortlist & Rejection Feedback
1. On the Company Applicants page, click **⚡ Auto-Shortlist by Score Threshold**.
2. Enter score threshold `75`, check *"Also automatically reject applicants below threshold"*, and click **Run Auto-Shortlist**.
3. Candidates with score &ge; 75% are instantly shortlisted with interview invitations; candidates below 75% receive rejection notices with auto-generated improvement areas.

---

## ⚖️ 6. Assumptions & Architectural Decisions

1. **Company vs Platform Admin**: The brief noted *"the Admin page in my notes: a company account that manages its own jobs and applicants. Company accounts and seeker accounts are separate. Nobody can self-register as a platform admin."* Therefore, Company accounts possess administrative powers over their own job vacancies, applicant pipelines, and interview schedules, strictly isolated by tenant company ID.
2. **Mandatory Fields Computation**: A Mongoose pre-save hook on the Job model dynamically inspects all filled constraint fields (skills, experience, CGPA, GitHub, LinkedIn, projects) and persists a `mandatoryFields` array enforced on the apply route.
3. **Email Resilience**: Email dispatch uses asynchronous execution with comprehensive try/catch guards. In environments without SMTP keys, transactional emails gracefully fall back to formatted console logging so no API call ever crashes due to third-party mailer timeouts.

---

## ☁️ 7. GitHub Setup & Cloud Deployment

### 7.1 Push to GitHub
```bash
# Option 1: Via GitHub CLI
gh auth login -w
gh repo create job-portal --public --source=. --remote=origin --push

# Option 2: Standard Git
git remote add origin https://github.com/<your-username>/job-portal.git
git branch -M main
git push -u origin main
```

### 7.2 Deploy to Render (1-Click Full Stack)
1. Sign up on [Render.com](https://render.com).
2. Create **New + → Blueprint** and connect your GitHub repository.
3. Render automatically picks up `render.yaml` to build and serve both the API and Vite React frontend from a single web service.
4. Add your **MongoDB Atlas** connection string as `MONGO_URI`.

### 7.3 Deploy to Vercel (1-Click Serverless Full Stack)
1. Click the **Deploy with Vercel** button above or import the repository in [vercel.com/new](https://vercel.com/new).
2. Vercel automatically detects `vercel.json` and builds the React frontend with Vite and routes `/api/*` to the serverless Express backend.
3. Add Environment Variables in the Vercel dashboard:
   - `MONGO_URI`: Your MongoDB Atlas connection string (e.g. `mongodb+srv://...`)
   - `JWT_SECRET`: A secure random secret string
4. Click **Deploy**. Your full-stack portal will be live on `https://job-portal-xxxx.vercel.app`.

### 7.4 Docker Container Deployment
```bash
docker build -t smart-job-portal .
docker run -d -p 5001:5001 -e MONGO_URI="<your-mongodb-atlas-uri>" -e JWT_SECRET="<secret>" smart-job-portal
```
