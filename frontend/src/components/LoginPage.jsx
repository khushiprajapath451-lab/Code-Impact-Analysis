import React, { useState } from 'react';
import { Shield, Mail, Lock, User, Cpu, ArrowRight, Sparkles, CheckCircle2, KeyRound, ArrowLeft } from 'lucide-react';
import { authAPI } from '../services/api';

export const LoginPage = ({ onAuthSuccess }) => {
  // Modes: 'login', 'register', 'forgot', 'reset'
  const [mode, setMode] = useState('login');
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Password reset fields
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

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
        }
      } else if (mode === 'register') {
        const data = await authAPI.register(username, email, password);
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          if (onAuthSuccess) onAuthSuccess(data.user);
        }
      } else if (mode === 'forgot') {
        const data = await authAPI.forgotPassword(email);
        if (data.devOtp) {
          setResetCode(data.devOtp);
          setSuccessMsg(`✅ Verification code generated: ${data.devOtp} (Auto-filled for development testing)`);
        } else {
          setSuccessMsg(data.message || `A verification code was sent to ${email}. Check your email.`);
          setResetCode('');
        }
        setMode('reset');
      } else if (mode === 'reset') {
        if (!resetCode.trim()) {
          throw new Error('Please enter the 6-digit verification code sent to your email.');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('New passwords do not match.');
        }
        if (newPassword.length < 4) {
          throw new Error('Password must be at least 4 characters long.');
        }

        const data = await authAPI.resetPassword(email, resetCode, newPassword);
        setSuccessMsg(data.message || 'Password updated successfully! You can now sign in.');
        setPassword('');
        setResetCode('');
        setNewPassword('');
        setConfirmPassword('');
        setMode('login');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    const demoUser = { id: 'demo_user', username: 'Guest Developer', email: 'demo@codesense.ai' };
    localStorage.setItem('token', 'demo_token_12345');
    localStorage.setItem('user', JSON.stringify(demoUser));
    if (onAuthSuccess) {
      onAuthSuccess(demoUser);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.15), transparent 70%), radial-gradient(ellipse at bottom, rgba(6, 182, 212, 0.1), transparent 70%)'
    }}>
      <div style={{
        maxWidth: '1050px',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '2.5rem',
        alignItems: 'center'
      }}>
        {/* Left Side: Brand Value Proposition */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="brand-icon" style={{ width: '44px', height: '44px' }}>
              <Cpu size={26} />
            </div>
            <div>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(90deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                CodeSense
              </span>
              <span style={{ color: 'var(--accent-secondary)', fontSize: '1.2rem', fontWeight: 700, marginLeft: '6px' }}>AI</span>
            </div>
          </div>

          <h1 style={{ fontSize: '2.6rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            Next-Gen Codebase Impact & Requirement Intelligence
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Empower your engineering team to predict blast radius, map dependency graphs, and identify candidate files for Jira user stories before writing a single line of code.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            {[
              'Automated candidate file, class, and method discovery',
              'Upstream & downstream caller impact prediction',
              'Targeted test suite recommendations & risk matrices'
            ].map((feature, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#e2e8f0', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="var(--accent-secondary)" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <button
              onClick={handleQuickDemo}
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem' }}
            >
              <Sparkles size={16} color="var(--accent-primary)" />
              <span>Explore Instant Demo Mode (No Login Required)</span>
            </button>
          </div>
        </div>

        {/* Right Side: Auth Form Card */}
        <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ marginBottom: '1.5rem' }}>
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
                  marginBottom: '0.75rem'
                }}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            )}

            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Create an Account'}
              {mode === 'forgot' && 'Reset Your Password'}
              {mode === 'reset' && 'Enter Verification Code'}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {mode === 'login' && 'Sign in to access your indexed repositories and AI agents'}
              {mode === 'register' && 'Register to start analyzing codebases with AI'}
              {mode === 'forgot' && 'We will send a 6-digit verification code to your email address'}
              {mode === 'reset' && 'Enter the 6-digit code from your email and your new password'}
            </p>
          </div>

          {/* Success Banner */}
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
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {/* Register: Username */}
            {mode === 'register' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name / Username</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. devraj"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>
            )}

            {/* Email Field */}
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
                  placeholder="developer@example.com"
                  style={{ paddingLeft: '2.5rem', opacity: mode === 'reset' ? 0.7 : 1 }}
                />
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {/* Reset: 6-digit Code */}
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
                    style={{ paddingLeft: '2.5rem', letterSpacing: '0.2em', fontWeight: 700, fontSize: '1.1rem' }}
                  />
                  <KeyRound size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>
            )}

            {/* Login / Register: Standard Password */}
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

            {/* Reset: New Password & Confirm */}
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
                  <label className="form-label">Confirm New Password</label>
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

            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', fontSize: '0.95rem' }}
            >
              {loading ? (
                'Processing...'
              ) : mode === 'login' ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              ) : mode === 'register' ? (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              ) : mode === 'forgot' ? (
                <>
                  <span>Send Code to Email</span>
                  <ArrowRight size={16} />
                </>
              ) : (
                <>
                  <span>Verify Code & Reset Password</span>
                  <CheckCircle2 size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer toggle links */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {mode === 'login' && (
              <>
                Don't have an account?{' '}
                <span
                  onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
                  style={{ color: 'var(--accent-secondary)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Create one now
                </span>
              </>
            )}
            {mode === 'register' && (
              <>
                Already have an account?{' '}
                <span
                  onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                  style={{ color: 'var(--accent-secondary)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Sign in
                </span>
              </>
            )}
            {(mode === 'forgot' || mode === 'reset') && (
              <span
                onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                style={{ color: 'var(--accent-secondary)', cursor: 'pointer', fontWeight: 600 }}
              >
                Remembered your password? Sign in
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
