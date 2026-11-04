// client/src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/axios';

export default function Login() {
  const { seekerLogin, companyLogin } = useAuth();
  const nav = useNavigate();

  const [role, setRole] = useState('seeker'); // 'seeker' | 'company'
  const [form, setForm] = useState({ mail_id: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (role === 'company') {
        await companyLogin(form.mail_id, form.password);
        nav('/company/dashboard');
      } else {
        await seekerLogin(form.mail_id, form.password);
        nav('/jobs');
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="card narrow auth-card" onSubmit={submit}>
        <div className="auth-header">
          <div className="auth-icon-badge">🔐</div>
          <h1>Welcome Back</h1>
          <p className="muted">Sign in to access your portfolio, smart matches, or company applicants.</p>
        </div>

        {/* Role Segment */}
        <div className="role-selector-box">
          <div className="seg" role="radiogroup" aria-label="Sign in mode">
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

        <label>
          {role === 'company' ? 'Company Mail ID' : 'Mail ID'}
          <input
            type="email"
            required
            placeholder={role === 'company' ? 'recruiting@company.com' : 'you@example.com'}
            value={form.mail_id}
            onChange={e => setForm({ ...form, mail_id: e.target.value })}
            autoFocus
          />
        </label>

        <label>
          Password
          <input
            type="password"
            required
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
        </label>

        <button type="submit" className="primary full-width" disabled={loading}>
          {loading ? 'Authenticating…' : `Sign In as ${role === 'company' ? 'Company' : 'Job Seeker'}`}
        </button>

        <p className="muted auth-footer-text">
          Don't have an account yet? <Link to="/register">Create one here</Link>
        </p>
      </form>
    </div>
  );
}
