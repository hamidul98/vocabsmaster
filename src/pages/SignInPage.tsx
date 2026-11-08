import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, Input, Label, TextField } from '@heroui/react';
import Butterflies from '@/components/Butterflies';
import { Icon } from '@/components/ui';
import { authMessage, useAuth } from '@/lib/sync';

type Mode = 'signin' | 'signup' | 'reset';

function GoogleLogo() {
  return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>;
}

/** Split card: brand illustration on the left, form on the right (left panel hides on phones). */
function Shell({ children, top }: { children: ReactNode; top?: ReactNode }) {
  return <main className="auth-page">
    <div className="auth-card">
      <aside className="auth-art" aria-hidden="true">
        <img className="auth-logo" src="brand-icon.svg" alt="" width={36} height={36} />
        <div className="auth-art-copy"><strong>Learn every IELTS word.</strong><span>One passage at a time, on every device.</span></div>
        <img className="auth-photo" src="hero-banner.webp" alt="" />
        <Butterflies />
      </aside>
      <section className="auth-main">
        <div className="auth-top"><img className="auth-logo-sm" src="brand-icon.svg" alt="" width={32} height={32} /><div className="auth-top-link">{top}</div></div>
        <div className="auth-body">{children}</div>
      </section>
    </div>
  </main>;
}

/** Grey filled input with a leading icon. */
function Field({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return <div className="auth-input"><Icon name={icon} size={20} /><Label className="sr-only">{label}</Label>{children}</div>;
}

function PasswordField({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return <TextField value={value} onChange={onChange} isRequired>
    <Field icon="lock" label={label}><Input type={show ? 'text' : 'password'} autoComplete={autoComplete} placeholder={label} />
      <button type="button" className="pw-toggle" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)}><Icon name={show ? 'visibility_off' : 'visibility'} size={20} /></button></Field>
  </TextField>;
}

export function SignInPage() {
  const { signIn, signInEmail, signUpEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const go = (m: Mode) => { setMode(m); setError(''); setNotice(''); setPassword(''); setConfirm(''); };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(authMessage(e)); } finally { setBusy(false); }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'reset') return run(async () => { await resetPassword(email); setNotice(`If an account exists for ${email.trim()}, a password reset link is on its way. Check your inbox (and spam folder).`); });
    if (mode === 'signup') {
      if (password.length < 8) return setError('Use at least 8 characters for your password.');
      if (password !== confirm) return setError('Passwords don’t match.');
      return run(() => signUpEmail(name, email, password));
    }
    return run(() => signInEmail(email, password));
  };

  const top = mode === 'signin'
    ? <>Don’t have an account?<button type="button" className="auth-link" onClick={() => go('signup')}>Sign up</button></>
    : <>Already have an account?<button type="button" className="auth-link" onClick={() => go('signin')}>Sign in</button></>;

  return <Shell top={top}>
    <h1 className="auth-title">{mode === 'signup' ? 'Sign up' : mode === 'reset' ? 'Reset password' : 'Sign in'}</h1>

    {mode !== 'reset' ? <>
      <p className="auth-label">{mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}</p>
      <Button className="google-btn auth-google" fullWidth isDisabled={busy} onPress={() => run(signIn)}><GoogleLogo />Google</Button>
      <hr className="auth-rule" />
      <p className="auth-label">Or continue with email address</p>
    </> : <p className="auth-label">Enter your email and we’ll send you a link to reset your password.</p>}

    <form className="auth-form" onSubmit={submit} noValidate>
      {mode === 'signup' && <TextField value={name} onChange={setName}><Field icon="person" label="Your name"><Input autoComplete="name" placeholder="Your name" maxLength={40} /></Field></TextField>}
      <TextField value={email} onChange={setEmail} isRequired type="email"><Field icon="mail" label="Email"><Input type="email" autoComplete="email" placeholder="you@example.com" /></Field></TextField>
      {mode !== 'reset' && <PasswordField label="Password" value={password} onChange={setPassword} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />}
      {mode === 'signup' && <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" />}
      {mode === 'signin' && <button type="button" className="auth-link forgot" onClick={() => go('reset')}>Forgot password?</button>}

      {error && <p className="auth-error" role="alert"><Icon name="error" size={18} />{error}</p>}
      {notice && <p className="auth-notice" role="status"><Icon name="mark_email_read" size={18} />{notice}</p>}

      <Button type="submit" className="auth-submit" fullWidth isDisabled={busy}>
        {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Start learning'}
      </Button>
      {mode === 'reset' && <button type="button" className="auth-link back" onClick={() => go('signin')}><Icon name="back" size={18} />Back to sign in</button>}
    </form>
  </Shell>;
}

export function VerifyEmailPage() {
  const { user, resendVerification, checkVerified, signOut } = useAuth();
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(''); setMsg(''); try { await fn(); } catch (e) { setErr(authMessage(e)); } finally { setBusy(false); } };
  return <Shell top={<button type="button" className="auth-link" onClick={signOut}>Use a different account</button>}>
    <div className="verify-icon"><Icon name="mark_email_unread" size={30} /></div>
    <h1 className="auth-title">Confirm your email</h1>
    <p className="auth-label">We sent a confirmation link to <strong>{user?.email}</strong>. Open it, then come back and tap the button below. Can’t find it? Check your spam folder.</p>
    {err && <p className="auth-error" role="alert"><Icon name="error" size={18} />{err}</p>}
    {msg && <p className="auth-notice" role="status"><Icon name="mark_email_read" size={18} />{msg}</p>}
    <div className="auth-form">
      <Button className="auth-submit" fullWidth isDisabled={busy} onPress={() => run(async () => { if (!(await checkVerified())) setErr('Not confirmed yet. Click the link in the email first.'); })}>I’ve confirmed my email</Button>
      <Button variant="secondary" className="auth-secondary" fullWidth isDisabled={busy} onPress={() => run(async () => { await resendVerification(); setMsg('A new confirmation email is on its way.'); })}>Resend email</Button>
    </div>
  </Shell>;
}

/** Requires sign-in (and a confirmed email) before the app is shown. Without Firebase config, the app stays open. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { enabled, user, loading, verified } = useAuth();
  if (!enabled) return <>{children}</>;
  if (loading) return <main className="auth-page"><div className="auth-loading" role="status" aria-label="Loading"><img src="brand-icon.svg" alt="" width={56} height={56} /></div></main>;
  if (!user) return <SignInPage />;
  if (!verified) return <VerifyEmailPage />;
  return <>{children}</>;
}
