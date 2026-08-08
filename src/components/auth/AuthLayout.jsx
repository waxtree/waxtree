import { CookieBanner, ThemeButton, ThemeFrame, useTheme } from '@/components/AppChrome';
import { Card, CardContent } from '@/components/ui/card';

// Brand (with its subtitle) is rendered by each form, not here — a couple
// of forms (RegisterForm, ForgotPasswordForm) change their subtitle based
// on their own internal state (e.g. "Create your account" -> "Almost
// done!" once signup succeeds), which this shell has no visibility into.
export const AuthLayout = ({ maxWidth = 400, children }) => {
  const [theme, toggleTheme] = useTheme();
  return (
    <ThemeFrame theme={theme} className="flex items-center justify-center p-6">
      <ThemeButton theme={theme} onToggle={toggleTheme} />
      <Card style={{ maxWidth }} className="w-full border border-border bg-card px-2 py-9 shadow-[var(--wt-shadow)]">
        <CardContent className="px-8 max-[440px]:px-4">
          {children}
        </CardContent>
      </Card>
      <CookieBanner />
    </ThemeFrame>
  );
};
