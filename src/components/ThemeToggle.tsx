import { useStore } from '../store';

export function ThemeToggle() {
  const { theme, toggleTheme } = useStore(s => ({ theme: s.theme, toggleTheme: s.toggleTheme }));
  return (
    <button className="theme-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}>
      {theme === 'dark' ? '☀' : '🌙'}
    </button>
  );
}
