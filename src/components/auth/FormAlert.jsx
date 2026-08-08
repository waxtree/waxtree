import { Alert, AlertDescription } from '@/components/ui/alert';

export const FormAlert = ({ children }) => {
  if (!children) return null;
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
};
