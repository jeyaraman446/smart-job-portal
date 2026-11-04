// client/src/pages/MyApplications.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api/axios';

export default function MyApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchApps = async () => {
    try {
      const res = await api.get('/applications/mine');
      setApps(res.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const getStatusBadge = status => {
    switch (status) {
      case 'shortlisted':
        return <span className="status-badge status-shortlisted">🌟 Shortlisted</span>;
      case 'interview':
        return <span className="status-badge status-interview">📞 Interview Scheduled</span>;
      case 'hired':
        return <span className="status-badge status-hired">🎉 Hired</span>;
      case 'rejected':
        return <span className="status-badge status-rejected">✕ Not Selected</span>;
      default:
        return <span className="status-badge status-applied">⏳ Under Review</span>;
    }
  };

  const getScoreColor = score => {
    if (score >= 85) return '#10b981';
    if (score >= 70) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) return <div className="loading-state">Loading your submitted applications…</div>;

  return (
    <div className="applications-container">
      <div className="section-header-banner card">
        <h1>My Applications ({apps.length})</h1>
        <p className="muted">Track your job applications, algorithmic match scores, and interview notifications.</p>
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {apps.length === 0 ? (
        <div className="card empty-state">
          <h3>No applications submitted yet</h3>
          <p className="muted">Explore open positions and apply with your customized resume.</p>
          <Link to="/jobs" className="primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Browse Job Vacancies &rarr;
          </Link>
        </div>
      ) : (
        <div className="applications-list">
          {apps.map(app => {
            const hasInterview = (app.status === 'shortlisted' || app.status === 'interview') && app.interviewDetails;
            const hasRejection = app.status === 'rejected' && (app.rejectionReasons?.length > 0 || app.companyNote);

            return (
              <div key={app._id} className="card app-card">
                <div className="app-card-top">
                  <div>
                    <span className="company-badge">{app.company?.name || 'Verified Company'}</span>
                    <h3 className="app-job-title">{app.job?.title}</h3>
                    <p className="muted">
                      Applied on {new Date(app.createdAt).toLocaleDateString()} &bull; 📍 {app.job?.location}
                    </p>
                  </div>

                  <div className="app-badges-group">
                    <div
                      className="score-badge"
                      style={{ borderColor: getScoreColor(app.matchScore), color: getScoreColor(app.matchScore) }}
                      title="Resume Match Score"
                    >
                      <span className="score-num">{app.matchScore}%</span>
                      <span className="score-label">Match</span>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                </div>

                {/* Interview Call Box */}
                {hasInterview && (
                  <div className="interview-call-box">
                    <h4>🎉 Interview Call Information</h4>
                    <div className="interview-meta-grid">
                      <div>
                        <strong>Mode:</strong> {app.interviewDetails.mode || 'Remote Video'}
                      </div>
                      <div>
                        <strong>Date:</strong> {app.interviewDetails.date ? new Date(app.interviewDetails.date).toLocaleDateString() : 'To be coordinated'}
                      </div>
                      <div>
                        <strong>Time:</strong> {app.interviewDetails.time || 'Check email'}
                      </div>
                    </div>
                    {app.interviewDetails.message && (
                      <p className="interview-note">
                        <strong>Recruiter Message:</strong> "{app.interviewDetails.message}"
                      </p>
                    )}
                  </div>
                )}

                {/* Rejection Feedback Box */}
                {hasRejection && (
                  <div className="rejection-feedback-box">
                    <h4>💡 Feedback & Areas to Improve</h4>
                    {app.companyNote && (
                      <p className="company-note-text">
                        <strong>Note from employer:</strong> "{app.companyNote}"
                      </p>
                    )}
                    {app.rejectionReasons?.length > 0 && (
                      <ul className="reasons-list">
                        {app.rejectionReasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                <div className="app-card-bottom">
                  <span className="resume-tag">
                    📄 Resume: {app.resumeFileName || 'Submitted_Resume.pdf'}
                  </span>
                  <Link to={`/jobs/${app.job?._id}`} className="view-link">
                    View Job Requirements &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
