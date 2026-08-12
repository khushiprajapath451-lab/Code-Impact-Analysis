import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Lock, Mail, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login, loading, authError } = useAuth();

  const [email, setEmail] = useState('abhiram@impactiq.ai');
  const [password, setPassword] = useState('password123');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      // Error handled in auth context
    }
  };

  const handleDemoLogin = async () => {
    setEmail('abhiram@impactiq.ai');
    setPassword('password123');
    try {
      await login('abhiram@impactiq.ai', 'password123');
      navigate('/dashboard');
    } catch {
      // Error handled
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #1E1B4B 0%, #0B1220 70%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        color: '#FFFFFF',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px 35px',
          borderRadius: '24px',
          border: '1px solid rgba(129, 140, 248, 0.25)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              marginBottom: '15px',
              boxShadow: '0 8px 16px rgba(79, 70, 229, 0.4)',
            }}
          >
            <Sparkles size={28} color="#FFFFFF" />
          </div>
          <h1 style={{ fontSize: '26px', margin: 0, fontWeight: 700, letterSpacing: '-0.5px' }}>
            Sign in to ImpactIQ
          </h1>
          <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '8px', margin: 0 }}>
            AI-Powered Code Impact & Pre-Review Platform
          </p>
        </div>

        {authError && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
              fontSize: '14px',
            }}
          >
            <AlertCircle size={18} />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', color: '#D1D5DB', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
              Work Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#9CA3AF" style={{ position: 'absolute', left: '14px', top: '15px' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@impactiq.ai"
                style={{
                  width: '100%',
                  padding: '13px 14px 13px 42px',
                  background: '#1F2937',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: '#D1D5DB', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#9CA3AF" style={{ position: 'absolute', left: '14px', top: '15px' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '13px 14px 13px 42px',
                  background: '#1F2937',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="primary-btn"
            style={{
              padding: '14px',
              fontSize: '15px',
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '5px',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={18} />
          </button>

          <button
            type="button"
            onClick={handleDemoLogin}
            style={{
              padding: '12px',
              background: 'transparent',
              border: '1px dashed rgba(129, 140, 248, 0.4)',
              borderRadius: '12px',
              color: '#818CF8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldCheck size={16} /> Quick Demo One-Click Sign In
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '25px', color: '#9CA3AF', fontSize: '14px' }}>
          Don&apos;t have an account?{' '}
          <Link to="/register" style={{ color: '#818CF8', fontWeight: 600, textDecoration: 'none' }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
