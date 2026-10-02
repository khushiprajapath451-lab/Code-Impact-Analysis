import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Zap,
  Layers,
  GitPullRequest,
  CheckCircle2,
  Eye,
  EyeOff,
  Code2,
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login, loading, authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      // Error handled in auth context
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1100px',
          display: 'grid',
          gridTemplateColumns: '1.15fr 1fr',
          gap: '32px',
          alignItems: 'center',
        }}
      >
        {/* Left Side: Brand Showcase & Value Proposition */}
        <div
          style={{
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
          }}
        >
          {/* Logo Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 25px rgba(99, 102, 241, 0.5)',
              }}
            >
              <Sparkles size={24} color="#FFFFFF" />
            </div>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#FFF', margin: 0 }}>
                Impact<span style={{ color: '#818CF8' }}>IQ</span>
              </h2>
              <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '500' }}>
                Autonomous Code Intelligence
              </span>
            </div>
          </div>

          {/* Headline */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(129, 140, 248, 0.3)',
                color: '#A5B4FC',
                fontSize: '12px',
                fontWeight: '700',
                marginBottom: '14px',
              }}
            >
              <Zap size={14} /> Next-Gen AST Blast Radius Engine
            </div>
            <h1
              style={{
                fontSize: '38px',
                fontWeight: '800',
                color: '#FFFFFF',
                lineHeight: 1.2,
                margin: '0 0 14px 0',
                letterSpacing: '-0.5px',
              }}
            >
              Predict code impact <br />
              <span className="shimmer-text">
                before writing a single line.
              </span>
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
              Map requirements to syntax trees, audit Git diffs for regressions with Senior AI pre-reviews, and synthesize verified Pull Requests in seconds.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {[
              { title: 'AST Dependency Graph', desc: 'Real-time caller & caller-callee mapping', icon: Layers, col: '#818CF8' },
              { title: 'Senior AI Pre-Review', desc: 'Zero-leakage security & logic audit', icon: ShieldCheck, col: '#06B6D4' },
              { title: 'PR & Test Synthesis', desc: 'Auto-generates unit tests & changelogs', icon: GitPullRequest, col: '#10B981' },
              { title: 'Zero Cloud Leakage', desc: 'Local ChromaDB & embeddings', icon: Code2, col: '#F59E0B' },
            ].map((feat, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  transition: 'transform 0.25s ease, border-color 0.25s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = `${feat.col}66`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: `${feat.col}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: feat.col,
                    flexShrink: 0,
                  }}
                >
                  <feat.icon size={16} />
                </div>
                <div>
                  <h4 style={{ color: '#FFF', fontSize: '13px', margin: '0 0 2px 0', fontWeight: '600' }}>
                    {feat.title}
                  </h4>
                  <p style={{ color: '#64748B', fontSize: '11px', margin: 0 }}>{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Live Metrics Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              padding: '14px 20px',
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
            }}
          >
            <div>
              <div style={{ color: '#818CF8', fontSize: '18px', fontWeight: '800' }}>70%</div>
              <div style={{ color: '#64748B', fontSize: '11px' }}>Faster PR Cycles</div>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)' }} />
            <div>
              <div style={{ color: '#06B6D4', fontSize: '18px', fontWeight: '800' }}>100%</div>
              <div style={{ color: '#64748B', fontSize: '11px' }}>AST Grounded</div>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)' }} />
            <div>
              <div style={{ color: '#10B981', fontSize: '18px', fontWeight: '800' }}>0</div>
              <div style={{ color: '#64748B', fontSize: '11px' }}>Blast Radius Surprises</div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div
          className="animated-border"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(9, 13, 22, 0.95))',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '28px',
            padding: '40px 36px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.2)',
            position: 'relative',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#FFF', margin: '0 0 6px 0' }}>
              Welcome back
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '14px', margin: 0 }}>
              Enter your credentials to access your workspace.
            </p>
          </div>

          {authError && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Email Field */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#E2E8F0', marginBottom: '8px' }}>
                Work Email
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  gap: '10px',
                }}
              >
                <Mail size={16} color="#94A3B8" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#FFF',
                    fontSize: '14px',
                    width: '100%',
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#E2E8F0' }}>
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '12px', color: '#818CF8', textDecoration: 'none', fontWeight: '500' }}
                >
                  Forgot password?
                </Link>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  gap: '10px',
                }}
              >
                <Lock size={16} color="#94A3B8" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#FFF',
                    fontSize: '14px',
                    width: '100%',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '10px',
                padding: '14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                border: 'none',
                color: '#FFF',
                fontSize: '15px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                if (!loading) e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.filter = 'brightness(1.0)';
              }}
            >
              {loading ? (
                'Authenticating...'
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer Register Link */}
          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#94A3B8' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#818CF8', fontWeight: '600', textDecoration: 'none' }}>
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
