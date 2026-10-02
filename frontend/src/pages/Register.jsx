import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { requestOtp, verifyAndCreateAccount, loading, authError } = useAuth();

  // Step state: 'form' | 'otp'
  const [step, setStep] = useState('form');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Senior Staff Engineer');
  const [showPassword, setShowPassword] = useState(false);

  // OTP State (6 Digits)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [localError, setLocalError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const otpInputRefs = useRef([]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Focus first OTP input on step switch
  useEffect(() => {
    if (step === 'otp' && otpInputRefs.current[0]) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Handle Step 1: Submit Details & Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLocalError('');
    setInfoMessage('');

    if (!name.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    try {
      await requestOtp(email.trim(), name.trim());
      setStep('otp');
      setResendTimer(60);
      setCanResend(false);
      setInfoMessage(`Verification code sent to ${email.trim()}`);
    } catch (err) {
      setLocalError(err.message || 'Failed to dispatch verification code.');
    }
  };

  // Handle OTP digit changes
  const handleOtpDigitChange = (index, value) => {
    // Handle paste of full 6-digit code
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      if (pasted) {
        const newDigits = [...otpDigits];
        for (let i = 0; i < pasted.length; i++) {
          newDigits[i] = pasted[i];
        }
        setOtpDigits(newDigits);
        const nextIndex = Math.min(pasted.length, 5);
        otpInputRefs.current[nextIndex]?.focus();
      }
      return;
    }

    const cleanVal = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    // Auto-advance to next box if filled
    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP Backspace key
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Step 2: Verify OTP & Complete Registration
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setLocalError('');
    setInfoMessage('');

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setLocalError('Please enter all 6 digits of your verification code.');
      return;
    }

    try {
      await verifyAndCreateAccount({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        otp: fullOtp,
      });
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message || 'Invalid or expired verification code.');
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    setLocalError('');
    setInfoMessage('');
    try {
      await requestOtp(email.trim(), name.trim());
      setResendTimer(60);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setInfoMessage(`A fresh 6-digit code was sent to ${email.trim()}`);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setLocalError(err.message || 'Failed to resend verification code.');
    }
  };

  const displayedError = localError || authError;

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
        {/* Left Side: Brand & Engineering Onboarding Benefits */}
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
                Enterprise Engineering Suite
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
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#6EE7B7',
                fontSize: '12px',
                fontWeight: '700',
                marginBottom: '14px',
              }}
            >
              <ShieldCheck size={14} /> Verified Developer Authentication
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
              Join your team <br />
              <span className="shimmer-text">
                on ImpactIQ Workspace.
              </span>
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
              Equip your engineering squad with AST blast radius mapping, automated PR authoring, and Senior AI code reviews.
            </p>
          </div>

          {/* What you get list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { title: 'Interactive AST Call Graphs', desc: 'Trace caller hierarchies from controllers to database models.' },
              { title: 'Deterministic Pre-Review Audit', desc: 'Detect race conditions, SQL flaws, and missing tests before merge.' },
              { title: 'Autonomous PR Synthesizer', desc: '1-click pull request generation with comprehensive QA plans.' },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '14px 18px',
                  transition: 'transform 0.25s ease, border-color 0.25s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10B981',
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <h4 style={{ color: '#FFF', fontSize: '13px', margin: '0 0 2px 0', fontWeight: '600' }}>
                    {item.title}
                  </h4>
                  <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Privacy footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '12px' }}>
            <Lock size={14} color="#818CF8" />
            <span>Encrypted with SHA-256 & email OTP token validation.</span>
          </div>
        </div>

        {/* Right Side: Registration Card */}
        <div
          className="animated-border"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(9, 13, 22, 0.95))',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '28px',
            padding: '36px 32px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.2)',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#FFF', margin: 0 }}>
                {step === 'form' ? 'Create Developer Account' : 'Verify Your Email'}
              </h2>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#818CF8', background: 'rgba(99, 102, 241, 0.15)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                {step === 'form' ? 'Step 1 of 2' : 'Step 2 of 2'}
              </span>
            </div>
            <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>
              {step === 'form'
                ? 'Fill in your details to receive an authentication code.'
                : `We sent a 6-digit verification code to ${email}`}
            </p>
          </div>

          {/* Feedback messages */}
          {displayedError && (
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
              <AlertCircle size={16} flexShrink={0} />
              <span>{displayedError}</span>
            </div>
          )}

          {infoMessage && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                color: '#6EE7B7',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px',
                fontSize: '13px',
              }}
            >
              <CheckCircle2 size={16} flexShrink={0} />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────
              STEP 1: DETAILS FORM
              ────────────────────────────────────────────────────────────────── */}
          {step === 'form' ? (
            <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#E2E8F0', marginBottom: '6px' }}>
                  Full Name
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    gap: '10px',
                  }}
                >
                  <User size={16} color="#94A3B8" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Abhiram Sadgun"
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

              {/* Work Email */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#E2E8F0', marginBottom: '6px' }}>
                  Work Email (Real email for OTP)
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '10px 14px',
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

              {/* Role / Title */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#E2E8F0', marginBottom: '6px' }}>
                  Engineering Role
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    gap: '10px',
                  }}
                >
                  <Briefcase size={16} color="#94A3B8" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#FFF',
                      fontSize: '13px',
                      width: '100%',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="Senior Staff Engineer" style={{ background: '#0F172A', color: '#FFF' }}>Senior Staff Engineer</option>
                    <option value="Principal Architect" style={{ background: '#0F172A', color: '#FFF' }}>Principal Architect</option>
                    <option value="Tech Lead / Engineering Manager" style={{ background: '#0F172A', color: '#FFF' }}>Tech Lead / Engineering Manager</option>
                    <option value="Full-Stack Developer" style={{ background: '#0F172A', color: '#FFF' }}>Full-Stack Developer</option>
                    <option value="QA / SDET Automation Lead" style={{ background: '#0F172A', color: '#FFF' }}>QA / SDET Automation Lead</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#E2E8F0', marginBottom: '6px' }}>
                  Password
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    gap: '10px',
                  }}
                >
                  <Lock size={16} color="#94A3B8" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
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
                  padding: '13px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  border: 'none',
                  color: '#FFF',
                  fontSize: '14px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)',
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? (
                  'Sending Verification Code...'
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* ──────────────────────────────────────────────────────────────────
                STEP 2: 6-DIGIT OTP ENTRY
                ────────────────────────────────────────────────────────────────── */
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Target Email Summary & Change Option */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={15} color="#818CF8" />
                  <span style={{ fontSize: '13px', color: '#E2E8F0', fontFamily: 'monospace' }}>{email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setLocalError('');
                    setInfoMessage('');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#818CF8',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Edit email
                </button>
              </div>

              {/* 6 Digit Inputs */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#CBD5E1', marginBottom: '10px', textAlign: 'center' }}>
                  Enter the 6-Digit OTP Code
                </label>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e.target)}
                      style={{
                        width: '46px',
                        height: '52px',
                        textAlign: 'center',
                        fontSize: '22px',
                        fontWeight: '800',
                        fontFamily: 'monospace',
                        color: '#FFF',
                        background: 'rgba(15, 23, 42, 0.9)',
                        border: digit ? '2px solid #818CF8' : '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '12px',
                        outline: 'none',
                        boxShadow: digit ? '0 0 12px rgba(99, 102, 241, 0.3)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Resend Action & Countdown */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ color: '#94A3B8' }}>Didn't receive code?</span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#818CF8',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                  >
                    <RefreshCw size={13} /> Resend Code
                  </button>
                ) : (
                  <span style={{ color: '#64748B', fontWeight: '600' }}>
                    Resend in {resendTimer}s
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length !== 6}
                  style={{
                    padding: '13px',
                    borderRadius: '12px',
                    background:
                      otpDigits.join('').length === 6
                        ? 'linear-gradient(135deg, #10B981, #059669)'
                        : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    border: 'none',
                    color: '#FFF',
                    fontSize: '14px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: loading || otpDigits.join('').length !== 6 ? 'not-allowed' : 'pointer',
                    opacity: otpDigits.join('').length !== 6 ? 0.7 : 1,
                    boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {loading ? (
                    'Verifying & Creating Profile...'
                  ) : (
                    <>
                      <KeyRound size={16} />
                      <span>Verify & Launch Workspace</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setLocalError('');
                    setInfoMessage('');
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '10px',
                    color: '#94A3B8',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={14} /> Back to Details
                </button>
              </div>
            </form>
          )}

          {/* Footer Login Link */}
          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#94A3B8' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#818CF8', fontWeight: '600', textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
