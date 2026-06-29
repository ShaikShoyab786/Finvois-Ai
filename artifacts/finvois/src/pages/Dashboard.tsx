import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useGetReport, useGetReportSummary, useGetReportVerdicts } from "@workspace/api-client-react";
import type { UseQueryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, User, MapPin, Phone, IdCard, Zap, CalendarDays, Briefcase, GraduationCap } from "lucide-react";
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
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion } from "framer-motion";

import { Sidebar, type NavSection } from "@/components/report/Sidebar";
import { ReportHeader } from "@/components/report/ReportHeader";
import { Hero } from "@/components/report/Hero";
import { BriefingCard } from "@/components/report/BriefingCard";
import { KpiTile } from "@/components/report/KpiTile";
import { PageHeader } from "@/components/report/PageHeader";
import { InsightCaption } from "@/components/report/InsightCaption";
import { ChartFrame } from "@/components/report/ChartFrame";
import { MetricCard } from "@/components/report/MetricCard";
import { DataTable } from "@/components/report/DataTable";
import { ProfitabilityWaterfall } from "@/components/report/ProfitabilityWaterfall";
import { WorkingCapitalChart } from "@/components/report/WorkingCapitalChart";
import { CapitalStructureChart } from "@/components/report/CapitalStructureChart";
import { DscrAmortizationChart } from "@/components/report/DscrAmortizationChart";
import { SectionVerdict } from "@/components/report/SectionVerdict";
import { ThresholdGauge, parseNumeric } from "@/components/report/ThresholdGauge";
import {
  insightPL,
  insightBalanceSheet,
  insightCashFlow,
  insightRatios,
  insightLoan,
  plLatestMetrics,
  meanFinite,
  insightFinancialSnapshot,
  insightWaterfall,
  insightWorkingCapital,
  insightCapitalStructure,
  insightDscrAmortization,
} from "@/lib/insights";
import { ArrowRight } from "lucide-react";

const fmtRupeesL = (n: number): string => `₹${n.toFixed(2)}L`;

// ─── Navigation structure ────────────────────────────────
// Flat, finance-industry-familiar labels. Storytelling depth lives
// inside each section, not in nav abstraction.
const NAV: NavSection[] = [
  {
    group: "",
    items: [
      { id: "overview", label: "Executive Summary" },
      { id: "profile", label: "Business Profile" },
      { id: "dashboard", label: "Financial Dashboard" },
      { id: "pl", label: "P&L Account" },
      { id: "bs", label: "Balance Sheet" },
      { id: "ratios", label: "Ratio Analysis" },
      { id: "cashflow", label: "Cash Flow" },
      { id: "loan", label: "Loan Schedule" },
      { id: "eval", label: "Financial Evaluation" },
    ],
  },
];

// Recharts palette — professional multi-color (blue / sky / orange / green / red)
const NAVY = "hsl(221 83% 53%)";        // primary royal blue
const NAVY_LIGHT = "hsl(199 89% 48%)";  // sky blue
const GOLD = "hsl(32 90% 52%)";         // orange accent
const SLATE = "hsl(215 16% 47%)";
const EMERALD = "hsl(158 64% 40%)";
const ROSE = "hsl(0 72% 51%)";
const PURPLE = "hsl(262 83% 58%)";

const PIE_COLORS = [NAVY, NAVY_LIGHT, GOLD, EMERALD, PURPLE, ROSE];
const fmtINR = (n: number | null | undefined): string =>
  n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`;

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid hsl(220 16% 90%)",
  fontSize: 12,
  padding: "8px 12px",
  background: "white",
  boxShadow: "0 4px 12px -2px rgb(15 23 42 / 0.08)",
};

const axisTick = { fill: SLATE, fontSize: 11 };

export default function Dashboard() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: report, isLoading, isError } = useGetReport(id);
  // AI-generated summary + per-section verdicts each cost one paid LLM call
  // (~15s each). Treat them as essentially static for the session — don't
  // refetch on window focus or remount, since the underlying extracted data
  // is immutable once the report is "ready". The orval-generated type marks
  // queryKey as required even though the underlying queryOptions builder
  // supplies it; we cast to allow partial overrides only.
  const aiQuery = {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  } as unknown as UseQueryOptions<unknown, unknown, unknown, readonly unknown[]>;
  const { data: summary, isLoading: isLoadingSummary } = useGetReportSummary(id, { query: aiQuery as never });
  const { data: verdictsData, isLoading: isLoadingVerdicts } = useGetReportVerdicts(id, { query: aiQuery as never });
  const v = verdictsData?.verdicts;

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

  const ed = report.extractedData;
  const bp = ed?.businessProfile;
  const fs = ed?.financialSummary;
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

            {/* ═══════════ OVERVIEW ═══════════ */}
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                <Hero firmName={report.firmName || "Unnamed Report"} tagline={bp?.lineOfActivity} kpis={heroKpis} />
                <BriefingCard
                  summary={summary?.summary}
                  keyStrengths={summary?.keyStrengths}
                  riskFactors={summary?.riskFactors}
                  isLoading={isLoadingSummary}
                />
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.6 } } }}
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
                      variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
                    >
                      <KpiTile label={k.label} value={k.value} variant="card" />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* ═══════════ BUSINESS PROFILE (incl. Employment) ═══════════ */}
            {activeTab === "profile" && <ProfileSection report={report} ed={ed} verdict={v?.profile} isLoadingVerdict={isLoadingVerdicts} />}

            {/* ═══════════ FINANCIAL DASHBOARD — synthesis hub ═══════════ */}
            {activeTab === "dashboard" && <FinancialDashboardSection ed={ed} onJump={setActiveTab} />}

            {/* ═══════════ P&L ═══════════ */}
            {activeTab === "pl" && <PLSection ed={ed} verdict={v?.pl} isLoadingVerdict={isLoadingVerdicts} />}

            {/* ═══════════ BALANCE SHEET ═══════════ */}
            {activeTab === "bs" && <BalanceSheetSection ed={ed} verdict={v?.balanceSheet} isLoadingVerdict={isLoadingVerdicts} />}

            {/* ═══════════ RATIOS ═══════════ */}
            {activeTab === "ratios" && <RatiosSection ed={ed} verdict={v?.ratios} isLoadingVerdict={isLoadingVerdicts} />}

            {/* ═══════════ CASH FLOW ═══════════ */}
            {activeTab === "cashflow" && <CashFlowSection ed={ed} verdict={v?.cashFlow} isLoadingVerdict={isLoadingVerdicts} />}

            {/* ═══════════ LOAN SCHEDULE ═══════════ */}
            {activeTab === "loan" && <LoanSection ed={ed} verdict={v?.loan} isLoadingVerdict={isLoadingVerdicts} />}

            {/* ═══════════ FINANCIAL EVALUATION ═══════════ */}
            {activeTab === "eval" && <EvaluationSection ed={ed} verdict={v?.evaluation} isLoadingVerdict={isLoadingVerdicts} />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ═════════════════════════════════════════════════════════

function ProfileSection({ report, ed, verdict, isLoadingVerdict }: { report: any; ed: any; verdict?: string | null; isLoadingVerdict?: boolean }) {
  const bp = ed?.businessProfile;
  const proprietorName = bp?.proprietorName || report.proprietorName || "—";
  const initials = proprietorName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase() || "—";

  const firmRows = [
    { icon: Briefcase, label: "Constitution", value: bp?.constitution },
    { icon: MapPin, label: "Location", value: bp?.location },
    { icon: MapPin, label: "Unit Address", value: bp?.unitAddress },
    { icon: IdCard, label: "PAN", value: bp?.panNo },
    { icon: Zap, label: "Power Requirement", value: bp?.powerRequirement },
    { icon: CalendarDays, label: "Commercial Production", value: bp?.commercialProductionDate },
    { icon: FileText, label: "Prepared By", value: bp?.preparedBy },
  ].filter((r) => r.value);

  const proprietorRows = [
    { label: "Education", value: bp?.education },
    { label: "Experience", value: bp?.experience },
    { label: "Age", value: bp?.age },
    { label: "Gender", value: bp?.gender },
    { label: "Caste", value: bp?.caste },
    { label: "Mobile", value: bp?.mobile },
    { label: "Aadhar No.", value: bp?.aadharNo },
  ].filter((r) => r.value);

  return (
    <SectionPage>
      <PageHeader eyebrow="The Business" title="Business Profile" description="Identity, leadership and operational footprint of the firm." />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />

      {/* Profile cards — Business Profile + Proprietor Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Firm card (60%) */}
        <div className="lg:col-span-3 surface-card rounded-2xl p-8 md:p-9">
          <div className="text-eyebrow text-muted-foreground mb-4">The Firm</div>
          <h2 className="font-display text-[28px] leading-[1.15] text-foreground mb-2">
            {report.firmName || "—"}
          </h2>
          {bp?.lineOfActivity && (
            <p className="text-[14px] text-muted-foreground leading-relaxed mb-7">{bp.lineOfActivity}</p>
          )}

          <div className="space-y-1">
            {firmRows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-4 py-3 border-b border-border last:border-b-0">
                <Icon className="w-3.5 h-3.5 text-muted-foreground mt-1 flex-shrink-0" />
                <div className="text-eyebrow text-muted-foreground w-[140px] flex-shrink-0 pt-1">{label}</div>
                <div className="flex-1 text-[14px] font-medium text-foreground">{String(value)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Proprietor card (40%) */}
        <div className="lg:col-span-2 surface-card rounded-2xl p-7 md:p-8">
          <div className="text-eyebrow text-muted-foreground mb-5">The Proprietor</div>

          <div className="flex items-start gap-4 mb-7 pb-7 border-b border-border">
            <div className="flex-shrink-0 w-14 h-14 rounded-full bg-brand text-white flex items-center justify-center font-semibold text-base">
              {initials}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <h3 className="font-display text-[20px] leading-tight text-foreground mb-1">{proprietorName}</h3>
              {bp?.constitution && (
                <div className="text-[12.5px] text-muted-foreground">{bp.constitution}</div>
              )}
            </div>
          </div>

          <div className="space-y-3.5">
            {proprietorRows.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No additional proprietor details extracted.</p>
            ) : (
              proprietorRows.map(({ label, value }) => (
                <div key={label} className="flex gap-4">
                  <div className="text-eyebrow text-muted-foreground w-[90px] flex-shrink-0 pt-0.5">{label}</div>
                  <div className="flex-1 text-[13.5px] text-foreground/90 font-medium">{String(value)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Project Cost & Finance · Finance Mix · Employment + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 items-start">
        <ProjectFinanceCard ed={ed} />
        <FinanceMixPie ed={ed} />
        <EmploymentBlock ed={ed} />
      </div>

      {/* SWOT Analysis — qualitative profile of the business */}
      <div className="mt-12">
        <SwotBlock ed={ed} />
      </div>

      {/* Implementation Timeline (rendered when extracted) */}
      <ImplementationTimeline ed={ed} />

      {/* Product Portfolio (rendered when extracted) */}
      <ProductPortfolioTable ed={ed} />
    </SectionPage>
  );
}

function ProjectFinanceCard({ ed }: { ed: any }) {
  const pc = ed?.projectCost;
  const items: any[] = pc?.items || [];
  const finance: any[] = pc?.financeBreakdown || [];
  if (items.length === 0 && finance.length === 0) return null;
  const financeTotal = finance.reduce((a, f) => a + (f.amount || 0), 0);

  return (
    <div className="surface-card rounded-2xl p-7">
      <h3 className="font-display text-[18px] mb-5">Project Cost &amp; Finance</h3>

      {items.length > 0 && (
        <div className="mb-6">
          <div className="text-eyebrow text-muted-foreground mb-3">Cost of Project</div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex justify-between items-baseline text-[13.5px]">
                <span className="text-foreground/85">{it.label}</span>
                <span className="font-semibold text-brand num-tabular">{fmtINR(it.amount)}</span>
              </div>
            ))}
            {pc?.totalCost != null && (
              <div className="flex justify-between items-baseline pt-2.5 mt-1.5 border-t border-border">
                <span className="font-semibold text-foreground">Total Project Cost</span>
                <span className="font-bold text-brand num-tabular">{fmtINR(pc.totalCost)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {finance.length > 0 && (
        <div>
          <div className="text-eyebrow text-muted-foreground mb-3">Means of Finance</div>
          <div className="space-y-2">
            {finance.map((f, i) => (
              <div key={i} className="flex justify-between items-baseline text-[13.5px]">
                <span className="text-foreground/85">{f.label}</span>
                <span className="font-semibold text-emerald-600 num-tabular">{fmtINR(f.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between items-baseline pt-2.5 mt-1.5 border-t border-border">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-emerald-700 num-tabular">{fmtINR(financeTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FinanceMixPie({ ed }: { ed: any }) {
  const finance: any[] = ed?.projectCost?.financeBreakdown || [];
  if (finance.length === 0) return null;
  const data = finance.map((f) => ({ name: f.label, value: f.amount || 0 }));

  return (
    <div className="surface-card rounded-2xl p-7">
      <h3 className="font-display text-[18px] mb-1">Finance Mix</h3>
      <p className="text-[12.5px] text-muted-foreground mb-3">Capital sources funding the project.</p>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} innerRadius={44} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: any) => fmtINR(v as number)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 text-[11.5px]">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="text-muted-foreground">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImplementationTimeline({ ed }: { ed: any }) {
  const phases: any[] = ed?.implementationTimeline;
  if (!Array.isArray(phases) || phases.length === 0) return null;
  const tones = [
    "bg-blue-50 border-blue-200",
    "bg-purple-50 border-purple-200",
    "bg-amber-50 border-amber-200",
    "bg-emerald-50 border-emerald-200",
  ];
  return (
    <div className="mt-12">
      <h3 className="font-display text-[22px] mb-5">Implementation Timeline</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {phases.map((p, i) => (
          <div key={i} className={`rounded-2xl border p-5 ${tones[i % tones.length]}`}>
            <div className="font-semibold text-[15px] text-foreground mb-2">{p.phase || p.name || `Phase ${i + 1}`}</div>
            {(p.startDate || p.start) && (
              <div className="text-[12px] text-muted-foreground">{p.startDate || p.start}</div>
            )}
            <div className="text-[13px] font-medium text-foreground">{p.endDate || p.end || p.status || ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductPortfolioTable({ ed }: { ed: any }) {
  const products: any[] = ed?.productPortfolio || ed?.businessProfile?.productPortfolio;
  if (!Array.isArray(products) || products.length === 0) return null;
  return (
    <div className="mt-12">
      <h3 className="font-display text-[22px] mb-5">Product Portfolio</h3>
      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary">
                <th className="text-eyebrow text-white/85 py-3.5 px-4 text-left w-16">S.No</th>
                <th className="text-eyebrow text-white/85 py-3.5 px-4 text-left">Product</th>
                <th className="text-eyebrow text-white/85 py-3.5 px-4 text-right">Production Capacity / Annum</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={i} className={`border-t border-border ${i % 2 === 1 ? "bg-muted/40" : ""}`}>
                  <td className="py-3 px-4 text-[13.5px] text-muted-foreground">{i + 1}</td>
                  <td className="py-3 px-4 text-[13.5px] font-medium text-foreground">{p.product || p.name || p.label}</td>
                  <td className="py-3 px-4 text-[13.5px] text-right font-semibold text-brand num-tabular">
                    {p.capacity || p.productionCapacity || p.value || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PLSection({ ed, verdict, isLoadingVerdict }: { ed: any; verdict?: string | null; isLoadingVerdict?: boolean }) {
  const pl = ed?.plAccount;
  if (!pl?.years?.length) return (
    <SectionPage>
      <PageHeader eyebrow="Financials" title="P&L Account" />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />
      <EmptyState />
    </SectionPage>
  );

  const metrics = plLatestMetrics(pl);
  const chartData = pl.years.map((y: string, i: number) => ({
    year: y,
    Revenue: pl.revenue?.[i] || 0,
    "Gross Profit": pl.grossProfit?.[i] || 0,
    "Net Profit": pl.netProfit?.[i] || 0,
  }));
  const insight = insightPL(pl);

  return (
    <SectionPage>
      <PageHeader eyebrow="Financials" title="P&L Account" description="Revenue trajectory and profitability across the projection window." />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />

      {/* Latest year KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label={`Revenue · ${pl.years[pl.years.length - 1]}`}
          value={metrics.revenue != null ? fmtRupeesL(metrics.revenue) : null}
          tone="neutral"
        />
        <MetricCard
          label={`Net Profit · ${pl.years[pl.years.length - 1]}`}
          value={metrics.netProfit != null ? fmtRupeesL(metrics.netProfit) : null}
          tone={metrics.netProfit == null ? "neutral" : metrics.netProfit > 0 ? "good" : "risk"}
        />
        <MetricCard
          label="Gross Margin (latest)"
          value={metrics.grossMargin != null ? `${metrics.grossMargin.toFixed(1)}%` : null}
          tone="neutral"
        />
        <MetricCard
          label="Net Margin (latest)"
          value={metrics.netMargin != null ? `${metrics.netMargin.toFixed(1)}%` : null}
          tone={metrics.netMargin == null ? "neutral" : metrics.netMargin > 5 ? "good" : "warn"}
        />
      </div>

      {/* Layer 2a — relationship view: where does the latest rupee go? */}
      <ChartFrame
        eyebrow="Where The Rupee Goes"
        title={`Profitability waterfall · ${pl.years[pl.years.length - 1]}`}
        description="Latest-year flow from top-line revenue down to net profit — each deduction shown as a step."
        chartHeight={340}
        footer={<InsightCaption text={insightWaterfall(pl)} />}
      >
        <ProfitabilityWaterfall pl={pl} />
      </ChartFrame>

      <div className="h-6" />

      <ChartFrame
        eyebrow="Revenue & Profitability"
        title="Earnings trajectory"
        description="Top-line revenue against gross and net profit progression."
        chartHeight={360}
        footer={<InsightCaption text={insight} />}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={NAVY} stopOpacity={0.3} />
                <stop offset="100%" stopColor={NAVY} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gpFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={NAVY_LIGHT} stopOpacity={0.35} />
                <stop offset="100%" stopColor={NAVY_LIGHT} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="npFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.45} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(220 16% 90%)" />
            <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" />
            <Area type="monotone" dataKey="Revenue" stroke={NAVY} strokeWidth={2.5} fill="url(#revFill)" />
            <Area type="monotone" dataKey="Gross Profit" stroke={NAVY_LIGHT} strokeWidth={2} fill="url(#gpFill)" />
            <Area type="monotone" dataKey="Net Profit" stroke={GOLD} strokeWidth={2.5} fill="url(#npFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <div className="mt-6">
        <DataTable
          years={pl.years}
          rows={[
            { label: "Revenue", values: pl.revenue || [], emphasis: true },
            { label: "Gross Profit", values: pl.grossProfit || [] },
            { label: "Expenses", values: pl.expenses || [] },
            { label: "Depreciation", values: pl.depreciation || [] },
            { label: "Interest", values: pl.interest || [] },
            { label: "Net Profit", values: pl.netProfit || [], emphasis: true },
          ]}
        />
      </div>
    </SectionPage>
  );
}

function BalanceSheetSection({ ed, verdict, isLoadingVerdict }: { ed: any; verdict?: string | null; isLoadingVerdict?: boolean }) {
  const bs = ed?.balanceSheet;
  if (!bs?.years?.length) return (
    <SectionPage>
      <PageHeader eyebrow="Financials" title="Balance Sheet" />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />
      <EmptyState />
    </SectionPage>
  );

  const chartData = bs.years.map((y: string, i: number) => ({
    year: y,
    "Current Assets": bs.currentAssets?.[i] || 0,
    "Fixed Assets": bs.fixedAssets?.[i] || 0,
    "Current Liab.": -(bs.currentLiabilities?.[i] || 0),
    "Long-term Liab.": -(bs.longTermLiabilities?.[i] || 0),
    Equity: -(bs.equity?.[i] || 0),
  }));
  const insight = insightBalanceSheet(bs);

  return (
    <SectionPage>
      <PageHeader eyebrow="Financials" title="Balance Sheet" description="Assets above, liabilities and equity below — the project's capital structure over time." />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />

      <ChartFrame
        eyebrow="Capital Structure"
        title="Assets vs Liabilities & Equity"
        description="Stacked composition with assets above the axis and funding sources below."
        chartHeight={400}
        footer={<InsightCaption text={insight} />}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} stackOffset="sign" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(220 16% 90%)" />
            <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => Math.abs(v).toString()} />
            <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => Math.abs(v).toFixed(2)} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" />
            <Bar dataKey="Current Assets" stackId="a" fill={NAVY_LIGHT} radius={[0, 0, 0, 0]} maxBarSize={36} />
            <Bar dataKey="Fixed Assets" stackId="a" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="Current Liab." stackId="b" fill="hsl(262 45% 78%)" radius={[0, 0, 0, 0]} maxBarSize={36} />
            <Bar dataKey="Long-term Liab." stackId="b" fill="hsl(262 55% 64%)" radius={[0, 0, 0, 0]} maxBarSize={36} />
            <Bar dataKey="Equity" stackId="b" fill={GOLD} radius={[0, 0, 4, 4]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      {/* Layer 2b — short-term solvency: working capital position */}
      <div className="h-6" />
      <ChartFrame
        eyebrow="Short-Term Health"
        title="Working capital position"
        description="Current assets vs current liabilities each year; the line traces the resulting working capital."
        chartHeight={320}
        footer={<InsightCaption text={insightWorkingCapital(bs)} />}
      >
        <WorkingCapitalChart bs={bs} />
      </ChartFrame>

      {/* Layer 2c — long-term health: capital structure mix evolution */}
      <div className="h-6" />
      <ChartFrame
        eyebrow="Long-Term Health"
        title="Capital structure evolution"
        description="Funding mix as a percentage — does the project deleverage as debt is paid down?"
        chartHeight={320}
        footer={<InsightCaption text={insightCapitalStructure(bs)} />}
      >
        <CapitalStructureChart bs={bs} />
      </ChartFrame>

      <div className="mt-6">
        <DataTable
          years={bs.years}
          rows={[
            { label: "Current Assets", values: bs.currentAssets || [] },
            { label: "Fixed Assets", values: bs.fixedAssets || [] },
            { label: "Current Liabilities", values: bs.currentLiabilities || [] },
            { label: "Long-term Liabilities", values: bs.longTermLiabilities || [] },
            { label: "Equity", values: bs.equity || [], emphasis: true },
          ]}
        />
      </div>
    </SectionPage>
  );
}

function CashFlowSection({ ed, verdict, isLoadingVerdict }: { ed: any; verdict?: string | null; isLoadingVerdict?: boolean }) {
  const cf = ed?.cashFlow;
  if (!cf?.years?.length) return (
    <SectionPage>
      <PageHeader eyebrow="Financials" title="Cash Flow" />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />
      <EmptyState />
    </SectionPage>
  );

  const chartData = cf.years.map((y: string, i: number) => ({
    year: y,
    Operating: cf.operatingCashFlow?.[i] || 0,
    Investing: cf.investingCashFlow?.[i] || 0,
    Financing: cf.financingCashFlow?.[i] || 0,
    Net: cf.netCashFlow?.[i] || 0,
  }));
  const insight = insightCashFlow(cf);

  return (
    <SectionPage>
      <PageHeader eyebrow="Financials" title="Cash Flow" description="Operating, investing, financing — and the net resulting cash movement." />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />

      <ChartFrame
        eyebrow="Cash Movement"
        title="Annual cash flow breakdown"
        description="Composition of cash generated and consumed across activities. The line tracks net cash position."
        chartHeight={400}
        footer={<InsightCaption text={insight} />}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(220 16% 90%)" />
            <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" />
            <Bar dataKey="Operating" fill={NAVY} radius={[3, 3, 0, 0]} maxBarSize={22} />
            <Bar dataKey="Investing" fill="hsl(218 30% 55%)" radius={[3, 3, 0, 0]} maxBarSize={22} />
            <Bar dataKey="Financing" fill={GOLD} radius={[3, 3, 0, 0]} maxBarSize={22} />
            <Line type="monotone" dataKey="Net" stroke={EMERALD} strokeWidth={2.5} dot={{ r: 3, fill: EMERALD }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>

      <div className="mt-6">
        <DataTable
          years={cf.years}
          rows={[
            { label: "Operating Cash Flow", values: cf.operatingCashFlow || [] },
            { label: "Investing Cash Flow", values: cf.investingCashFlow || [] },
            { label: "Financing Cash Flow", values: cf.financingCashFlow || [] },
            { label: "Net Cash Flow", values: cf.netCashFlow || [], emphasis: true },
          ]}
        />
      </div>
    </SectionPage>
  );
}

function RatiosSection({ ed, verdict, isLoadingVerdict }: { ed: any; verdict?: string | null; isLoadingVerdict?: boolean }) {
  const ra = ed?.ratioAnalysis;
  if (!ra?.years?.length) return (
    <SectionPage>
      <PageHeader eyebrow="Quality" title="Ratio Analysis" />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />
      <EmptyState />
    </SectionPage>
  );

  const insight = insightRatios(ra);

  const ratios = [
    { key: "dscr", label: "DSCR", values: ra.dscr || [], benchmark: 1.5, benchmarkLabel: "≥ 1.5× (banking standard)", color: GOLD },
    { key: "currentRatio", label: "Current Ratio", values: ra.currentRatio || [], benchmark: 1.33, benchmarkLabel: "≥ 1.33 (healthy liquidity)", color: NAVY },
    { key: "debtEquityRatio", label: "Debt / Equity", values: ra.debtEquityRatio || [], benchmark: 2, benchmarkLabel: "≤ 2 (manageable leverage)", color: NAVY_LIGHT, lower: true },
    { key: "grossProfitMargin", label: "Gross Margin", values: ra.grossProfitMargin || [], benchmark: 20, benchmarkLabel: "≥ 20% (industry baseline)", color: EMERALD, isPct: true },
    { key: "netProfitMargin", label: "Net Margin", values: ra.netProfitMargin || [], benchmark: 8, benchmarkLabel: "≥ 8% (sustainable margin)", color: GOLD, isPct: true },
    { key: "returnOnEquity", label: "Return on Equity", values: ra.returnOnEquity || [], benchmark: 15, benchmarkLabel: "≥ 15% (investor expectation)", color: NAVY, isPct: true },
  ].filter((r) => r.values.some((v: number | null) => v != null && v !== 0));

  return (
    <SectionPage>
      <PageHeader eyebrow="Quality" title="Ratio Analysis" description="Key financial health indicators projected across the loan window." />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        {ratios.map(({ key, ...r }) => (
          <RatioMiniCard key={key} {...r} years={ra.years} />
        ))}
      </div>

      <InsightCaption text={insight} label="Banker's Read" />
    </SectionPage>
  );
}

function RatioMiniCard({ label, values, years, color, benchmark, benchmarkLabel, isPct, lower }: any) {
  const data = years.map((y: string, i: number) => ({ year: y, v: values[i] != null ? values[i] : 0 }));
  // Latest is the last non-null value; falls back to undefined when none
  let latest: number | null = null;
  for (let i = values.length - 1; i >= 0; i--) {
    if (typeof values[i] === "number" && isFinite(values[i])) {
      latest = values[i];
      break;
    }
  }
  const avg = meanFinite(values);
  const passes = benchmark != null && avg != null
    ? (lower ? avg <= benchmark : avg >= benchmark)
    : null;

  const fmt = (n: number) => isPct ? `${n.toFixed(1)}%` : n.toFixed(2);

  return (
    <div className="surface-card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-2">
        <div className="text-eyebrow text-muted-foreground">{label}</div>
        {passes != null && (
          <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${passes ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {passes ? "On target" : "Below"}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <div className="font-display text-[28px] leading-none text-foreground num-tabular">
          {latest != null ? fmt(latest) : "—"}
        </div>
        <div className="text-[11px] text-muted-foreground">latest</div>
      </div>
      <div className="h-[60px] -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#fill-${label.replace(/\s/g, "")})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {benchmarkLabel && (
        <div className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border">
          {benchmarkLabel}
        </div>
      )}
    </div>
  );
}

/**
 * Three banker-grade threshold gauges for the Financial Evaluation section.
 * Each gauge shows whether a single headline metric clears the bar that a
 * credit committee actually uses — not just whether the number exists.
 *
 * The IRR gauge floats its bands around the project's own WACC when
 * available (IRR must exceed WACC to create value); otherwise it falls
 * back to conventional MSME thresholds. Renders nothing when no
 * threshold metric is parseable.
 */
function ThresholdGaugesBlock({ fe }: { fe: any }) {
  if (!fe) return null;
  const irr = parseNumeric(fe.irr);
  const wacc = parseNumeric(fe.wacc);
  const altman = parseNumeric(fe.altmanZScore);
  const dscr = parseNumeric(fe.averageDscr);

  if (irr == null && altman == null && dscr == null) return null;

  // IRR bands: must beat WACC to create value, comfort margin is ~5pp above
  const irrFloor = wacc ?? 12;
  const irrComfort = irrFloor + 5;
  const irrMax = Math.max(30, Math.ceil((irr ?? 0) + 5), irrComfort + 5);

  return (
    <div className="mb-9">
      <div className="text-eyebrow text-gold mb-4">Does it clear the bar?</div>
      <h3 className="font-display text-[22px] mb-5">Threshold Gauges</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {irr != null && (
          <ThresholdGauge
            label="IRR vs WACC"
            value={irr}
            suffix="%"
            min={0}
            max={irrMax}
            bands={[
              { to: irrFloor, bg: "bg-rose-200/70", label: "WACC" },
              { to: irrComfort, bg: "bg-amber-200/70", label: `+5pp` },
              { to: irrMax, bg: "bg-emerald-200/70" },
            ]}
            benchmarkLabel={
              wacc != null
                ? `IRR must exceed WACC (${wacc.toFixed(1)}%) to create value; +5pp gives margin for execution risk.`
                : `WACC not stated; using 12% as conventional MSME floor.`
            }
          />
        )}
        {altman != null && (
          <ThresholdGauge
            label="Altman Z-Score"
            value={altman}
            min={0}
            max={5}
            bands={[
              { to: 1.8, bg: "bg-rose-200/70", label: "1.8" },
              { to: 3.0, bg: "bg-amber-200/70", label: "3.0" },
              { to: 5, bg: "bg-emerald-200/70" },
            ]}
            benchmarkLabel="Below 1.8 signals distress; 1.8–3.0 is grey zone; above 3.0 is safe."
          />
        )}
        {dscr != null && (
          <ThresholdGauge
            label="Average DSCR"
            value={dscr}
            suffix="×"
            min={0}
            max={3}
            bands={[
              { to: 1.0, bg: "bg-rose-200/70", label: "1.0×" },
              { to: 1.5, bg: "bg-amber-200/70", label: "1.5×" },
              { to: 3, bg: "bg-emerald-200/70" },
            ]}
            benchmarkLabel="Below 1.0× cannot service debt; 1.0–1.5× is tight; 1.5×+ is what most banks underwrite to."
          />
        )}
      </div>
    </div>
  );
}

function EvaluationSection({ ed, verdict, isLoadingVerdict }: { ed: any; verdict?: string | null; isLoadingVerdict?: boolean }) {
  const fe = ed?.financialEvaluation;
  if (!fe) return (
    <SectionPage>
      <PageHeader eyebrow="Quality" title="Financial Evaluation" />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />
      <EmptyState />
    </SectionPage>
  );

  const groups = [
    {
      title: "Capital Returns",
      eyebrow: "Returns",
      metrics: [
        { label: "IRR", value: fe.irr, description: "Internal rate of return" },
        { label: "MIRR", value: fe.mirr, description: "Modified internal rate of return" },
        { label: "NPV", value: fe.npv, description: "Net present value" },
        { label: "WACC", value: fe.wacc, description: "Weighted avg. cost of capital" },
        { label: "Profitability Index", value: fe.profitabilityIndex, description: "PV of cash flows / investment" },
      ],
    },
    {
      title: "Payback Profile",
      eyebrow: "Payback",
      metrics: [
        { label: "Simple Payback", value: fe.simplePaybackPeriod, description: "Years to recover investment" },
        { label: "Discounted Payback", value: fe.discountedPaybackPeriod, description: "Discounted recovery period" },
      ],
    },
    {
      title: "Risk Profile",
      eyebrow: "Risk",
      metrics: [
        { label: "BEP", value: fe.bep, description: "Break-even point" },
        { label: "Margin of Safety", value: fe.marginOfSafety, description: "Sales cushion above BEP" },
        { label: "Altman Z-Score", value: fe.altmanZScore, description: "Bankruptcy risk indicator" },
        { label: "Average DSCR", value: fe.averageDscr, description: "Debt service coverage" },
      ],
    },
  ];

  return (
    <SectionPage>
      <PageHeader eyebrow="Quality" title="Financial Evaluation" description="Returns, payback and risk metrics determining whether this project clears the bar." />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />

      {/* Threshold gauges — does the project clear the bar that banks actually use? */}
      <ThresholdGaugesBlock fe={fe} />

      <div className="space-y-9">
        {groups.map((g) => {
          const filtered = g.metrics.filter((m) => m.value);
          if (!filtered.length) return null;
          return (
            <div key={g.title}>
              <div className="text-eyebrow text-gold mb-4">{g.eyebrow}</div>
              <h3 className="font-display text-[22px] mb-5">{g.title}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((m) => (
                  <MetricCard key={m.label} label={m.label} value={m.value} description={m.description} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </SectionPage>
  );
}

// Block rendered inside Business Profile — the qualitative profile of
// the business, mirroring the old dashboard's SWOT placement.
function SwotBlock({ ed }: { ed: any }) {
  const sw = ed?.swotAnalysis;
  if (!sw) return null;
  const quads = [
    { title: "Strengths", items: sw.strengths, tone: "emerald" as const, sub: "Internal · Positive" },
    { title: "Weaknesses", items: sw.weaknesses, tone: "rose" as const, sub: "Internal · Negative" },
    { title: "Opportunities", items: sw.opportunities, tone: "sky" as const, sub: "External · Positive" },
    { title: "Threats", items: sw.threats, tone: "amber" as const, sub: "External · Negative" },
  ];
  return (
    <div>
      <div className="text-eyebrow text-muted-foreground mb-4">Qualitative Profile</div>
      <h3 className="font-display text-[22px] mb-2">SWOT Analysis</h3>
      <p className="text-[13.5px] text-muted-foreground mb-5 max-w-2xl">
        Internal capabilities of the business mapped against the external forces it operates within.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {quads.map((q) => (
          <SwotQuad key={q.title} {...q} />
        ))}
      </div>
    </div>
  );
}

function SwotQuad({ title, items, tone, sub }: { title: string; items?: string[] | null; tone: "emerald" | "rose" | "sky" | "amber"; sub: string }) {
  const tones = {
    emerald: { bg: "bg-emerald-50/40", bar: "bg-emerald-500", text: "text-emerald-800", dot: "text-emerald-500/70", count: "bg-emerald-100 text-emerald-700" },
    rose: { bg: "bg-rose-50/40", bar: "bg-rose-500", text: "text-rose-800", dot: "text-rose-500/70", count: "bg-rose-100 text-rose-700" },
    sky: { bg: "bg-sky-50/40", bar: "bg-sky-500", text: "text-sky-800", dot: "text-sky-500/70", count: "bg-sky-100 text-sky-700" },
    amber: { bg: "bg-amber-50/40", bar: "bg-amber-500", text: "text-amber-800", dot: "text-amber-500/70", count: "bg-amber-100 text-amber-700" },
  }[tone];
  const count = items?.length || 0;
  return (
    <div className={`surface-card rounded-2xl p-7 relative overflow-hidden ${tones.bg} min-h-[220px]`}>
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${tones.bar}`} />
      <div className="flex items-center justify-between mb-1">
        <div className={`text-eyebrow ${tones.text}`}>{title}</div>
        <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tones.count}`}>{count}</div>
      </div>
      <div className="text-[11px] text-muted-foreground mb-5">{sub}</div>
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

function LoanSection({ ed, verdict, isLoadingVerdict }: { ed: any; verdict?: string | null; isLoadingVerdict?: boolean }) {
  const loan = ed?.loanSchedule;
  if (!loan?.schedule?.length) return (
    <SectionPage>
      <PageHeader eyebrow="Operations" title="Loan Schedule" />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />
      <EmptyState />
    </SectionPage>
  );

  const chartData = loan.schedule.map((r: any) => ({
    year: r.year,
    Principal: r.principal || 0,
    Interest: r.interest || 0,
    "Closing Balance": r.closingBalance || 0,
  }));
  const insight = insightLoan(loan);

  return (
    <SectionPage>
      <PageHeader eyebrow="Operations" title="Loan Schedule" description="Amortization plan — principal repayment, interest burden, and outstanding balance over time." />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiTile label="Term Loan" value={loan.termLoanAmount} variant="card" />
        <KpiTile label="Interest Rate" value={loan.interestRate} variant="card" />
        <KpiTile label="Tenure" value={loan.tenure} variant="card" />
        <KpiTile label="Moratorium" value={loan.moratorium} variant="card" />
      </div>

      <ChartFrame
        eyebrow="Amortization"
        title="Repayment curve"
        description="Annual principal & interest bars against the descending outstanding balance curve."
        chartHeight={340}
        footer={<InsightCaption text={insight} />}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(220 16% 90%)" />
            <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={axisTick} axisLine={false} tickLine={false} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" />
            <Bar yAxisId="left" dataKey="Principal" stackId="emi" fill={NAVY} radius={[0, 0, 0, 0]} maxBarSize={28} />
            <Bar yAxisId="left" dataKey="Interest" stackId="emi" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Line yAxisId="right" type="monotone" dataKey="Closing Balance" stroke={ROSE} strokeWidth={2.5} dot={{ r: 3, fill: ROSE }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>

      {/* Layer 2b — the banker's coverage view: does operating cash service the EMI? */}
      <div className="h-6" />
      <ChartFrame
        eyebrow="Coverage Check"
        title="Operating cash vs EMI · with DSCR overlay"
        description="EMI burden (bars) against operating cash available (line), with the DSCR ratio overlaid on the right axis and the 1.2× banking floor as a reference."
        chartHeight={360}
        footer={<InsightCaption text={insightDscrAmortization(loan, ed?.cashFlow, ed?.ratioAnalysis)} />}
      >
        <DscrAmortizationChart loan={loan} cf={ed?.cashFlow} ra={ed?.ratioAnalysis} />
      </ChartFrame>

      <div className="mt-6 surface-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary">
                <th className="text-eyebrow text-white/85 py-3.5 px-4 text-left">Year</th>
                <th className="text-eyebrow text-white/85 text-right px-4">Opening</th>
                <th className="text-eyebrow text-white/85 text-right px-4">Principal</th>
                <th className="text-eyebrow text-white/85 text-right px-4">Interest</th>
                <th className="text-eyebrow text-white/85 text-right px-4">Total EMI</th>
                <th className="text-eyebrow text-white/85 text-right px-4">Closing</th>
              </tr>
            </thead>
            <tbody>
              {loan.schedule.map((row: any, i: number) => (
                <tr key={i} className={`border-t border-border ${i % 2 === 1 ? "bg-muted/40" : ""}`}>
                  <td className="font-medium text-[13.5px] py-3 px-4">{row.year}</td>
                  <td className="text-right num-tabular text-[13.5px] px-4">{fmtNum(row.openingBalance)}</td>
                  <td className="text-right num-tabular text-[13.5px] px-4">{fmtNum(row.principal)}</td>
                  <td className="text-right num-tabular text-[13.5px] px-4">{fmtNum(row.interest)}</td>
                  <td className="text-right num-tabular text-[13.5px] font-semibold px-4">{fmtNum(row.totalEmi)}</td>
                  <td className="text-right num-tabular text-[13.5px] px-4">{fmtNum(row.closingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionPage>
  );
}

// Card rendered inside Business Profile — operational footprint
// (jobs created) plus the headline KPIs, as in the old dashboard.
function EmploymentBlock({ ed }: { ed: any }) {
  const emp = ed?.employmentGeneration;
  const fe = ed?.financialEvaluation;
  const fs = ed?.financialSummary;

  const tiles = [
    { label: "Total Direct", value: emp?.totalDirect, cls: "bg-blue-50 text-blue-700" },
    { label: "Indirect", value: emp?.indirect, cls: "bg-emerald-50 text-emerald-700" },
    { label: "Skilled", value: emp?.skilled, cls: "bg-orange-50 text-orange-700" },
    { label: "Semi-Skilled", value: emp?.semiSkilled, cls: "bg-amber-50 text-amber-700" },
    { label: "Unskilled", value: emp?.unskilled, cls: "bg-slate-100 text-slate-700" },
  ].filter((t) => t.value != null);

  const kpis = [
    { label: "Average DSCR", value: fe?.averageDscr || fs?.averageDscr },
    { label: "IRR", value: fe?.irr },
    { label: "MIRR", value: fe?.mirr },
    { label: "WACC", value: fe?.wacc },
    { label: "NPV", value: fe?.npv },
    { label: "Payback (Simple)", value: fe?.simplePaybackPeriod },
  ].filter((k) => k.value);

  if (tiles.length === 0 && kpis.length === 0) return null;

  return (
    <div className="surface-card rounded-2xl p-7">
      <h3 className="font-display text-[18px] mb-4">Employment Generation</h3>

      {tiles.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {tiles.map((t) => (
            <div key={t.label} className={`rounded-xl p-4 ${t.cls}`}>
              <div className="font-display text-[26px] leading-none num-tabular">{t.value}</div>
              <div className="text-[11px] mt-1.5 font-medium opacity-80">{t.label}</div>
            </div>
          ))}
        </div>
      )}

      {kpis.length > 0 && (
        <>
          <div className="text-eyebrow text-muted-foreground mb-2">Key KPIs</div>
          <div className="divide-y divide-border">
            {kpis.map((k) => (
              <div key={k.label} className="flex justify-between py-2 text-[13.5px]">
                <span className="text-muted-foreground">{k.label}</span>
                <span className="font-semibold text-foreground num-tabular">{k.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// FINANCIAL DASHBOARD — cross-statement synthesis hub
// ═════════════════════════════════════════════════════════
function FinancialDashboardSection({ ed, onJump }: { ed: any; onJump: (id: string) => void }) {
  if (!ed) {
    return (
      <SectionPage>
        <PageHeader eyebrow="At a Glance" title="Financial Dashboard" />
        <EmptyState />
      </SectionPage>
    );
  }

  const pl = ed?.plAccount;
  const ra = ed?.ratioAnalysis;
  const cf = ed?.cashFlow;
  const fe = ed?.financialEvaluation;

  // Latest-year KPIs sourced across statements
  const revArr = pl?.revenue || [];
  const npArr = pl?.netProfit || [];
  const lastIdx = revArr.length - 1;
  const latestRev = lastIdx >= 0 ? revArr[lastIdx] : null;
  const latestNp = lastIdx >= 0 ? npArr[lastIdx] : null;
  const netMargin = latestRev && latestNp != null && latestRev !== 0 ? (latestNp / latestRev) * 100 : null;
  const avgDscr = meanFinite(ra?.dscr || []);
  const avgCurrent = meanFinite(ra?.currentRatio || []);

  const tiles: { label: string; value: string; sub?: string }[] = [
    {
      label: "Latest Year Revenue",
      value: latestRev != null ? fmtRupeesL(latestRev) : "—",
      sub: pl?.years?.[lastIdx] ? `FY ${pl.years[lastIdx]}` : undefined,
    },
    {
      label: "Latest Net Margin",
      value: netMargin != null ? `${netMargin.toFixed(1)}%` : "—",
      sub: latestNp != null ? `${fmtRupeesL(latestNp)} PAT` : undefined,
    },
    {
      label: "Avg DSCR",
      value: avgDscr != null ? `${avgDscr.toFixed(2)}×` : "—",
      sub: avgDscr != null ? (avgDscr >= 1.5 ? "Above benchmark" : avgDscr >= 1.2 ? "Meets minimum" : "Below threshold") : undefined,
    },
    {
      label: "Avg Current Ratio",
      value: avgCurrent != null ? `${avgCurrent.toFixed(2)}×` : "—",
      sub: avgCurrent != null ? (avgCurrent >= 1.5 ? "Comfortable" : avgCurrent >= 1 ? "Adequate" : "Strained") : undefined,
    },
    {
      label: "Project IRR",
      value: fe?.irr || "—",
      sub: fe?.npv ? `NPV ${fe.npv}` : undefined,
    },
    {
      label: "Simple Payback",
      value: fe?.simplePaybackPeriod || "—",
      sub: fe?.discountedPaybackPeriod ? `Discounted: ${fe.discountedPaybackPeriod}` : undefined,
    },
  ];

  const snapshot = insightFinancialSnapshot(ed);

  // Mini sparkline data builders — preserve nulls so missing data
  // creates a gap in the line, not a fabricated zero-inflection.
  const mkSpark = (years?: number[], values?: (number | null)[]) => {
    if (!years || !values) return [];
    return years.map((y, i) => ({ year: y, value: values[i] ?? null }));
  };
  const revSpark = mkSpark(pl?.years, pl?.revenue);
  const npSpark = mkSpark(pl?.years, pl?.netProfit);
  const dscrSpark = mkSpark(ra?.years, ra?.dscr);
  const cashSpark = mkSpark(cf?.years, cf?.netCashFlow);

  const charts: { key: string; label: string; subtitle: string; data: { year: number; value: number | null }[]; color: string; jumpTo: string }[] = [
    { key: "rev", label: "Revenue Trajectory", subtitle: "₹ in Lakhs", data: revSpark, color: NAVY, jumpTo: "pl" },
    { key: "np", label: "Net Profit Trajectory", subtitle: "₹ in Lakhs", data: npSpark, color: GOLD, jumpTo: "pl" },
    { key: "dscr", label: "DSCR Trend", subtitle: "× coverage", data: dscrSpark, color: NAVY_LIGHT, jumpTo: "ratios" },
    { key: "cash", label: "Net Cash Flow", subtitle: "₹ in Lakhs", data: cashSpark, color: "hsl(142 45% 35%)", jumpTo: "cashflow" },
  ].filter((c) => c.data.some((d) => d.value != null));

  return (
    <SectionPage>
      <PageHeader
        eyebrow="At a Glance"
        title="Financial Dashboard"
        description="The banker's one-glance view — signals pulled from every statement, synthesised into a single read."
      />

      {/* AI Snapshot — Layer 1, the claim */}
      {snapshot && (
        <div className="surface-card rounded-2xl p-8 mb-8 border-l-2 border-l-brand">
          <div className="text-eyebrow text-brand mb-2">Financial Snapshot</div>
          <p className="font-display text-[19px] leading-[1.55] text-foreground/90">{snapshot}</p>
        </div>
      )}

      {/* 6 KPI tiles spanning all statements */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {tiles.map((t) => (
          <MetricCard key={t.label} label={t.label} value={t.value} description={t.sub} />
        ))}
      </div>

      {/* 4 mini sparklines — click any to jump to its full statement */}
      {charts.length > 0 && (
        <div>
          <div className="text-eyebrow text-gold mb-4">Cross-Statement Trends</div>
          <h3 className="font-display text-[22px] mb-5">Key Trajectories</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {charts.map((c) => (
              <button
                key={c.key}
                onClick={() => onJump(c.jumpTo)}
                className="surface-card rounded-2xl p-6 text-left hover:border-gold/40 hover:shadow-md transition-all group"
                data-testid={`dashboard-spark-${c.key}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-eyebrow text-muted-foreground mb-1">{c.subtitle}</div>
                    <div className="font-display text-[17px] text-foreground">{c.label}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="h-[110px] -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={c.data} margin={{ top: 6, right: 8, bottom: 4, left: 8 }}>
                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: "hsl(218 15% 50%)" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <RechartsTooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(218 20% 88%)" }}
                        labelStyle={{ fontSize: 11, color: "hsl(218 15% 50%)" }}
                      />
                      <Line type="monotone" dataKey="value" stroke={c.color} strokeWidth={2} dot={{ r: 3, fill: c.color }} activeDot={{ r: 5 }} connectNulls={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </SectionPage>
  );
}

// ═════════════════════════════════════════════════════════
// SHARED HELPERS
// ═════════════════════════════════════════════════════════

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

function EmptyState() {
  return (
    <div className="surface-card rounded-2xl p-16 text-center">
      <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
      <h3 className="font-display text-xl text-foreground mb-1">No Data Available</h3>
      <p className="text-sm text-muted-foreground">The AI could not extract this section from the PDF.</p>
    </div>
  );
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}
