import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../lib/auth';

export function LandingPage() {
  const { session } = useAuth();

  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <ThemeToggle />
        <Link className="btn btn--ghost" to={session ? '/app' : '/login'}>
          {session ? 'Open app' : 'Login'}
        </Link>
      </nav>
      <section className="landing-hero">
        <BrandMark />
        <h1>WaxTree</h1>
        <p>
          Explore artists and labels as a living, non-destructive family tree,
          then keep every branch, tag, playlist and listening clue in one place.
        </p>
        <div className="landing-hero__actions">
          <Link className="btn btn--primary" to={session ? '/app' : '/register'}>
            {session ? 'Continue digging' : 'Create an account'}
          </Link>
          {!session && (
            <Link className="btn btn--secondary" to="/login">
              Sign in
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
