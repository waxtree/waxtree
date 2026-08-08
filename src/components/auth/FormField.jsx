import { Label } from '@/components/ui/label';

export const FormField = ({ label, error, htmlFor, children }) => (
  <div className="mb-4">
    <Label htmlFor={htmlFor} className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
      {label}
    </Label>
    <div className="mt-1.5">{children}</div>
    <div className="mt-1.5 min-h-4 text-xs text-destructive">{error}</div>
  </div>
);
