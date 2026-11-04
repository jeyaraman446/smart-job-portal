import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { errMsg, getFileUrl } from '../api/axios';

const STATUSES = ['applied', 'shortlisted', 'interview', 'rejected', 'hired'];

const BREAKDOWN_LABELS = {
  requiredSkills: 'Required Skills (40 max)',
  preferredSkills: 'Preferred Skills (15 max)',
  projects: 'Projects Built (15 max)',
  experience: 'Work Experience (8 max)',
  internships: 'Internships (7 max)',
  hackathons: 'Hackathons Attended (10 max)',
  exams: 'Competitive Exams (5 max)',
};

const BREAKDOWN_MAX = {
  requiredSkills: 40,
  preferredSkills: 15,
  projects: 15,
  experience: 8,
  internships: 7,
  hackathons: 10,
  exams: 5,
};

function CandidateModal({ app, job, onClose, onStatusChange, onFeedbackSave }) {
  const applicant = app.applicant || {};
  const breakdown = app.matchBreakdown || {};
  const [status, setStatus] = useState(app.status);
  const [feedback, setFeedback] = useState(app.feedback || '');
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  const handleStatusChange = async newStatus => {
    setStatus(newStatus);
    onStatusChange(app._id, newStatus);
  };

  const handleSaveFeedback = async () => {
    setSaving(true);
    await onFeedbackSave(app._id, feedback);
    setSaving(false);
    setSavedNote(true);
    setTimeout(() => setSavedNote(false), 3000);
  };

  const resumeUrl = app.resumeUrl ? getFileUrl(app.resumeUrl) : null;
  const required = job.requiredSkills || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card card candidate-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{applicant.name}</h2>
            <p className="candidate-headline">{applicant.headline || 'Candidate Profile'}</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Quick Contact & Links Bar */}
        <div className="candidate-quick-bar">
          <div className="candidate-contacts">
            <span>📧 {applicant.email}</span>
            {applicant.phone && <span>📞 {applicant.phone}</span>}
            {applicant.location && <span>📍 {applicant.location}</span>}
            {applicant.experienceYears !== undefined && (
              <span>💼 {applicant.experienceYears} Years Full-Time Exp</span>
            )}
          </div>

          <div className="candidate-external-links">
            {applicant.github && (
              <a href={applicant.github} target="_blank" rel="noreferrer" className="btn btn-sm">
                GitHub ↗
              </a>
            )}
            {applicant.linkedin && (
              <a href={applicant.linkedin} target="_blank" rel="noreferrer" className="btn btn-sm">
                LinkedIn ↗
              </a>
            )}
            {resumeUrl && (
              <a href={resumeUrl} target="_blank" rel="noreferrer" className="btn btn-sm primary">
                📄 View Resume PDF ↗
              </a>
            )}
          </div>
        </div>

        {/* Overall Match Score Breakdown */}
        <div className="candidate-score-banner">
          <div className={`score-badge ${app.matchScore >= 75 ? 'shi' : app.matchScore >= 50 ? 'smid' : 'slo'}`}>
            <span className="score-num">{app.matchScore}%</span>
            <span className="score-lbl">Smart Fit</span>
          </div>

          <div className="score-breakdown-details">
            <h3>Automated Match Score Analysis</h3>
            <div className="breakdown-grid">
              {Object.entries(breakdown).map(([k, score]) => {
                const max = BREAKDOWN_MAX[k] || 10;
                const pct = Math.min(100, Math.round((score / max) * 100));
                return (
                  <div key={k} className="breakdown-item">
                    <div className="breakdown-label-row">
                      <span>{BREAKDOWN_LABELS[k] || k}</span>
                      <strong>{score}/{max}</strong>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Applicant Note */}
        {app.coverNote && (
          <div className="candidate-note-card">
            <strong>Candidate Cover Note:</strong>
            <p>"{app.coverNote}"</p>
          </div>
        )}

        {/* Skills Alignment */}
        <div className="candidate-section">
          <h3>Skills Comparison</h3>
          <div className="skills-audit">
            <div>
              <span className="section-label">Candidate Skills ({applicant.skills?.length || 0}):</span>
              <div className="tags-inline">
                {(applicant.skills || []).map(s => {
                  const isHit = required.includes(s.toLowerCase());
                  return (
                    <span key={s} className={`skill-pill ${isHit ? 'skill-hit' : 'tag'}`}>
                      {isHit ? '✓ ' : ''}{s}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="candidate-section">
          <h3>Projects Built ({applicant.projects?.length || 0})</h3>
          {(!applicant.projects || applicant.projects.length === 0) ? (
            <p className="muted">No projects listed.</p>
          ) : (
            <div className="candidate-cards-list">
              {applicant.projects.map((proj, idx) => (
                <div key={idx} className="sub-detail-card">
                  <div className="sub-detail-header">
                    <strong>{proj.title}</strong>
                    {proj.link && (
                      <a href={proj.link} target="_blank" rel="noreferrer" className="link">
                        Link ↗
                      </a>
                    )}
                  </div>
                  {proj.description && <p className="muted">{proj.description}</p>}
                  {proj.techStack?.length > 0 && (
                    <div className="tags-inline">
                      {proj.techStack.map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Internships & Experience */}
        <div className="candidate-section">
          <h3>Internships & Work Experience ({applicant.internships?.length || 0})</h3>
          {(!applicant.internships || applicant.internships.length === 0) ? (
            <p className="muted">No internships listed.</p>
          ) : (
            <div className="candidate-cards-list">
              {applicant.internships.map((intern, idx) => (
                <div key={idx} className="sub-detail-card">
                  <div className="sub-detail-header">
                    <strong>{intern.role}</strong> at <strong>{intern.company}</strong>
                    {intern.durationMonths && <span className="muted">({intern.durationMonths} months)</span>}
                  </div>
                  {intern.description && <p className="muted">{intern.description}</p>}
                  {intern.techStack?.length > 0 && (
                    <div className="tags-inline">
                      {intern.techStack.map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hackathons */}
        <div className="candidate-section">
          <h3>Hackathons Attended ({applicant.hackathons?.length || 0})</h3>
          {(!applicant.hackathons || applicant.hackathons.length === 0) ? (
            <p className="muted">No hackathons listed.</p>
          ) : (
            <div className="candidate-cards-list">
              {applicant.hackathons.map((h, idx) => (
                <div key={idx} className="sub-detail-card">
                  <div className="sub-detail-header">
                    <strong>{h.name}</strong>
                    {h.position && <span className="position-tag">{h.position}</span>}
                    {h.year && <span className="muted">({h.year})</span>}
                  </div>
                  {h.techUsed?.length > 0 && (
                    <div className="tags-inline">
                      {h.techUsed.map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Competitive Exams */}
        <div className="candidate-section">
          <h3>Competitive Exams & Problem Solving ({applicant.competitiveExams?.length || 0})</h3>
          {(!applicant.competitiveExams || applicant.competitiveExams.length === 0) ? (
            <p className="muted">No competitive exam scores listed.</p>
          ) : (
            <div className="candidate-cards-list">
              {applicant.competitiveExams.map((ex, idx) => (
                <div key={idx} className="sub-detail-card">
                  <div className="sub-detail-header">
                    <strong>{ex.name}</strong>
                    {ex.rank && <span>Rank: #{ex.rank}</span>}
                    {ex.score && <span>Score/Rating: {ex.score}</span>}
                    {ex.year && <span className="muted">({ex.year})</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hiring Decision & Feedback Controls */}
        <div className="candidate-decision-box">
          <div className="decision-status-row">
            <label>
              Application Status:
              <select value={status} onChange={e => handleStatusChange(e.target.value)}>
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Recruiter Feedback / Notes:
            <textarea
              placeholder="Add interview notes, strengths, or candidate remarks…"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={2}
            />
          </label>

          <div className="row spread" style={{ alignItems: 'center', marginTop: '0.4rem' }}>
            {savedNote ? <span style={{ color: 'var(--good)' }}>✓ Feedback remarks saved!</span> : <span></span>}
            <button
              type="button"
              className="primary"
              onClick={handleSaveFeedback}
              disabled={saving}
            >
              {saving ? 'Saving Notes…' : 'Save Review Remarks'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RankedCandidates() {
  const { jobId } = useParams();
  const [data, setData] = useState(null);
  const [minScore, setMinScore] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');

  const load = () => {
    api.get(`/jobs/${jobId}/applicants`, {
      params: { minScore, status: statusFilter, search: searchTerm },
    })
      .then(r => setData(r.data))
      .catch(e => setError(errMsg(e)));
  };

  useEffect(() => { load(); }, [minScore, statusFilter]); // eslint-disable-line

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/applications/${id}/status`, { status });
      setNotification(`Application status updated to "${status}".`);
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const saveFeedback = async (id, feedback) => {
    try {
      await api.patch(`/applications/${id}/status`, { feedback });
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading ranked candidate pool…</p>
      </div>
    );
  }

  const { job, applicants = [], stats = {} } = data;
  const required = job.requiredSkills || [];

  return (
    <div className="stack ranked-candidates-page">
      <div className="back-nav-row">
        <Link to="/hr" className="link">← Back to Vacancies Dashboard</Link>
      </div>

      <div className="page-header">
        <div>
          <h1>{job.title}</h1>
          <p className="muted">
            Candidates ranked automatically by skill alignment, projects built, hackathons, internships, and competitive exam scores.
          </p>
        </div>
        <div className="job-status-pill-wrap">
          <span className={`pill ${job.status === 'open' ? 'pill-open' : 'pill-closed'}`}>
            {job.status === 'open' ? '● Open Vacancy' : '○ Closed'}
          </span>
        </div>
      </div>

      {notification && (
        <div className="notice notice-good" role="alert">
          {notification}
          <button type="button" className="close-notice-btn" onClick={() => setNotification('')}>✕</button>
        </div>
      )}

      {/* Analytics Summary */}
      <div className="stats-grid">
        <div className="card stat-card">
          <span className="stat-num">{stats.total || 0}</span>
          <span className="stat-label">Total Applicants</span>
        </div>
        <div className="card stat-card">
          <span className="stat-num" style={{ color: 'var(--brand)' }}>{stats.averageScore || 0}%</span>
          <span className="stat-label">Average Match Score</span>
        </div>
        <div className="card stat-card">
          <span className="stat-num" style={{ color: 'var(--good)' }}>{stats.highFit || 0}</span>
          <span className="stat-label">High-Fit Candidates (≥70%)</span>
        </div>
        <div className="card stat-card">
          <span className="stat-num" style={{ color: 'var(--warn)' }}>{stats.shortlisted || 0}</span>
          <span className="stat-label">Shortlisted Candidates</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card filter-container">
        <form
          className="search-row"
          onSubmit={e => { e.preventDefault(); load(); }}
        >
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              placeholder="Search candidate by name, email, or skill…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="submit" className="primary search-btn">Filter Candidates</button>
        </form>

        <div className="filters-row">
          <div className="filter-item">
            <label>Application Status:</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses ({stats.total || 0})</option>
              {STATUSES.map(s => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="filter-item score-slider-item">
            <label>Minimum Match Score: <strong>{minScore}%</strong></label>
            <input
              type="range"
              min="0"
              max="95"
              step="5"
              value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Ranked Candidate List */}
      {applicants.length === 0 ? (
        <div className="card empty-state">
          <h3>No candidates match this criteria</h3>
          <p className="muted">Try lowering the minimum match score or changing the status filter.</p>
        </div>
      ) : (
        <div className="ranked-table-card card">
          <div className="scroll">
            <table className="candidates-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Candidate Profile</th>
                  <th>Smart Match</th>
                  <th>Skills Audit</th>
                  <th>Portfolio & Extra Signals</th>
                  <th>Status Decision</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((a, i) => {
                  const u = a.applicant || {};
                  return (
                    <tr key={a._id} className="candidate-row">
                      <td className="rank-cell">
                        <span className={`rank-badge rank-${i + 1}`}>#{i + 1}</span>
                      </td>

                      <td className="candidate-profile-cell">
                        <strong>{u.name}</strong>
                        {u.headline && <div className="headline-text">{u.headline}</div>}
                        <div className="muted contact-sub">
                          {u.email} • {u.experienceYears ?? 0} yrs exp
                        </div>
                      </td>

                      <td className="score-cell">
                        <div className={`score-badge score-sm ${a.matchScore >= 75 ? 'shi' : a.matchScore >= 50 ? 'smid' : 'slo'}`}>
                          <span className="score-num">{a.matchScore}%</span>
                        </div>
                      </td>

                      <td className="skills-cell">
                        <div className="tags-inline">
                          {(u.skills || []).map(s => {
                            const isMatch = required.includes(s.toLowerCase());
                            return (
                              <span key={s} className={`skill-pill ${isMatch ? 'skill-hit' : 'tag'}`}>
                                {isMatch ? '✓ ' : ''}{s}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="signals-cell">
                        <div className="signal-chip">💻 {u.projects?.length || 0} projects</div>
                        <div className="signal-chip">💼 {u.internships?.length || 0} internships</div>
                        <div className="signal-chip">🏆 {u.hackathons?.length || 0} hackathons</div>
                        <div className="signal-chip">📊 {u.competitiveExams?.length || 0} exams</div>
                      </td>

                      <td className="status-cell">
                        <select
                          value={a.status}
                          onChange={e => setStatus(a._id, e.target.value)}
                          className={`status-select status-${a.status}`}
                          aria-label={`Status for ${u.name}`}
                        >
                          {STATUSES.map(s => (
                            <option key={s} value={s}>{s.toUpperCase()}</option>
                          ))}
                        </select>
                      </td>

                      <td className="actions-cell">
                        <button
                          type="button"
                          className="btn btn-sm primary"
                          onClick={() => setSelectedApplicant(a)}
                        >
                          Inspect Profile →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full Candidate Modal */}
      {selectedApplicant && (
        <CandidateModal
          app={selectedApplicant}
          job={job}
          onClose={() => setSelectedApplicant(null)}
          onStatusChange={(id, status) => {
            setStatus(id, status);
            setSelectedApplicant(prev => ({ ...prev, status }));
          }}
          onFeedbackSave={(id, feedback) => {
            saveFeedback(id, feedback);
            setSelectedApplicant(prev => ({ ...prev, feedback }));
          }}
        />
      )}
    </div>
  );
}
