import { useEffect } from "react";
import { Link } from "wouter";
import { useListReports, useDeleteReport, getListReportsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, ArrowRight, AlertCircle, RefreshCw, ArrowLeft, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/theme";

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "Unknown date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AllReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Match the landing's signature look.
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme("finny");
  }, [setTheme]);

  const { data: reports, isLoading, isError, refetch } = useListReports();
  const deleteMutation = useDeleteReport();

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this report?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast({ title: "Report deleted" });
        queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
      } catch {
        toast({ title: "Failed to delete", variant: "destructive" });
      }
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-shell-stage text-shell-hero-fg">
      {/* grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 md:px-8 py-12">
        <Link href="/">
          <Button
            variant="ghost"
            className="mb-6 gap-2 text-shell-hero-fg/70 hover:text-shell-hero-fg hover:bg-white/5"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>
        </Link>

        <div className="bg-glass-tile backdrop-blur rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-3xl text-shell-tile-fg">All Reports</h1>
              <p className="text-shell-tile-label text-sm mt-1">
                Every project report you've analyzed, with the date it was generated
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              className="border-white/15 bg-white/5 text-shell-tile-fg hover:bg-white/10"
              data-testid="button-refresh-all"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl bg-rose-500/10">
              <AlertCircle className="w-10 h-10 text-rose-400 mb-2" />
              <p className="text-rose-300 font-medium">Failed to load reports</p>
              <Button variant="outline" className="mt-4 border-white/15 bg-white/5 text-shell-tile-fg" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          ) : reports?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-white/15">
              <FileText className="w-12 h-12 text-shell-tile-label mb-4" />
              <h3 className="text-lg font-medium text-shell-tile-fg">No reports yet</h3>
              <p className="text-shell-tile-label mt-1">Upload your first DPR to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports?.map((report) => (
                <Link key={report.id} href={`/reports/${report.id}`} data-testid={`link-report-${report.id}`}>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/[0.09] ring-1 ring-white/5 hover:ring-white/15 transition-all group cursor-pointer">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-shell-accent/15 flex items-center justify-center text-shell-accent flex-shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-lg text-shell-tile-fg truncate group-hover:text-shell-accent transition-colors">
                          {report.firmName || "Unnamed Firm"}
                        </h3>
                        <p className="text-sm text-shell-tile-label truncate">
                          {report.proprietorName || "Unknown Proprietor"} • {report.totalProjectCost || "N/A"}
                        </p>
                        <p className="text-[12px] text-shell-tile-label/80 mt-0.5 flex items-center gap-1.5" data-testid={`text-generated-${report.id}`}>
                          <Clock className="w-3 h-3" />
                          Generated {formatTimestamp(report.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge variant={report.status === "ready" ? "default" : "secondary"}>
                        {report.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 text-rose-400 hover:bg-rose-500/10"
                        onClick={(e) => handleDelete(e, report.id)}
                        data-testid={`button-delete-${report.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <ArrowRight className="w-5 h-5 text-shell-tile-label group-hover:text-shell-accent transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
