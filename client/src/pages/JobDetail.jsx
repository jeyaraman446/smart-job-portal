// client/src/pages/JobDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function JobDetail() {
  const { id } = useParams();
  const { user, isSeeker } = useAuth();
  const nav = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Application submission state
  const [resumeFile, setResumeFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [appResult, setAppResult] = useState(null);

  const fetchJob = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/jobs/${id}`);
      setJob(res.data);
      if (res.data.alreadyApplied) {
        setAlreadyApplied(true);
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  const handleApply = async e => {
    e.preventDefault();
    if (!resumeFile) {
      setError('Please attach a PDF resume file for this specific application.');
      return;
    }

    if (resumeFile.size > 2 * 1024 * 1024) {
      setError('Resume file exceeds the 2 MB size limit.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    const fd = new FormData();
    fd.append('resume', resumeFile);

    try {
      const res = await api.post(`/jobs/${id}/apply`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Application submitted successfully! Your resume and profile snapshot have been delivered to the hiring team.');
      setAlreadyApplied(true);
      setAppResult(res.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = score => {
    if (score >= 85) return '#10b981';
    if (score >= 70) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) return <div className="loading-state">Analyzing role requirements & portfolio alignment…</div>;
  if (!job) return <div className="error-state">Job posting not found.</div>;

  return (
    <div className="jobdetail-container">
      <Link to="/jobs" className="back-link">&larr; Back to all open jobs</Link>

      {/* Hero Header */}
      <div className="card job-header-card">
        <div className="header-flex">
          <div>
            <span className="company-badge">{job.company?.name}</span>
            <h1>{job.title}</h1>
            <p className="job-meta">
              📍 {job.location} &bull; 👥 {job.vacancies} {job.vacancies === 1 ? 'vacancy' : 'vacancies'}
              {job.salaryRange?.min && (
                <span> &bull; 💰 ${job.salaryRange.min.toLocaleString()} - ${job.salaryRange.max?.toLocaleString()}</span>
              )}
              {job.deadline && (
                <span> &bull; ⏳ Closes on {new Date(job.deadline).toLocaleDateString()}</span>
              )}
            </p>
          </div>

          {job.matchScore !== null && (
            <div
              className="score-hero-badge"
              style={{ borderColor: getScoreColor(job.matchScore), color: getScoreColor(job.matchScore) }}
            >
              <span className="score-hero-num">{job.matchScore}%</span>
              <span className="score-hero-label">Smart Match</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {success && <div className="success-banner" role="status">{success}</div>}

      <div className="job-details-columns">
        {/* Left Column: Job Description & Employer Requirements */}
        <div className="details-main">
          <div className="card section-card">
            <h3>Role Description</h3>
            <p className="job-full-desc">{job.description}</p>
          </div>

          <div className="card section-card">
            <h3>Employer Requirements & Mandatory Criteria</h3>
            <p className="muted">Any requirement the employer sets below becomes mandatory for applicants.</p>

            <div className="requirements-checklist">
              <div className="req-item">
                <strong>Core Required Skills:</strong>
                <div className="tags-cloud">
                  {job.requiredSkills?.map(s => {
                    const matched = (job.matchedSkills || []).includes(s.toLowerCase());
                    return (
                      <span key={s} className={`tag-chip ${matched ? 'chip-matched' : 'chip-missing'}`}>
                        {matched ? '✓ Matched: ' : '○ Missing: '}{s}
                      </span>
                    );
                  })}
                  {(!job.requiredSkills || job.requiredSkills.length === 0) && (
                    <span className="muted">No specific skill constraints.</span>
                  )}
                </div>
              </div>

              {job.minExperience > 0 && (
                <div className="req-item">
                  <strong>Minimum Experience:</strong>
                  <span> {job.minExperience} Years</span>
                </div>
              )}

              {job.minCgpa > 0 && (
                <div className="req-item">
                  <strong>Minimum Academic CGPA:</strong>
                  <span> {job.minCgpa} / 10.0</span>
                </div>
              )}

              {job.githubRequired && (
                <div className="req-item">
                  <strong>GitHub Profile:</strong>
                  <span> Mandatory (must provide GitHub repository URL)</span>
                </div>
              )}

              {job.linkedinRequired && (
                <div className="req-item">
                  <strong>LinkedIn Profile:</strong>
                  <span> Mandatory for recruiter identity check</span>
                </div>
              )}

              {job.preferredSkills?.length > 0 && (
                <div className="req-item">
                  <strong>Preferred Skills (Bonus Points):</strong>
                  <div className="tags-cloud">
                    {job.preferredSkills.map(s => <span key={s} className="sub-tag">{s}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Areas to Improve (Section 3.4) */}
          {job.improvementSuggestions?.length > 0 && (
            <div className="card section-card improvements-card">
              <h3>💡 Areas to Improve (Ordered by Score Impact)</h3>
              <p className="muted">Actionable suggestions that would add points to your match score for this role:</p>
              <div className="suggestions-list">
                {job.improvementSuggestions.map((sug, idx) => (
                  <div key={idx} className="suggestion-row">
                    <div className="sug-left">
                      <span className="sug-cat">{sug.category}</span>
                      <p className="sug-text">{sug.suggestion}</p>
                    </div>
                    {sug.pointsPossible > 0 && (
                      <span className="sug-pts">+{sug.pointsPossible} pts</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Score Breakdown & Tailored Resume Apply Box */}
        <div className="details-sidebar">
          {job.breakdown && (
            <div className="card section-card breakdown-card">
              <h3>Match Score Breakdown</h3>
              <div className="breakdown-bars">
                {Object.entries(job.breakdown).map(([k, score]) => (
                  <div key={k} className="bar-row">
                    <div className="bar-label-group">
                      <span className="bar-label">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                      <span className="bar-val">{score} pts</span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${Math.min(100, (score / 35) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Apply Box */}
          <div className="card apply-card">
            <h3>Apply for this Position</h3>
            {alreadyApplied ? (
              <div className="applied-success-box">
                <span className="check-icon">✓</span>
                <h4>You have already applied!</h4>
                <p className="muted">Your application status is: <strong>{job.applicationStatus || 'Under Review'}</strong></p>
                <Link to="/applications" className="primary full-width" style={{ textAlign: 'center', display: 'block', textDecoration: 'none' }}>
                  Track in My Applications &rarr;
                </Link>
              </div>
            ) : isSeeker ? (
              <form onSubmit={handleApply} className="apply-form">
                <p className="muted">
                  Attach a customized PDF resume for this opening (max 2 MB). Your profile details and verified portfolio will be snapshotted at apply time.
                </p>

                <label className="file-input-label">
                  Attach Tailored PDF Resume *
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    required
                    onChange={e => setResumeFile(e.target.files[0])}
                  />
                  {resumeFile && (
                    <span className="selected-filename">📄 {resumeFile.name} ({(resumeFile.size / 1024).toFixed(0)} KB)</span>
                  )}
                </label>

                <button
                  type="submit"
                  className="primary full-width"
                  disabled={submitting || !resumeFile}
                >
                  {submitting ? 'Submitting Application…' : 'Submit Application ➔'}
                </button>
              </form>
            ) : (
              <div>
                <p className="muted">Log in as a job seeker to submit your application for this position.</p>
                <Link to="/login" className="primary full-width" style={{ textAlign: 'center', display: 'block', textDecoration: 'none' }}>
                  Sign in to Apply
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
