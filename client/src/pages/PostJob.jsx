// client/src/pages/PostJob.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api, { errMsg } from '../api/axios';

export default function PostJob() {
  const { id } = useParams(); // If present, edit mode
  const nav = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    vacancies: 1,
    minSalary: '',
    maxSalary: '',
    deadline: '',
    requiredSkills: '',
    preferredSkills: '',
    minExperience: 0,
    minCgpa: 0,
    githubRequired: false,
    linkedinRequired: false,
    projectsRequired: false,
    programmingLangs: '',
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(Boolean(id));
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      api.get(`/company/jobs/${id}`)
        .then(res => {
          const j = res.data;
          setForm({
            title: j.title || '',
            description: j.description || '',
            location: j.location || '',
            vacancies: j.vacancies || 1,
            minSalary: j.salaryRange?.min || '',
            maxSalary: j.salaryRange?.max || '',
            deadline: j.deadline ? j.deadline.split('T')[0] : '',
            requiredSkills: (j.requiredSkills || []).join(', '),
            preferredSkills: (j.preferredSkills || []).join(', '),
            minExperience: j.minExperience || 0,
            minCgpa: j.minCgpa || 0,
            githubRequired: Boolean(j.githubRequired),
            linkedinRequired: Boolean(j.linkedinRequired),
            projectsRequired: Boolean(j.projectsRequired),
            programmingLangs: (j.languagesKnown?.programming || []).join(', '),
          });
        })
        .catch(err => setError(errMsg(err)))
        .finally(() => setFetching(false));
    }
  }, [id]);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      title: form.title,
      description: form.description,
      location: form.location,
      vacancies: Number(form.vacancies) || 1,
      salaryRange: form.minSalary ? { min: Number(form.minSalary), max: Number(form.maxSalary) || undefined } : undefined,
      deadline: form.deadline ? new Date(form.deadline) : undefined,
      requiredSkills: form.requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
      preferredSkills: form.preferredSkills.split(',').map(s => s.trim()).filter(Boolean),
      minExperience: Number(form.minExperience) || 0,
      minCgpa: Number(form.minCgpa) || 0,
      githubRequired: form.githubRequired,
      linkedinRequired: form.linkedinRequired,
      projectsRequired: form.projectsRequired,
      languagesKnown: {
        programming: form.programmingLangs.split(',').map(s => s.trim()).filter(Boolean),
        spoken: ['english'],
      },
    };

    try {
      if (id) {
        await api.put(`/company/jobs/${id}`, payload);
      } else {
        await api.post('/company/jobs', payload);
      }
      nav('/company/dashboard');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="loading-state">Loading job details…</div>;

  return (
    <div className="post-job-container">
      <Link to="/company/dashboard" className="back-link">&larr; Back to Dashboard</Link>

      <form className="card post-job-card" onSubmit={handleSubmit}>
        <div className="form-header">
          <h1>{id ? 'Edit Job Vacancy' : 'Publish New Job Vacancy'}</h1>
          <p className="muted">Specify role expectations, competencies, and automated mandatory candidate constraints.</p>
        </div>

        {/* Mandatory Rule Notice (Section 4.2) */}
        <div className="mandatory-policy-box">
          <span className="policy-icon">⚖️</span>
          <div>
            <strong>Automated Mandatory Requirements Rule:</strong>
            <p>
              Any requirement you fill in below will become <strong>mandatory</strong> for candidates.
              Applicants who do not satisfy your mandatory constraints (such as minimum years of experience or required GitHub link) will be blocked from applying.
              Requirements left empty remain optional.
            </p>
          </div>
        </div>

        {error && <div className="error-banner" role="alert">{error}</div>}

        <h3>1. Role Basics</h3>
        <label>
          Job Title *
          <input
            required
            placeholder="e.g. Senior Full Stack MERN Engineer"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
        </label>

        <label>
          Job Description *
          <textarea
            required
            rows={4}
            placeholder="Describe role responsibilities, deliverables, team culture, and day-to-day work..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </label>

        <div className="form-grid-2">
          <label>
            Location *
            <input
              required
              placeholder="e.g. San Francisco, CA / Remote"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
            />
          </label>

          <label>
            Number of Vacancies *
            <input
              type="number"
              min="1"
              required
              value={form.vacancies}
              onChange={e => setForm({ ...form, vacancies: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="form-grid-3">
          <label>
            Min Salary (USD)
            <input
              type="number"
              placeholder="e.g. 120000"
              value={form.minSalary}
              onChange={e => setForm({ ...form, minSalary: e.target.value })}
            />
          </label>
          <label>
            Max Salary (USD)
            <input
              type="number"
              placeholder="e.g. 160000"
              value={form.maxSalary}
              onChange={e => setForm({ ...form, maxSalary: e.target.value })}
            />
          </label>
          <label>
            Application Deadline
            <input
              type="date"
              value={form.deadline}
              onChange={e => setForm({ ...form, deadline: e.target.value })}
            />
          </label>
        </div>

        <h3>2. Technical Skills & Languages</h3>
        <label>
          Mandatory Required Skills (comma separated)
          <input
            placeholder="react, node, mongodb, typescript, express"
            value={form.requiredSkills}
            onChange={e => setForm({ ...form, requiredSkills: e.target.value })}
          />
          <span className="field-hint">Accounts missing any required skills will have points deducted and be flagged in reviews.</span>
        </label>

        <label>
          Preferred Skills (Bonus points, comma separated)
          <input
            placeholder="docker, aws, redis, tailwind"
            value={form.preferredSkills}
            onChange={e => setForm({ ...form, preferredSkills: e.target.value })}
          />
        </label>

        <label>
          Required Programming Languages (comma separated)
          <input
            placeholder="javascript, typescript, python"
            value={form.programmingLangs}
            onChange={e => setForm({ ...form, programmingLangs: e.target.value })}
          />
        </label>

        <h3>3. Mandatory Candidate Constraints</h3>
        <div className="form-grid-2">
          <label>
            Minimum Years of Experience
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.minExperience}
              onChange={e => setForm({ ...form, minExperience: Number(e.target.value) })}
            />
            <span className="field-hint">If set &gt; 0, candidates with less total experience cannot apply.</span>
          </label>

          <label>
            Minimum Academic CGPA (0 - 10)
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={form.minCgpa}
              onChange={e => setForm({ ...form, minCgpa: Number(e.target.value) })}
            />
            <span className="field-hint">If set &gt; 0, candidates below this threshold cannot apply.</span>
          </label>
        </div>

        <div className="checkbox-group-vertical">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.githubRequired}
              onChange={e => setForm({ ...form, githubRequired: e.target.checked })}
            />
            <span><strong>Mandatory GitHub Profile:</strong> Applicants must have a verified GitHub URL in their portfolio.</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.linkedinRequired}
              onChange={e => setForm({ ...form, linkedinRequired: e.target.checked })}
            />
            <span><strong>Mandatory LinkedIn Profile:</strong> Applicants must provide a LinkedIn identity link.</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.projectsRequired}
              onChange={e => setForm({ ...form, projectsRequired: e.target.checked })}
            />
            <span><strong>Mandatory Portfolio Projects:</strong> Applicants must have at least 1 verified project listed.</span>
          </label>
        </div>

        <div className="form-submit-row">
          <button type="submit" className="primary full-width" disabled={loading}>
            {loading ? 'Saving Job Posting…' : id ? 'Update Job Vacancy' : 'Publish Job Vacancy ➔'}
          </button>
        </div>
      </form>
    </div>
  );
}
