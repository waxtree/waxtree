import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const PasswordInput = ({ error, className, ...props }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        aria-invalid={!!error}
        className={cn('pr-10', className)}
      />
      <button
        type="button"
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible(value => !value)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[15px] text-muted-foreground hover:text-foreground"
      >
        {visible ? '🙈' : '👁'}
      </button>
    </div>
  );
};
