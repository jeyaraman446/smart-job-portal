// client/src/pages/CompanyApplicants.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { errMsg } from '../api/axios';

export default function CompanyApplicants() {
  const { id } = useParams(); // Job ID
  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [minScoreFilter, setMinScoreFilter] = useState(0);

  // Selected applicants for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modals state
  const [activeSnapshot, setActiveSnapshot] = useState(null); // Applicant profile snapshot modal
  const [showAutoShortlistModal, setShowAutoShortlistModal] = useState(false);
  const [autoThreshold, setAutoThreshold] = useState(75);
  const [rejectBelowThreshold, setRejectBelowThreshold] = useState(false);
  const [autoInterviewDetails, setAutoInterviewDetails] = useState({
    date: '',
    time: '10:00 AM',
    mode: 'Google Meet',
    message: 'Congratulations! You have been auto-shortlisted based on your verified portfolio and top match score.',
  });

  // Single status change modal
  const [statusModalApp, setStatusModalApp] = useState(null);
  const [targetStatus, setTargetStatus] = useState('shortlisted');
  const [interviewForm, setInterviewForm] = useState({
    date: '',
    time: '10:00 AM',
    mode: 'Google Meet',
    message: 'We are impressed with your technical background and would love to invite you to an interview round.',
  });
  const [companyNote, setCompanyNote] = useState('');

  const fetchApplicants = async () => {
    try {
      const jobRes = await api.get(`/company/jobs/${id}`);
      setJob(jobRes.data);

      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (minScoreFilter > 0) params.minScore = minScoreFilter;

      const appRes = await api.get(`/company/jobs/${id}/applicants`, { params });
      setApplicants(appRes.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, [id, statusFilter, minScoreFilter]);

  // Checkbox selection
  const toggleSelect = appId => {
    const next = new Set(selectedIds);
    if (next.has(appId)) next.delete(appId);
    else next.add(appId);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === applicants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applicants.map(a => a._id)));
    }
  };

  // Submit Auto-Shortlist
  const handleAutoShortlist = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await api.post(`/company/jobs/${id}/auto-shortlist`, {
        threshold: autoThreshold,
        rejectBelow: rejectBelowThreshold,
        interviewDetails: autoInterviewDetails,
      });
      setSuccess(res.data.message);
      setShowAutoShortlistModal(false);
      fetchApplicants();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  // Submit Single Status Change
  const handleStatusChangeSubmit = async e => {
    e.preventDefault();
    if (!statusModalApp) return;
    setError('');
    setSuccess('');

    try {
      await api.patch(`/company/applications/${statusModalApp._id}/status`, {
        status: targetStatus,
        interviewDetails: (targetStatus === 'shortlisted' || targetStatus === 'interview') ? interviewForm : undefined,
        companyNote,
      });
      setSuccess(`Updated applicant status to "${targetStatus}". Notification and email sent.`);
      setStatusModalApp(null);
      setCompanyNote('');
      fetchApplicants();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  // Bulk status update
  const handleBulkAction = async status => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to change status to "${status}" for ${selectedIds.size} candidate(s)?`)) {
      return;
    }
    setError('');
    setSuccess('');

    try {
      const res = await api.post(`/company/jobs/${id}/bulk-status`, {
        applicationIds: Array.from(selectedIds),
        status,
        interviewDetails: (status === 'shortlisted' || status === 'interview') ? interviewForm : undefined,
      });
      setSuccess(res.data.message);
      setSelectedIds(new Set());
      fetchApplicants();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  // Download resume
  const handleDownloadResume = async appId => {
    try {
      const res = await api.get(`/applications/${appId}/resume`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Candidate_Resume_${appId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const getScoreColor = score => {
    if (score >= 85) return '#10b981';
    if (score >= 70) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) return <div className="loading-state">Ranking candidates by algorithmic match score…</div>;

  return (
    <div className="applicants-page-container">
      <Link to="/company/dashboard" className="back-link">&larr; Back to Dashboard</Link>

      {/* Header Banner */}
      <div className="card applicants-header-card">
        <div className="applicants-header-flex">
          <div>
            <span className="company-badge">Candidate Review Center</span>
            <h1>{job?.title}</h1>
            <p className="muted">
              📍 {job?.location} &bull; {applicants.length} total applicant(s) sorted by smart match score
            </p>
          </div>

          <button
            type="button"
            className="primary auto-shortlist-btn"
            onClick={() => setShowAutoShortlistModal(true)}
          >
            ⚡ Auto-Shortlist by Score Threshold
          </button>
        </div>
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}
      {success && <div className="success-banner" role="status">{success}</div>}

      {/* Filters and Bulk Actions Toolbar */}
      <div className="card filter-toolbar">
        <div className="filter-group">
          <label>
            Status:
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="applied">Applied (Pending)</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview">Interview</option>
              <option value="rejected">Rejected</option>
              <option value="hired">Hired</option>
            </select>
          </label>

          <label>
            Min Score:
            <select value={minScoreFilter} onChange={e => setMinScoreFilter(Number(e.target.value))}>
              <option value="0">All Scores (0%+)</option>
              <option value="50">50%+ Match</option>
              <option value="70">70%+ Match</option>
              <option value="85">85%+ Top Tier</option>
            </select>
          </label>
        </div>

        {selectedIds.size > 0 && (
          <div className="bulk-actions-group">
            <span>{selectedIds.size} selected:</span>
            <button type="button" className="secondary" onClick={() => handleBulkAction('shortlisted')}>
              Shortlist Selected
            </button>
            <button type="button" className="danger-btn" onClick={() => handleBulkAction('rejected')}>
              Reject Selected
            </button>
          </div>
        )}
      </div>

      {/* Applicants List */}
      {applicants.length === 0 ? (
        <div className="card empty-state">
          <h3>No matching applicants found</h3>
          <p className="muted">Try adjusting your status or minimum score filters.</p>
        </div>
      ) : (
        <div className="applicants-list">
          <div className="select-all-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={selectedIds.size === applicants.length && applicants.length > 0}
                onChange={toggleSelectAll}
              />
              <span>Select All Applicants ({applicants.length})</span>
            </label>
          </div>

          {applicants.map((app, index) => {
            const snap = app.profileSnapshot || {};
            return (
              <div key={app._id} className="card applicant-card">
                <div className="applicant-card-header">
                  <div className="checkbox-and-name">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(app._id)}
                      onChange={() => toggleSelect(app._id)}
                    />
                    <div>
                      <div className="name-and-rank">
                        <span className="rank-badge">#{index + 1}</span>
                        <h3>{snap.name || app.applicant?.name || 'Candidate'}</h3>
                        <span className={`status-pill status-${app.status}`}>
                          {app.status}
                        </span>
                      </div>
                      <p className="muted">
                        ✉️ {snap.mail_id || app.applicant?.mail_id} &bull; 📞 {snap.phone || 'No phone'} &bull; Applied: {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Match Score Badge */}
                  <div
                    className="score-badge"
                    style={{ borderColor: getScoreColor(app.matchScore), color: getScoreColor(app.matchScore) }}
                  >
                    <span className="score-num">{app.matchScore}%</span>
                    <span className="score-label">Match</span>
                  </div>
                </div>

                {/* Skills Breakdown */}
                <div className="applicant-skills-box">
                  <div className="matched-col">
                    <span className="skills-sub-title">Matched Core Skills:</span>
                    <div className="tags-cloud">
                      {app.matchedSkills?.map(s => <span key={s} className="tag-chip chip-matched">✓ {s}</span>)}
                      {(!app.matchedSkills || app.matchedSkills.length === 0) && <span className="muted">None</span>}
                    </div>
                  </div>

                  <div className="missing-col">
                    <span className="skills-sub-title">Missing Skills:</span>
                    <div className="tags-cloud">
                      {app.missingSkills?.map(s => <span key={s} className="tag-chip chip-missing">○ {s}</span>)}
                      {(!app.missingSkills || app.missingSkills.length === 0) && <span className="chip-all-good">✓ None missing!</span>}
                    </div>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="applicant-card-actions">
                  <div className="action-buttons-left">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setActiveSnapshot(app)}
                    >
                      🔍 View Profile Snapshot & Breakdown
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => handleDownloadResume(app._id)}
                    >
                      📄 Download PDF Resume
                    </button>
                  </div>

                  <div className="status-change-dropdown">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => {
                        setStatusModalApp(app);
                        setTargetStatus(app.status === 'applied' ? 'shortlisted' : app.status);
                      }}
                    >
                      Update Status / Schedule &rarr;
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Auto-Shortlist Modal */}
      {showAutoShortlistModal && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <h3>⚡ Automated Shortlist by Score Threshold</h3>
            <p className="muted">
              Applicants with a match score &ge; your threshold will automatically be moved to "shortlisted" and sent an interview invitation email.
            </p>

            <form onSubmit={handleAutoShortlist}>
              <label>
                Score Threshold (0 - 100) *
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={autoThreshold}
                  onChange={e => setAutoThreshold(Number(e.target.value))}
                />
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rejectBelowThreshold}
                  onChange={e => setRejectBelowThreshold(e.target.checked)}
                />
                <span>Also automatically reject applicants below this score threshold with feedback reasons</span>
              </label>

              <h4>Interview Call Details (Sent to shortlisted candidates):</h4>
              <div className="form-grid-2">
                <label>
                  Interview Date
                  <input
                    type="date"
                    value={autoInterviewDetails.date}
                    onChange={e => setAutoInterviewDetails({ ...autoInterviewDetails, date: e.target.value })}
                  />
                </label>
                <label>
                  Interview Mode
                  <input
                    placeholder="Google Meet / Zoom / Onsite"
                    value={autoInterviewDetails.mode}
                    onChange={e => setAutoInterviewDetails({ ...autoInterviewDetails, mode: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Message from Employer
                <textarea
                  rows={2}
                  value={autoInterviewDetails.message}
                  onChange={e => setAutoInterviewDetails({ ...autoInterviewDetails, message: e.target.value })}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setShowAutoShortlistModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Run Auto-Shortlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Status Change / Interview Modal */}
      {statusModalApp && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <h3>Update Candidate Status: {statusModalApp.profileSnapshot?.name}</h3>
            <form onSubmit={handleStatusChangeSubmit}>
              <label>
                New Status *
                <select value={targetStatus} onChange={e => setTargetStatus(e.target.value)}>
                  <option value="shortlisted">🌟 Shortlist Candidate</option>
                  <option value="interview">📞 Schedule Interview</option>
                  <option value="hired">🎉 Hire Candidate</option>
                  <option value="rejected">✕ Reject Candidate</option>
                </select>
              </label>

              {(targetStatus === 'shortlisted' || targetStatus === 'interview') && (
                <div className="interview-fields-box">
                  <h4>Interview Call Parameters (Email + Portal Alert):</h4>
                  <div className="form-grid-2">
                    <label>
                      Interview Date
                      <input
                        type="date"
                        value={interviewForm.date}
                        onChange={e => setInterviewForm({ ...interviewForm, date: e.target.value })}
                      />
                    </label>
                    <label>
                      Time
                      <input
                        placeholder="11:30 AM PST"
                        value={interviewForm.time}
                        onChange={e => setInterviewForm({ ...interviewForm, time: e.target.value })}
                      />
                    </label>
                  </div>
                  <label>
                    Meeting Mode
                    <input
                      placeholder="Google Meet link or Office Address"
                      value={interviewForm.mode}
                      onChange={e => setInterviewForm({ ...interviewForm, mode: e.target.value })}
                    />
                  </label>
                  <label>
                    Recruiter Message
                    <textarea
                      rows={2}
                      value={interviewForm.message}
                      onChange={e => setInterviewForm({ ...interviewForm, message: e.target.value })}
                    />
                  </label>
                </div>
              )}

              {targetStatus === 'rejected' && (
                <div className="rejection-fields-box">
                  <p className="muted">
                    Smart Job Portal will automatically attach the score breakdown and actionable improvement suggestions to their notification email.
                  </p>
                  <label>
                    Optional Feedback Note from Company:
                    <textarea
                      rows={2}
                      placeholder="e.g. Thank you for interviewing. We encourage applying for junior roles..."
                      value={companyNote}
                      onChange={e => setCompanyNote(e.target.value)}
                    />
                  </label>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setStatusModalApp(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Save & Dispatch Notifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Snapshot Viewer Modal */}
      {activeSnapshot && (
        <div className="modal-overlay" onClick={() => setActiveSnapshot(null)}>
          <div className="card modal-card snapshot-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header-line">
              <h2>Portfolio Snapshot: {activeSnapshot.profileSnapshot?.name}</h2>
              <button type="button" className="close-btn" onClick={() => setActiveSnapshot(null)}>&times;</button>
            </div>
            <p className="muted">Captured at application time ({new Date(activeSnapshot.createdAt).toLocaleString()}).</p>

            <div className="snapshot-content-scroll">
              <h4>Candidate Match Score Breakdown ({activeSnapshot.matchScore}%)</h4>
              {activeSnapshot.breakdown && (
                <div className="breakdown-grid">
                  {Object.entries(activeSnapshot.breakdown).map(([k, score]) => (
                    <div key={k} className="pill-chip">
                      <strong>{k}:</strong> {score} pts
                    </div>
                  ))}
                </div>
              )}

              <h4>Skills ({activeSnapshot.profileSnapshot?.skills?.length || 0})</h4>
              <div className="tags-cloud">
                {activeSnapshot.profileSnapshot?.skills?.map(s => <span key={s} className="tag-chip">{s}</span>)}
              </div>

              <h4>Portfolio Projects ({activeSnapshot.profileSnapshot?.projects?.length || 0})</h4>
              {activeSnapshot.profileSnapshot?.projects?.map(p => (
                <div key={p.title} className="sub-item-card">
                  <strong>{p.title}</strong>
                  {p.description && <p>{p.description}</p>}
                  {p.link && <a href={p.link} target="_blank" rel="noreferrer">Project Link &rarr;</a>}
                </div>
              ))}

              <h4>Work Experience ({activeSnapshot.profileSnapshot?.experience?.length || 0})</h4>
              {activeSnapshot.profileSnapshot?.experience?.map(exp => (
                <div key={exp.company} className="sub-item-card">
                  <strong>{exp.role} &bull; {exp.company}</strong> ({exp.years} yrs {exp.months} mos)
                  {exp.description && <p>{exp.description}</p>}
                </div>
              ))}

              <h4>Hackathons ({activeSnapshot.profileSnapshot?.hackathons?.length || 0})</h4>
              {activeSnapshot.profileSnapshot?.hackathons?.map(h => (
                <div key={h.name} className="sub-item-card">
                  <strong>{h.name} ({h.year})</strong> &bull; {h.status === 'won' ? '🏆 ' + h.position : 'Participant'}
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button type="button" className="primary" onClick={() => setActiveSnapshot(null)}>
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
