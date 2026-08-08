import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const TopTable = ({ title, heading, rows }) => (
  <Card size="sm" className="overflow-hidden">
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="px-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{heading}</TableHead>
            <TableHead>Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? rows.map(([name, count]) => (
            <TableRow key={name}>
              <TableCell>{name}</TableCell>
              <TableCell>{count}</TableCell>
            </TableRow>
          )) : (
            <TableRow><TableCell colSpan={2}>No data yet</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);
