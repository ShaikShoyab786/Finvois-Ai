import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useGetReport, useGetReportSummary } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";

import { Sidebar, type NavSection } from "@/components/report/Sidebar";
import { ReportHeader } from "@/components/report/ReportHeader";
import { Hero } from "@/components/report/Hero";
import { BriefingCard } from "@/components/report/BriefingCard";
import { KpiTile } from "@/components/report/KpiTile";
import { PageHeader } from "@/components/report/PageHeader";

// ─── Navigation structure (grouped narrative arc) ──────────────
const NAV: NavSection[] = [
  { group: "Overview", items: [{ id: "overview", label: "Briefing" }] },
  {
    group: "The Business",
    items: [
      { id: "profile", label: "Business Profile" },
      { id: "summary", label: "Executive Summary" },
    ],
  },
  {
    group: "Financials",
    items: [
      { id: "pl", label: "P&L Account" },
      { id: "bs", label: "Balance Sheet" },
      { id: "cashflow", label: "Cash Flow" },
    ],
  },
  {
    group: "Quality",
    items: [
      { id: "ratios", label: "Ratio Analysis" },
      { id: "eval", label: "Financial Evaluation" },
      { id: "swot", label: "SWOT Analysis" },
    ],
  },
  {
    group: "Operations",
    items: [
      { id: "loan", label: "Loan Schedule" },
      { id: "employment", label: "Employment" },
    ],
  },
];

// Recharts theme — restrained, premium
const NAVY = "hsl(218 55% 14%)";
const GOLD = "hsl(38 55% 58%)";
const SLATE = "hsl(218 30% 45%)";

export default function Dashboard() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: report, isLoading, isError } = useGetReport(id);
  const { data: summary, isLoading: isLoadingSummary } = useGetReportSummary(id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="font-display text-3xl mb-4">Report Not Found</h2>
        <Button onClick={() => setLocation("/")}>Return Home</Button>
      </div>
    );
  }

  const { extractedData } = report;
  const bp = extractedData?.businessProfile;
  const fs = extractedData?.financialSummary;

  const heroKpis = [
    { label: "Total Project Cost", value: fs?.totalProjectCost },
    { label: "Term Loan", value: fs?.termLoan },
    { label: "Working Capital", value: fs?.workingCapitalLoan },
    { label: "Equity Capital", value: fs?.equityCapital },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar
        firmName={report.firmName || "Unnamed Report"}
        tagline={bp?.lineOfActivity || report.proprietorName}
        activeId={activeTab}
        onSelect={setActiveTab}
        sections={NAV}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <ReportHeader
          reportId={id}
          fiscalYear={fs?.fiscalYear}
          verdict={summary?.viabilityVerdict}
        />

        {/* Mobile nav */}
        <div className="lg:hidden border-b border-border bg-card overflow-x-auto px-4 py-2 flex gap-2">
          {NAV.flatMap((g) => g.items).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={activeTab === item.id ? "page" : undefined}
              className={`flex-shrink-0 px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                activeTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-14 py-10 pb-24">

            {/* ════════════ OVERVIEW (the new "wow" experience) ════════════ */}
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <Hero
                  firmName={report.firmName || "Unnamed Report"}
                  tagline={bp?.lineOfActivity}
                  kpis={heroKpis}
                />

                <BriefingCard
                  summary={summary?.summary}
                  keyStrengths={summary?.keyStrengths}
                  riskFactors={summary?.riskFactors}
                  isLoading={isLoadingSummary}
                />

                {/* Secondary metrics row — paired below the briefing */}
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.6 } },
                  }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
                >
                  {[
                    { label: "Average DSCR", value: fs?.averageDscr },
                    { label: "Fiscal Window", value: fs?.fiscalYear },
                    { label: "Constitution", value: bp?.constitution },
                    { label: "Location", value: bp?.location },
                  ].map((k) => (
                    <motion.div
                      key={k.label}
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                      }}
                    >
                      <KpiTile label={k.label} value={k.value} variant="card" />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Finance Mix — anchor chart */}
                {extractedData?.projectCost?.financeBreakdown && extractedData.projectCost.financeBreakdown.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    className="surface-card rounded-2xl p-8"
                  >
                    <div className="grid lg:grid-cols-5 gap-8">
                      <div className="lg:col-span-2">
                        <div className="text-eyebrow text-gold mb-3">How the project is funded</div>
                        <h3 className="font-display text-[24px] leading-tight mb-3">Finance Mix</h3>
                        <p className="text-[14px] text-muted-foreground leading-relaxed">
                          Breakdown of capital sources contributing to the total project cost.
                        </p>
                      </div>
                      <div className="lg:col-span-3 h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={extractedData.projectCost.financeBreakdown}
                            layout="vertical"
                            margin={{ left: 8, right: 30, top: 8, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="financeFill" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor={NAVY} stopOpacity={0.95} />
                                <stop offset="100%" stopColor={GOLD} stopOpacity={0.85} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid horizontal={false} stroke="hsl(35 18% 88%)" />
                            <XAxis type="number" tick={{ fill: SLATE, fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="label" tick={{ fill: NAVY, fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
                            <RechartsTooltip cursor={{ fill: "hsl(35 20% 94%)" }} contentStyle={{ borderRadius: 8, border: "1px solid hsl(35 18% 88%)", fontSize: 12 }} />
                            <Bar dataKey="amount" fill="url(#financeFill)" radius={[0, 6, 6, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ════════════ BUSINESS PROFILE ════════════ */}
            {activeTab === "profile" && (
              <SectionPage>
                <PageHeader eyebrow="The Business" title="Business Profile" description="Identity, leadership and operational footprint of the firm." />
                <div className="surface-card rounded-2xl">
                  <div className="divide-y divide-border">
                    {Object.entries(extractedData?.businessProfile || {}).map(([key, val]) =>
                      val ? (
                        <div key={key} className="grid grid-cols-3 px-6 py-4">
                          <div className="text-eyebrow text-muted-foreground self-center">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </div>
                          <div className="col-span-2 text-[14.5px] font-medium text-foreground">{String(val)}</div>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              </SectionPage>
            )}

            {/* ════════════ EXECUTIVE SUMMARY ════════════ */}
            {activeTab === "summary" && (
              <SectionPage>
                <PageHeader eyebrow="The Bottom Line" title="Executive Summary" description="AI-generated investor briefing distilling the project's viability." />
                {isLoadingSummary ? (
                  <div className="surface-card rounded-2xl p-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
                    Generating summary…
                  </div>
                ) : summary ? (
                  <div className="space-y-6">
                    <div className="surface-card rounded-2xl p-10">
                      <div className="text-eyebrow text-gold mb-3">Overview</div>
                      <p className="text-[16px] leading-[1.75] text-foreground/85">{summary.summary}</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="surface-card rounded-2xl p-7 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500/80" />
                        <div className="text-eyebrow text-emerald-700 mb-4">Key Strengths</div>
                        <ul className="space-y-3">
                          {summary.keyStrengths?.map((s, i) => (
                            <li key={i} className="text-[14px] leading-relaxed text-foreground/85 flex gap-2.5">
                              <span className="text-emerald-500/70 mt-1.5 text-[8px]">●</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="surface-card rounded-2xl p-7 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-500/80" />
                        <div className="text-eyebrow text-amber-700 mb-4">Risk Factors</div>
                        <ul className="space-y-3">
                          {summary.riskFactors?.map((s, i) => (
                            <li key={i} className="text-[14px] leading-relaxed text-foreground/85 flex gap-2.5">
                              <span className="text-amber-500/70 mt-1.5 text-[8px]">●</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState />
                )}
              </SectionPage>
            )}

            {/* ════════════ P&L ACCOUNT ════════════ */}
            {activeTab === "pl" && (
              <SectionPage>
                <PageHeader eyebrow="Financials" title="P&L Account" description="Revenue trajectory and profitability across the projection window." />
                {extractedData?.plAccount?.years?.length ? (
                  <div className="surface-card rounded-2xl p-8 h-[440px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={extractedData.plAccount.years.map((y, i) => ({
                          year: y,
                          Revenue: extractedData.plAccount?.revenue?.[i] || 0,
                          NetProfit: extractedData.plAccount?.netProfit?.[i] || 0,
                        }))}
                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={NAVY} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={NAVY} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={GOLD} stopOpacity={0.45} />
                            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="hsl(35 18% 90%)" />
                        <XAxis dataKey="year" tick={{ fill: SLATE, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: SLATE, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(35 18% 88%)", fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                        <Area type="monotone" dataKey="Revenue" stroke={NAVY} strokeWidth={2.5} fill="url(#revFill)" />
                        <Area type="monotone" dataKey="NetProfit" stroke={GOLD} strokeWidth={2.5} fill="url(#profitFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState />
                )}
              </SectionPage>
            )}

            {/* ════════════ BALANCE SHEET ════════════ */}
            {activeTab === "bs" && (
              <SectionPage>
                <PageHeader eyebrow="Financials" title="Balance Sheet" description="Assets, liabilities and equity position over time." />
                {extractedData?.balanceSheet?.years?.length ? (
                  <div className="surface-card rounded-2xl p-8 h-[440px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={extractedData.balanceSheet.years.map((y, i) => ({
                          year: y,
                          Assets: (extractedData.balanceSheet?.currentAssets?.[i] || 0) + (extractedData.balanceSheet?.fixedAssets?.[i] || 0),
                          Liabilities: (extractedData.balanceSheet?.currentLiabilities?.[i] || 0) + (extractedData.balanceSheet?.longTermLiabilities?.[i] || 0),
                          Equity: extractedData.balanceSheet?.equity?.[i] || 0,
                        }))}
                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} stroke="hsl(35 18% 90%)" />
                        <XAxis dataKey="year" tick={{ fill: SLATE, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: SLATE, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(35 18% 88%)", fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                        <Bar dataKey="Assets" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={32} />
                        <Bar dataKey="Liabilities" fill="hsl(218 30% 55%)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                        <Bar dataKey="Equity" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState />
                )}
              </SectionPage>
            )}

            {/* ════════════ CASH FLOW ════════════ */}
            {activeTab === "cashflow" && (
              <SectionPage>
                <PageHeader eyebrow="Financials" title="Cash Flow" description="Operating, investing and financing cash movement." />
                {extractedData?.cashFlow?.years?.length ? (
                  <div className="surface-card rounded-2xl p-8 h-[440px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={extractedData.cashFlow.years.map((y, i) => ({
                          year: y,
                          Operating: extractedData.cashFlow?.operatingCashFlow?.[i] || 0,
                          Investing: extractedData.cashFlow?.investingCashFlow?.[i] || 0,
                          Financing: extractedData.cashFlow?.financingCashFlow?.[i] || 0,
                          Net: extractedData.cashFlow?.netCashFlow?.[i] || 0,
                        }))}
                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} stroke="hsl(35 18% 90%)" />
                        <XAxis dataKey="year" tick={{ fill: SLATE, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: SLATE, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(35 18% 88%)", fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                        <Bar dataKey="Operating" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={26} />
                        <Bar dataKey="Investing" fill="hsl(218 30% 55%)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                        <Bar dataKey="Financing" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={26} />
                        <Bar dataKey="Net" fill="hsl(158 50% 42%)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState />
                )}
              </SectionPage>
            )}

            {/* ════════════ RATIO ANALYSIS ════════════ */}
            {activeTab === "ratios" && (
              <SectionPage>
                <PageHeader eyebrow="Quality" title="Ratio Analysis" description="Key financial health indicators across the projection." />
                {extractedData?.ratioAnalysis?.years?.length ? (
                  <div className="surface-card rounded-2xl p-8 h-[440px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={extractedData.ratioAnalysis.years.map((y, i) => ({
                          year: y,
                          CurrentRatio: extractedData.ratioAnalysis?.currentRatio?.[i] || 0,
                          DSCR: extractedData.ratioAnalysis?.dscr?.[i] || 0,
                        }))}
                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} stroke="hsl(35 18% 90%)" />
                        <XAxis dataKey="year" tick={{ fill: SLATE, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: SLATE, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(35 18% 88%)", fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                        <Line type="monotone" dataKey="CurrentRatio" stroke={NAVY} strokeWidth={2.5} dot={{ r: 3, fill: NAVY }} />
                        <Line type="monotone" dataKey="DSCR" stroke={GOLD} strokeWidth={2.5} dot={{ r: 3, fill: GOLD }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState />
                )}
              </SectionPage>
            )}

            {/* ════════════ FINANCIAL EVALUATION ════════════ */}
            {activeTab === "eval" && (
              <SectionPage>
                <PageHeader eyebrow="Quality" title="Financial Evaluation" description="IRR, NPV, payback and other capital metrics." />
                {extractedData?.financialEvaluation ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(extractedData.financialEvaluation).map(([key, val]) =>
                      val ? (
                        <KpiTile
                          key={key}
                          label={key.replace(/([A-Z])/g, " $1").trim()}
                          value={String(val)}
                          variant="card"
                        />
                      ) : null
                    )}
                  </div>
                ) : (
                  <EmptyState />
                )}
              </SectionPage>
            )}

            {/* ════════════ SWOT ════════════ */}
            {activeTab === "swot" && (
              <SectionPage>
                <PageHeader eyebrow="Quality" title="SWOT Analysis" description="Strategic position — internal and external factors." />
                {extractedData?.swotAnalysis ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <SwotQuad title="Strengths" items={extractedData.swotAnalysis.strengths} tone="emerald" />
                    <SwotQuad title="Weaknesses" items={extractedData.swotAnalysis.weaknesses} tone="rose" />
                    <SwotQuad title="Opportunities" items={extractedData.swotAnalysis.opportunities} tone="sky" />
                    <SwotQuad title="Threats" items={extractedData.swotAnalysis.threats} tone="amber" />
                  </div>
                ) : (
                  <EmptyState />
                )}
              </SectionPage>
            )}

            {/* ════════════ LOAN SCHEDULE ════════════ */}
            {activeTab === "loan" && (
              <SectionPage>
                <PageHeader eyebrow="Operations" title="Loan Schedule" description="Amortization plan and repayment structure." />
                {extractedData?.loanSchedule?.schedule?.length ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <KpiTile label="Term Loan" value={extractedData.loanSchedule.termLoanAmount} variant="card" />
                      <KpiTile label="Interest Rate" value={extractedData.loanSchedule.interestRate} variant="card" />
                      <KpiTile label="Tenure" value={extractedData.loanSchedule.tenure} variant="card" />
                      <KpiTile label="Moratorium" value={extractedData.loanSchedule.moratorium} variant="card" />
                    </div>
                    <div className="surface-card rounded-2xl overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="text-eyebrow text-muted-foreground py-3">Year</TableHead>
                            <TableHead className="text-eyebrow text-muted-foreground text-right">Opening</TableHead>
                            <TableHead className="text-eyebrow text-muted-foreground text-right">Principal</TableHead>
                            <TableHead className="text-eyebrow text-muted-foreground text-right">Interest</TableHead>
                            <TableHead className="text-eyebrow text-muted-foreground text-right">Total EMI</TableHead>
                            <TableHead className="text-eyebrow text-muted-foreground text-right">Closing</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {extractedData.loanSchedule.schedule.map((row, i) => (
                            <TableRow key={i} className="border-border">
                              <TableCell className="font-medium text-[13.5px]">{row.year}</TableCell>
                              <TableCell className="text-right num-tabular text-[13.5px]">{row.openingBalance}</TableCell>
                              <TableCell className="text-right num-tabular text-[13.5px]">{row.principal}</TableCell>
                              <TableCell className="text-right num-tabular text-[13.5px]">{row.interest}</TableCell>
                              <TableCell className="text-right num-tabular text-[13.5px] font-semibold">{row.totalEmi}</TableCell>
                              <TableCell className="text-right num-tabular text-[13.5px]">{row.closingBalance}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <EmptyState />
                )}
              </SectionPage>
            )}

            {/* ════════════ EMPLOYMENT ════════════ */}
            {activeTab === "employment" && (
              <SectionPage>
                <PageHeader eyebrow="Operations" title="Employment Generation" description="Direct and indirect jobs created by the project." />
                {extractedData?.employmentGeneration ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Object.entries(extractedData.employmentGeneration).map(([key, val]) =>
                      val !== undefined && val !== null ? (
                        <KpiTile
                          key={key}
                          label={key.replace(/([A-Z])/g, " $1").trim()}
                          value={String(val)}
                          variant="card"
                        />
                      ) : null
                    )}
                  </div>
                ) : (
                  <EmptyState />
                )}
              </SectionPage>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function SectionPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SwotQuad({ title, items, tone }: { title: string; items?: string[] | null; tone: "emerald" | "rose" | "sky" | "amber" }) {
  const tones = {
    emerald: { bg: "bg-emerald-50/60", bar: "bg-emerald-500", text: "text-emerald-800", dot: "text-emerald-500/70" },
    rose: { bg: "bg-rose-50/60", bar: "bg-rose-500", text: "text-rose-800", dot: "text-rose-500/70" },
    sky: { bg: "bg-sky-50/60", bar: "bg-sky-500", text: "text-sky-800", dot: "text-sky-500/70" },
    amber: { bg: "bg-amber-50/60", bar: "bg-amber-500", text: "text-amber-800", dot: "text-amber-500/70" },
  }[tone];
  return (
    <div className={`surface-card rounded-2xl p-7 relative overflow-hidden ${tones.bg}`}>
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${tones.bar}`} />
      <div className={`text-eyebrow ${tones.text} mb-4`}>{title}</div>
      {items && items.length > 0 ? (
        <ul className="space-y-2.5">
          {items.map((s, i) => (
            <li key={i} className="text-[14px] leading-relaxed text-foreground/85 flex gap-2.5">
              <span className={`${tones.dot} mt-1.5 text-[8px]`}>●</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground italic">None identified.</p>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="surface-card rounded-2xl p-16 text-center">
      <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
      <h3 className="font-display text-xl text-foreground mb-1">No Data Available</h3>
      <p className="text-sm text-muted-foreground">The AI could not extract this section from the PDF.</p>
    </div>
  );
}
