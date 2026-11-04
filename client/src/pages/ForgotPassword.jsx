import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/axios';

export default function ForgotPassword() {
  const { forgotPassword, resetPassword, resendOtp } = useAuth();
  const nav = useNavigate();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Password, 3: Success
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);

  const inputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (step === 2 && timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [step, timer]);

  const handleDigitChange = (index, value) => {
    const clean = value.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (clean.length > 1) {
      const pasted = clean.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newDigits[index] = clean;
    setOtpDigits(newDigits);

    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = e => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (pasteData.length > 0) {
      const pasted = pasteData.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      const targetFocus = Math.min(pasted.length, 5);
      inputRefs.current[targetFocus]?.focus();
    }
  };

  // Step 1: Request password reset email
  const handleRequestOtp = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await forgotPassword(email.trim());
      setSuccess(res.message || 'Password reset passcode dispatched via Brevo SMTP.');
      setStep(2);
      setTimer(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit OTP and new password
  const handleResetSubmit = async e => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter the complete 6-digit reset code sent to your email.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await resetPassword(email.trim(), fullOtp, newPassword);
      setSuccess(res.message || 'Password updated successfully!');
      setStep(3);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || resending) return;
    setError('');
    setSuccess('');
    setResending(true);

    try {
      const res = await resendOtp(email.trim(), 'reset_password');
      setSuccess(res.message || 'A new password reset code has been sent via Brevo.');
      setTimer(60);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setResending(false);
    }
  };

  // Password rules evaluation
  const hasMinLen = newPassword.length >= 6;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNum = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const score = [hasMinLen, hasUpper, hasNum, hasSpecial].filter(Boolean).length;
  const strengthLabel = score <= 1 ? 'Weak' : score <= 3 ? 'Medium' : 'Strong';
  const strengthColor = score <= 1 ? '#ef4444' : score <= 3 ? '#f59e0b' : '#10b981';

  return (
    <div className="auth-container">
      <div className="card narrow auth-card forgot-card-container">
        {/* Progress Stepper */}
        <div className="auth-stepper">
          <div className={`stepper-step ${step > 1 ? 'completed' : 'active'}`}>
            <span className="step-circle">{step > 1 ? '✓' : '1'}</span>
            <span className="step-title">Lookup</span>
          </div>
          <div className={`stepper-line ${step >= 2 ? 'active' : ''}`}></div>
          <div className={`stepper-step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
            <span className="step-circle">{step > 2 ? '✓' : '2'}</span>
            <span className="step-title">Reset OTP</span>
          </div>
          <div className={`stepper-line ${step === 3 ? 'active' : ''}`}></div>
          <div className={`stepper-step ${step === 3 ? 'active' : ''}`}>
            <span className="step-circle">3</span>
            <span className="step-title">Ready</span>
          </div>
        </div>

        {step === 1 && (
          <>
            <div className="auth-header">
              <div className="auth-icon-badge">🔑</div>
              <h1>Reset Your Password</h1>
              <p className="muted">
                Enter your registered candidate or corporate HR email address to receive a secure recovery code via Brevo SMTP.
              </p>
            </div>

            {error && <div className="error-banner" role="alert">{error}</div>}

            <form onSubmit={handleRequestOtp}>
              <label>
                Registered Email Address
                <input
                  type="email"
                  required
                  placeholder="name@company.com or candidate@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </label>

              <button type="submit" className="primary full-width" disabled={loading}>
                {loading ? 'Dispatching Passcode…' : 'Send Recovery Passcode ➔'}
              </button>
            </form>

            <div className="smtp-security-seal">
              <span>🔒 Brevo (Bravo) High-Deliverability Transactional Mail</span>
            </div>

            <p className="muted auth-footer-text">
              Remember your password? <Link to="/login">Back to Log In</Link>
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <div className="auth-header">
              <div className="auth-icon-badge">🛡️</div>
              <h1>Set New Password</h1>
              <p className="muted">Enter the 6-digit recovery code sent to</p>
              <div className="email-target-chip">
                <strong>{email}</strong>
              </div>
            </div>

            {error && <div className="error-banner" role="alert">{error}</div>}
            {success && <div className="success-banner" role="status">{success}</div>}

            <div className="mail-check-notice">
              <span className="notice-mail-icon">📬</span>
              <div>
                <strong>Check your Gmail / Email Inbox:</strong>
                <p>We've dispatched a 6-digit password recovery code to <strong>{email}</strong> via Brevo SMTP. Enter it below.</p>
              </div>
            </div>

            <form onSubmit={handleResetSubmit}>
              <div className="otp-inputs-wrapper" onPaste={handlePaste}>
                <label className="section-subtitle centered-label">Enter 6-Digit Reset Passcode</label>
                <div className="otp-digit-boxes">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => (inputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className={`otp-digit-input ${digit ? 'filled' : ''}`}
                      value={digit}
                      onChange={e => handleDigitChange(idx, e.target.value)}
                      onKeyDown={e => handleKeyDown(idx, e)}
                      aria-label={`Digit ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>

              <label>
                New Password
                <div className="password-input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(s => !s)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </label>

              {newPassword && (
                <div className="password-rules-box">
                  <div className="strength-header">
                    <span>Password Strength:</span>
                    <strong style={{ color: strengthColor }}>{strengthLabel}</strong>
                  </div>
                  <div className="strength-bar-track">
                    <div
                      className="strength-bar-progress"
                      style={{ width: `${(score / 4) * 100}%`, backgroundColor: strengthColor }}
                    ></div>
                  </div>
                  <div className="rules-grid">
                    <span className={`rule-chip ${hasMinLen ? 'valid' : ''}`}>
                      {hasMinLen ? '✓' : '○'} 6+ Characters
                    </span>
                    <span className={`rule-chip ${hasUpper ? 'valid' : ''}`}>
                      {hasUpper ? '✓' : '○'} Uppercase
                    </span>
                    <span className={`rule-chip ${hasNum ? 'valid' : ''}`}>
                      {hasNum ? '✓' : '○'} Number
                    </span>
                    <span className={`rule-chip ${hasSpecial ? 'valid' : ''}`}>
                      {hasSpecial ? '✓' : '○'} Symbol
                    </span>
                  </div>
                </div>
              )}

              <label>
                Confirm New Password
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </label>

              {confirmPassword && (
                <div className={`match-indicator ${passMatch ? 'match-good' : 'match-bad'}`}>
                  {passMatch ? '✓ Passwords match perfectly' : '✕ Passwords do not match'}
                </div>
              )}

              <button
                type="submit"
                className="primary full-width"
                disabled={loading || otpDigits.join('').length !== 6 || !passMatch}
              >
                {loading ? 'Updating Password…' : 'Save New Password & Sign In ➔'}
              </button>
            </form>

            <div className="otp-resend-section">
              {timer > 0 ? (
                <div className="timer-wrapper">
                  <div className="timer-bar-track">
                    <div
                      className="timer-bar-fill"
                      style={{ width: `${(timer / 60) * 100}%` }}
                    ></div>
                  </div>
                  <p className="resend-countdown muted">
                    ⏱️ Resend code in <strong>{timer}s</strong>
                  </p>
                </div>
              ) : (
                <p className="resend-action">
                  Didn't receive the passcode?{' '}
                  <button
                    type="button"
                    className="link-button"
                    onClick={handleResend}
                    disabled={resending}
                  >
                    {resending ? 'Sending…' : 'Resend Code'}
                  </button>
                </p>
              )}
            </div>

            <div className="otp-footer-links">
              <button type="button" className="link-button" onClick={() => setStep(1)}>
                ← Change Email Address
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="success-step-box">
            <div className="celebration-circle">
              <span className="celebration-check">✓</span>
            </div>
            <h2>Password Successfully Updated!</h2>
            <p className="muted">
              Your credentials have been securely updated via Brevo authenticated reset. You are now logged in and ready to access the portal.
            </p>
            <div className="success-actions">
              <button
                type="button"
                className="primary full-width"
                onClick={() => nav('/jobs')}
              >
                Continue to Portal Dashboard ➔
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
