// client/src/pages/SeekerProfile.jsx
import { useState, useEffect } from 'react';
import api, { errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function SeekerProfile() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Skill input
  const [newSkill, setNewSkill] = useState('');
  // Project modal / form
  const [projForm, setProjForm] = useState({ title: '', description: '', techStack: '', link: '' });
  const [showProjModal, setShowProjModal] = useState(false);
  // Hackathon modal / form
  const [hackForm, setHackForm] = useState({ name: '', year: 2024, status: 'participated', position: '', techUsed: '' });
  const [showHackModal, setShowHackModal] = useState(false);
  // Experience modal / form
  const [expForm, setExpForm] = useState({ company: '', role: '', years: 1, months: 0, description: '' });
  const [showExpModal, setShowExpModal] = useState(false);
  // Internship modal / form
  const [internForm, setInternForm] = useState({ company: '', role: '', duration: '3 months', durationMonths: 3, description: '' });
  const [showInternModal, setShowInternModal] = useState(false);
  // Education modal / form
  const [eduForm, setEduForm] = useState({ level: 'Degree', boardOrUniversity: '', percentageOrCgpa: 8.5, year: 2024 });
  const [showEduModal, setShowEduModal] = useState(false);

  // Resume upload
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  const loadProfile = async () => {
    try {
      const res = await api.get('/profile');
      setProfile(res.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const saveOverall = async e => {
    if (e) e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/profile', {
        name: profile.name,
        phone: profile.phone,
        github: profile.github,
        linkedin: profile.linkedin,
        cgpa: profile.cgpa,
        interests: profile.interests,
        degree: profile.degree,
      });
      setProfile(res.data.user);
      setSuccess('Profile updated successfully!');
      refreshUser();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  // Add skill
  const handleAddSkill = async e => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    try {
      const res = await api.post('/profile/skills', { skill: newSkill });
      setProfile({ ...profile, skills: res.data.skills });
      setNewSkill('');
      setSuccess('Skill added!');
    } catch (err) {
      setError(errMsg(err));
    }
  };

  // Remove skill
  const handleRemoveSkill = async skill => {
    try {
      const res = await api.delete(`/profile/skills/${encodeURIComponent(skill)}`);
      setProfile({ ...profile, skills: res.data.skills });
    } catch (err) {
      setError(errMsg(err));
    }
  };

  // Add project
  const handleAddProject = async e => {
    e.preventDefault();
    try {
      const res = await api.post('/profile/projects', {
        ...projForm,
        techStack: projForm.techStack.split(',').map(s => s.trim()).filter(Boolean),
      });
      setProfile({ ...profile, projects: res.data.projects });
      setShowProjModal(false);
      setProjForm({ title: '', description: '', techStack: '', link: '' });
      setSuccess('Project added!');
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handleDeleteProject = async id => {
    try {
      const res = await api.delete(`/profile/projects/${id}`);
      setProfile({ ...profile, projects: res.data.projects });
    } catch (err) {
      setError(errMsg(err));
    }
  };

  // Add Hackathon
  const handleAddHackathon = async e => {
    e.preventDefault();
    try {
      const res = await api.post('/profile/hackathons', {
        ...hackForm,
        techUsed: hackForm.techUsed.split(',').map(s => s.trim()).filter(Boolean),
      });
      setProfile({ ...profile, hackathons: res.data.hackathons });
      setShowHackModal(false);
      setHackForm({ name: '', year: 2024, status: 'participated', position: '', techUsed: '' });
      setSuccess('Hackathon added!');
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handleDeleteHackathon = async id => {
    try {
      const res = await api.delete(`/profile/hackathons/${id}`);
      setProfile({ ...profile, hackathons: res.data.hackathons });
    } catch (err) {
      setError(errMsg(err));
    }
  };

  // Add Experience
  const handleAddExperience = async e => {
    e.preventDefault();
    try {
      const res = await api.post('/profile/experience', expForm);
      setProfile({ ...profile, experience: res.data.experience });
      setShowExpModal(false);
      setExpForm({ company: '', role: '', years: 1, months: 0, description: '' });
      setSuccess('Experience added!');
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handleDeleteExperience = async id => {
    try {
      const res = await api.delete(`/profile/experience/${id}`);
      setProfile({ ...profile, experience: res.data.experience });
    } catch (err) {
      setError(errMsg(err));
    }
  };

  // Add Internship
  const handleAddInternship = async e => {
    e.preventDefault();
    try {
      const res = await api.post('/profile/internships', internForm);
      setProfile({ ...profile, internships: res.data.internships });
      setShowInternModal(false);
      setInternForm({ company: '', role: '', duration: '3 months', durationMonths: 3, description: '' });
      setSuccess('Internship added!');
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handleDeleteInternship = async id => {
    try {
      const res = await api.delete(`/profile/internships/${id}`);
      setProfile({ ...profile, internships: res.data.internships });
    } catch (err) {
      setError(errMsg(err));
    }
  };

  // Add Education
  const handleAddEducation = async e => {
    e.preventDefault();
    try {
      const res = await api.post('/profile/education', eduForm);
      setProfile({ ...profile, education: res.data.education });
      setShowEduModal(false);
      setEduForm({ level: 'Degree', boardOrUniversity: '', percentageOrCgpa: 8.5, year: 2024 });
      setSuccess('Education record added!');
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handleDeleteEducation = async id => {
    try {
      const res = await api.delete(`/profile/education/${id}`);
      setProfile({ ...profile, education: res.data.education });
    } catch (err) {
      setError(errMsg(err));
    }
  };

  // Resume upload
  const handleResumeUpload = async e => {
    e.preventDefault();
    if (!resumeFile) return;
    setUploadingResume(true);
    setError('');
    setSuccess('');

    const fd = new FormData();
    fd.append('resume', resumeFile);

    try {
      const res = await api.post('/profile/resume', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile({
        ...profile,
        resumeUrl: res.data.resumeUrl,
        resumeFileName: res.data.resumeFileName,
        skills: res.data.skills,
      });
      setSuccess(res.data.message || 'Resume uploaded and technical skills extracted!');
      setResumeFile(null);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setUploadingResume(false);
    }
  };

  if (loading) return <div className="loading-state">Loading your profile portfolio…</div>;
  if (!profile) return <div className="error-state">Failed to load profile.</div>;

  return (
    <div className="profile-container">
      <div className="profile-header-banner card">
        <div className="header-info">
          <h2>{profile.name}</h2>
          <p className="muted">{profile.mail_id} &bull; Total Experience: <strong>{profile.totalExperienceYears || 0} Years</strong></p>
          <div className="profile-links-row">
            {profile.github && (
              <a href={profile.github} target="_blank" rel="noreferrer" className="pill-link">
                GitHub &rarr;
              </a>
            )}
            {profile.linkedin && (
              <a href={profile.linkedin} target="_blank" rel="noreferrer" className="pill-link">
                LinkedIn &rarr;
              </a>
            )}
            {profile.cgpa > 0 && <span className="pill-chip">CGPA: {profile.cgpa}</span>}
          </div>
        </div>

        {/* Resume Box */}
        <div className="resume-box">
          <h4>📄 Resume Document</h4>
          {profile.resumeUrl ? (
            <p className="resume-status-text">
              Current: <strong>{profile.resumeFileName || 'Uploaded Resume.pdf'}</strong>
            </p>
          ) : (
            <p className="muted">No resume uploaded yet.</p>
          )}

          <form onSubmit={handleResumeUpload} className="resume-upload-form">
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={e => setResumeFile(e.target.files[0])}
            />
            <button type="submit" className="secondary" disabled={!resumeFile || uploadingResume}>
              {uploadingResume ? 'Parsing…' : 'Upload & Parse Skills'}
            </button>
          </form>
        </div>
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}
      {success && <div className="success-banner" role="status">{success}</div>}

      {/* Basic Profile Details Form */}
      <form onSubmit={saveOverall} className="card section-card">
        <h3>Core Profile & Links</h3>
        <div className="form-grid-2">
          <label>
            Full Name
            <input
              value={profile.name || ''}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
            />
          </label>
          <label>
            Phone Number
            <input
              value={profile.phone || ''}
              onChange={e => setProfile({ ...profile, phone: e.target.value })}
            />
          </label>
          <label>
            GitHub Profile URL
            <input
              placeholder="https://github.com/username"
              value={profile.github || ''}
              onChange={e => setProfile({ ...profile, github: e.target.value })}
            />
          </label>
          <label>
            LinkedIn Profile URL
            <input
              placeholder="https://linkedin.com/in/username"
              value={profile.linkedin || ''}
              onChange={e => setProfile({ ...profile, linkedin: e.target.value })}
            />
          </label>
          <label>
            Cumulative CGPA (0 - 10)
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={profile.cgpa || ''}
              onChange={e => setProfile({ ...profile, cgpa: e.target.value })}
            />
          </label>
          <label>
            Interests (comma separated)
            <input
              placeholder="cloud, distributed systems, machine learning"
              value={(profile.interests || []).join(', ')}
              onChange={e => setProfile({ ...profile, interests: e.target.value.split(',').map(s => s.trim()) })}
            />
          </label>
        </div>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Core Details'}
        </button>
      </form>

      {/* Skills Section */}
      <div className="card section-card">
        <div className="section-title-row">
          <h3>Skills & Technologies ({profile.skills?.length || 0})</h3>
        </div>

        <form onSubmit={handleAddSkill} className="inline-add-form">
          <input
            placeholder="Add a technical skill (e.g. React, Docker, Python)"
            value={newSkill}
            onChange={e => setNewSkill(e.target.value)}
          />
          <button type="submit" className="secondary">+ Add Skill</button>
        </form>

        <div className="tags-cloud">
          {profile.skills?.map(skill => (
            <span key={skill} className="skill-tag">
              {skill}
              <button
                type="button"
                className="tag-remove-btn"
                onClick={() => handleRemoveSkill(skill)}
                title="Remove skill"
              >
                &times;
              </button>
            </span>
          ))}
          {(!profile.skills || profile.skills.length === 0) && (
            <p className="muted">No skills added yet. Type a skill or upload your PDF resume above.</p>
          )}
        </div>
      </div>

      {/* Projects Section */}
      <div className="card section-card">
        <div className="section-title-row">
          <h3>Projects ({profile.projects?.length || 0})</h3>
          <button type="button" className="secondary" onClick={() => setShowProjModal(!showProjModal)}>
            {showProjModal ? 'Cancel' : '+ Add Project'}
          </button>
        </div>

        {showProjModal && (
          <form onSubmit={handleAddProject} className="modal-inner-form">
            <label>
              Project Title *
              <input
                required
                value={projForm.title}
                onChange={e => setProjForm({ ...projForm, title: e.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                rows={2}
                value={projForm.description}
                onChange={e => setProjForm({ ...projForm, description: e.target.value })}
              />
            </label>
            <label>
              Tech Stack (comma separated)
              <input
                placeholder="react, node, mongodb"
                value={projForm.techStack}
                onChange={e => setProjForm({ ...projForm, techStack: e.target.value })}
              />
            </label>
            <label>
              Project Repository / Demo Link
              <input
                placeholder="https://github.com/..."
                value={projForm.link}
                onChange={e => setProjForm({ ...projForm, link: e.target.value })}
              />
            </label>
            <button type="submit" className="primary">Save Project</button>
          </form>
        )}

        <div className="items-list">
          {profile.projects?.map(proj => (
            <div key={proj._id} className="item-row">
              <div className="item-main">
                <h4>{proj.title}</h4>
                {proj.description && <p>{proj.description}</p>}
                <div className="tags-cloud">
                  {proj.techStack?.map(t => <span key={t} className="sub-tag">{t}</span>)}
                </div>
                {proj.link && <a href={proj.link} target="_blank" rel="noreferrer" className="item-link">View Repo &rarr;</a>}
              </div>
              <button type="button" className="danger-btn" onClick={() => handleDeleteProject(proj._id)}>Delete</button>
            </div>
          ))}
          {(!profile.projects || profile.projects.length === 0) && (
            <p className="muted">No portfolio projects listed. Add projects to boost your match scores.</p>
          )}
        </div>
      </div>

      {/* Hackathons Section */}
      <div className="card section-card">
        <div className="section-title-row">
          <h3>Hackathons & Contests ({profile.hackathons?.length || 0})</h3>
          <button type="button" className="secondary" onClick={() => setShowHackModal(!showHackModal)}>
            {showHackModal ? 'Cancel' : '+ Add Hackathon'}
          </button>
        </div>

        {showHackModal && (
          <form onSubmit={handleAddHackathon} className="modal-inner-form">
            <label>
              Hackathon Name *
              <input
                required
                value={hackForm.name}
                onChange={e => setHackForm({ ...hackForm, name: e.target.value })}
              />
            </label>
            <div className="form-grid-2">
              <label>
                Year *
                <input
                  type="number"
                  required
                  value={hackForm.year}
                  onChange={e => setHackForm({ ...hackForm, year: Number(e.target.value) })}
                />
              </label>
              <label>
                Status
                <select
                  value={hackForm.status}
                  onChange={e => setHackForm({ ...hackForm, status: e.target.value })}
                >
                  <option value="participated">Participated</option>
                  <option value="won">Won / Placed</option>
                </select>
              </label>
            </div>
            <label>
              Position / Recognition
              <input
                placeholder="1st Place Winner, Finalist, Best UI Award"
                value={hackForm.position}
                onChange={e => setHackForm({ ...hackForm, position: e.target.value })}
              />
            </label>
            <label>
              Technologies Used
              <input
                placeholder="react, node, docker"
                value={hackForm.techUsed}
                onChange={e => setHackForm({ ...hackForm, techUsed: e.target.value })}
              />
            </label>
            <button type="submit" className="primary">Save Hackathon</button>
          </form>
        )}

        <div className="items-list">
          {profile.hackathons?.map(h => (
            <div key={h._id} className="item-row">
              <div className="item-main">
                <h4>{h.name} ({h.year}) &bull; <span className={h.status === 'won' ? 'badge-win' : 'badge-part'}>{h.status === 'won' ? '🏆 ' + (h.position || 'Winner') : 'Participant'}</span></h4>
                <div className="tags-cloud">
                  {h.techUsed?.map(t => <span key={t} className="sub-tag">{t}</span>)}
                </div>
              </div>
              <button type="button" className="danger-btn" onClick={() => handleDeleteHackathon(h._id)}>Delete</button>
            </div>
          ))}
          {(!profile.hackathons || profile.hackathons.length === 0) && (
            <p className="muted">No hackathons listed yet.</p>
          )}
        </div>
      </div>

      {/* Experience & Internships Section */}
      <div className="card section-card">
        <div className="section-title-row">
          <h3>Work Experience & Internships</h3>
          <div className="btn-group">
            <button type="button" className="secondary" onClick={() => setShowExpModal(!showExpModal)}>
              {showExpModal ? 'Cancel' : '+ Add Job'}
            </button>
            <button type="button" className="secondary" onClick={() => setShowInternModal(!showInternModal)}>
              {showInternModal ? 'Cancel' : '+ Add Internship'}
            </button>
          </div>
        </div>

        {showExpModal && (
          <form onSubmit={handleAddExperience} className="modal-inner-form">
            <h4>Add Full-Time / Contract Experience</h4>
            <div className="form-grid-2">
              <label>
                Company *
                <input required value={expForm.company} onChange={e => setExpForm({ ...expForm, company: e.target.value })} />
              </label>
              <label>
                Role *
                <input required value={expForm.role} onChange={e => setExpForm({ ...expForm, role: e.target.value })} />
              </label>
              <label>
                Years
                <input type="number" min="0" value={expForm.years} onChange={e => setExpForm({ ...expForm, years: Number(e.target.value) })} />
              </label>
              <label>
                Months
                <input type="number" min="0" max="11" value={expForm.months} onChange={e => setExpForm({ ...expForm, months: Number(e.target.value) })} />
              </label>
            </div>
            <label>
              Description
              <textarea rows={2} value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} />
            </label>
            <button type="submit" className="primary">Save Experience</button>
          </form>
        )}

        {showInternModal && (
          <form onSubmit={handleAddInternship} className="modal-inner-form">
            <h4>Add Internship</h4>
            <div className="form-grid-2">
              <label>
                Company *
                <input required value={internForm.company} onChange={e => setInternForm({ ...internForm, company: e.target.value })} />
              </label>
              <label>
                Role *
                <input required value={internForm.role} onChange={e => setInternForm({ ...internForm, role: e.target.value })} />
              </label>
              <label>
                Duration Months
                <input type="number" min="1" max="24" value={internForm.durationMonths} onChange={e => setInternForm({ ...internForm, durationMonths: Number(e.target.value) })} />
              </label>
            </div>
            <button type="submit" className="primary">Save Internship</button>
          </form>
        )}

        <div className="items-list">
          {profile.experience?.map(exp => (
            <div key={exp._id} className="item-row">
              <div className="item-main">
                <h4>{exp.role} &bull; {exp.company}</h4>
                <p className="muted">{exp.years} yrs {exp.months} mos</p>
                {exp.description && <p>{exp.description}</p>}
              </div>
              <button type="button" className="danger-btn" onClick={() => handleDeleteExperience(exp._id)}>Delete</button>
            </div>
          ))}

          {profile.internships?.map(intern => (
            <div key={intern._id} className="item-row">
              <div className="item-main">
                <h4>🎓 {intern.role} (Intern) &bull; {intern.company}</h4>
                <p className="muted">{intern.duration || `${intern.durationMonths} months`}</p>
                {intern.description && <p>{intern.description}</p>}
              </div>
              <button type="button" className="danger-btn" onClick={() => handleDeleteInternship(intern._id)}>Delete</button>
            </div>
          ))}

          {(!profile.experience?.length && !profile.internships?.length) && (
            <p className="muted">No work experience or internships recorded.</p>
          )}
        </div>
      </div>

      {/* Education Details */}
      <div className="card section-card">
        <div className="section-title-row">
          <h3>Education Details</h3>
          <button type="button" className="secondary" onClick={() => setShowEduModal(!showEduModal)}>
            {showEduModal ? 'Cancel' : '+ Add Education Record'}
          </button>
        </div>

        {showEduModal && (
          <form onSubmit={handleAddEducation} className="modal-inner-form">
            <div className="form-grid-2">
              <label>
                Level *
                <select value={eduForm.level} onChange={e => setEduForm({ ...eduForm, level: e.target.value })}>
                  <option value="10th / Secondary">10th / Secondary</option>
                  <option value="12th / Higher Secondary">12th / Higher Secondary</option>
                  <option value="Degree">Degree / Undergraduate</option>
                  <option value="Post Graduate">Post Graduate / Master's</option>
                </select>
              </label>
              <label>
                Board / University
                <input value={eduForm.boardOrUniversity} onChange={e => setEduForm({ ...eduForm, boardOrUniversity: e.target.value })} />
              </label>
              <label>
                Percentage or CGPA
                <input type="number" step="0.1" value={eduForm.percentageOrCgpa} onChange={e => setEduForm({ ...eduForm, percentageOrCgpa: Number(e.target.value) })} />
              </label>
              <label>
                Year of Completion
                <input type="number" value={eduForm.year} onChange={e => setEduForm({ ...eduForm, year: Number(e.target.value) })} />
              </label>
            </div>
            <button type="submit" className="primary">Save Education</button>
          </form>
        )}

        <div className="items-list">
          {profile.education?.map(edu => (
            <div key={edu._id} className="item-row">
              <div className="item-main">
                <h4>{edu.level} &bull; {edu.boardOrUniversity || 'Accredited Institution'}</h4>
                <p className="muted">Score: {edu.percentageOrCgpa} {edu.year ? `(${edu.year})` : ''}</p>
              </div>
              <button type="button" className="danger-btn" onClick={() => handleDeleteEducation(edu._id)}>Delete</button>
            </div>
          ))}
          {(!profile.education || profile.education.length === 0) && (
            <p className="muted">No education records added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
