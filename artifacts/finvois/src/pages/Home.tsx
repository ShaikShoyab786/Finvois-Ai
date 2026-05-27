import { useState, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useListReports, useDeleteReport, getListReportsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, ArrowRight, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

      toast({
        title: "Upload successful",
        description: "Your DPR is being processed by AI. This may take a moment.",
      });

      queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
      setLocation(`/reports/${res.id}`);
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "There was an error processing the PDF.",
        variant: "destructive",
      });
    } finally {
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
        toast({
          title: "Report deleted",
        });
        queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
      } catch (err) {
        toast({
          title: "Failed to delete",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="mb-12 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg">
              <FileText className="text-primary-foreground w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Finvois AI</h1>
          </div>
          <p className="text-muted-foreground text-lg">Intelligent DPR Analysis for Chartered Accountants</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Upload DPR</CardTitle>
                <CardDescription>Upload a Detailed Project Report PDF to extract financial metrics instantly.</CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-4 min-h-[250px]
                    ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                    ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
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
                  
                  {uploading ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                      <div className="text-sm font-medium">Processing via AI...</div>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-secondary" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">Drag & Drop PDF</p>
                        <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                      </div>
                      <Button variant="secondary" className="mt-2" data-testid="button-upload-trigger">Select File</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Recent Reports</CardTitle>
                  <CardDescription>Previously analyzed project reports</CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4 mt-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                        <Skeleton className="w-12 h-12 rounded-lg" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-1/3" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : isError ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-destructive/5 mt-4">
                    <AlertCircle className="w-10 h-10 text-destructive mb-2" />
                    <p className="text-destructive font-medium">Failed to load reports</p>
                    <Button variant="outline" className="mt-4" onClick={() => refetch()}>Try Again</Button>
                  </div>
                ) : reports?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg mt-4">
                    <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No reports found</h3>
                    <p className="text-muted-foreground mt-1 mb-4">Upload your first DPR to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-4">
                    {reports?.map((report) => (
                      <Link key={report.id} href={`/reports/${report.id}`} data-testid={`link-report-${report.id}`}>
                        <div className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 hover:shadow-sm transition-all group bg-card hover-elevate cursor-pointer">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              <FileText className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                                {report.firmName || "Unnamed Firm"}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {report.proprietorName || "Unknown Proprietor"} • {report.totalProjectCost || "N/A"}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Badge variant={report.status === "completed" ? "default" : "secondary"}>
                              {report.status}
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                              onClick={(e) => handleDelete(e, report.id)}
                              data-testid={`button-delete-${report.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
