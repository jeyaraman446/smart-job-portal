// client/src/pages/JobList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function JobList() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search filters
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');

  const fetchJobs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (locationFilter.trim()) params.location = locationFilter.trim();
      if (skillFilter.trim()) params.skill = skillFilter.trim();

      const res = await api.get('/jobs', { params });
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

  const handleSearchSubmit = e => {
    e.preventDefault();
    fetchJobs();
  };

  const getScoreColor = score => {
    if (score >= 85) return '#10b981';
    if (score >= 70) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="joblist-container">
      <div className="search-hero card">
        <h1>Explore Open Job Vacancies</h1>
        <p className="muted">Intelligent resume matching analyzes your portfolio against live company criteria in real-time.</p>

        <form onSubmit={handleSearchSubmit} className="search-filter-grid">
          <input
            placeholder="Search by role title (e.g. MERN, DevOps, Full Stack)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <input
            placeholder="Location (e.g. San Francisco, Remote)"
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
          />
          <input
            placeholder="Skill (e.g. react, node, aws)"
            value={skillFilter}
            onChange={e => setSkillFilter(e.target.value)}
          />
          <button type="submit" className="primary">Filter Jobs</button>
        </form>
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {loading ? (
        <div className="loading-state">Scanning opportunities & calculating smart match scores…</div>
      ) : jobs.length === 0 ? (
        <div className="card empty-state">
          <h3>No matching job vacancies found</h3>
          <p className="muted">Try adjusting your keyword, skill, or location filters.</p>
          <button type="button" className="secondary" onClick={() => { setSearch(''); setLocationFilter(''); setSkillFilter(''); fetchJobs(); }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="jobs-grid">
          {jobs.map(job => {
            const hasScore = job.matchScore !== null && job.matchScore !== undefined;
            return (
              <div key={job._id} className="card job-card">
                <div className="job-card-header">
                  <div>
                    <span className="company-badge">{job.company?.name || 'Verified Employer'}</span>
                    <h3 className="job-title">{job.title}</h3>
                    <p className="job-meta">
                      📍 {job.location} &bull; 👥 {job.vacancies} {job.vacancies === 1 ? 'opening' : 'openings'}
                      {job.salaryRange?.min && (
                        <span> &bull; 💰 ${job.salaryRange.min.toLocaleString()} - ${job.salaryRange.max?.toLocaleString()}</span>
                      )}
                    </p>
                  </div>

                  {hasScore && (
                    <div
                      className="score-badge"
                      style={{ borderColor: getScoreColor(job.matchScore), color: getScoreColor(job.matchScore) }}
                      title="Your algorithmic portfolio match score"
                    >
                      <span className="score-num">{job.matchScore}%</span>
                      <span className="score-label">Match</span>
                    </div>
                  )}
                </div>

                <p className="job-desc-preview">{job.description}</p>

                {/* Skills Preview */}
                <div className="job-skills-preview">
                  <div className="skills-subgroup">
                    <span className="skills-group-title">Mandatory Requirements:</span>
                    <div className="tags-cloud">
                      {job.requiredSkills?.map(s => {
                        const isMatched = (job.matchedSkills || []).includes(s.toLowerCase());
                        return (
                          <span key={s} className={`tag-chip ${isMatched ? 'chip-matched' : 'chip-missing'}`}>
                            {isMatched ? '✓ ' : '○ '}{s}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {job.preferredSkills?.length > 0 && (
                    <div className="skills-subgroup">
                      <span className="skills-group-title">Preferred Bonus:</span>
                      <div className="tags-cloud">
                        {job.preferredSkills.map(s => (
                          <span key={s} className="sub-tag">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="job-card-footer">
                  {job.alreadyApplied ? (
                    <span className="applied-pill">✓ Applied</span>
                  ) : (
                    <span className="ready-pill">Available to Apply</span>
                  )}
                  <Link to={`/jobs/${job._id}`} className="view-details-btn">
                    View Match Breakdown & Apply &rarr;
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
