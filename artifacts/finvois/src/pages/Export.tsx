import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Printer } from "lucide-react";
import { useGetReport } from "@workspace/api-client-react";

export default function Export() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const { data: report } = useGetReport(id);

  const handlePrint = () => {
    document.body.classList.add("print-white");
    window.print();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-8 no-print">
        <div className="flex items-center gap-4">
          <Link href={`/reports/${id}`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Export Report</h1>
        </div>

        <Card className="border-2 border-primary/30">
          <CardHeader>
            <CardTitle>White Printable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-white rounded-md border shadow-sm p-4 flex flex-col gap-2">
              <div className="h-4 w-1/2 bg-slate-900 rounded" />
              <div className="h-2 w-3/4 bg-slate-200 rounded" />
              <div className="mt-auto h-8 w-full bg-slate-100 rounded border border-slate-200" />
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Clean, high-contrast theme matching the dashboard. Best for both digital PDFs and physical printing.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-6 border-t">
          <Button size="lg" onClick={handlePrint} data-testid="button-trigger-print">
            <Printer className="w-4 h-4 mr-2" /> Generate PDF / Print
          </Button>
        </div>
      </div>

      {/* Print Only Area */}
      <div className="hidden print-only max-w-[210mm] mx-auto p-8">
        <h1 className="text-4xl font-bold mb-2">{report?.firmName || "Report"}</h1>
        <h2 className="text-2xl text-gray-500 mb-8">{report?.proprietorName}</h2>

        <div className="space-y-6">
           <h3 className="text-xl font-bold border-b pb-2">Business Profile</h3>
           <div className="grid grid-cols-2 gap-4">
              {Object.entries(report?.extractedData?.businessProfile || {}).slice(0,10).map(([k,v]) => v && (
                <div key={k}>
                  <div className="text-sm font-semibold capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div>{String(v)}</div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
