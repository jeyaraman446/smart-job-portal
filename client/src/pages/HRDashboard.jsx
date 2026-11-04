import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { errMsg, getFileUrl } from '../api/axios';
import TagInput from '../components/TagInput';

function CompanyModal({ company, onClose, onSaved }) {
  const [f, setF] = useState({
    name: company?.name || '',
    website: company?.website || '',
    industry: company?.industry || '',
    size: company?.size || '',
    location: company?.location || '',
    description: company?.description || '',
    taxId: company?.taxId || '',
    idProofType: company?.idProofType || 'Certificate of Incorporation',
  });
  const [idFile, setIdFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');

    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, v));
    if (idFile) fd.append('idProof', idFile);

    try {
      let res;
      if (company?._id) {
        res = await api.put('/company', fd);
      } else {
        res = await api.post('/company', fd);
      }
      onSaved(res.data);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{company?._id ? 'Edit Company & Business Credentials' : 'Register Verified Company Profile'}</h2>
          {company?._id && <button type="button" className="close-btn" onClick={onClose}>✕</button>}
        </div>
        <p className="muted">
          {company?._id
            ? 'Update your organization profile and legal business verification credentials.'
            : 'Register your organization and provide official ID proof to receive verified employer status.'}
        </p>

        {error && <div className="error-banner" role="alert">{error}</div>}

        <form className="stack" onSubmit={submit}>
          <div className="verification-notice-card">
            <span className="notice-icon">🛡️</span>
            <div>
              <strong>Employer Identity & Anti-Fraud Verification:</strong>
              <p>To protect job seekers and maintain trusted hiring, companies must provide official registration details (e.g. EIN, GSTIN, or Certificate of Incorporation).</p>
            </div>
          </div>

          <label>Company Legal Name *
            <input required placeholder="e.g. Acme Technologies Inc." value={f.name} onChange={set('name')} />
          </label>

          <div className="row">
            <label>Business Tax ID / Registration # (EIN / GSTIN / CIN) *
              <input required placeholder="e.g. US-EIN-98471239" value={f.taxId} onChange={set('taxId')} />
            </label>
            <label>ID Proof Document Type
              <select value={f.idProofType} onChange={set('idProofType')}>
                <option value="Certificate of Incorporation">Certificate of Incorporation</option>
                <option value="Tax Registration (EIN / GSTIN)">Tax Registration (EIN / GSTIN)</option>
                <option value="Commercial Business License">Commercial Business License</option>
                <option value="Official Corporate ID Badge">Official Corporate ID Badge</option>
              </select>
            </label>
          </div>

          <label>
            Upload Company ID Proof Document (PDF, PNG, JPG, max 5MB)
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={e => setIdFile(e.target.files[0])}
            />
            {company?.idProofFileName && !idFile && (
              <span className="file-hint">Current document: <strong>{company.idProofFileName}</strong></span>
            )}
          </label>

          <div className="row">
            <label>Official Website URL
              <input placeholder="https://example.com" value={f.website} onChange={set('website')} />
            </label>
            <label>Industry
              <input placeholder="e.g. Fintech, SaaS, Healthcare" value={f.industry} onChange={set('industry')} />
            </label>
          </div>

          <div className="row">
            <label>Company Size
              <input placeholder="e.g. 50-200 employees" value={f.size} onChange={set('size')} />
            </label>
            <label>Headquarters / Main Location
              <input placeholder="e.g. San Francisco, CA & Remote" value={f.location} onChange={set('location')} />
            </label>
          </div>

          <label>About Organization
            <textarea
              placeholder="Outline your company mission, tech stack, and workplace culture…"
              value={f.description}
              onChange={set('description')}
              rows={3}
            />
          </label>

          <div className="modal-actions">
            {company?._id && (
              <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
            )}
            <button type="submit" className="primary" disabled={busy}>
              {busy ? 'Saving & Submitting Proof…' : company?._id ? 'Save Changes' : 'Register & Submit for Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JobForm({ existingJob, onClose, onDone, isCompanyVerified }) {
  const [f, setF] = useState({
    title: existingJob?.title || '',
    description: existingJob?.description || '',
    location: existingJob?.location || 'Remote',
    jobType: existingJob?.jobType || 'Full-time',
    minExperience: existingJob?.minExperience ?? 0,
    vacancies: existingJob?.vacancies ?? 1,
    salaryMin: existingJob?.salaryRange?.min || '',
    salaryMax: existingJob?.salaryRange?.max || '',
    deadline: existingJob?.deadline ? existingJob.deadline.slice(0, 10) : '',
    preferHackathons: existingJob?.preferHackathons || false,
    requiredSkills: existingJob?.requiredSkills || [],
    preferredSkills: existingJob?.preferredSkills || [],
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { salaryMin, salaryMax, ...rest } = f;
      const body = {
        ...rest,
        minExperience: Number(f.minExperience) || 0,
        vacancies: Number(f.vacancies) || 1,
        salaryRange: {
          min: salaryMin ? Number(salaryMin) : undefined,
          max: salaryMax ? Number(salaryMax) : undefined,
        },
      };

      let res;
      if (existingJob?._id) {
        res = await api.put(`/jobs/${existingJob._id}`, body);
      } else {
        res = await api.post('/jobs', body);
      }
      onDone(res.data);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <form className="card stack vacancy-form" onSubmit={submit}>
      <div className="modal-header">
        <h2>{existingJob?._id ? 'Edit Vacancy' : 'Post a New Job Vacancy'}</h2>
        <button type="button" className="close-btn" onClick={onClose}>✕</button>
      </div>

      {!isCompanyVerified && (
        <div className="warn-banner">
          ⚠️ <strong>Verification in progress:</strong> Your company ID proof is currently under review. This vacancy can be posted, but will display a "Pending Verification" badge to candidates until confirmed.
        </div>
      )}

      {error && <div className="error-banner" role="alert">{error}</div>}

      <div className="row">
        <label>Job Title *
          <input required placeholder="e.g. Senior MERN Stack Engineer" value={f.title} onChange={set('title')} />
        </label>
        <label>Job Type
          <select value={f.jobType} onChange={set('jobType')}>
            <option value="Full-time">Full-time</option>
            <option value="Internship">Internship</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Remote">Remote</option>
          </select>
        </label>
      </div>

      <label>Job Description
        <textarea
          placeholder="Outline role responsibilities, tech requirements, and project scope…"
          value={f.description}
          onChange={set('description')}
          rows={4}
        />
      </label>

      <label>Required Skills (Carries 40% Matching Weight) *
        <TagInput
          value={f.requiredSkills}
          onChange={requiredSkills => setF({ ...f, requiredSkills })}
          placeholder="e.g. react, node, express, mongodb (press Enter after each)"
        />
      </label>

      <label>Preferred Skills (Carries 15% Matching Weight)
        <TagInput
          value={f.preferredSkills}
          onChange={preferredSkills => setF({ ...f, preferredSkills })}
          placeholder="e.g. docker, aws, redis, tailwind (optional)"
        />
      </label>

      <div className="row">
        <label>Location
          <input placeholder="e.g. Remote or San Francisco, CA" value={f.location} onChange={set('location')} />
        </label>
        <label>Min. Experience (Years)
          <input type="number" min="0" step="0.5" value={f.minExperience} onChange={set('minExperience')} />
        </label>
        <label>Vacancies Available
          <input type="number" min="1" value={f.vacancies} onChange={set('vacancies')} />
        </label>
      </div>

      <div className="row">
        <label>Min Salary ($/yr)
          <input type="number" min="0" placeholder="e.g. 100000" value={f.salaryMin} onChange={set('salaryMin')} />
        </label>
        <label>Max Salary ($/yr)
          <input type="number" min="0" placeholder="e.g. 140000" value={f.salaryMax} onChange={set('salaryMax')} />
        </label>
        <label>Application Deadline
          <input type="date" value={f.deadline} onChange={set('deadline')} />
        </label>
      </div>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={f.preferHackathons}
          onChange={e => setF({ ...f, preferHackathons: e.target.checked })}
        />
        <span>Award extra priority matching weight to candidates with Hackathon awards and competitive exam scores</span>
      </label>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Saving Vacancy…' : existingJob?._id ? 'Save Changes' : 'Publish Vacancy'}
        </button>
      </div>
    </form>
  );
}

export default function HRDashboard() {
  const { user } = useAuth();
  const [company, setCompany] = useState(undefined);
  const [jobs, setJobs] = useState([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [showCompanyEdit, setShowCompanyEdit] = useState(false);
  const [message, setMessage] = useState('');
  const [togglingVerify, setTogglingVerify] = useState(false);

  const loadJobs = () => api.get('/jobs/mine').then(r => setJobs(r.data));
  const loadCompany = () => api.get('/company/mine').then(r => setCompany(r.data));

  useEffect(() => {
    loadCompany();
    loadJobs();
  }, []);

  const toggleJobStatus = async id => {
    try {
      const res = await api.patch(`/jobs/${id}/close`);
      setMessage(`Vacancy status updated to "${res.data.status}".`);
      loadJobs();
    } catch (e) {
      alert(errMsg(e));
    }
  };

  // Demo tool: simulate admin verification review
  const handleToggleVerification = async () => {
    setTogglingVerify(true);
    try {
      const res = await api.patch('/company/verify', {
        status: company.verified ? 'pending' : 'verified',
        notes: company.verified
          ? 'Verification reset to pending review.'
          : 'Official Business Registration & EIN validated by Admin Compliance.',
      });
      setCompany(res.data.company);
      setMessage(res.data.message);
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setTogglingVerify(false);
    }
  };

  if (company === undefined) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading enterprise employer dashboard…</p>
      </div>
    );
  }

  // Force company registration if none exists
  if (!company) {
    return <CompanyModal company={null} onSaved={setCompany} onClose={() => {}} />;
  }

  const totalApplicants = jobs.reduce((sum, j) => sum + (j.applicantCount || 0), 0);
  const activeJobs = jobs.filter(j => j.status === 'open').length;
  const isVerified = company.verificationStatus === 'verified' || company.verified;

  return (
    <div className="stack hr-dashboard">
      {/* 1. Company Profile & Verification Status Card */}
      <div className="card hr-company-card">
        <div className="company-info-area">
          <div className="company-logo-avatar">🏢</div>
          <div className="company-texts">
            <div className="company-title-row">
              <h1>{company.name}</h1>
              {isVerified ? (
                <span className="verified-badge-pill" title="Verified by Business ID Proof">
                  ✓ Verified Employer
                </span>
              ) : (
                <span className="pending-badge-pill" title="Submitted ID proof is under compliance review">
                  ⏳ Verification In Review
                </span>
              )}
            </div>

            <p className="company-details-line">
              {[company.industry, company.size, company.location].filter(Boolean).join(' • ')}
            </p>

            <div className="company-credentials-row">
              {user?.email && (
                <span className="cred-chip verified-chip" title="Corporate email verified via OTP">
                  <strong>Corporate Email:</strong> {user.email} <span className="verified-tick-small">✓ Verified</span>
                </span>
              )}
              {company.taxId && (
                <span className="cred-chip">
                  <strong>Tax / Reg ID:</strong> {company.taxId}
                </span>
              )}
              {company.idProofType && (
                <span className="cred-chip">
                  <strong>Doc:</strong> {company.idProofType}
                </span>
              )}
              {company.idProofUrl && (
                <a
                  href={getFileUrl(company.idProofUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="id-proof-link"
                >
                  📄 View ID Proof Document ↗
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="company-actions-group">
          <button
            type="button"
            className="btn"
            onClick={() => setShowCompanyEdit(true)}
          >
            ✏️ Edit Profile & ID Proof
          </button>

          <button
            type="button"
            className={`btn btn-sm ${isVerified ? 'btn-warn-outline' : 'btn-success-outline'}`}
            onClick={handleToggleVerification}
            disabled={togglingVerify}
            title="Demonstration feature: simulates Admin review compliance check"
          >
            {togglingVerify
              ? 'Updating…'
              : isVerified
              ? 'Simulate: Set to Pending ⏳'
              : 'Simulate Admin Approval ✓'}
          </button>
        </div>
      </div>

      {/* Verification Notice Banner */}
      {!isVerified ? (
        <div className="verification-banner-warning card">
          <div className="banner-icon">⏳</div>
          <div className="banner-content">
            <h3>Company Verification Pending Compliance Review</h3>
            <p>
              Your organization's ID proof (<strong>{company.idProofType}</strong>) has been submitted and is queued for verification.
              You can post vacancies; they will show as verified once compliance approval is complete.
            </p>
          </div>
          <button
            type="button"
            className="btn primary btn-sm"
            onClick={handleToggleVerification}
          >
            Approve Verification (Demo)
          </button>
        </div>
      ) : (
        <div className="verification-banner-success card">
          <div className="banner-icon">🛡️</div>
          <div className="banner-content">
            <h3>Verified Enterprise Employer Status Active</h3>
            <p>
              Business identity, tax credentials (<code>{company.taxId || 'Verified'}</code>), and official email domain are validated. Your job vacancies receive prioritized candidate placement.
            </p>
          </div>
        </div>
      )}

      {message && (
        <div className="notice notice-good" role="alert">
          {message}
          <button type="button" className="close-notice-btn" onClick={() => setMessage('')}>✕</button>
        </div>
      )}

      {/* Analytics Summary */}
      <div className="stats-grid">
        <div className="card stat-card">
          <span className="stat-num">{jobs.length}</span>
          <span className="stat-label">Total Vacancies Posted</span>
        </div>
        <div className="card stat-card">
          <span className="stat-num" style={{ color: 'var(--good)' }}>{activeJobs}</span>
          <span className="stat-label">Active Open Vacancies</span>
        </div>
        <div className="card stat-card">
          <span className="stat-num" style={{ color: 'var(--brand)' }}>{totalApplicants}</span>
          <span className="stat-label">Candidate Resumes Screened</span>
        </div>
      </div>

      {/* Vacancies Header & Action */}
      <div className="vacancies-header">
        <div>
          <h2>Active Company Vacancies</h2>
          <p className="muted">Review talent match scores, view candidate hackathons/exams, and evaluate resumes.</p>
        </div>
        <button
          type="button"
          className="primary"
          onClick={() => { setEditingJob(null); setShowJobForm(true); }}
        >
          + Post New Vacancy
        </button>
      </div>

      {/* Post/Edit Job Form */}
      {showJobForm && (
        <JobForm
          existingJob={editingJob}
          isCompanyVerified={isVerified}
          onClose={() => { setShowJobForm(false); setEditingJob(null); }}
          onDone={() => { setShowJobForm(false); setEditingJob(null); loadJobs(); }}
        />
      )}

      {/* Vacancies List */}
      {jobs.length === 0 ? (
        <div className="card empty-state">
          <h3>No job vacancies posted yet</h3>
          <p className="muted">Click "Post New Vacancy" above to start hiring with smart candidate matching.</p>
        </div>
      ) : (
        <div className="vacancies-list">
          {jobs.map(j => (
            <div key={j._id} className="card vacancy-card">
              <div className="vacancy-main-col">
                <div className="vacancy-title-row">
                  <h3>{j.title}</h3>
                  <span className={`pill ${j.status === 'open' ? 'pill-open' : 'pill-closed'}`}>
                    {j.status === 'open' ? '● Open' : '○ Closed'}
                  </span>
                  {j.jobType && <span className="job-badge">{j.jobType}</span>}
                </div>

                <p className="vacancy-meta">
                  <span>📍 {j.location || 'Remote'}</span>
                  <span>💼 {j.minExperience === 0 ? 'Freshers welcome' : `${j.minExperience}+ yrs exp`}</span>
                  <span>👥 {j.vacancies} {j.vacancies === 1 ? 'opening' : 'openings'}</span>
                  {j.salaryRange?.max && (
                    <span>💰 ${j.salaryRange.min ? `${j.salaryRange.min / 1000}k` : '0'} – ${j.salaryRange.max / 1000}k</span>
                  )}
                </p>

                <div className="vacancy-skills">
                  <strong>Required Skills:</strong>
                  <div className="tags-inline">
                    {(j.requiredSkills || []).map(s => <span key={s} className="tag">{s}</span>)}
                  </div>
                </div>
              </div>

              <div className="vacancy-actions-col">
                <div className="applicant-stat-chip">
                  <span className="count">{j.applicantCount}</span>
                  <span className="lbl">{j.applicantCount === 1 ? 'Candidate' : 'Candidates'}</span>
                </div>

                <Link className="primary btn view-candidates-btn" to={`/hr/jobs/${j._id}`}>
                  View Ranked Candidates →
                </Link>

                <div className="vacancy-sub-actions">
                  <button
                    type="button"
                    className="link"
                    onClick={() => { setEditingJob(j); setShowJobForm(true); }}
                  >
                    Edit
                  </button>
                  <span className="dot-sep">•</span>
                  <button
                    type="button"
                    className="link"
                    onClick={() => toggleJobStatus(j._id)}
                  >
                    {j.status === 'open' ? 'Close Vacancy' : 'Reopen Vacancy'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCompanyEdit && (
        <CompanyModal
          company={company}
          onClose={() => setShowCompanyEdit(false)}
          onSaved={c => { setCompany(c); setShowCompanyEdit(false); }}
        />
      )}
    </div>
  );
}
