// client/src/pages/CompanyDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchJobs = async () => {
    try {
      const res = await api.get('/company/jobs');
      setJobs(res.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const toggleStatus = async (jobId, currentStatus) => {
    const nextStatus = currentStatus === 'open' ? 'closed' : 'open';
    try {
      await api.patch(`/company/jobs/${jobId}/status`, { status: nextStatus });
      setJobs(jobs.map(j => (j._id === jobId ? { ...j, status: nextStatus } : j)));
      setSuccess(`Job status updated to "${nextStatus}".`);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const deleteJob = async jobId => {
    if (!window.confirm('Are you sure you want to delete this job vacancy and all associated applicant records?')) {
      return;
    }
    try {
      await api.delete(`/company/jobs/${jobId}`);
      setJobs(jobs.filter(j => j._id !== jobId));
      setSuccess('Job posting deleted.');
    } catch (err) {
      setError(errMsg(err));
    }
  };

  if (loading) return <div className="loading-state">Loading company dashboard…</div>;

  return (
    <div className="company-dashboard-container">
      {/* Company Header */}
      <div className="card company-header-card">
        <div className="company-profile-summary">
          <div>
            <span className="role-tag">🏢 Company Employer Admin</span>
            <h1>{user?.name || 'Company Portal'}</h1>
            <p className="muted">
              📍 {user?.location || 'Corporate Headquarters'} &bull; ✉️ {user?.mail_id}
              {user?.website && <span> &bull; 🌐 <a href={user.website} target="_blank" rel="noreferrer">{user.website}</a></span>}
            </p>
          </div>

          <Link to="/company/post-job" className="primary post-job-btn">
            + Post New Job Vacancy
          </Link>
        </div>
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}
      {success && <div className="success-banner" role="status">{success}</div>}

      {/* Posted Jobs Section */}
      <div className="section-title-row">
        <h2>Your Published Job Vacancies ({jobs.length})</h2>
      </div>

      {jobs.length === 0 ? (
        <div className="card empty-state">
          <h3>No job vacancies published yet</h3>
          <p className="muted">Post your first opening to begin receiving AI-ranked candidate applications.</p>
          <Link to="/company/post-job" className="primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            + Create First Job Opening
          </Link>
        </div>
      ) : (
        <div className="company-jobs-list">
          {jobs.map(job => (
            <div key={job._id} className="card company-job-card">
              <div className="job-card-top-row">
                <div>
                  <div className="title-and-status">
                    <h3>{job.title}</h3>
                    <span className={`status-pill ${job.status === 'open' ? 'status-open' : 'status-closed'}`}>
                      {job.status === 'open' ? '● Open & Accepting Applicants' : '○ Closed'}
                    </span>
                  </div>
                  <p className="muted">
                    📍 {job.location} &bull; 👥 {job.vacancies} vacancies &bull; Posted on {new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="applicant-stat-chip">
                  <span className="stat-number">{job.applicantCount || 0}</span>
                  <span className="stat-label">Applicants</span>
                </div>
              </div>

              <div className="requirements-summary-row">
                <span className="req-summary-label">Mandatory Requirements:</span>
                <div className="tags-cloud">
                  {job.requiredSkills?.map(s => <span key={s} className="tag-chip chip-matched">{s}</span>)}
                  {job.minExperience > 0 && <span className="sub-tag">{job.minExperience}+ yrs exp</span>}
                  {job.minCgpa > 0 && <span className="sub-tag">CGPA &ge; {job.minCgpa}</span>}
                  {job.githubRequired && <span className="sub-tag">GitHub mandatory</span>}
                </div>
              </div>

              <div className="company-job-card-actions">
                <Link to={`/company/jobs/${job._id}/applicants`} className="primary view-candidates-btn">
                  Review Ranked Applicants ({job.applicantCount || 0}) &rarr;
                </Link>

                <div className="secondary-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => toggleStatus(job._id, job.status)}
                  >
                    {job.status === 'open' ? 'Close Job' : 'Reopen Job'}
                  </button>
                  <Link to={`/company/jobs/${job._id}/edit`} className="secondary">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => deleteJob(job._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
