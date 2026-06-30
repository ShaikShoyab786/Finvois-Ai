import { useLocation, Link } from "wouter";
import { ArrowLeft, Download, Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSetReportTheme } from "@workspace/api-client-react";
import { useTheme, THEMES, THEME_ORDER, type ThemeId } from "@/contexts/theme";
import { useToast } from "@/hooks/use-toast";

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
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const setThemeMutation = useSetReportTheme();

  const handleThemeChange = (next: ThemeId) => {
    if (next === theme) return;
    // Apply instantly to the shell, then persist. Financial sections render
    // identically across themes, so only the branding shell changes.
    const previous = theme;
    setTheme(next);
    setThemeMutation.mutate(
      { id: reportId, data: { theme: next } },
      {
        onError: () => {
          setTheme(previous);
          toast({ title: "Couldn't save the new theme", variant: "destructive" });
        },
      },
    );
  };

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9 px-3"
                data-testid="button-theme-switcher"
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{THEMES[theme].name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Report branding</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {THEME_ORDER.map((tid) => (
                <DropdownMenuItem
                  key={tid}
                  onClick={() => handleThemeChange(tid)}
                  data-testid={`theme-option-${tid}`}
                  className="gap-2"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-border flex-shrink-0"
                    style={{ background: THEMES[tid].swatch.accent }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-medium truncate">{THEMES[tid].name}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{THEMES[tid].tagline}</span>
                  </div>
                  {theme === tid && <Check className="w-3.5 h-3.5 ml-auto text-foreground/70" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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
