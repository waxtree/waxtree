import { useEffect, useState } from 'react';
import { Brand } from '@/components/AppChrome';
import { Button } from '@/components/ui/button';
import { AuthStatusMessage } from '@/components/auth/AuthStatusMessage';
import { FormAlert } from '@/components/auth/FormAlert';
import { FormField } from '@/components/auth/FormField';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { Spinner } from '@/components/auth/Spinner';
import { supabase } from '@/lib/supabase';

export const ResetPasswordForm = () => {
  const [state, setState] = useState('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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

  if (state === 'loading') {
    return (
      <>
        <Brand subtitle="New password" />
        <div className="py-7 text-center text-[13px] text-muted-foreground"><span className="mr-2 animate-pulse text-primary">●</span>Verifying…</div>
      </>
    );
  }
  if (state === 'error') {
    return (
      <>
        <Brand subtitle="New password" />
        <AuthStatusMessage icon="⚠️" title="Invalid link" body="The recovery link has expired or is invalid. Request a new one." href="/forgot-password" action="Request new link" />
      </>
    );
  }
  if (state === 'success') {
    return (
      <>
        <Brand subtitle="Done!" />
        <AuthStatusMessage icon="✅" title="Password updated" body="You can now sign in with your new password." href="/login" action="Go to sign in" />
      </>
    );
  }

  return (
    <>
      <Brand subtitle="New password" />
      <FormAlert>{formError}</FormAlert>
      <form onSubmit={submit} noValidate>
        <FormField label="New password" htmlFor="reset-password" error={errors.password}>
          <PasswordInput id="reset-password" error={errors.password} value={password} onChange={event => setPassword(event.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" />
          <PasswordStrengthMeter password={password} />
        </FormField>
        <FormField label="Confirm password" htmlFor="reset-confirm" error={errors.confirm}>
          <PasswordInput id="reset-confirm" error={errors.confirm} value={confirm} onChange={event => setConfirm(event.target.value)} placeholder="Repeat password" autoComplete="new-password" />
        </FormField>
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? 'Saving…' : 'Set password'}
        </Button>
      </form>
    </>
  );
};
