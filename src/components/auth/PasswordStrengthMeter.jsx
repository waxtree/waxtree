import { passwordStrength } from '@/lib/auth';

export const PasswordStrengthMeter = ({ password }) => {
  const level = passwordStrength(password);
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded bg-border">
        <div className={`h-full rounded transition-all ${level.width} ${level.barClass}`} />
      </div>
      <span className={`min-w-10 text-right text-[11px] ${level.textClass}`}>{level.label}</span>
    </div>
  );
};
