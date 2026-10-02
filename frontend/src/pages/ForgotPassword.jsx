import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendForgotPasswordOtp, resetPasswordWithOtp } from '../services/api';
import {
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();

  // Step: 'request' | 'verify' | 'success'
  const [step, setStep] = useState('request');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const otpInputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    let interval = null;
    if (step === 'verify' && resendTimer > 0) {
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

  // Focus first OTP box on step change
  useEffect(() => {
    if (step === 'verify' && otpInputRefs.current[0]) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Step 1: Send Password Reset Code
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await sendForgotPasswordOtp(email.trim());
      setStep('verify');
      setResendTimer(60);
      setCanResend(false);
      setInfoMessage(`Recovery code sent to ${email.trim()}`);
    } catch (err) {
      setError(err.message || 'Failed to dispatch password recovery code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP input
  const handleOtpDigitChange = (index, value) => {
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

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Step 2: Submit OTP & New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithOtp(email.trim(), fullOtp, newPassword);
      setStep('success');
    } catch (err) {
      setError(err.message || 'Invalid or expired recovery code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      await sendForgotPasswordOtp(email.trim());
      setResendTimer(60);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setInfoMessage(`A fresh recovery code was sent to ${email.trim()}`);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || 'Failed to resend recovery code.');
    } finally {
      setLoading(false);
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
          maxWidth: '480px',
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(9, 13, 22, 0.95))',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '28px',
          padding: '40px 36px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.2)',
          textAlign: 'center',
        }}
      >
        {/* Brand Icon */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            marginBottom: '20px',
            boxShadow: '0 0 25px rgba(99, 102, 241, 0.4)',
          }}
        >
          <Lock size={24} color="#FFFFFF" />
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#FFF', margin: '0 0 8px 0' }}>
          {step === 'request' && 'Reset Password'}
          {step === 'verify' && 'Enter Verification Code'}
          {step === 'success' && 'Password Updated!'}
        </h2>

        <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.5, margin: '0 0 24px 0' }}>
          {step === 'request' && 'Enter your developer account email to receive a recovery code.'}
          {step === 'verify' && `Enter the 6-digit code sent to ${email} and choose a new password.`}
          {step === 'success' && 'Your password has been changed. You can now log in.'}
        </p>

        {error && (
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
              textAlign: 'left',
            }}
          >
            <AlertCircle size={16} flexShrink={0} />
            <span>{error}</span>
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
              textAlign: 'left',
            }}
          >
            <CheckCircle2 size={16} flexShrink={0} />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* STEP 1: REQUEST OTP */}
        {step === 'request' && (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#E2E8F0', marginBottom: '8px' }}>
                Account Email
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
                'Sending Recovery Code...'
              ) : (
                <>
                  <span>Send Recovery Code</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#94A3B8',
                  fontSize: '13px',
                  textDecoration: 'none',
                  fontWeight: '500',
                }}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: ENTER OTP & NEW PASSWORD */}
        {step === 'verify' && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}>
            {/* 6 Digit Inputs */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#CBD5E1', marginBottom: '10px', textAlign: 'center' }}>
                Enter 6-Digit Code
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
                      width: '44px',
                      height: '50px',
                      textAlign: 'center',
                      fontSize: '20px',
                      fontWeight: '800',
                      fontFamily: 'monospace',
                      color: '#FFF',
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: digit ? '2px solid #818CF8' : '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      outline: 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Resend Action */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12.5px' }}>
              <span style={{ color: '#94A3B8' }}>Didn't get code?</span>
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
                  <RefreshCw size={13} /> Resend
                </button>
              ) : (
                <span style={{ color: '#64748B', fontWeight: '600' }}>
                  Resend in {resendTimer}s
                </span>
              )}
            </div>

            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#E2E8F0', marginBottom: '8px' }}>
                New Password
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
                <Lock size={16} color="#94A3B8" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

            <button
              type="submit"
              disabled={loading || otpDigits.join('').length !== 6 || newPassword.length < 6}
              style={{
                marginTop: '10px',
                padding: '14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none',
                color: '#FFF',
                fontSize: '14px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: loading || otpDigits.join('').length !== 6 || newPassword.length < 6 ? 'not-allowed' : 'pointer',
                opacity: otpDigits.join('').length !== 6 || newPassword.length < 6 ? 0.7 : 1,
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? (
                'Resetting Password...'
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>Update Password</span>
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setStep('request')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                }}
              >
                ← Change email address
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: '#E2E8F0', fontSize: '14px', margin: '0 0 20px' }}>
              Your password has been reset successfully.
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: '#FFF',
                fontWeight: '700',
                fontSize: '14px',
                textDecoration: 'none',
                boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)',
              }}
            >
              Sign In Now <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
