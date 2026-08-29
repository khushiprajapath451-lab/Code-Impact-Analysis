import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate password recovery email dispatch
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsSubmitted(true);
    } catch (err) {
      setError('Could not process request. Please try again.');
    } finally {
      setLoading(false);
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
            Reset Password
          </h1>
          <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '8px', margin: 0 }}>
            Restore access to your ImpactIQ account
          </p>
        </div>

        {isSubmitted ? (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22C55E',
                marginBottom: '20px',
              }}
            >
              <CheckCircle2 size={24} />
            </div>
            <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Verification Email Sent</h3>
            <p style={{ color: '#9CA3AF', fontSize: '14px', lineHeight: 1.6, marginBottom: '25px' }}>
              We have sent verification instructions to <strong style={{ color: '#FFFFFF' }}>{email}</strong>.
              Please check your inbox and click the reset link to choose a new password.
            </p>
            <Link
              to="/login"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#818CF8',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
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
                  fontSize: '14px',
                }}
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

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
              <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '6px', margin: 0 }}>
                Enter the email address associated with your developer profile.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
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
                opacity: !email ? 0.7 : 1,
              }}
            >
              {loading ? 'Sending Instructions...' : 'Send Reset Link'} <ArrowRight size={18} />
            </button>

            <Link
              to="/login"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#CBD5E1',
                fontWeight: 500,
                textDecoration: 'none',
                fontSize: '14px',
                marginTop: '10px',
              }}
            >
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
