import { Card, CardContent } from '@/components/ui/card';

export const StatTile = ({ label, value, sub }) => (
  <Card size="sm">
    <CardContent>
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </CardContent>
  </Card>
);
