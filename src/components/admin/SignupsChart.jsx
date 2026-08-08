import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const SignupsChart = ({ entries }) => {
  const max = Math.max(1, ...entries.map(([, value]) => value));

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-xs font-semibold text-muted-foreground">Signups — last 30 days</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-16 items-end gap-1">
          {entries.map(([date, value]) => (
            <div
              key={date}
              title={`${date}: ${value}`}
              style={{ height: Math.max(4, Math.round((value / max) * 60)) }}
              className="min-w-1 flex-1 rounded-t bg-primary"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
