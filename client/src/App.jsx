// client/src/App.jsx
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import api from './api/axios';

import Login from './pages/Login';
import Register from './pages/Register';
import JobList from './pages/JobList';
import JobDetail from './pages/JobDetail';
import SeekerProfile from './pages/SeekerProfile';
import MyApplications from './pages/MyApplications';
import Notifications from './pages/Notifications';
import CompanyDashboard from './pages/CompanyDashboard';
import PostJob from './pages/PostJob';
import CompanyApplicants from './pages/CompanyApplicants';

function Guard({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role) {
    if (role === 'seeker' && user.role !== 'seeker' && user.role !== 'user') {
      return <Navigate to="/company/dashboard" replace />;
    }
    if (role === 'company' && user.role !== 'company') {
      return <Navigate to="/jobs" replace />;
    }
  }
  return children;
}

export default function App() {
  const { user, isCompany, isSeeker, logout } = useAuth();
  const nav = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'light');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  // Fetch unread count periodically for logged-in seekers
  useEffect(() => {
    if (user && (user.role === 'seeker' || user.role === 'user')) {
      api.get('/notifications/unread-count')
        .then(r => setUnreadCount(r.data?.unreadCount || 0))
        .catch(() => {});
    } else {
      setUnreadCount(0);
    }
  }, [user]);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  const home = !user
    ? '/jobs'
    : user.role === 'company'
    ? '/company/dashboard'
    : '/jobs';

  return (
    <>
      <header className="nav">
        <div className="brand-group">
          <NavLink to="/" className="brand-logo">
            <span className="brand-icon">⚡</span>
            <div className="brand-text">
              <span className="brand-title">SmartJob</span>
              <span className="brand-sub">Matching & Verification Portal</span>
            </div>
          </NavLink>

          {user && (
            <span className={`role-badge ${isCompany ? 'role-company' : 'role-seeker'}`}>
              {isCompany ? '🏢 Company Employer (Admin)' : '👤 Job Seeker'}
            </span>
          )}
        </div>

        <nav>
          {isSeeker && (
            <>
              <NavLink to="/jobs">Explore Jobs</NavLink>
              <NavLink to="/applications">My Applications</NavLink>
              <NavLink to="/profile">Portfolio Profile</NavLink>
              <NavLink to="/notifications" className="notif-nav-link">
                Alerts
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </NavLink>
            </>
          )}

          {isCompany && (
            <>
              <NavLink to="/company/dashboard">Employer Dashboard</NavLink>
              <NavLink to="/company/post-job" className="nav-btn-highlight">+ Post Job</NavLink>
            </>
          )}

          {!user && (
            <>
              <NavLink to="/jobs">Browse Jobs</NavLink>
              <NavLink to="/login">Sign In</NavLink>
              <NavLink to="/register" className="nav-btn-highlight">Create Account</NavLink>
            </>
          )}

          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label="Toggle dark and light mode"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {user && (
            <div className="user-menu">
              <span className="user-name">{user.name}</span>
              <button className="btn-logout" onClick={() => { logout(); nav('/login'); }} title="Sign Out">
                Sign Out
              </button>
            </div>
          )}
        </nav>
      </header>

      <main className="page">
        <Routes>
          <Route path="/" element={<Navigate to={home} replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/jobs" element={<JobList />} />
          <Route path="/jobs/:id" element={<JobDetail />} />

          {/* Seeker Protected Routes */}
          <Route path="/profile" element={<Guard role="seeker"><SeekerProfile /></Guard>} />
          <Route path="/applications" element={<Guard role="seeker"><MyApplications /></Guard>} />
          <Route path="/notifications" element={<Guard role="seeker"><Notifications /></Guard>} />

          {/* Company Protected Routes (Admin Portal) */}
          <Route path="/company/dashboard" element={<Guard role="company"><CompanyDashboard /></Guard>} />
          <Route path="/company/post-job" element={<Guard role="company"><PostJob /></Guard>} />
          <Route path="/company/jobs/:id/edit" element={<Guard role="company"><PostJob /></Guard>} />
          <Route path="/company/jobs/:id/applicants" element={<Guard role="company"><CompanyApplicants /></Guard>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
