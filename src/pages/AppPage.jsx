import { Component, useEffect, useState } from 'react';
import { AppFailure } from '@/components/AppFailure';

// componentDidCatch/getDerivedStateFromError have no hooks-based
// equivalent — a React error boundary must be a class component.
class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('WaxTree app render failed:', error, info);
  }

  render() {
    if (this.state.error) return <AppFailure error={this.state.error} />;
    return this.props.children;
  }
}

export const AppPage = () => {
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'WaxTree';
    let active = true;
    Promise.all([import('@/lib/waxTreeEngine.jsx'), import('@/components/WaxTreeApp.jsx')])
      .then(([engine, view]) => { if (active) setLoaded({ engine, View: view.WaxTreeApp }); })
      .catch(importError => { console.error('WaxTree app import failed:', importError); if (active) setError(importError); });
    return () => { active = false; };
  }, []);

  if (error) return <AppFailure error={error} />;
  if (!loaded) return <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">Loading WaxTree…</div>;
  const { engine, View } = loaded;
  return <AppErrorBoundary><View engine={engine} /></AppErrorBoundary>;
};
