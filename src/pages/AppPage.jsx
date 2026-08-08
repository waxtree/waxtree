import { Component, useEffect, useState } from 'react';

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

function AppFailure({ error }) {
  return <main className="flex min-h-dvh items-center justify-center bg-[#E8F0EA] p-6 text-center text-[#1B2D22]"><div className="max-w-lg"><img className="mx-auto mb-5 size-20" src="/logo.svg" alt="" /><h1 className="text-xl font-bold text-[#3DAE5A]">WaxTree could not start</h1><p className="mt-2 text-sm text-[#3D6B4E]">{error?.message || 'Unexpected application error.'}</p><button onClick={() => window.location.reload()} className="mt-5 rounded-full bg-[#3DAE5A] px-5 py-2.5 text-sm font-semibold text-white">Reload</button></div></main>;
}

export function AppPage() {
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'WaxTree';
    let active = true;
    Promise.all([import('../lib/waxTreeEngine.jsx'), import('../components/WaxTreeApp.jsx')])
      .then(([engine, view]) => { if (active) setLoaded({ engine, View: view.WaxTreeApp }); })
      .catch(importError => { console.error('WaxTree app import failed:', importError); if (active) setError(importError); });
    return () => { active = false; };
  }, []);

  if (error) return <AppFailure error={error} />;
  if (!loaded) return <div className="flex min-h-dvh items-center justify-center bg-[#E8F0EA] text-sm text-[#3D6B4E]">Loading WaxTree…</div>;
  const { engine, View } = loaded;
  return <AppErrorBoundary><View engine={engine} /></AppErrorBoundary>;
}
