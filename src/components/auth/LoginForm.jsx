import { useEffect, useState } from 'react';
import { Brand } from '@/components/AppChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormAlert } from '@/components/auth/FormAlert';
import { FormField } from '@/components/auth/FormField';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Spinner } from '@/components/auth/Spinner';
import { clearApiCacheIfNearQuota, emailIsValid, freeRoomForSessionWrite } from '@/lib/auth';
import { getRedirectTarget } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    // signInWithPassword() resolving does NOT guarantee the session landed
    // in localStorage — a fresh page load can read it a beat before it's
    // actually there, producing an instant sign-in -> bounced-back loop.
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
    <>
      <Brand subtitle="Sign in to your account" />
      <FormAlert>{formError}</FormAlert>
      <form onSubmit={submit} noValidate>
        <FormField label="Email" htmlFor="login-email" error={errors.email}>
          <Input id="login-email" aria-invalid={!!errors.email} value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="your@email.com" autoComplete="email" />
        </FormField>
        <FormField label="Password" htmlFor="login-password" error={errors.password}>
          <PasswordInput id="login-password" error={errors.password} value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </FormField>
        <div className="-mt-2 mb-5 text-right">
          <a className="text-xs text-muted-foreground hover:text-primary" href="/forgot-password">Forgot password?</a>
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <div className="mt-6 text-center text-[13px] text-muted-foreground">
        Don't have an account? <a className="font-medium text-primary hover:opacity-80" href="/register">Sign up</a>
      </div>
    </>
  );
};
