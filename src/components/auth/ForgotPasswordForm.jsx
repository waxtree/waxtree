import { useEffect, useState } from 'react';
import { Brand } from '@/components/AppChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthStatusMessage } from '@/components/auth/AuthStatusMessage';
import { FormField } from '@/components/auth/FormField';
import { Spinner } from '@/components/auth/Spinner';
import { emailIsValid } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export const ForgotPasswordForm = () => {
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

  if (sent) {
    return (
      <>
        <Brand subtitle="Reset your password" />
        <AuthStatusMessage
          icon="📬"
          title="Check your email"
          body={<>If the address <strong className="text-foreground">{email.trim()}</strong> is registered, you'll receive instructions to reset your password within a few minutes.</>}
          href="/login"
          action="Back to sign in"
        />
      </>
    );
  }

  return (
    <>
      <Brand subtitle="Reset your password" />
      <p className="mb-5 text-[13px] leading-6 text-muted-foreground">Enter your account email address. We'll send you instructions to reset your password.</p>
      <form onSubmit={submit} noValidate>
        <FormField label="Email" htmlFor="forgot-email" error={error}>
          <Input id="forgot-email" aria-invalid={!!error} value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="your@email.com" autoComplete="email" />
        </FormField>
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? 'Sending…' : 'Send instructions'}
        </Button>
      </form>
      <div className="mt-5 text-center"><a className="text-[13px] text-primary" href="/login">← Back to sign in</a></div>
    </>
  );
};
