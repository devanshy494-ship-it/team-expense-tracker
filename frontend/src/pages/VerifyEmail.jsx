import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('invalid'); return; }

    api.get(`/auth/verify-email?token=${token}`)
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/login?verified=true'), 2500);
      })
      .catch(() => setStatus('invalid'));
  }, []);

  const content = {
    verifying: { icon: '⏳', title: 'Verifying your email…', sub: 'Please wait.' },
    success:   { icon: '✅', title: 'Email verified!', sub: 'Redirecting you to login…' },
    invalid:   { icon: '❌', title: 'Invalid or expired link', sub: 'Try registering again or request a new link.' },
  }[status];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{content.icon}</div>
        <h2 style={{ marginBottom: 8 }}>{content.title}</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>{content.sub}</p>
        {status === 'invalid' && (
          <button onClick={() => navigate('/login')}
            style={{ marginTop: 24, padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--neon)', color: 'var(--accent-fg)', cursor: 'pointer', fontWeight: 600 }}>
            Back to login
          </button>
        )}
      </div>
    </div>
  );
}