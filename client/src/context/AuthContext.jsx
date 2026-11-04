// client/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });

  const save = ({ token, user, company }) => {
    const activeObj = user || company;
    if (token) localStorage.setItem('token', token);
    if (activeObj) {
      localStorage.setItem('user', JSON.stringify(activeObj));
      setUser(activeObj);
    }
    return activeObj;
  };

  const seekerLogin = async (mail_id, password) => {
    const res = await api.post('/auth/seeker/login', { mail_id, password });
    if (res.data.token && res.data.user) save(res.data);
    return res.data;
  };

  const seekerRegister = async form => {
    const res = await api.post('/auth/seeker/register', form);
    if (res.data.token && res.data.user) save(res.data);
    return res.data;
  };

  const companyLogin = async (mail_id, password) => {
    const res = await api.post('/auth/company/login', { mail_id, password });
    if (res.data.token && (res.data.company || res.data.user)) save(res.data);
    return res.data;
  };

  const companyRegister = async form => {
    const res = await api.post('/auth/company/register', form);
    if (res.data.token && (res.data.company || res.data.user)) save(res.data);
    return res.data;
  };

  // Universal login helper
  const login = async (mail_id, password, role = 'seeker') => {
    if (role === 'company') {
      return companyLogin(mail_id, password);
    }
    return seekerLogin(mail_id, password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
      }
    } catch {
      logout();
    }
  };

  const isCompany = user?.role === 'company';
  const isSeeker = user?.role === 'seeker' || user?.role === 'user';

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isCompany,
        isSeeker,
        login,
        seekerLogin,
        seekerRegister,
        companyLogin,
        companyRegister,
        logout,
        refreshUser,
        save,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
