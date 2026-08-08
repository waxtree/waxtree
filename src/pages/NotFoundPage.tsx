import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="route-state">
      <h1>Page not found</h1>
      <Link className="btn btn--primary" to="/app">
        Back to WaxTree
      </Link>
    </main>
  );
}
