import { useEffect, useState } from 'react';
import { Brand, CookieBanner, ThemeButton, ThemeFrame, useTheme } from '../components/AppChrome';
import { getRedirectTarget } from '../lib/routes';
import { supabase } from '../lib/supabase';

const inputBase = 'w-full rounded-xl border-[1.5px] bg-[var(--wt-input)] px-3.5 py-[11px] text-sm text-[var(--wt-text)] outline-none transition focus:border-[var(--wt-accent)] focus:shadow-[0_0_0_3px_rgba(94,196,123,.14)]';
const labelBase = 'mb-1.5 block text-xs font-semibold uppercase text-[var(--wt-muted)]';
const mainButton = 'mt-1 flex w-full items-center justify-center rounded-xl bg-[var(--wt-accent)] p-[13px] text-sm font-semibold text-white transition hover:opacity-90 active:scale-[.98] disabled:cursor-default disabled:opacity-50';

function AuthPage({ children, maxWidth = 400 }) {
  const [theme, toggleTheme] = useTheme();
  return (
    <ThemeFrame theme={theme} className="flex items-center justify-center p-6">
      <ThemeButton theme={theme} onToggle={toggleTheme} />
      <section style={{ maxWidth }} className="w-full rounded-[20px] border border-[var(--wt-border)] bg-[var(--wt-surface)] px-10 pb-9 pt-11 shadow-[var(--wt-shadow)] max-[440px]:px-6">
        {children}
      </section>
      <CookieBanner />
    </ThemeFrame>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="mb-4">
      <label className={labelBase}>{label}</label>
      {children}
      <div className="mt-1.5 min-h-4 text-xs text-[var(--wt-error)]">{error}</div>
    </div>
  );
}

function Spinner() {
  return <span className="mr-1.5 size-4 animate-spin rounded-full border-[2.5px] border-white/30 border-t-white" />;
}

function errorInput(error, extra = '') {
  return `${inputBase} ${error ? 'border-[var(--wt-error)]' : 'border-[var(--wt-border)]'} ${extra}`;
}

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clearApiCacheIfNearQuota() {
  try {
    localStorage.setItem('wt-quota-probe', '1');
    localStorage.removeItem('wt-quota-probe');
  } catch (error) {
    if (error.name !== 'QuotaExceededError') return;
    const keys = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith('ct2:')) keys.push(key);
    }
    keys.forEach(key => localStorage.removeItem(key));
  }
}

function freeRoomForSessionWrite() {
  try {
    let total = 0;
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      total += key.length + (localStorage.getItem(key) || '').length;
    }
    if (total < 3 * 1024 * 1024) return;
    const keys = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith('ct2:')) keys.push(key);
    }
    keys.forEach(key => localStorage.removeItem(key));
  } catch {
    // Best effort: authentication must not be blocked by cache cleanup.
  }
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Sign in — WaxTree';
    clearApiCacheIfNearQuota();
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = getRedirectTarget();
    });
  }, []);

  const submit = async event => {
    event.preventDefault();
    const nextErrors = {};
    const normalizedEmail = email.trim();
    if (!normalizedEmail) nextErrors.email = 'Enter your email';
    else if (!emailIsValid(normalizedEmail)) nextErrors.email = 'Invalid email';
    if (!password) nextErrors.password = 'Enter your password';
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length) return;

    freeRoomForSessionWrite();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) {
      setSubmitting(false);
      setFormError(error.message.includes('Invalid login credentials') ? 'Incorrect email or password. Try again.' : error.message);
      return;
    }

    let verified = null;
    for (let attempt = 0; attempt < 3 && !verified; attempt++) {
      if (attempt) await new Promise(resolve => setTimeout(resolve, 250));
      verified = (await supabase.auth.getSession()).data.session;
    }
    if (!verified) {
      setSubmitting(false);
      setFormError("Signed in, but your browser couldn't save the session (storage may be full). Try clearing some space or a different browser.");
      return;
    }
    window.location.href = getRedirectTarget();
  };

  return (
    <AuthPage>
      <Brand subtitle="Sign in to your account" />
      {formError && <div className="mb-4 rounded-[10px] border border-[#F47B5E]/30 bg-[#F47B5E]/10 px-3.5 py-2.5 text-[13px] text-[var(--wt-error)]">{formError}</div>}
      <form onSubmit={submit} noValidate>
        <Field label="Email" error={errors.email}>
          <input className={errorInput(errors.email)} value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="your@email.com" autoComplete="email" />
        </Field>
        <Field label="Password" error={errors.password}>
          <div className="relative">
            <input className={errorInput(errors.password, 'pr-10')} value={password} onChange={event => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password" />
            <button type="button" aria-label="Show password" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[15px] text-[var(--wt-faint)] hover:text-[var(--wt-muted)]">{showPassword ? '🙈' : '👁'}</button>
          </div>
        </Field>
        <div className="-mt-2 mb-5 text-right"><a className="text-xs text-[var(--wt-muted)] hover:text-[var(--wt-accent)]" href="/forgot-password">Forgot password?</a></div>
        <button className={mainButton} disabled={submitting}>{submitting && <Spinner />}{submitting ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="mt-6 text-center text-[13px] text-[var(--wt-muted)]">Don't have an account? <a className="font-medium text-[var(--wt-accent)] hover:opacity-80" href="/register">Sign up</a></div>
    </AuthPage>
  );
}

const strengthLevels = [
  { label: '', color: '', width: 'w-0' },
  { label: 'Weak', color: 'bg-[#F47B5E] text-[#F47B5E]', width: 'w-1/5' },
  { label: 'Fair', color: 'bg-[#F4C15E] text-[#F4C15E]', width: 'w-2/5' },
  { label: 'Good', color: 'bg-[#90E0AA] text-[#90E0AA]', width: 'w-3/5' },
  { label: 'Great', color: 'bg-[#5EC47B] text-[#5EC47B]', width: 'w-4/5' },
  { label: 'Strong', color: 'bg-[#3DAE5A] text-[#3DAE5A]', width: 'w-full' },
];

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return password ? strengthLevels[Math.max(1, Math.min(score, 5))] : strengthLevels[0];
}

function PasswordStrength({ password }) {
  const level = passwordStrength(password);
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded bg-[var(--wt-border)]"><div className={`h-full rounded transition-all ${level.width} ${level.color.split(' ')[0]}`} /></div>
      <span className={`min-w-10 text-right text-[11px] ${level.color.split(' ')[1] || ''}`}>{level.label}</span>
    </div>
  );
}

export function RegisterPage() {
  const [values, setValues] = useState({ username: '', email: '', password: '', confirm: '' });
  const [show, setShow] = useState({ password: false, confirm: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState('');

  useEffect(() => {
    document.title = 'Create account — WaxTree';
    void supabase.auth.getSession().then(({ data }) => { if (data.session) window.location.href = '/app'; });
  }, []);

  const update = key => event => setValues(current => ({ ...current, [key]: event.target.value }));
  const submit = async event => {
    event.preventDefault();
    const username = values.username.trim();
    const email = values.email.trim();
    const nextErrors = {};
    if (!username) nextErrors.username = 'Enter a username';
    else if (username.length < 3) nextErrors.username = 'At least 3 characters';
    else if (!/^[a-zA-Z0-9_.-]+$/.test(username)) nextErrors.username = 'Letters, numbers, _ . - only';
    if (!email) nextErrors.email = 'Enter your email';
    else if (!emailIsValid(email)) nextErrors.email = 'Invalid email';
    if (!values.password) nextErrors.password = 'Enter a password';
    else if (values.password.length < 8) nextErrors.password = 'At least 8 characters';
    if (!values.confirm) nextErrors.confirm = 'Confirm your password';
    else if (values.password !== values.confirm) nextErrors.confirm = 'Passwords do not match';
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({ email, password: values.password, options: { data: { username } } });
    if (error) {
      setSubmitting(false);
      setFormError(error.message.includes('already registered') ? 'Email already registered. Sign in instead.' : error.message);
      return;
    }
    if (data.session) window.location.href = '/app';
    else setConfirmedEmail(email);
  };

  return (
    <AuthPage maxWidth={420}>
      <Brand subtitle={confirmedEmail ? 'Almost done!' : 'Create your account'} />
      {confirmedEmail ? (
        <div className="text-center">
          <div className="mb-3 text-[42px]">📬</div>
          <h1 className="mb-2 text-base font-semibold">Check your email</h1>
          <p className="mb-5 text-[13px] leading-6 text-[var(--wt-muted)]">We've sent a confirmation link to <strong className="text-[var(--wt-text)]">{confirmedEmail}</strong>.<br />Click the link to activate your account.</p>
          <a href="/login" className="inline-block rounded-xl border border-[var(--wt-border)] px-5 py-2.5 text-[13px] font-semibold text-[var(--wt-muted)] hover:border-[var(--wt-accent)] hover:text-[var(--wt-accent)]">Go to sign in</a>
        </div>
      ) : (
        <>
          {formError && <div className="mb-4 rounded-[10px] border border-[#F47B5E]/30 bg-[#F47B5E]/10 px-3.5 py-2.5 text-[13px] text-[var(--wt-error)]">{formError}</div>}
          <form onSubmit={submit} noValidate>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[.08em] text-[var(--wt-faint)]">Profile</div>
            <Field label="Username" error={errors.username}><input className={errorInput(errors.username)} value={values.username} onChange={update('username')} placeholder="e.g. djluca" autoComplete="username" maxLength={32} /></Field>
            <Field label="Email" error={errors.email}><input className={errorInput(errors.email)} value={values.email} onChange={update('email')} type="email" placeholder="your@email.com" autoComplete="email" /></Field>
            <div className="my-5 h-px bg-[var(--wt-border)]" />
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[.08em] text-[var(--wt-faint)]">Security</div>
            <Field label="Password" error={errors.password}>
              <div className="relative"><input className={errorInput(errors.password, 'pr-10')} value={values.password} onChange={update('password')} type={show.password ? 'text' : 'password'} placeholder="Min. 8 characters" autoComplete="new-password" /><button type="button" onClick={() => setShow(current => ({ ...current, password: !current.password }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-[var(--wt-faint)]">{show.password ? '🙈' : '👁'}</button></div>
              <PasswordStrength password={values.password} />
            </Field>
            <Field label="Confirm password" error={errors.confirm}>
              <div className="relative"><input className={errorInput(errors.confirm, 'pr-10')} value={values.confirm} onChange={update('confirm')} type={show.confirm ? 'text' : 'password'} placeholder="Repeat password" autoComplete="new-password" /><button type="button" onClick={() => setShow(current => ({ ...current, confirm: !current.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-[var(--wt-faint)]">{show.confirm ? '🙈' : '👁'}</button></div>
            </Field>
            <button className={mainButton} disabled={submitting}>{submitting && <Spinner />}{submitting ? 'Creating account…' : 'Create account'}</button>
          </form>
          <div className="mt-6 text-center text-[13px] text-[var(--wt-muted)]">Already have an account? <a className="font-medium text-[var(--wt-accent)]" href="/login">Sign in</a></div>
        </>
      )}
    </AuthPage>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { document.title = 'Reset password — WaxTree'; }, []);

  const submit = async event => {
    event.preventDefault();
    const normalized = email.trim();
    if (!normalized) return setError('Enter your email');
    if (!emailIsValid(normalized)) return setError('Invalid email');
    setError('');
    setSubmitting(true);
    await supabase.auth.resetPasswordForEmail(normalized, { redirectTo: `${location.origin}/reset-password` });
    setSent(true);
  };

  return (
    <AuthPage>
      <Brand subtitle="Reset your password" />
      {sent ? (
        <div className="text-center">
          <div className="mb-3 text-[42px]">📬</div>
          <h1 className="mb-2 text-base font-semibold">Check your email</h1>
          <p className="mb-5 text-[13px] leading-6 text-[var(--wt-muted)]">If the address <strong className="text-[var(--wt-text)]">{email.trim()}</strong> is registered, you'll receive instructions to reset your password within a few minutes.</p>
          <a href="/login" className="inline-block rounded-xl border border-[var(--wt-border)] px-5 py-2.5 text-[13px] font-semibold text-[var(--wt-muted)]">Back to sign in</a>
        </div>
      ) : (
        <>
          <p className="mb-5 text-[13px] leading-6 text-[var(--wt-muted)]">Enter your account email address. We'll send you instructions to reset your password.</p>
          <form onSubmit={submit} noValidate>
            <Field label="Email" error={error}><input className={errorInput(error)} value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="your@email.com" autoComplete="email" /></Field>
            <button className={mainButton} disabled={submitting}>{submitting && <Spinner />}{submitting ? 'Sending…' : 'Send instructions'}</button>
          </form>
          <div className="mt-5 text-center"><a className="text-[13px] text-[var(--wt-accent)]" href="/login">← Back to sign in</a></div>
        </>
      )}
    </AuthPage>
  );
}

export function ResetPasswordPage() {
  const [state, setState] = useState('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState({ password: false, confirm: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'New password — WaxTree';
    let recoveryReady = false;
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') { recoveryReady = true; setState('form'); }
    });
    const timer = setTimeout(() => { if (!recoveryReady) setState('error'); }, 4000);
    return () => { clearTimeout(timer); data.subscription.unsubscribe(); };
  }, []);

  const submit = async event => {
    event.preventDefault();
    const nextErrors = {};
    if (!password || password.length < 8) nextErrors.password = 'At least 8 characters';
    if (!confirm) nextErrors.confirm = 'Confirm your password';
    else if (confirm !== password) nextErrors.confirm = 'Passwords do not match';
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length) return;
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setSubmitting(false); setFormError(error.message); return; }
    await supabase.auth.signOut();
    setState('success');
    setTimeout(() => { window.location.href = '/login'; }, 3000);
  };

  return (
    <AuthPage>
      <Brand subtitle={state === 'success' ? 'Done!' : 'New password'} />
      {state === 'loading' && <div className="py-7 text-center text-[13px] text-[var(--wt-muted)]"><span className="mr-2 animate-pulse text-[var(--wt-accent)]">●</span>Verifying…</div>}
      {state === 'error' && <AuthState icon="⚠️" title="Invalid link" body="The recovery link has expired or is invalid. Request a new one." href="/forgot-password" action="Request new link" />}
      {state === 'success' && <AuthState icon="✅" title="Password updated" body="You can now sign in with your new password." href="/login" action="Go to sign in" />}
      {state === 'form' && (
        <form onSubmit={submit} noValidate>
          {formError && <div className="mb-4 rounded-[10px] border border-[#F47B5E]/30 bg-[#F47B5E]/10 px-3.5 py-2.5 text-[13px] text-[var(--wt-error)]">{formError}</div>}
          <Field label="New password" error={errors.password}>
            <div className="relative"><input className={errorInput(errors.password, 'pr-10')} value={password} onChange={event => setPassword(event.target.value)} type={show.password ? 'text' : 'password'} placeholder="Min. 8 characters" autoComplete="new-password" /><button type="button" onClick={() => setShow(current => ({ ...current, password: !current.password }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-[var(--wt-faint)]">{show.password ? '🙈' : '👁'}</button></div>
            <PasswordStrength password={password} />
          </Field>
          <Field label="Confirm password" error={errors.confirm}>
            <div className="relative"><input className={errorInput(errors.confirm, 'pr-10')} value={confirm} onChange={event => setConfirm(event.target.value)} type={show.confirm ? 'text' : 'password'} placeholder="Repeat password" autoComplete="new-password" /><button type="button" onClick={() => setShow(current => ({ ...current, confirm: !current.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-[var(--wt-faint)]">{show.confirm ? '🙈' : '👁'}</button></div>
          </Field>
          <button className={mainButton} disabled={submitting}>{submitting && <Spinner />}{submitting ? 'Saving…' : 'Set password'}</button>
        </form>
      )}
    </AuthPage>
  );
}

function AuthState({ icon, title, body, href, action }) {
  return (
    <div className="text-center">
      <div className="mb-3 text-[42px]">{icon}</div>
      <h1 className="mb-2 text-base font-semibold">{title}</h1>
      <p className="mb-5 text-[13px] leading-6 text-[var(--wt-muted)]">{body}</p>
      <a href={href} className="inline-block rounded-xl border border-[var(--wt-border)] px-5 py-2.5 text-[13px] font-semibold text-[var(--wt-muted)]">{action}</a>
    </div>
  );
}
