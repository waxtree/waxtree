import { Button } from '@/components/ui/button';

export const AuthStatusMessage = ({ icon, title, body, href, action }) => (
  <div className="text-center">
    <div className="mb-3 text-[42px]">{icon}</div>
    <h1 className="mb-2 text-base font-semibold">{title}</h1>
    <p className="mb-5 text-[13px] leading-6 text-muted-foreground">{body}</p>
    <Button asChild variant="outline">
      <a href={href}>{action}</a>
    </Button>
  </div>
);
