import { useState } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useGetReport, useGetReportSummary } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { FileText, Download, ArrowLeft, Loader2, PieChart, Activity, Building, LayoutDashboard, FileSpreadsheet, Percent, CircleDollarSign, CalendarDays, Crosshair, Users, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend, LineChart, Line, AreaChart, Area } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Dashboard() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: report, isLoading, isError } = useGetReport(id);
  const { data: summary, isLoading: isLoadingSummary } = useGetReportSummary(id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Report Not Found</h2>
        <Button onClick={() => setLocation("/")} data-testid="button-back-home">Return Home</Button>
      </div>
    );
  }

  const { extractedData } = report;

  const sections = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "profile", label: "Business Profile", icon: <Building className="w-4 h-4" /> },
    { id: "summary", label: "Executive Summary", icon: <FileText className="w-4 h-4" /> },
    { id: "pl", label: "P&L Account", icon: <Activity className="w-4 h-4" /> },
    { id: "bs", label: "Balance Sheet", icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: "ratios", label: "Ratio Analysis", icon: <Percent className="w-4 h-4" /> },
    { id: "cashflow", label: "Cash Flow", icon: <CircleDollarSign className="w-4 h-4" /> },
    { id: "loan", label: "Loan Schedule", icon: <CalendarDays className="w-4 h-4" /> },
    { id: "swot", label: "SWOT Analysis", icon: <Crosshair className="w-4 h-4" /> },
    { id: "eval", label: "Financial Evaluation", icon: <Target className="w-4 h-4" /> },
    { id: "employment", label: "Employment", icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navbar */}
      <header className="sticky top-0 z-10 bg-card border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">{report.firmName || "Unnamed Report"}</h1>
            <p className="text-sm text-muted-foreground">{report.proprietorName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/reports/${id}/export`}>
            <Button variant="secondary" data-testid="button-export">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r bg-card hidden md:flex flex-col">
          <nav className="p-4 space-y-1 overflow-y-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === section.id 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                data-testid={`tab-${section.id}`}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile Nav */}
        <div className="md:hidden border-b bg-card overflow-x-auto p-2 flex gap-2">
           {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={`flex-shrink-0 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                  activeTab === section.id 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {section.label}
              </button>
            ))}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-muted/30">
          <div className="max-w-6xl mx-auto space-y-8 pb-12">
            
            {activeTab === "dashboard" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold">Financial Dashboard</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <KPI title="Total Project Cost" value={extractedData?.financialSummary?.totalProjectCost} />
                  <KPI title="Term Loan" value={extractedData?.financialSummary?.termLoan} />
                  <KPI title="Working Capital" value={extractedData?.financialSummary?.workingCapitalLoan} />
                  <KPI title="Equity Capital" value={extractedData?.financialSummary?.equityCapital} />
                  <KPI title="Average DSCR" value={extractedData?.financialSummary?.averageDscr} />
                  <KPI title="Fiscal Year" value={extractedData?.financialSummary?.fiscalYear} />
                </div>

                {extractedData?.projectCost?.financeBreakdown && (
                   <Card>
                    <CardHeader>
                      <CardTitle>Finance Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={extractedData.projectCost.financeBreakdown}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <RechartsTooltip />
                            <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "profile" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-2xl font-bold">Business Profile</h2>
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {Object.entries(extractedData?.businessProfile || {}).map(([key, val]) => val && (
                        <div key={key} className="grid grid-cols-1 md:grid-cols-3 p-4 hover:bg-muted/50 transition-colors">
                          <div className="font-medium text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                          <div className="md:col-span-2 font-medium">{val}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "summary" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-2xl font-bold">Executive Summary</h2>
                {isLoadingSummary ? (
                   <div className="space-y-4">
                     <Skeleton className="h-32 w-full" />
                     <Skeleton className="h-32 w-full" />
                   </div>
                ) : summary ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="md:col-span-2 bg-primary/5 border-primary/20">
                      <CardHeader>
                        <CardTitle>AI Verdict</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg leading-relaxed">{summary.viabilityVerdict || summary.summary}</p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-500">
                      <CardHeader>
                        <CardTitle className="text-emerald-700 dark:text-emerald-400">Key Strengths</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc pl-5 space-y-2">
                          {summary.keyStrengths?.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-rose-500">
                      <CardHeader>
                        <CardTitle className="text-rose-700 dark:text-rose-400">Risk Factors</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc pl-5 space-y-2">
                          {summary.riskFactors?.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card><CardContent className="p-8 text-center text-muted-foreground">Summary not available.</CardContent></Card>
                )}
              </div>
            )}

            {activeTab === "pl" && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                 <h2 className="text-2xl font-bold">P&L Account</h2>
                 {extractedData?.plAccount?.years?.length ? (
                   <Card>
                     <CardContent className="pt-6">
                       <div className="h-[400px] w-full mb-8">
                         <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={extractedData.plAccount.years.map((y, i) => ({
                             year: y,
                             Revenue: extractedData.plAccount?.revenue?.[i] || 0,
                             NetProfit: extractedData.plAccount?.netProfit?.[i] || 0,
                           }))}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis dataKey="year" />
                             <YAxis />
                             <RechartsTooltip />
                             <Legend />
                             <Area type="monotone" dataKey="Revenue" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                             <Area type="monotone" dataKey="NetProfit" stackId="2" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.2} />
                           </AreaChart>
                         </ResponsiveContainer>
                       </div>
                     </CardContent>
                   </Card>
                 ) : <EmptyState />}
               </div>
            )}

            {activeTab === "bs" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                 <h2 className="text-2xl font-bold">Balance Sheet</h2>
                 {extractedData?.balanceSheet?.years?.length ? (
                   <Card>
                     <CardContent className="pt-6">
                       <div className="h-[400px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={extractedData.balanceSheet.years.map((y, i) => ({
                             year: y,
                             Assets: (extractedData.balanceSheet?.currentAssets?.[i] || 0) + (extractedData.balanceSheet?.fixedAssets?.[i] || 0),
                             Liabilities: (extractedData.balanceSheet?.currentLiabilities?.[i] || 0) + (extractedData.balanceSheet?.longTermLiabilities?.[i] || 0),
                             Equity: extractedData.balanceSheet?.equity?.[i] || 0
                           }))}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis dataKey="year" />
                             <YAxis />
                             <RechartsTooltip />
                             <Legend />
                             <Bar dataKey="Assets" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                             <Bar dataKey="Liabilities" fill="hsl(var(--chart-2))" radius={[4,4,0,0]} />
                             <Bar dataKey="Equity" fill="hsl(var(--chart-3))" radius={[4,4,0,0]} />
                           </BarChart>
                         </ResponsiveContainer>
                       </div>
                     </CardContent>
                   </Card>
                 ) : <EmptyState />}
              </div>
            )}

            {activeTab === "ratios" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                 <h2 className="text-2xl font-bold">Ratio Analysis</h2>
                 {extractedData?.ratioAnalysis?.years?.length ? (
                   <Card>
                     <CardContent className="pt-6">
                       <div className="h-[400px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={extractedData.ratioAnalysis.years.map((y, i) => ({
                             year: y,
                             CurrentRatio: extractedData.ratioAnalysis?.currentRatio?.[i] || 0,
                             DSCR: extractedData.ratioAnalysis?.dscr?.[i] || 0,
                           }))}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis dataKey="year" />
                             <YAxis />
                             <RechartsTooltip />
                             <Legend />
                             <Line type="monotone" dataKey="CurrentRatio" stroke="hsl(var(--primary))" strokeWidth={3} />
                             <Line type="monotone" dataKey="DSCR" stroke="hsl(var(--secondary))" strokeWidth={3} />
                           </LineChart>
                         </ResponsiveContainer>
                       </div>
                     </CardContent>
                   </Card>
                 ) : <EmptyState />}
              </div>
            )}

            {activeTab === "cashflow" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                 <h2 className="text-2xl font-bold">Cash Flow</h2>
                 {extractedData?.cashFlow?.years?.length ? (
                   <Card>
                     <CardContent className="pt-6">
                       <div className="h-[400px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={extractedData.cashFlow.years.map((y, i) => ({
                             year: y,
                             Operating: extractedData.cashFlow?.operatingCashFlow?.[i] || 0,
                             Investing: extractedData.cashFlow?.investingCashFlow?.[i] || 0,
                             Financing: extractedData.cashFlow?.financingCashFlow?.[i] || 0,
                             Net: extractedData.cashFlow?.netCashFlow?.[i] || 0,
                           }))}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis dataKey="year" />
                             <YAxis />
                             <RechartsTooltip />
                             <Legend />
                             <Bar dataKey="Operating" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                             <Bar dataKey="Investing" fill="hsl(var(--chart-4))" radius={[4,4,0,0]} />
                             <Bar dataKey="Financing" fill="hsl(var(--secondary))" radius={[4,4,0,0]} />
                             <Bar dataKey="Net" fill="hsl(var(--chart-5))" radius={[4,4,0,0]} />
                           </BarChart>
                         </ResponsiveContainer>
                       </div>
                     </CardContent>
                   </Card>
                 ) : <EmptyState />}
              </div>
            )}

            {activeTab === "loan" && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                 <div className="flex justify-between items-center">
                   <h2 className="text-2xl font-bold">Loan Schedule</h2>
                 </div>
                 {extractedData?.loanSchedule?.schedule?.length ? (
                   <Card>
                      <CardHeader>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Term Loan Amount</p>
                            <p className="font-semibold">{extractedData.loanSchedule.termLoanAmount || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Interest Rate</p>
                            <p className="font-semibold">{extractedData.loanSchedule.interestRate || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Tenure</p>
                            <p className="font-semibold">{extractedData.loanSchedule.tenure || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Moratorium</p>
                            <p className="font-semibold">{extractedData.loanSchedule.moratorium || "N/A"}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Year</TableHead>
                              <TableHead className="text-right">Opening Balance</TableHead>
                              <TableHead className="text-right">Principal</TableHead>
                              <TableHead className="text-right">Interest</TableHead>
                              <TableHead className="text-right">Total EMI</TableHead>
                              <TableHead className="text-right">Closing Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {extractedData.loanSchedule.schedule.map((row, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{row.year}</TableCell>
                                <TableCell className="text-right">{row.openingBalance}</TableCell>
                                <TableCell className="text-right">{row.principal}</TableCell>
                                <TableCell className="text-right">{row.interest}</TableCell>
                                <TableCell className="text-right">{row.totalEmi}</TableCell>
                                <TableCell className="text-right">{row.closingBalance}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                   </Card>
                 ) : <EmptyState />}
               </div>
            )}

            {activeTab === "swot" && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                 <h2 className="text-2xl font-bold">SWOT Analysis</h2>
                 {extractedData?.swotAnalysis ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <Card className="border-l-4 border-l-emerald-500">
                        <CardHeader>
                          <CardTitle>Strengths</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-5 space-y-2">
                            {extractedData.swotAnalysis.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </CardContent>
                     </Card>
                     <Card className="border-l-4 border-l-rose-500">
                        <CardHeader>
                          <CardTitle>Weaknesses</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-5 space-y-2">
                            {extractedData.swotAnalysis.weaknesses?.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </CardContent>
                     </Card>
                     <Card className="border-l-4 border-l-blue-500">
                        <CardHeader>
                          <CardTitle>Opportunities</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-5 space-y-2">
                            {extractedData.swotAnalysis.opportunities?.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </CardContent>
                     </Card>
                     <Card className="border-l-4 border-l-amber-500">
                        <CardHeader>
                          <CardTitle>Threats</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-5 space-y-2">
                            {extractedData.swotAnalysis.threats?.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </CardContent>
                     </Card>
                   </div>
                 ) : <EmptyState />}
               </div>
            )}

            {activeTab === "eval" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-2xl font-bold">Financial Evaluation</h2>
                {extractedData?.financialEvaluation ? (
                   <Card>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {Object.entries(extractedData.financialEvaluation).map(([key, val]) => val && (
                          <div key={key} className="grid grid-cols-1 md:grid-cols-3 p-4 hover:bg-muted/50 transition-colors">
                            <div className="font-medium text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                            <div className="md:col-span-2 font-medium text-lg">{val}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : <EmptyState />}
              </div>
            )}

            {activeTab === "employment" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                 <h2 className="text-2xl font-bold">Employment Generation</h2>
                 {extractedData?.employmentGeneration ? (
                   <Card>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {Object.entries(extractedData.employmentGeneration).map(([key, val]) => val && (
                          <div key={key} className="grid grid-cols-1 md:grid-cols-3 p-4 hover:bg-muted/50 transition-colors">
                            <div className="font-medium text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                            <div className="md:col-span-2 font-medium">{val}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                 ) : <EmptyState />}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

function KPI({ title, value }: { title: string; value?: string | null }) {
  return (
    <Card className="hover-elevate transition-all">
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
        <p className="text-2xl font-bold text-foreground truncate">{value || "N/A"}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="p-12 text-center flex flex-col items-center">
        <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-foreground">No Data Available</h3>
        <p className="text-muted-foreground">The AI could not extract this section from the PDF.</p>
      </CardContent>
    </Card>
  )
}
