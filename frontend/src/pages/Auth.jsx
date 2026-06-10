import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import styles from './Auth.module.css';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login, register } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const passwordStrength = (p) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(p)) s++;
    return s;
  };

  const strength = passwordStrength(form.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'][strength];
  const strengthColor = ['', '#ff6b6b', '#ffc272', '#72c2ff', '#c2ff72', '#72ffc2'][strength];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        navigate('/');
      } else {
        await register(form.name, form.email, form.password);
        setMode('check-email');
      }
    } catch (err) {
      const code = err.response?.data?.code;
      const msg = err.response?.data?.errors?.[0]?.msg
        || err.response?.data?.error
        || 'Something went wrong';

      if (code === 'EMAIL_NOT_VERIFIED') {
        setMode('check-email');
        setError('');
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.grid} aria-hidden="true">
        {Array.from({ length: 80 }).map((_, i) => <div key={i} className={styles.cell} />)}
      </div>

      <button className={styles.themeBtn} onClick={toggle} aria-label="Toggle theme">
        {theme === 'dark' ? '☀' : '☾'}
      </button>

      <div className={styles.card}>
        <div className={styles.logoRow}>
          <span className={styles.logo}>Expense<span>IQ</span></span>
        </div>

        {/* Check email screen */}
        {mode === 'check-email' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>📬</div>
            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Check your inbox</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
              We sent a verification link to<br />
              <strong>{form.email}</strong>.<br />
              Click it to activate your account.
            </p>
            <button className={styles.btnSubmit} onClick={() => { setMode('login'); setError(''); }}>
              Back to sign in
            </button>
          </div>

        ) : (
          /* Login / Register screen */
          <>
            <p className={styles.sub}>
              {mode === 'login' ? 'Welcome back. Sign in to continue.' : 'Create your account.'}
            </p>

            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
                onClick={() => { setMode('login'); setError(''); }}
              >Sign in</button>
              <button
                className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
                onClick={() => { setMode('register'); setError(''); }}
              >Create account</button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {mode === 'register' && (
                <div className={styles.field}>
                  <label htmlFor="name">Full name</label>
                  <input
                    id="name" type="text" placeholder="Your name"
                    value={form.name} onChange={set('name')}
                    autoComplete="name" required minLength={2}
                  />
                </div>
              )}

              <div className={styles.field}>
                <label htmlFor="email">Email</label>
                <input
                  id="email" type="email" placeholder="you@example.com"
                  value={form.email} onChange={set('email')}
                  autoComplete="email" required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="password">Password</label>
                <div className={styles.passWrap}>
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    placeholder={mode === 'register' ? 'Min 8 chars, mixed case + symbol' : 'Your password'}
                    value={form.password} onChange={set('password')}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPass(s => !s)}
                    aria-label="Toggle password visibility"
                  >
                    {showPass ? '○' : '●'}
                  </button>
                </div>
                {mode === 'register' && form.password.length > 0 && (
                  <div className={styles.strength}>
                    <div className={styles.strengthBars}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <div key={n} className={styles.strengthBar}
                          style={{ background: n <= strength ? strengthColor : 'var(--border2)' }} />
                      ))}
                    </div>
                    <span style={{ color: strengthColor, fontSize: '11px' }}>{strengthLabel}</span>
                  </div>
                )}
              </div>

              {error && <div className={styles.error} role="alert">{error}</div>}

              <button type="submit" className={styles.btnSubmit} disabled={loading}>
                {loading
                  ? <span className={styles.spinner} />
                  : (mode === 'login' ? 'Sign in' : 'Create account')
                }
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}