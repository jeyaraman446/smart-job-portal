// client/src/pages/Notifications.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api/axios';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markRead = async id => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => (n._id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getNotifIcon = type => {
    switch (type) {
      case 'shortlisted':
      case 'interview':
        return '🎉';
      case 'rejected':
        return '💡';
      case 'hired':
        return '🏆';
      default:
        return '📬';
    }
  };

  if (loading) return <div className="loading-state">Loading your portal notifications…</div>;

  return (
    <div className="notifications-container">
      <div className="section-header-banner card header-with-action">
        <div>
          <h1>Notifications</h1>
          <p className="muted">Stay up to date on your application status changes, interviews, and employer alerts.</p>
        </div>
        {notifications.some(n => !n.read) && (
          <button type="button" className="secondary" onClick={markAllRead}>
            Mark All as Read
          </button>
        )}
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {notifications.length === 0 ? (
        <div className="card empty-state">
          <h3>No notifications yet</h3>
          <p className="muted">You will receive alerts here whenever employers review or update your applications.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(n => (
            <div key={n._id} className={`card notification-card ${n.read ? 'read' : 'unread'}`}>
              <div className="notif-icon-col">
                <span className="notif-icon">{getNotifIcon(n.type)}</span>
              </div>
              <div className="notif-content-col">
                <div className="notif-header-line">
                  <h4>{n.title}</h4>
                  <span className="notif-time">{new Date(n.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="notif-msg">{n.message}</p>
                <div className="notif-actions-line">
                  {n.link && (
                    <Link to={n.link} className="pill-link">
                      View Application Details &rarr;
                    </Link>
                  )}
                  {!n.read && (
                    <button type="button" className="link-button" onClick={() => markRead(n._id)}>
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
