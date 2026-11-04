// client/src/pages/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/axios';

const FREE_PROVIDERS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'icloud.com', 'proton.me', 'protonmail.com', 'zoho.com', 'mail.com', 'aol.com',
];

export default function Register() {
  const { seekerRegister, companyRegister } = useAuth();
  const nav = useNavigate();

  const [role, setRole] = useState('seeker'); // 'seeker' | 'company'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Seeker state
  const [seekerForm, setSeekerForm] = useState({
    name: '',
    mail_id: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  // Company state
  const [companyForm, setCompanyForm] = useState({
    name: '',
    location: '',
    mail_id: '',
    password: '',
    confirmPassword: '',
    website: '',
    industry: '',
    description: '',
  });

  const isFreeDomain = email => {
    const domain = (email || '').split('@')[1]?.toLowerCase();
    return domain && FREE_PROVIDERS.includes(domain);
  };

  const validatePassword = pwd => {
    return pwd && pwd.length >= 8 && /[A-Za-z]/.test(pwd) && /\d/.test(pwd);
  };

  const submitSeeker = async e => {
    e.preventDefault();
    setError('');

    if (!validatePassword(seekerForm.password)) {
      setError('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    if (seekerForm.password !== seekerForm.confirmPassword) {
      setError('Confirm password does not match password.');
      return;
    }

    setLoading(true);
    try {
      await seekerRegister(seekerForm);
      nav('/profile');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const submitCompany = async e => {
    e.preventDefault();
    setError('');

    if (isFreeDomain(companyForm.mail_id)) {
      setError('Company registration requires an official work email (e.g. name@company.com). Free providers (Gmail, Yahoo, Outlook, etc.) are blocked.');
      return;
    }

    if (!validatePassword(companyForm.password)) {
      setError('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    if (companyForm.password !== companyForm.confirmPassword) {
      setError('Confirm password does not match password.');
      return;
    }

    setLoading(true);
    try {
      await companyRegister(companyForm);
      nav('/company/dashboard');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card narrow auth-card">
        <div className="auth-header">
          <div className="auth-icon-badge">🚀</div>
          <h1>Create an Account</h1>
          <p className="muted">Join Smart Job Portal for verified skill matching and direct company hiring.</p>
        </div>

        {/* Account Role Selector */}
        <div className="role-selector-box">
          <label className="section-subtitle">Account Type</label>
          <div className="seg" role="radiogroup" aria-label="Account Type">
            <button
              type="button"
              className={role === 'seeker' ? 'on' : ''}
              onClick={() => { setRole('seeker'); setError(''); }}
            >
              👤 Job Seeker (User)
            </button>
            <button
              type="button"
              className={role === 'company' ? 'on' : ''}
              onClick={() => { setRole('company'); setError(''); }}
            >
              🏢 Company (Employer Admin)
            </button>
          </div>
        </div>

        {error && <div className="error-banner" role="alert">{error}</div>}

        {role === 'seeker' ? (
          <form onSubmit={submitSeeker} className="auth-form">
            <label>
              Full Name *
              <input
                required
                placeholder="Arun Kumar"
                value={seekerForm.name}
                onChange={e => setSeekerForm({ ...seekerForm, name: e.target.value })}
              />
            </label>

            <label>
              Mail ID *
              <input
                type="email"
                required
                placeholder="arun@example.com"
                value={seekerForm.mail_id}
                onChange={e => setSeekerForm({ ...seekerForm, mail_id: e.target.value })}
              />
            </label>

            <label>
              Phone Number <span className="muted-text">(Optional)</span>
              <input
                placeholder="+1 (555) 000-0000"
                value={seekerForm.phone}
                onChange={e => setSeekerForm({ ...seekerForm, phone: e.target.value })}
              />
            </label>

            <label>
              Password * <span className="muted-text">(min 8 chars, letter + number)</span>
              <input
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={seekerForm.password}
                onChange={e => setSeekerForm({ ...seekerForm, password: e.target.value })}
              />
            </label>

            <label>
              Confirm Password *
              <input
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={seekerForm.confirmPassword}
                onChange={e => setSeekerForm({ ...seekerForm, confirmPassword: e.target.value })}
              />
            </label>

            <button type="submit" className="primary full-width" disabled={loading}>
              {loading ? 'Creating Account…' : 'Register Seeker Account'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCompany} className="auth-form">
            <div className="corporate-policy-banner">
              <span className="policy-icon">💼</span>
              <div>
                <strong>Company Account Verification:</strong>
                <p>Company accounts must register with an official domain mail ID (no Gmail, Yahoo, etc.).</p>
              </div>
            </div>

            <label>
              Company Name *
              <input
                required
                placeholder="TechCorp Systems"
                value={companyForm.name}
                onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
              />
            </label>

            <label>
              Area of Location *
              <input
                required
                placeholder="San Francisco, CA"
                value={companyForm.location}
                onChange={e => setCompanyForm({ ...companyForm, location: e.target.value })}
              />
            </label>

            <label>
              Company Mail ID *
              <input
                type="email"
                required
                placeholder="recruiting@yourcompany.com"
                value={companyForm.mail_id}
                onChange={e => setCompanyForm({ ...companyForm, mail_id: e.target.value })}
              />
              {companyForm.mail_id && isFreeDomain(companyForm.mail_id) && (
                <span className="warn-text">⚠️ Please use your company domain (e.g. @yourcompany.com), not a free email provider.</span>
              )}
            </label>

            <label>
              Company Website <span className="muted-text">(Optional)</span>
              <input
                placeholder="https://yourcompany.com"
                value={companyForm.website}
                onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })}
              />
            </label>

            <label>
              Password * <span className="muted-text">(min 8 chars, letter + number)</span>
              <input
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={companyForm.password}
                onChange={e => setCompanyForm({ ...companyForm, password: e.target.value })}
              />
            </label>

            <label>
              Confirm Password *
              <input
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={companyForm.confirmPassword}
                onChange={e => setCompanyForm({ ...companyForm, confirmPassword: e.target.value })}
              />
            </label>

            <button type="submit" className="primary full-width" disabled={loading}>
              {loading ? 'Registering Company…' : 'Register Company Account'}
            </button>
          </form>
        )}

        <p className="muted auth-footer-text">
          Already registered? <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
