import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DataTableProps {
  years: string[];
  rows: { label: string; values: (number | null | undefined)[]; emphasis?: boolean }[];
  /** Format applied to each numeric value */
  format?: (n: number) => string;
}

const defaultFmt = (n: number): string =>
  n === 0 ? "—" : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);

/**
 * Year-on-year financial table — labels in left column, years across the top.
 * Used for P&L, Balance Sheet, Cash Flow detail breakdowns.
 */
export function DataTable({ years, rows, format = defaultFmt }: DataTableProps) {
  return (
    <div className="surface-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-eyebrow text-muted-foreground py-3 sticky left-0 bg-muted/40 z-10">
                Metric
              </TableHead>
              {years.map((y) => (
                <TableHead key={y} className="text-eyebrow text-muted-foreground text-right num-tabular">
                  {y}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label} className="border-border">
                <TableCell
                  className={`text-[13px] sticky left-0 bg-card z-10 ${
                    row.emphasis ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {row.label}
                </TableCell>
                {years.map((_, i) => {
                  const v = row.values[i];
                  return (
                    <TableCell
                      key={i}
                      className={`text-right num-tabular text-[13.5px] ${
                        row.emphasis ? "font-semibold text-foreground" : "text-foreground/85"
                      }`}
                    >
                      {typeof v === "number" && isFinite(v) ? format(v) : "—"}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
