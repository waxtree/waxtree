import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../lib/auth';
import { normalizeNext } from '../lib/routes';
import { supabase } from '../lib/supabase';
import { makeRoomForAuthSession } from '../lib/storage';

function AuthShell({
  subtitle,
  children,
}: {
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="auth-page">
      <ThemeToggle />
      <section className="auth-card">
        <BrandMark />
        <p className="auth-card__subtitle">{subtitle}</p>
        {children}
      </section>
    </div>
  );
}

function emailValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function passwordScore(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function passwordLabel(score: number) {
  return ['Too short', 'Weak', 'Okay', 'Good', 'Strong'][score] ?? 'Too short';
}

export function LoginPage() {
  const { loading, session, refresh } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const next = useMemo(() => normalizeNext(new URLSearchParams(location.search).get('next')), [location.search]);

  if (!loading && session) return <Navigate to={next} replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!emailValid(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    makeRoomForAuthSession();
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setSubmitting(false);
      setError(
        signInError.message.includes('Invalid login credentials')
          ? 'Incorrect email or password. Try again.'
          : signInError.message,
      );
      return;
    }

    let verified = false;
    for (let i = 0; i < 3; i++) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        verified = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    setSubmitting(false);
    if (!verified) {
      setError('Sign in succeeded, but the browser could not persist the session. Clear site data or try again.');
      return;
    }
    await refresh();
    navigate(next, { replace: true });
  }

  return (
    <AuthShell subtitle="Sign in to your account">
      <form className="form-stack" onSubmit={onSubmit} noValidate>
        {error && <div className="form-alert">{error}</div>}
        <label className="field">
          <span>Email</span>
          <input value={email} type="email" autoComplete="email" onChange={event => setEmail(event.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <div className="field-row">
            <input
              value={password}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              onChange={event => setPassword(event.target.value)}
            />
            <button className="icon-text-btn" type="button" onClick={() => setShowPassword(value => !value)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>
        <Link className="auth-card__quiet-link" to="/forgot-password">
          Forgot password?
        </Link>
        <button className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="auth-card__footer">
        Don't have an account? <Link to="/register">Sign up</Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { loading, session } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [successEmail, setSuccessEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const score = passwordScore(password);

  if (!loading && session) return <Navigate to="/app" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!username.trim()) return setError('Choose a username.');
    if (!emailValid(email)) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username.trim() },
        emailRedirectTo: `${location.origin}/app`,
      },
    });
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message.includes('already') ? 'Email already registered. Sign in instead.' : signUpError.message);
      return;
    }
    if (data.session) {
      window.location.assign('/app');
      return;
    }
    setSuccessEmail(email);
  }

  if (successEmail) {
    return (
      <AuthShell subtitle="Almost done">
        <div className="auth-state">
          <h1>Check your email</h1>
          <p>We sent a confirmation link to {successEmail}.</p>
          <Link className="btn btn--secondary btn--block" to="/login">
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell subtitle="Create your account">
      <form className="form-stack" onSubmit={onSubmit} noValidate>
        {error && <div className="form-alert">{error}</div>}
        <label className="field">
          <span>Username</span>
          <input value={username} autoComplete="username" onChange={event => setUsername(event.target.value)} />
        </label>
        <label className="field">
          <span>Email</span>
          <input value={email} type="email" autoComplete="email" onChange={event => setEmail(event.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            value={password}
            type="password"
            autoComplete="new-password"
            onChange={event => setPassword(event.target.value)}
          />
        </label>
        <div className="password-meter" aria-label={passwordLabel(score)}>
          <span style={{ width: `${Math.max(12, score * 25)}%` }} />
        </div>
        <div className="field-hint">{passwordLabel(score)}</div>
        <label className="field">
          <span>Confirm password</span>
          <input
            value={confirm}
            type="password"
            autoComplete="new-password"
            onChange={event => setConfirm(event.target.value)}
          />
        </label>
        <button className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="auth-card__footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!emailValid(email)) return setError('Enter a valid email address.');
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (resetError) return setError(resetError.message);
    setSent(true);
  }

  return (
    <AuthShell subtitle="Reset your password">
      {sent ? (
        <div className="auth-state">
          <h1>Instructions sent</h1>
          <p>If {email} is registered, you will receive a reset link within a few minutes.</p>
          <Link className="btn btn--secondary btn--block" to="/login">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="form-stack" onSubmit={onSubmit} noValidate>
          {error && <div className="form-alert">{error}</div>}
          <label className="field">
            <span>Email</span>
            <input value={email} type="email" autoComplete="email" onChange={event => setEmail(event.target.value)} />
          </label>
          <button className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
          <Link className="btn btn--ghost btn--block" to="/login">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const score = passwordScore(password);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) return setError(updateError.message);
    setDone(true);
  }

  return (
    <AuthShell subtitle={done ? 'Done' : 'New password'}>
      {done ? (
        <div className="auth-state">
          <h1>Password updated</h1>
          <p>You can now sign in with your new password.</p>
          <Link className="btn btn--primary btn--block" to="/login">
            Go to sign in
          </Link>
        </div>
      ) : (
        <form className="form-stack" onSubmit={onSubmit} noValidate>
          {error && <div className="form-alert">{error}</div>}
          <label className="field">
            <span>New password</span>
            <input value={password} type="password" autoComplete="new-password" onChange={event => setPassword(event.target.value)} />
          </label>
          <div className="password-meter" aria-label={passwordLabel(score)}>
            <span style={{ width: `${Math.max(12, score * 25)}%` }} />
          </div>
          <div className="field-hint">{passwordLabel(score)}</div>
          <label className="field">
            <span>Confirm password</span>
            <input value={confirm} type="password" autoComplete="new-password" onChange={event => setConfirm(event.target.value)} />
          </label>
          <button className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? 'Saving…' : 'Set password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
