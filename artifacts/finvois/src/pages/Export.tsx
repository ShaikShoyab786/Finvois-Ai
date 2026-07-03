import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import type { UseQueryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Loader2, Download } from "lucide-react";
import {
  useGetReport,
  useGetReportSummary,
  useGetReportVerdicts,
} from "@workspace/api-client-react";
import { useTheme, resolveTheme } from "@/contexts/theme";
import { generateReportPdf, reportPdfFilename } from "@/lib/generatePdf";
import { PrintableReport } from "./Dashboard";

export default function Export() {
  const params = useParams();
  const id = parseInt(params.id || "0");

  const { data: report, isLoading } = useGetReport(id);

  // Match the dashboard's caching for the paid AI calls so we reuse the
  // already-fetched summary/verdicts instead of re-billing on this page.
  const aiQuery = {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  } as unknown as UseQueryOptions<unknown, unknown, unknown, readonly unknown[]>;
  const { data: summary, isLoading: isLoadingSummary } = useGetReportSummary(id, {
    query: aiQuery as never,
  });
  const { data: verdictsData, isLoading: isLoadingVerdicts } = useGetReportVerdicts(
    id,
    { query: aiQuery as never },
  );

  // Export adopts the report's branding theme so the PDF/print shell matches
  // the dashboard. Financial content stays identical across themes.
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme(resolveTheme(report?.theme));
  }, [report?.theme, setTheme]);

  const [pdfProgress, setPdfProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [pdfError, setPdfError] = useState<string | null>(null);
  const isGenerating = pdfProgress !== null;

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    if (isGenerating) return;
    const root = document.querySelector<HTMLElement>(".print-root");
    if (!root) return;
    setPdfError(null);
    setPdfProgress({ done: 0, total: 0 });
    try {
      await generateReportPdf(
        root,
        reportPdfFilename(report?.firmName),
        (p) => setPdfProgress(p),
        { firmName: report?.firmName },
      );
    } catch {
      setPdfError("Could not generate the PDF. Please try again or use Print instead.");
    } finally {
      setPdfProgress(null);
    }
  };

  if (isLoading || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pct =
    pdfProgress && pdfProgress.total > 0
      ? Math.round((pdfProgress.done / pdfProgress.total) * 100)
      : 0;

  return (
    <div className="export-stage min-h-screen bg-muted/40">
      {/* Toolbar (hidden when printing) */}
      <div className="no-print sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/reports/${id}`}>
              <Button variant="outline" size="icon" data-testid="button-export-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display text-lg leading-tight text-foreground">
                Export Report
              </h1>
              <p className="text-xs text-muted-foreground">
                A4 landscape · one section per page
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={isGenerating}
              className="gap-2"
              data-testid="button-trigger-print"
            >
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              className="bg-shell-accent text-shell-accent-foreground hover:opacity-90 gap-2 min-w-[170px]"
              data-testid="button-download-pdf"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {pdfProgress?.total ? `Generating ${pct}%` : "Preparing…"}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
        {pdfError && (
          <div className="max-w-[1200px] mx-auto px-4 md:px-6 pb-2">
            <p className="text-xs text-destructive" data-testid="text-pdf-error">
              {pdfError}
            </p>
          </div>
        )}
      </div>

      {/* Live preview — this is exactly what gets exported */}
      <div className="print-stage flex justify-center px-3 md:px-6 py-6 md:py-8">
        <div className="print-page-shell bg-white shadow-lg rounded-sm">
          <PrintableReport
            report={report}
            summary={summary}
            verdicts={verdictsData?.verdicts}
            isLoadingSummary={isLoadingSummary}
            isLoadingVerdicts={isLoadingVerdicts}
          />
        </div>
      </div>
    </div>
  );
}
