import { useEffect, useState } from 'react';
import { Brand } from '@/components/AppChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { AuthStatusMessage } from '@/components/auth/AuthStatusMessage';
import { FormAlert } from '@/components/auth/FormAlert';
import { FormField } from '@/components/auth/FormField';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { Spinner } from '@/components/auth/Spinner';
import { emailIsValid } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export const RegisterForm = () => {
  const [values, setValues] = useState({ username: '', email: '', password: '', confirm: '' });
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

  if (confirmedEmail) {
    return (
      <>
        <Brand subtitle="Almost done!" />
        <AuthStatusMessage
          icon="📬"
          title="Check your email"
          body={<>We've sent a confirmation link to <strong className="text-foreground">{confirmedEmail}</strong>.<br />Click the link to activate your account.</>}
          href="/login"
          action="Go to sign in"
        />
      </>
    );
  }

  return (
    <>
      <Brand subtitle="Create your account" />
      <FormAlert>{formError}</FormAlert>
      <form onSubmit={submit} noValidate>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground/70">Profile</div>
        <FormField label="Username" htmlFor="register-username" error={errors.username}>
          <Input id="register-username" aria-invalid={!!errors.username} value={values.username} onChange={update('username')} placeholder="e.g. djluca" autoComplete="username" maxLength={32} />
        </FormField>
        <FormField label="Email" htmlFor="register-email" error={errors.email}>
          <Input id="register-email" aria-invalid={!!errors.email} value={values.email} onChange={update('email')} type="email" placeholder="your@email.com" autoComplete="email" />
        </FormField>

        <Separator className="my-5" />

        <div className="mb-2 text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground/70">Security</div>
        <FormField label="Password" htmlFor="register-password" error={errors.password}>
          <PasswordInput id="register-password" error={errors.password} value={values.password} onChange={update('password')} placeholder="Min. 8 characters" autoComplete="new-password" />
          <PasswordStrengthMeter password={values.password} />
        </FormField>
        <FormField label="Confirm password" htmlFor="register-confirm" error={errors.confirm}>
          <PasswordInput id="register-confirm" error={errors.confirm} value={values.confirm} onChange={update('confirm')} placeholder="Repeat password" autoComplete="new-password" />
        </FormField>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <div className="mt-6 text-center text-[13px] text-muted-foreground">
        Already have an account? <a className="font-medium text-primary" href="/login">Sign in</a>
      </div>
    </>
  );
};
