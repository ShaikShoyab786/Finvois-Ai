import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useListReports, useDeleteReport, getListReportsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, ArrowRight, Loader2, AlertCircle, RefreshCw, Sparkles, ShieldCheck, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/theme";
import { motion } from "framer-motion";

import finnyHello from "@/assets/finny/finny-hello.png";
import ffMark from "@/assets/finny/ff-mark.png";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // The landing is always Finny's signature black & gold — his home turf.
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme("finny");
  }, [setTheme]);

  const { data: reports, isLoading, isError, refetch } = useListReports();
  const deleteMutation = useDeleteReport();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const response = await fetch(`${base}/api/reports/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(errBody.error || "Upload failed");
      }

      const res = await response.json();

      queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
      // Hand off to the themed launch flow: choose a look → Finny processing.
      setLocation(`/reports/${res.id}/launch`);
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "There was an error processing the PDF.",
        variant: "destructive",
      });
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

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

      <div className="relative max-w-6xl mx-auto px-6 md:px-10 py-8 md:py-12">
        {/* Brand bar */}
        <header className="flex items-center gap-3 mb-12">
          <img src={ffMark} alt="Finvois" className="w-9 h-9" />
          <span className="font-display text-xl text-shell-hero-fg">Finvois AI</span>
        </header>

        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-8 items-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="order-2 lg:order-1"
          >
            <div className="text-eyebrow-lg text-shell-hero-eyebrow mb-4">
              Meet your DPR analyst
            </div>
            <h1 className="font-display text-[40px] md:text-[56px] leading-[1.05] text-shell-hero-fg mb-5">
              Hi, I'm Finny.
              <br />
              Drop a DPR — I'll do the rest.
            </h1>
            <p className="text-shell-hero-fg/65 text-lg max-w-lg mb-8">
              Upload a Detailed Project Report and I'll extract every financial
              statement, crunch the ratios, and assemble a banker-grade briefing
              in seconds.
            </p>

            {/* Integrated dropzone */}
            <div
              className={`relative rounded-2xl p-6 transition-all cursor-pointer bg-glass-tile backdrop-blur ${
                dragActive ? "ring-2 ring-shell-accent" : "ring-1 ring-white/10 hover:ring-white/25"
              } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={onButtonClick}
              data-testid="upload-zone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleChange}
                data-testid="input-file"
              />
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-shell-accent/15 flex items-center justify-center">
                  {uploading ? (
                    <Loader2 className="w-7 h-7 animate-spin text-shell-accent" />
                  ) : (
                    <Upload className="w-7 h-7 text-shell-accent" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-shell-tile-fg text-[17px]">
                    {uploading ? "Uploading…" : "Drag & drop your DPR PDF"}
                  </div>
                  <div className="text-shell-tile-label text-sm mt-0.5">
                    {uploading ? "Hang tight — taking you to the next step." : "or click to browse your files"}
                  </div>
                </div>
                {!uploading && (
                  <Button
                    className="bg-shell-accent text-shell-accent-foreground hover:opacity-90 gap-2"
                    data-testid="button-upload-trigger"
                  >
                    Select File <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Feature row */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              {[
                { icon: Sparkles, label: "AI extraction" },
                { icon: Wand2, label: "3 branded themes" },
                { icon: ShieldCheck, label: "Banker-grade output" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 text-shell-hero-fg/70 text-[13px]">
                  <f.icon className="w-4 h-4 text-shell-accent flex-shrink-0" />
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Finny mascot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="order-1 lg:order-2 flex justify-center"
          >
            <motion.img
              src={finnyHello}
              alt="Finny, the Finvois AI mascot, waving"
              className="w-64 md:w-80 lg:w-[22rem] drop-shadow-2xl"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              data-testid="finny-hero"
            />
          </motion.div>
        </div>

        {/* Recent reports */}
        <div className="bg-glass-tile backdrop-blur rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-2xl text-shell-tile-fg">Recent Reports</h2>
              <p className="text-shell-tile-label text-sm mt-0.5">Previously analyzed project reports</p>
            </div>
            <div className="flex items-center gap-2">
              {reports && reports.length > 3 && (
                <Link href="/reports">
                  <Button
                    variant="outline"
                    className="border-white/15 bg-white/5 text-shell-tile-fg hover:bg-white/10 gap-2"
                    data-testid="button-view-all"
                  >
                    More <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                className="border-white/15 bg-white/5 text-shell-tile-fg hover:bg-white/10"
                data-testid="button-refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
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
              {reports?.slice(0, 3).map((report) => (
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
