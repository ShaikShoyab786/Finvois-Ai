import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useGetReport, useGetReportSummary } from "@workspace/api-client-react";
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

// Recharts palette
const NAVY = "hsl(218 55% 14%)";
const NAVY_LIGHT = "hsl(218 30% 45%)";
const GOLD = "hsl(38 55% 58%)";
const SLATE = "hsl(218 18% 50%)";
const EMERALD = "hsl(158 55% 40%)";
const ROSE = "hsl(0 60% 50%)";

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid hsl(35 18% 88%)",
  fontSize: 12,
  padding: "8px 12px",
  background: "white",
  boxShadow: "0 4px 12px -2px rgb(10 20 40 / 0.08)",
};

const axisTick = { fill: SLATE, fontSize: 11 };

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
                {ed?.projectCost?.financeBreakdown && ed.projectCost.financeBreakdown.length > 0 && (
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
                          <BarChart data={ed.projectCost.financeBreakdown} layout="vertical" margin={{ left: 8, right: 30, top: 8, bottom: 0 }}>
                            <defs>
                              <linearGradient id="financeFill" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor={NAVY} stopOpacity={0.95} />
                                <stop offset="100%" stopColor={GOLD} stopOpacity={0.85} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid horizontal={false} stroke="hsl(35 18% 88%)" />
                            <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="label" tick={{ fill: NAVY, fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
                            <RechartsTooltip cursor={{ fill: "hsl(35 20% 94%)" }} contentStyle={tooltipStyle} />
                            <Bar dataKey="amount" fill="url(#financeFill)" radius={[0, 6, 6, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ═══════════ BUSINESS PROFILE (incl. Employment) ═══════════ */}
            {activeTab === "profile" && <ProfileSection report={report} ed={ed} />}

            {/* ═══════════ FINANCIAL DASHBOARD — synthesis hub ═══════════ */}
            {activeTab === "dashboard" && <FinancialDashboardSection ed={ed} onJump={setActiveTab} />}

            {/* ═══════════ P&L ═══════════ */}
            {activeTab === "pl" && <PLSection ed={ed} />}

            {/* ═══════════ BALANCE SHEET ═══════════ */}
            {activeTab === "bs" && <BalanceSheetSection ed={ed} />}

            {/* ═══════════ RATIOS ═══════════ */}
            {activeTab === "ratios" && <RatiosSection ed={ed} />}

            {/* ═══════════ CASH FLOW ═══════════ */}
            {activeTab === "cashflow" && <CashFlowSection ed={ed} />}

            {/* ═══════════ LOAN SCHEDULE ═══════════ */}
            {activeTab === "loan" && <LoanSection ed={ed} />}

            {/* ═══════════ FINANCIAL EVALUATION (incl. SWOT) ═══════════ */}
            {activeTab === "eval" && <EvaluationSection ed={ed} />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ═════════════════════════════════════════════════════════

function ProfileSection({ report, ed }: { report: any; ed: any }) {
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Firm card (60%) */}
        <div className="lg:col-span-3 surface-card rounded-2xl p-8 md:p-9">
          <div className="text-eyebrow text-gold mb-4">The Firm</div>
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
        <div className="lg:col-span-2 surface-card rounded-2xl p-7 md:p-8 bg-gradient-to-br from-card to-muted/30">
          <div className="text-eyebrow text-gold mb-5">The Proprietor</div>

          <div className="flex items-start gap-4 mb-7 pb-7 border-b border-border">
            <div className="flex-shrink-0 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-base">
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

      {/* Project cost items, if available */}
      {ed?.projectCost?.items && ed.projectCost.items.length > 0 && (
        <div className="mt-10">
          <div className="text-eyebrow text-gold mb-3">Cost Composition</div>
          <h3 className="font-display text-[22px] mb-5">Project Cost Components</h3>
          <div className="surface-card rounded-2xl p-8">
            <div className="space-y-2.5">
              {ed.projectCost.items.map((it: any, i: number) => (
                <CostRow key={i} label={it.label} amount={it.amount} max={Math.max(...ed.projectCost.items.map((x: any) => x.amount || 0))} />
              ))}
              {ed.projectCost.totalCost && (
                <div className="flex justify-between items-center pt-4 mt-2 border-t border-border">
                  <div className="text-eyebrow text-foreground">Total</div>
                  <div className="font-display text-[20px] text-foreground num-tabular">
                    ₹{ed.projectCost.totalCost.toLocaleString("en-IN")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employment — folded in as the operational footprint of the firm */}
      <div className="mt-10">
        <EmploymentBlock ed={ed} />
      </div>
    </SectionPage>
  );
}

function CostRow({ label, amount, max }: { label: string; amount: number | null; max: number }) {
  const pct = amount && max ? (amount / max) * 100 : 0;
  return (
    <div className="grid grid-cols-12 items-center gap-3 py-1.5">
      <div className="col-span-4 text-[13px] text-foreground/85 truncate">{label}</div>
      <div className="col-span-6 h-[6px] rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-gold rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="col-span-2 text-right text-[13px] num-tabular font-medium text-foreground">
        {amount != null ? `₹${amount.toLocaleString("en-IN")}` : "—"}
      </div>
    </div>
  );
}

function PLSection({ ed }: { ed: any }) {
  const pl = ed?.plAccount;
  if (!pl?.years?.length) return (
    <SectionPage>
      <PageHeader eyebrow="Financials" title="P&L Account" />
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
            <CartesianGrid vertical={false} stroke="hsl(35 18% 90%)" />
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

function BalanceSheetSection({ ed }: { ed: any }) {
  const bs = ed?.balanceSheet;
  if (!bs?.years?.length) return (
    <SectionPage>
      <PageHeader eyebrow="Financials" title="Balance Sheet" />
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

      <ChartFrame
        eyebrow="Capital Structure"
        title="Assets vs Liabilities & Equity"
        description="Stacked composition with assets above the axis and funding sources below."
        chartHeight={400}
        footer={<InsightCaption text={insight} />}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} stackOffset="sign" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(35 18% 90%)" />
            <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => Math.abs(v).toString()} />
            <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => Math.abs(v).toFixed(2)} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" />
            <Bar dataKey="Current Assets" stackId="a" fill={NAVY_LIGHT} radius={[0, 0, 0, 0]} maxBarSize={36} />
            <Bar dataKey="Fixed Assets" stackId="a" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="Current Liab." stackId="b" fill="hsl(38 40% 78%)" radius={[0, 0, 0, 0]} maxBarSize={36} />
            <Bar dataKey="Long-term Liab." stackId="b" fill="hsl(38 50% 65%)" radius={[0, 0, 0, 0]} maxBarSize={36} />
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

function CashFlowSection({ ed }: { ed: any }) {
  const cf = ed?.cashFlow;
  if (!cf?.years?.length) return (
    <SectionPage>
      <PageHeader eyebrow="Financials" title="Cash Flow" />
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

      <ChartFrame
        eyebrow="Cash Movement"
        title="Annual cash flow breakdown"
        description="Composition of cash generated and consumed across activities. The line tracks net cash position."
        chartHeight={400}
        footer={<InsightCaption text={insight} />}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(35 18% 90%)" />
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

function RatiosSection({ ed }: { ed: any }) {
  const ra = ed?.ratioAnalysis;
  if (!ra?.years?.length) return (
    <SectionPage>
      <PageHeader eyebrow="Quality" title="Ratio Analysis" />
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

function EvaluationSection({ ed }: { ed: any }) {
  const fe = ed?.financialEvaluation;
  const sw = ed?.swotAnalysis;
  // Render if EITHER quantitative or qualitative evidence exists —
  // SWOT must remain reachable even when financialEvaluation is missing.
  if (!fe && !sw) return (
    <SectionPage>
      <PageHeader eyebrow="Quality" title="Financial Evaluation" />
      <EmptyState />
    </SectionPage>
  );

  const groups = fe ? [
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
  ] : [];

  return (
    <SectionPage>
      <PageHeader eyebrow="Quality" title="Financial Evaluation" description="Returns, payback and risk metrics determining whether this project clears the bar." />

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

        {/* SWOT — folded in as the qualitative companion to the quantitative verdict */}
        <SwotBlock ed={ed} />
      </div>
    </SectionPage>
  );
}

// Sub-block rendered inside Financial Evaluation as the qualitative
// companion to the quantitative verdict. Not a standalone section.
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
      <div className="text-eyebrow text-gold mb-4">Qualitative Verdict</div>
      <h3 className="font-display text-[22px] mb-2">SWOT Analysis</h3>
      <p className="text-[13.5px] text-muted-foreground mb-5 max-w-2xl">
        The qualitative companion to the financial evaluation — internal capabilities mapped against external forces.
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

function LoanSection({ ed }: { ed: any }) {
  const loan = ed?.loanSchedule;
  if (!loan?.schedule?.length) return (
    <SectionPage>
      <PageHeader eyebrow="Operations" title="Loan Schedule" />
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
            <CartesianGrid vertical={false} stroke="hsl(35 18% 90%)" />
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
              <tr className="bg-muted/40">
                <th className="text-eyebrow text-muted-foreground py-3 px-4 text-left">Year</th>
                <th className="text-eyebrow text-muted-foreground text-right px-4">Opening</th>
                <th className="text-eyebrow text-muted-foreground text-right px-4">Principal</th>
                <th className="text-eyebrow text-muted-foreground text-right px-4">Interest</th>
                <th className="text-eyebrow text-muted-foreground text-right px-4">Total EMI</th>
                <th className="text-eyebrow text-muted-foreground text-right px-4">Closing</th>
              </tr>
            </thead>
            <tbody>
              {loan.schedule.map((row: any, i: number) => (
                <tr key={i} className="border-t border-border">
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

// Sub-block rendered inside Business Profile — operational footprint
// (jobs created) as a descriptor of the firm, not a separate section.
function EmploymentBlock({ ed }: { ed: any }) {
  const emp = ed?.employmentGeneration;
  if (!emp) return null;

  const total = (emp.totalDirect || 0) + (emp.indirect || 0);
  const segments = [
    { label: "Skilled", value: emp.skilled || 0, color: NAVY },
    { label: "Semi-Skilled", value: emp.semiSkilled || 0, color: NAVY_LIGHT },
    { label: "Unskilled", value: emp.unskilled || 0, color: "hsl(218 25% 70%)" },
    { label: "Indirect", value: emp.indirect || 0, color: GOLD },
  ].filter((s) => s.value > 0);
  const segmentTotal = segments.reduce((a, b) => a + b.value, 0) || 1;

  if (total === 0 && segments.length === 0) return null;

  return (
    <div>
      <div className="text-eyebrow text-gold mb-3">Operational Footprint</div>
      <h3 className="font-display text-[22px] mb-5">Employment Generation</h3>
      <div className="surface-card rounded-2xl p-8 grid lg:grid-cols-5 gap-8 items-center">
        <div className="lg:col-span-2 text-center lg:text-left">
          <div className="text-eyebrow text-muted-foreground mb-2">Total Jobs Created</div>
          <div className="font-display text-[56px] leading-none text-foreground num-tabular">{total || "—"}</div>
          <div className="text-[13px] text-muted-foreground mt-3">
            {emp.totalDirect ? `${emp.totalDirect} direct` : ""}
            {emp.totalDirect && emp.indirect ? " · " : ""}
            {emp.indirect ? `${emp.indirect} indirect` : ""}
          </div>
        </div>
        {segments.length > 0 && (
          <div className="lg:col-span-3">
            <div className="flex h-3 rounded-full overflow-hidden">
              {segments.map((s) => (
                <div
                  key={s.label}
                  style={{ width: `${(s.value / segmentTotal) * 100}%`, backgroundColor: s.color }}
                  title={`${s.label}: ${s.value}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
              {segments.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-[12px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-semibold text-foreground num-tabular">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
        <div className="surface-card rounded-2xl p-8 mb-8 border-l-2 border-l-gold">
          <div className="text-eyebrow text-gold mb-2">Financial Snapshot</div>
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
