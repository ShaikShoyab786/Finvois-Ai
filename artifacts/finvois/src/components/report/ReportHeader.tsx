import { useLocation, Link } from "wouter";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Verdict = "Viable" | "Conditionally Viable" | "High Risk" | string | null | undefined;

interface ReportHeaderProps {
  reportId: number;
  fiscalYear?: string | null;
  verdict?: Verdict;
}

function verdictTone(v: Verdict): { dot: string; text: string; bg: string; border: string; label: string } {
  if (!v) return { dot: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200", label: "Awaiting Analysis" };
  const norm = v.toLowerCase();
  if (norm.includes("viable") && !norm.includes("condition")) {
    return { dot: "bg-emerald-500", text: "text-emerald-800", bg: "bg-emerald-50", border: "border-emerald-200", label: "Project Viable" };
  }
  if (norm.includes("condition")) {
    return { dot: "bg-amber-500", text: "text-amber-800", bg: "bg-amber-50", border: "border-amber-200", label: "Conditionally Viable" };
  }
  if (norm.includes("risk") || norm.includes("not viable")) {
    return { dot: "bg-rose-500", text: "text-rose-800", bg: "bg-rose-50", border: "border-rose-200", label: "High Risk" };
  }
  return { dot: "bg-slate-400", text: "text-slate-700", bg: "bg-slate-100", border: "border-slate-200", label: v };
}

export function ReportHeader({ reportId, fiscalYear, verdict }: ReportHeaderProps) {
  const [, setLocation] = useLocation();
  const tone = verdictTone(verdict);

  return (
    <header className="sticky top-0 z-20 bg-background/95 border-b border-border">
      <div className="px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="text-eyebrow text-muted-foreground/80 hidden md:block">
            Investor Briefing
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {fiscalYear && (
            <div
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border text-[11.5px] font-medium text-muted-foreground num-tabular"
              data-testid="header-fy-chip"
            >
              <span className="text-[10px] uppercase tracking-wider opacity-60">FY</span>
              <span>{fiscalYear}</span>
            </div>
          )}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${tone.bg} ${tone.border} border text-[12px] font-semibold ${tone.text}`}
            data-testid="header-verdict-chip"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
            {tone.label}
          </div>
          <Link href={`/reports/${reportId}/export`}>
            <Button
              size="sm"
              className="bg-shell-accent text-shell-accent-foreground hover:opacity-90 gap-2 h-9 px-4 ml-1"
              data-testid="button-export"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
