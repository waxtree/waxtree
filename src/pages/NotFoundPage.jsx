import { Link } from 'react-router-dom';
import { ThemeFrame, useTheme } from '@/components/AppChrome';
import { Button } from '@/components/ui/button';

export const NotFoundPage = () => {
  const [theme] = useTheme();

  return (
    <ThemeFrame theme={theme} className="flex min-h-dvh items-center justify-center px-6 text-center">
      <main>
        <img className="mx-auto mb-6 size-20 object-contain" src="/logo.svg" alt="" />
        <p className="text-xs font-bold uppercase text-muted-foreground/70">404</p>
        <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/">Back to WaxTree</Link>
        </Button>
      </main>
    </ThemeFrame>
  );
};
