import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { authAPI } from '../services/api';

export const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot', 'reset'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const data = await authAPI.login(email, password);
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          if (onAuthSuccess) onAuthSuccess(data.user);
          onClose();
        }
      } else if (mode === 'register') {
        const data = await authAPI.register(username, email, password);
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          if (onAuthSuccess) onAuthSuccess(data.user);
          onClose();
        }
      } else if (mode === 'forgot') {
        const data = await authAPI.forgotPassword(email);
        if (data.devOtp) {
          setResetCode(data.devOtp);
          setSuccessMsg(`✅ Verification code generated: ${data.devOtp} (Auto-filled for development testing)`);
        } else {
          setSuccessMsg(data.message || `Verification code dispatched to ${email}. Check your inbox.`);
          setResetCode('');
        }
        setMode('reset');
      } else if (mode === 'reset') {
        if (!resetCode.trim()) {
          throw new Error('Please enter the 6-digit verification code from your email.');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('New passwords do not match.');
        }
        const data = await authAPI.resetPassword(email, resetCode, newPassword);
        setSuccessMsg(data.message || 'Password reset successfully! Please sign in.');
        setPassword('');
        setResetCode('');
        setMode('login');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Shield size={22} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {mode === 'login' && 'Sign In'}
              {mode === 'register' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
              {mode === 'reset' && 'Enter Verification Code'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {mode !== 'login' && (
          <button
            onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-secondary)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              cursor: 'pointer',
              padding: 0,
              marginBottom: '1rem'
            }}
          >
            <ArrowLeft size={14} /> Back to Sign In
          </button>
        )}

        {successMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#6ee7b7',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '0.85rem',
            marginBottom: '1.25rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'register' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alex_dev"
                  style={{ paddingLeft: '2.5rem' }}
                />
                <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                disabled={mode === 'reset'}
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@company.com"
                style={{ paddingLeft: '2.5rem', opacity: mode === 'reset' ? 0.7 : 1 }}
              />
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {mode === 'reset' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">6-Digit Code from Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="form-input"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="e.g. 123456"
                  style={{ paddingLeft: '2.5rem', letterSpacing: '0.2em', fontWeight: 700 }}
                />
                <KeyRound size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                {mode === 'login' && (
                  <span
                    onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null); }}
                    style={{ color: 'var(--accent-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Forgot password?
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  required
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Send Code to Email' : 'Verify & Reset Password'}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {mode === 'login' && (
            <>
              Don't have an account?{' '}
              <span
                onClick={() => { setIsLogin(false); setMode('register'); setError(null); }}
                style={{ color: 'var(--accent-secondary)', cursor: 'pointer', fontWeight: 600 }}
              >
                Sign up
              </span>
            </>
          )}
          {mode === 'register' && (
            <>
              Already have an account?{' '}
              <span
                onClick={() => { setMode('login'); setError(null); }}
                style={{ color: 'var(--accent-secondary)', cursor: 'pointer', fontWeight: 600 }}
              >
                Sign in
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
