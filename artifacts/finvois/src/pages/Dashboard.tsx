import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useGetReport, useGetReportSummary, useGetReportVerdicts } from "@workspace/api-client-react";
import type { UseQueryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, User, MapPin, Phone, IdCard, Zap, CalendarDays, Briefcase, GraduationCap, Coins, Landmark, TrendingUp, TrendingDown, CheckCircle2, Clock, Target, BarChart3, Activity, Scale, Shield } from "lucide-react";
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
  ReferenceLine,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DscrAmortizationChart } from "@/components/report/DscrAmortizationChart";
import { SectionVerdict } from "@/components/report/SectionVerdict";
import { ThresholdGauge, parseNumeric } from "@/components/report/ThresholdGauge";
import {
  insightPL,
  insightBalanceSheet,
  insightRatios,
  insightLoan,
  meanFinite,
  insightFinancialSnapshot,
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
      { id: "leverage", label: "Leverage Ratios" },
      { id: "cashflow", label: "Cash Flow" },
      { id: "loan", label: "Loan Schedule" },
      { id: "eval", label: "Financial Evaluation" },
      { id: "altman", label: "Altman Z-Score" },
      { id: "bep", label: "BEP & Sensitivity" },
      { id: "mpbf", label: "MPBF Assessment" },
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

// projectCost / financeBreakdown figures are extracted already in lakhs, so
// render them with the ₹X.XXL convention (null-safe) to match the DPR.
const fmtLac = (n: number | null | undefined): string =>
  n == null ? "—" : `₹${Number(n).toFixed(2)}L`;

// P&L / cash-flow / balance line items are extracted in raw rupees, while
// project-cost figures arrive already in lakhs. Auto-detect the scale per
// chart (by its largest magnitude) so the axis always reads in lakhs (₹L),
// regardless of which unit a given report happens to use.
const lakhFormatter = (maxAbs: number) => {
  const inRupees = maxAbs >= 1000;
  return (v: number): string => {
    const lk = inRupees ? v / 1e5 : v;
    return `${Math.abs(lk) >= 100 ? Math.round(lk) : +lk.toFixed(1)}L`;
  };
};

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid hsl(220 16% 90%)",
  fontSize: 12,
  padding: "8px 12px",
  background: "white",
  boxShadow: "0 4px 12px -2px rgb(15 23 42 / 0.08)",
};

const axisTick = { fill: SLATE, fontSize: 11 };

// ─── Shared helpers for DSCR / Altman / BEP / MPBF sections ──────────
// Shorten DPR fiscal-period labels: "2025-26 Sep to Mar" -> "2025-26*".
const shortYear = (y: string): string => {
  const m = /(\d{4}-\d{2})/.exec(y || "");
  if (!m) return y || "—";
  return /sep|oct|nov|to|month/i.test(y) ? `${m[1]}*` : m[1];
};
// Rupees -> "₹X.XXL" (lakhs) for KPI tiles.
const toL = (n: number | null | undefined): string =>
  n == null || !isFinite(n) ? "—" : `₹${(n / 1e5).toFixed(2)}L`;
// Rupees with Indian grouping, no decimals.
const rupee = (n: number | null | undefined): string =>
  n == null || !isFinite(n) ? "—" : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));
const fmt2 = (n: number | null | undefined): string =>
  n == null || !isFinite(n) ? "—" : n.toFixed(2);
const fmtPct = (n: number | null | undefined): string =>
  n == null || !isFinite(n) ? "—" : `${n.toFixed(2)}%`;
const sumFinite = (a: (number | null | undefined)[]): number =>
  (a || []).reduce<number>((s, x) => (x != null && isFinite(x) ? s + x : s), 0);
// ₹-Lacs axis tick formatter (values already divided by 1e5).
const fmtAxisL = (v: number): string => `${Math.abs(v) >= 10 ? Math.round(v) : +Number(v).toFixed(1)}L`;
type Zone = "distress" | "grey" | "safe";
const altmanZone = (z: number): Zone => (z < 1.81 ? "distress" : z < 2.99 ? "grey" : "safe");

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
            {activeTab === "dashboard" && <FinancialDashboardSection ed={ed} />}

            {/* ═══════════ P&L ═══════════ */}
            {activeTab === "pl" && <PLSection ed={ed} verdict={v?.pl} isLoadingVerdict={isLoadingVerdicts} />}

            {/* ═══════════ BALANCE SHEET ═══════════ */}
            {activeTab === "bs" && <BalanceSheetSection ed={ed} verdict={v?.balanceSheet} isLoadingVerdict={isLoadingVerdicts} />}

            {/* ═══════════ RATIOS ═══════════ */}
            {activeTab === "ratios" && <RatiosSection ed={ed} verdict={v?.ratios} isLoadingVerdict={isLoadingVerdicts} />}

            {/* ═══════════ LEVERAGE RATIOS & DEPRECIATION ═══════════ */}
            {activeTab === "leverage" && <LeverageSection ed={ed} />}

            {/* ═══════════ CASH FLOW ═══════════ */}
            {activeTab === "cashflow" && <CashFlowSection ed={ed} verdict={v?.cashFlow} isLoadingVerdict={isLoadingVerdicts} />}

            {/* ═══════════ LOAN SCHEDULE ═══════════ */}
            {activeTab === "loan" && <LoanSection ed={ed} verdict={v?.loan} isLoadingVerdict={isLoadingVerdicts} />}

            {/* ═══════════ FINANCIAL EVALUATION ═══════════ */}
            {activeTab === "eval" && <EvaluationSection ed={ed} verdict={v?.evaluation} isLoadingVerdict={isLoadingVerdicts} />}
            {activeTab === "altman" && <AltmanSection ed={ed} />}
            {activeTab === "bep" && <BreakEvenSection ed={ed} />}
            {activeTab === "mpbf" && <MpbfSection ed={ed} />}
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
                <span className="font-semibold text-brand num-tabular">{fmtLac(it.amount)}</span>
              </div>
            ))}
            {pc?.totalCost != null && (
              <div className="flex justify-between items-baseline pt-2.5 mt-1.5 border-t border-border">
                <span className="font-semibold text-foreground">Total Project Cost</span>
                <span className="font-bold text-brand num-tabular">{fmtLac(pc.totalCost)}</span>
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
                <span className="font-semibold text-emerald-600 num-tabular">{fmtLac(f.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between items-baseline pt-2.5 mt-1.5 border-t border-border">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-emerald-700 num-tabular">{fmtLac(financeTotal)}</span>
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
            <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: any) => fmtLac(v as number)} />
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

// Light sky tone for the third expense-breakdown segment.
const SKY = "hsl(199 89% 70%)";

// Indian-grouped rupee formatter for the detailed P&L statement & schedules.
const fmtRsFull = (n: number): string =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

type PLRowKind = "header" | "subheader" | "normal" | "sub" | "strong" | "total" | "grand";
interface PLRow {
  label: string;
  values?: (number | null)[];
  kind: PLRowKind;
}

/**
 * Detailed Projected P&L statement table — supports section-header rows,
 * indented sub-rows, subtotal tiers and highlighted grand-total rows. Mirrors
 * the classic DPR P&L layout (COGS → Gross Profit → Operating Exp → EBDIT →
 * EBIT → Interest → EBT).
 */
function PLStatementTable({ years, rows }: { years: string[]; rows: PLRow[] }) {
  const span = years.length + 1;
  return (
    <div className="surface-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary border-0">
              <TableHead className="text-eyebrow text-white/85 py-3.5 sticky left-0 bg-primary z-10">Particulars</TableHead>
              {years.map((y) => (
                <TableHead key={y} className="text-eyebrow text-white/85 text-right num-tabular">{y}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, ri) => {
              if (row.kind === "header") {
                return (
                  <TableRow key={`${row.label}-${ri}`} className="border-border bg-muted/60 hover:bg-muted/60">
                    <TableCell colSpan={span} className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground py-2 sticky left-0 bg-muted/60 z-10">
                      {row.label}
                    </TableCell>
                  </TableRow>
                );
              }
              if (row.kind === "subheader") {
                return (
                  <TableRow key={`${row.label}-${ri}`} className="border-border bg-card hover:bg-card">
                    <TableCell colSpan={span} className="text-[12px] italic text-muted-foreground/75 py-1.5 pl-4 sticky left-0 bg-card z-10">
                      {row.label}
                    </TableCell>
                  </TableRow>
                );
              }
              const total = row.kind === "total";
              const grand = row.kind === "grand";
              const strong = row.kind === "strong";
              const sub = row.kind === "sub";
              const rowBg = grand ? "bg-primary/[0.08]" : total ? "bg-brand/[0.06]" : ri % 2 === 1 ? "bg-muted/40" : "bg-card";
              const labelWeight = grand ? "font-bold text-foreground" : total || strong ? "font-semibold text-foreground" : sub ? "text-muted-foreground/80" : "text-muted-foreground";
              const valWeight = grand ? "font-bold text-foreground" : total || strong ? "font-semibold text-foreground" : "text-foreground/85";
              return (
                <TableRow key={`${row.label}-${ri}`} className={`border-border ${rowBg} hover:${rowBg}`}>
                  <TableCell className={`text-[13px] sticky left-0 z-10 ${rowBg} ${labelWeight} ${sub ? "pl-8" : ""}`}>
                    {row.label}
                  </TableCell>
                  {years.map((_, i) => {
                    const v = row.values?.[i];
                    return (
                      <TableCell key={i} className={`text-right num-tabular text-[13.5px] ${valWeight}`}>
                        {typeof v === "number" && isFinite(v) ? fmtRsFull(v) : "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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

  const years: string[] = pl.years;
  const at = (a: any, i: number): number | null => {
    const v = a?.[i];
    return typeof v === "number" && isFinite(v) ? v : null;
  };
  const has = (a: any): boolean => Array.isArray(a) && a.some((v: any) => typeof v === "number" && isFinite(v));

  // Profit tiers — prefer extracted values, fall back to identities only when
  // the constituent inputs exist (never fabricate from thin air).
  const ebditArr = years.map((_, i) => {
    const v = at(pl.ebdit, i);
    if (v != null) return v;
    const gp = at(pl.grossProfit, i), ex = at(pl.expenses, i);
    return gp != null && ex != null ? gp - ex : null;
  });
  const ebitArr = years.map((_, i) => {
    const v = at(pl.ebit, i);
    if (v != null) return v;
    const dep = at(pl.depreciation, i);
    // Only derive when both inputs are present — never assume depreciation = 0.
    return ebditArr[i] != null && dep != null ? ebditArr[i]! - dep : null;
  });
  const ebtArr = years.map((_, i) => {
    const v = at(pl.ebt, i);
    if (v != null) return v;
    const intr = at(pl.interest, i);
    if (ebitArr[i] != null && intr != null) return ebitArr[i]! - intr;
    // Last resort: this extraction schema carries no tax line, so netProfit is
    // the pre-tax bottom line (== EBT). Used only when EBT can't be derived.
    return at(pl.netProfit, i);
  });

  // ── Chart 1: Revenue vs Profit Levels (grouped bars) ──
  const profitLevels = years.map((y, i) => ({
    year: y,
    Revenue: at(pl.revenue, i),
    "Gross Profit": at(pl.grossProfit, i),
    EBDIT: ebditArr[i],
    EBT: ebtArr[i],
  }));
  const hasProfitLevels = profitLevels.some((d) => d.Revenue != null || d["Gross Profit"] != null || d.EBDIT != null || d.EBT != null);
  const profitMax = Math.max(0, ...profitLevels.flatMap((d) => [d.Revenue, d["Gross Profit"], d.EBDIT, d.EBT].map((x) => (x == null ? 0 : Math.abs(x)))));
  const fmtProfitL = lakhFormatter(profitMax);

  // ── Chart 2: Expense Breakdown (stacked bars) ──
  const expenseBreak = years.map((y, i) => ({
    year: y,
    Salaries: at(pl.salaries, i),
    "Other Exp": at(pl.otherExpenses, i),
    Misc: at(pl.miscExpenses, i),
    Depreciation: at(pl.depreciation, i),
    Interest: at(pl.interest, i),
  }));
  const hasExpenseBreak = expenseBreak.some((d) => [d.Salaries, d["Other Exp"], d.Misc, d.Depreciation, d.Interest].some((x) => x != null));
  const expMax = Math.max(0, ...expenseBreak.map((d) => [d.Salaries, d["Other Exp"], d.Misc, d.Depreciation, d.Interest].reduce<number>((s, x) => s + (x || 0), 0)));
  const fmtExpL = lakhFormatter(expMax);

  // ── Detailed P&L statement rows (only what exists) ──
  const rows: PLRow[] = [];
  if (has(pl.revenue)) rows.push({ label: "Gross Revenue", values: pl.revenue, kind: "grand" });

  const cogsRows = [
    { label: "Opening Stock", arr: pl.openingStock, kind: "normal" as PLRowKind },
    { label: "Direct Material / Expenses", arr: pl.directMaterial, kind: "normal" as PLRowKind },
    { label: "(−) Closing Stock", arr: pl.closingStock, kind: "normal" as PLRowKind },
    { label: "Cost of Goods Sold", arr: pl.costOfGoodsSold, kind: "strong" as PLRowKind },
  ].filter((r) => has(r.arr));
  if (cogsRows.length) {
    rows.push({ label: "Cost of Goods Sold / Direct Costs", kind: "header" });
    cogsRows.forEach((r) => rows.push({ label: r.label, values: r.arr, kind: r.kind }));
  }

  if (has(pl.grossProfit)) rows.push({ label: "Gross Profit", values: pl.grossProfit, kind: "total" });

  const opSubRows = [
    { label: "Salaries & Wages", arr: pl.salaries },
    { label: "Other Expenses", arr: pl.otherExpenses },
    { label: "Misc. Expenses", arr: pl.miscExpenses },
  ].filter((r) => has(r.arr));
  let adminArr: (number | null)[] | null = null;
  let adminLabel = "";
  if (has(pl.adminSellingExpenses)) {
    adminArr = pl.adminSellingExpenses;
    adminLabel = "Admin & Selling Expenses";
  } else if (has(pl.expenses)) {
    adminArr = pl.expenses;
    adminLabel = "Total Operating Expenses";
  }
  if (opSubRows.length || adminArr) {
    rows.push({ label: "Operating Expenses", kind: "header" });
    if (adminArr) rows.push({ label: adminLabel, values: adminArr, kind: "strong" });
    opSubRows.forEach((r) => rows.push({ label: r.label, values: r.arr, kind: "sub" }));
  }

  if (ebditArr.some((x) => x != null)) rows.push({ label: "EBDIT", values: ebditArr, kind: "total" });
  if (has(pl.depreciation)) rows.push({ label: "(−) Depreciation", values: pl.depreciation, kind: "normal" });
  if (ebitArr.some((x) => x != null)) rows.push({ label: "EBIT", values: ebitArr, kind: "total" });

  const hasIntSplit = has(pl.interestTermLoan) || has(pl.interestCCLoan);
  if (has(pl.interestTermLoan)) rows.push({ label: "(−) Interest — Term Loan", values: pl.interestTermLoan, kind: "normal" });
  if (has(pl.interestCCLoan)) rows.push({ label: "(−) Interest — CC Loan", values: pl.interestCCLoan, kind: "normal" });
  if (has(pl.interest)) rows.push({ label: hasIntSplit ? "Total Interest" : "(−) Interest", values: pl.interest, kind: hasIntSplit ? "strong" : "normal" });

  if (ebtArr.some((x) => x != null)) rows.push({ label: "Earnings Before Tax (EBT)", values: ebtArr, kind: "grand" });

  // ── Schedule 1: Admin & Selling Expenses ──
  const sched1: { label: string; values: (number | null)[]; emphasis?: boolean }[] = [
    { label: "Salaries & Wages", arr: pl.salaries },
    { label: "Other Expenses", arr: pl.otherExpenses },
    { label: "Processing Fees", arr: pl.processingFees },
    { label: "Misc. Expenses", arr: pl.miscExpenses },
  ].filter((r) => has(r.arr)).map((r) => ({ label: r.label, values: r.arr }));
  if (has(pl.adminSellingExpenses)) sched1.push({ label: "Total Admin & Selling Expenses", values: pl.adminSellingExpenses, emphasis: true });
  const hasSched1 = sched1.length > 0;

  // ── Schedule 2: Interest Statement ──
  const rate = typeof ed?.loanSchedule?.interestRate === "string" ? ed.loanSchedule.interestRate : null;
  const rateSuffix = rate ? ` @ ${rate}` : "";
  const sched2: { label: string; values: (number | null)[]; emphasis?: boolean }[] = [];
  if (has(pl.interestTermLoan)) sched2.push({ label: `Interest on Term Loan${rateSuffix}`, values: pl.interestTermLoan });
  if (has(pl.interestCCLoan)) sched2.push({ label: `Interest on CC Loan${rateSuffix}`, values: pl.interestCCLoan });
  if (has(pl.interest)) sched2.push({ label: "Total Interest", values: pl.interest, emphasis: true });
  const hasSched2 = sched2.length > 0;

  const fyRange = years.length === 1 ? years[0] : `${years[0]} to ${years[years.length - 1]}`;

  return (
    <SectionPage>
      <PageHeader eyebrow="Financials" title="P&L Account" description={`Projected P&L — ${fyRange} (₹ in Rupees)`} />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />

      {(hasProfitLevels || hasExpenseBreak) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {hasProfitLevels && (
            <DashCard title="Revenue vs Profit Levels" subtitle="Revenue against profit tiers (₹ in Lakhs)">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitLevels} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtProfitL} width={48} />
                    <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(221 83% 53% / 0.05)" }} formatter={(val: any) => fmtINR(Number(val))} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Bar dataKey="Revenue" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="Gross Profit" fill={EMERALD} radius={[4, 4, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="EBDIT" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="EBT" fill={PURPLE} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}

          {hasExpenseBreak && (
            <DashCard title="Expense Breakdown" subtitle="Cost composition by category (₹ in Lakhs)">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseBreak} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtExpL} width={48} />
                    <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(221 83% 53% / 0.05)" }} formatter={(val: any) => fmtINR(Number(val))} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Bar dataKey="Salaries" stackId="exp" fill={NAVY} maxBarSize={40} />
                    <Bar dataKey="Other Exp" stackId="exp" fill={NAVY_LIGHT} maxBarSize={40} />
                    <Bar dataKey="Misc" stackId="exp" fill={SKY} maxBarSize={40} />
                    <Bar dataKey="Depreciation" stackId="exp" fill={GOLD} maxBarSize={40} />
                    <Bar dataKey="Interest" stackId="exp" fill={ROSE} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mb-3">
          <h3 className="font-display text-[18px] mb-3">Projected Profit &amp; Loss Statement</h3>
          <PLStatementTable years={years} rows={rows} />
          <p className="text-[12px] text-muted-foreground mt-2">{insightPL(pl)}</p>
          {typeof pl.periodNote === "string" && pl.periodNote.trim() && (
            <p className="text-[11.5px] text-muted-foreground/80 mt-1">* {pl.periodNote}</p>
          )}
        </div>
      )}

      {hasSched1 && (
        <div className="mt-8">
          <h3 className="font-display text-[18px] mb-1">Schedule 1 — Administrative &amp; Selling Expenses</h3>
          <p className="text-[12.5px] text-muted-foreground mb-4">Breakdown of operating overheads (₹ in Rupees)</p>
          <DataTable years={years} rows={sched1} format={fmtRsFull} />
        </div>
      )}

      {hasSched2 && (
        <div className="mt-8">
          <h3 className="font-display text-[18px] mb-1">Schedule 2 — Interest Statement</h3>
          <p className="text-[12.5px] text-muted-foreground mb-4">Interest on borrowings by facility (₹ in Rupees)</p>
          <DataTable years={years} rows={sched2} format={fmtRsFull} />
        </div>
      )}
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

  const years: string[] = bs.years;
  const at = (a: any, i: number): number | null => {
    const v = a?.[i];
    return typeof v === "number" && isFinite(v) ? v : null;
  };
  const has = (a: any): boolean => Array.isArray(a) && a.some((v: any) => typeof v === "number" && isFinite(v));
  const sumRows = (...arrs: any[]): (number | null)[] =>
    years.map((_, i) => {
      let any = false;
      let s = 0;
      for (const a of arrs) {
        const v = at(a, i);
        if (v != null) { any = true; s += v; }
      }
      return any ? s : null;
    });

  // Prefer explicit extracted lines, fall back to legacy equivalents — never fabricate.
  const netCapital = has(bs.netCapital) ? bs.netCapital : bs.equity;
  const termLoans = has(bs.termLoans) ? bs.termLoans : bs.longTermLiabilities;
  const totalFunds = has(bs.totalFunds) ? bs.totalFunds : sumRows(netCapital, termLoans, bs.currentLiabilities);
  const totalAssets = has(bs.totalAssets) ? bs.totalAssets : sumRows(bs.fixedAssets, bs.currentAssets);
  const netWorkingCapital = has(bs.netWorkingCapital)
    ? bs.netWorkingCapital
    : years.map((_, i) => {
        const ca = at(bs.currentAssets, i), cl = at(bs.currentLiabilities, i);
        return ca != null && cl != null ? ca - cl : null;
      });

  // ── Chart 1: Sources vs Application of Funds (₹ in Lakhs) ──
  const svaData = years.map((y, i) => ({
    year: y,
    "Net Capital": at(netCapital, i),
    "Current Assets": at(bs.currentAssets, i),
    "Fixed Assets": at(bs.fixedAssets, i),
    "Term Loans": at(termLoans, i),
  }));
  const hasSva = svaData.some((d) => d["Net Capital"] != null || d["Current Assets"] != null || d["Fixed Assets"] != null || d["Term Loans"] != null);
  const svaMax = Math.max(0, ...svaData.flatMap((d) => [d["Net Capital"], d["Current Assets"], d["Fixed Assets"], d["Term Loans"]].map((x) => (x == null ? 0 : Math.abs(x)))));
  const fmtSvaL = lakhFormatter(svaMax);

  // ── Chart 2: Current Assets Composition (stacked, ₹ in Lakhs) ──
  const caComp = years.map((y, i) => ({
    year: y,
    Stock: at(bs.closingStock, i),
    Debtors: at(bs.receivables, i),
    Cash: at(bs.cashEquivalents, i),
  }));
  const hasCaComp = caComp.some((d) => d.Stock != null || d.Debtors != null || d.Cash != null);
  const caMax = Math.max(0, ...caComp.map((d) => [d.Stock, d.Debtors, d.Cash].reduce<number>((s, x) => s + (x || 0), 0)));
  const fmtCaL = lakhFormatter(caMax);

  // ── Detailed Projected Balance Sheet rows (only what exists) ──
  const rows: PLRow[] = [];
  if (has(netCapital) || has(termLoans) || has(bs.currentLiabilities) || has(bs.workingCapitalLoan) || has(bs.shortTermLoan)) {
    rows.push({ label: "Sources of Funds", kind: "header" });
    if (has(netCapital)) rows.push({ label: "Net Capital (Opening + Net Profit − Drawings)", values: netCapital, kind: "strong" });
    if (has(termLoans)) rows.push({ label: "Term Loans", values: termLoans, kind: "normal" });
    const clSub = [
      { label: "Working Capital Loan", arr: bs.workingCapitalLoan },
      { label: "Short Term Loan", arr: bs.shortTermLoan },
    ].filter((r) => has(r.arr));
    if (clSub.length) {
      rows.push({ label: "Current Liabilities", kind: "subheader" });
      clSub.forEach((r) => rows.push({ label: r.label, values: r.arr, kind: "sub" }));
    } else if (has(bs.currentLiabilities)) {
      rows.push({ label: "Current Liabilities", values: bs.currentLiabilities, kind: "normal" });
    }
    if (has(totalFunds)) rows.push({ label: "Total Funds", values: totalFunds, kind: "total" });
  }
  if (has(bs.fixedAssets) || has(bs.currentAssets) || has(bs.closingStock) || has(bs.receivables) || has(bs.cashEquivalents)) {
    rows.push({ label: "Application of Funds", kind: "header" });
    if (has(bs.fixedAssets)) rows.push({ label: "Fixed Assets (WDV)", values: bs.fixedAssets, kind: "strong" });
    const caSub = [
      { label: "Closing Stock", arr: bs.closingStock },
      { label: "Receivables / Debtors", arr: bs.receivables },
      { label: "Cash & Cash Equivalents", arr: bs.cashEquivalents },
    ].filter((r) => has(r.arr));
    if (caSub.length) {
      rows.push({ label: "Current Assets", kind: "subheader" });
      caSub.forEach((r) => rows.push({ label: r.label, values: r.arr, kind: "sub" }));
    } else if (has(bs.currentAssets)) {
      rows.push({ label: "Current Assets", values: bs.currentAssets, kind: "normal" });
    }
    if (has(totalAssets)) rows.push({ label: "Total Assets", values: totalAssets, kind: "total" });
    if (has(netWorkingCapital)) rows.push({ label: "Net Working Capital", values: netWorkingCapital, kind: "strong" });
  }

  // ── Derived headline metric cards (render each only when its data exists) ──
  const fy = (y: string) => `FY${y}`;
  const shortFy = (y: string) => {
    const m = y.match(/-(\d{2,4})$/);
    return m ? `FY${m[1].slice(-2)}` : y;
  };
  const fpi = years.length > 1 ? 1 : 0; // first full projected year (year 0 may be a partial stub)
  const lpi = years.length - 1;
  const cards: { value: string; label: string; sub: string; bg: string; val: string }[] = [];
  const ncFp = at(netCapital, fpi);
  if (ncFp != null) cards.push({ value: fmtRupeesL(ncFp / 1e5), label: `Net Capital (${shortFy(years[fpi])})`, sub: "Equity buildup", bg: "bg-emerald-50 border-emerald-200", val: "text-emerald-700" });
  const ncLp = at(netCapital, lpi);
  if (ncLp != null && lpi !== fpi) cards.push({ value: fmtRupeesL(ncLp / 1e5), label: `Net Capital (${shortFy(years[lpi])})`, sub: `${years.length}-yr growth`, bg: "bg-emerald-50 border-emerald-200", val: "text-emerald-700" });
  const nwcFp = at(netWorkingCapital, fpi);
  if (nwcFp != null) cards.push({ value: fmtRupeesL(nwcFp / 1e5), label: `Net Working Cap (${shortFy(years[fpi])})`, sub: "Liquidity position", bg: "bg-blue-50 border-blue-200", val: "text-blue-700" });
  // Term loan fully repaid: first year the balance hits zero after having been positive.
  if (has(termLoans)) {
    let repaidIdx = -1;
    let sawPositive = false;
    for (let i = 0; i < years.length; i++) {
      const v = at(termLoans, i);
      if (v != null && v > 0) sawPositive = true;
      if (sawPositive && v === 0) { repaidIdx = i; break; }
    }
    if (repaidIdx >= 0) cards.push({ value: fy(years[repaidIdx]), label: "Loan Fully Repaid", sub: "Term loan cleared", bg: "bg-purple-50 border-purple-200", val: "text-purple-700" });
  }

  const fyRange = years.length === 1 ? fy(years[0]) : `${fy(years[0])} to ${fy(years[lpi])}`;
  const insight = insightBalanceSheet(bs);

  return (
    <SectionPage>
      <PageHeader eyebrow="Financials" title="Balance Sheet" description={`Projected Balance Sheet — ${fyRange} (₹)`} />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />

      {(hasSva || hasCaComp) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {hasSva && (
            <DashCard title="Sources vs Application of Funds" subtitle="Capital deployment over time (₹ in Lakhs)">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={svaData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <defs>
                      <linearGradient id="bsNetCapFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={EMERALD} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtSvaL} width={48} />
                    <RechartsTooltip contentStyle={tooltipStyle} cursor={{ stroke: "hsl(221 83% 53% / 0.2)" }} formatter={(val: any) => fmtINR(Number(val))} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
                    <Area type="monotone" dataKey="Net Capital" stroke={EMERALD} strokeWidth={2.5} fill="url(#bsNetCapFill)" dot={false} connectNulls />
                    <Line type="monotone" dataKey="Current Assets" stroke={NAVY} strokeWidth={2.5} dot={false} connectNulls />
                    <Line type="monotone" dataKey="Fixed Assets" stroke={GOLD} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
                    <Line type="monotone" dataKey="Term Loans" stroke={ROSE} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}

          {hasCaComp && (
            <DashCard title="Current Assets Composition" subtitle="Stock, debtors & cash (₹ in Lakhs)">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={caComp} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtCaL} width={48} />
                    <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(221 83% 53% / 0.05)" }} formatter={(val: any) => fmtINR(Number(val))} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Bar dataKey="Stock" stackId="ca" fill={GOLD} maxBarSize={40} />
                    <Bar dataKey="Debtors" stackId="ca" fill={NAVY} maxBarSize={40} />
                    <Bar dataKey="Cash" stackId="ca" fill={EMERALD} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mb-3">
          <h3 className="font-display text-[18px] mb-3">Projected Balance Sheet</h3>
          <PLStatementTable years={years} rows={rows} />
          {insight && <p className="text-[12px] text-muted-foreground mt-2">{insight}</p>}
          {typeof bs.periodNote === "string" && bs.periodNote.trim() && (
            <p className="text-[11.5px] text-muted-foreground/80 mt-1">* {bs.periodNote}</p>
          )}
        </div>
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {cards.map((c, i) => (
            <div key={i} className={`rounded-2xl border p-5 ${c.bg}`}>
              <div className={`font-display text-[24px] leading-tight num-tabular tracking-tight ${c.val}`}>{c.value}</div>
              <div className="text-[13px] font-medium text-foreground mt-1">{c.label}</div>
              <div className="text-[11.5px] text-muted-foreground mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>
      )}
    </SectionPage>
  );
}

function CashFlowSection({ ed, verdict, isLoadingVerdict }: { ed: any; verdict?: string | null; isLoadingVerdict?: boolean }) {
  const cf = ed?.cashFlow;
  if (!cf?.years?.length) return (
    <SectionPage>
      <PageHeader eyebrow="Financials" title="Projected Cash Flow Statement" />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />
      <EmptyState />
    </SectionPage>
  );

  const years: string[] = cf.years;
  const n = years.length;
  const num = (v: any): number | null => (typeof v === "number" && isFinite(v) ? v : null);
  const has = (a: any): boolean => Array.isArray(a) && a.some((v: any) => num(v) != null);
  const at = (a: any, i: number): number | null => num(a?.[i]);
  const sum = (a: any): number | null => {
    if (!Array.isArray(a)) return null;
    let s = 0, any = false;
    for (const v of a) { const x = num(v); if (x != null) { s += x; any = true; } }
    return any ? s : null;
  };
  const lastFinite = (a: any): number | null => {
    if (!Array.isArray(a)) return null;
    for (let i = a.length - 1; i >= 0; i--) { const x = num(a[i]); if (x != null) return x; }
    return null;
  };
  const shortFy = (y: string) => {
    const m = y.match(/(\d{2,4})$/);
    return m ? `FY${m[1].slice(-2)}` : y;
  };

  // Figures arrive in raw rupees (e.g. 1307440) or, rarely, already in lakhs.
  // Auto-detect by magnitude so every chart/card reads in lakhs (₹L).
  const allNums: number[] = [
    cf.profitBeforeInterestTax, cf.depreciation, cf.increaseInTermLoan, cf.increaseInWcLoan,
    cf.increaseInCapital, cf.increaseInCapitalDuringYear, cf.totalInflows, cf.capitalExpenditure,
    cf.termLoanInterest, cf.ccLoanInterest, cf.termLoanRepayment, cf.increaseInReceivables,
    cf.increaseInStock, cf.totalOutflows, cf.grossSurplus, cf.drawings, cf.openingBalance,
    cf.closingBalance, cf.netCashFlow,
  ]
    .flatMap((a: any) => (Array.isArray(a) ? a : []))
    .map((v: any) => num(v))
    .filter((v): v is number => v != null)
    .map((v) => Math.abs(v));
  const scale = allNums.length && Math.max(...allNums) >= 1000 ? 1e5 : 1;
  const toL = (v: number | null): number | null => (v == null ? null : v / scale);

  // ── Inflows / Outflows / surplus series (grossSurplus may be carried in
  //    netCashFlow for older reports — fall back so cards/charts still render).
  const grossSurplus = has(cf.grossSurplus) ? cf.grossSurplus : cf.netCashFlow;

  // ── Headline stat cards ──
  const totalIn = sum(cf.totalInflows);
  const totalOut = sum(cf.totalOutflows);
  const grossTotal = sum(grossSurplus);
  const drawTotal = sum(cf.drawings) ?? 0;
  const netSurplus = grossTotal == null ? null : grossTotal - drawTotal;
  const closingCash = lastFinite(cf.closingBalance);
  const cards = [
    { value: toL(totalIn), label: "Total Cash Inflows", sub: `${n} year window`, bg: "bg-emerald-50", color: "text-emerald-600" },
    { value: toL(totalOut), label: "Total Cash Outflows", sub: `${n} year window`, bg: "bg-rose-50", color: "text-rose-600" },
    { value: toL(netSurplus), label: `Net Surplus (${n} Yrs)`, sub: "Surplus after drawings", bg: "bg-blue-50", color: "text-blue-600" },
    { value: toL(closingCash), label: `Closing Cash (${n ? shortFy(years[n - 1]) : ""})`, sub: "Cash at end of horizon", bg: "bg-purple-50", color: "text-purple-600" },
  ].filter((c) => c.value != null);

  // ── Chart datasets (₹ Lacs) ──
  const flowData = years.map((y, i) => ({
    year: y,
    "Total Inflows": toL(at(cf.totalInflows, i)),
    "Total Outflows": toL(at(cf.totalOutflows, i)),
    "Net Surplus": toL(at(grossSurplus, i)),
  }));
  const balanceData = years.map((y, i) => ({
    year: y,
    "Opening Cash": toL(at(cf.openingBalance, i)),
    "Closing Cash": toL(at(cf.closingBalance, i)),
  }));
  let cumul = 0;
  const cumulData = years.map((y, i) => {
    const annual = at(grossSurplus, i);
    if (annual != null) cumul += annual;
    return { year: y, "Annual Net CF": toL(annual), "Cumulative Net CF": toL(cumul) };
  });
  const drawingsData = years.map((y, i) => ({ year: y, Drawings: toL(at(cf.drawings, i)) }));

  const hasFlow = has(cf.totalInflows) || has(cf.totalOutflows) || has(grossSurplus);
  const hasBalance = has(cf.openingBalance) || has(cf.closingBalance);
  const hasCumul = has(grossSurplus);
  const hasDrawings = has(cf.drawings);

  // ── Statement table rows (raw rupees, exactly as printed) ──
  const inflowRows = [
    { label: "Profit before Bank Int. & Tax (after Dep.)", values: cf.profitBeforeInterestTax },
    { label: "Add: Depreciation", values: cf.depreciation },
    { label: "Increase in Term Loan", values: cf.increaseInTermLoan },
    { label: "Increase in WC Loan", values: cf.increaseInWcLoan },
    { label: "Increase in Capital", values: cf.increaseInCapital },
    { label: "Increase in Capital during year", values: cf.increaseInCapitalDuringYear },
  ].filter((r) => has(r.values));
  const totalInRow = has(cf.totalInflows) ? { label: "Total Inflows", values: cf.totalInflows } : null;
  const outflowRows = [
    { label: "Capital Expenditure", values: cf.capitalExpenditure },
    { label: "Term Loan Interest", values: cf.termLoanInterest },
    { label: "CC Loan Interest", values: cf.ccLoanInterest },
    { label: "Term Loan Repayment", values: cf.termLoanRepayment },
    { label: "Increase in Receivables", values: cf.increaseInReceivables },
    { label: "Increase in Stock", values: cf.increaseInStock },
  ].filter((r) => has(r.values));
  const totalOutRow = has(cf.totalOutflows) ? { label: "Total Outflows", values: cf.totalOutflows } : null;
  const resultRows = [
    has(cf.grossSurplus) ? { label: "Gross Surplus", values: cf.grossSurplus, tint: "bg-blue-50", color: "text-blue-700" } : null,
    has(cf.drawings) ? { label: "Less: Drawings", values: cf.drawings, color: "text-rose-600" } : null,
    has(cf.openingBalance) ? { label: "Opening Balance of Cash", values: cf.openingBalance } : null,
    has(cf.closingBalance) ? { label: "Closing Balance of Cash", values: cf.closingBalance, tint: "bg-emerald-50", color: "text-emerald-700" } : null,
  ].filter(Boolean) as { label: string; values: any; tint?: string; color?: string }[];
  const hasInflows = inflowRows.length > 0 || totalInRow;
  const hasOutflows = outflowRows.length > 0 || totalOutRow;
  const hasTable = hasInflows || hasOutflows || resultRows.length > 0;

  const cell = (v: any): string => {
    const x = num(v);
    return x == null ? "—" : Math.round(x).toLocaleString("en-IN");
  };
  const cfLineFmt = (v: any) => `₹${Number(v).toFixed(2)}L`;

  const dataRow = (
    row: { label: string; values: any; tint?: string; color?: string },
    ri: number,
    opts: { total?: boolean } = {}
  ) => {
    const tint = row.tint ?? (opts.total ? "bg-muted/60" : ri % 2 === 1 ? "bg-muted/40" : "bg-card");
    const labelCls = opts.total || row.tint ? "font-semibold" : "font-medium";
    const valCls = opts.total || row.tint ? "font-semibold" : "font-medium";
    return (
      <TableRow key={row.label} className={`border-border ${tint} hover:${tint}`}>
        <TableCell className={`text-[13px] ${labelCls} text-foreground sticky left-0 z-10 ${tint}`}>{row.label}</TableCell>
        {years.map((_, i) => (
          <TableCell key={i} className={`text-right num-tabular text-[13px] ${valCls} ${row.color ?? "text-foreground/80"}`}>
            {cell(at(row.values, i))}
          </TableCell>
        ))}
      </TableRow>
    );
  };
  const sectionRow = (label: string, color: string) => (
    <TableRow key={`sec-${label}`} className="border-border bg-slate-100 hover:bg-slate-100">
      <TableCell className={`text-eyebrow ${color} sticky left-0 z-10 bg-slate-100`} colSpan={n + 1}>{label}</TableCell>
    </TableRow>
  );

  return (
    <SectionPage>
      <PageHeader
        eyebrow="Financials"
        title="Projected Cash Flow Statement"
        description={`Cash inflows, outflows and resulting balances across the ${n}-year projection.`}
      />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />

      {cards.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {cards.map((c, i) => (
            <div key={i} className={`rounded-2xl p-5 ${c.bg}`}>
              <div className={`font-display text-[26px] leading-none num-tabular tracking-tight ${c.color}`}>{fmtRupeesL(c.value!)}</div>
              <div className="text-[13px] font-semibold text-foreground mt-2">{c.label}</div>
              <div className="text-[11.5px] text-muted-foreground mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      {(hasFlow || hasBalance) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {hasFlow && (
            <DashCard title="Cash Inflows vs Outflows" subtitle="Total inflows, outflows & net surplus (₹ Lacs)">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowData} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} tickFormatter={(v: any) => `${Math.round(v)}L`} />
                    <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(221 83% 53% / 0.06)" }} formatter={(v: any) => cfLineFmt(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Bar dataKey="Total Inflows" fill={EMERALD} radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="Total Outflows" fill={ROSE} radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="Net Surplus" fill={NAVY} radius={[3, 3, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}

          {hasBalance && (
            <DashCard title="Cash Balance — Opening vs Closing" subtitle="Opening & closing cash position (₹ Lacs)">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={balanceData} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
                    <defs>
                      <linearGradient id="cfClosingFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={EMERALD} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={EMERALD} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} tickFormatter={(v: any) => `${Math.round(v)}L`} />
                    <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: any) => cfLineFmt(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
                    <Area type="monotone" dataKey="Opening Cash" stroke={NAVY} strokeWidth={2.5} fill={NAVY} fillOpacity={0.04} dot={{ r: 3, fill: NAVY }} connectNulls />
                    <Area type="monotone" dataKey="Closing Cash" stroke={EMERALD} strokeWidth={2.5} fill="url(#cfClosingFill)" dot={{ r: 3, fill: EMERALD }} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}
        </div>
      )}

      {(hasCumul || hasDrawings) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {hasCumul && (
            <DashCard title="Annual & Cumulative Net Cash Flows" subtitle="Surplus generated and accumulated (₹ Lacs)">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulData} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
                    <defs>
                      <linearGradient id="cfCumulFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PURPLE} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={PURPLE} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} tickFormatter={(v: any) => `${Math.round(v)}L`} />
                    <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: any) => cfLineFmt(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Area type="monotone" dataKey="Cumulative Net CF" stroke={PURPLE} strokeWidth={2.5} fill="url(#cfCumulFill)" dot={{ r: 3, fill: PURPLE }} connectNulls />
                    <Bar dataKey="Annual Net CF" fill={PURPLE} fillOpacity={0.35} radius={[3, 3, 0, 0]} maxBarSize={18} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}

          {hasDrawings && (
            <DashCard title="Drawings by Proprietor" subtitle="Cash withdrawn by the proprietor (₹ Lacs)">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={drawingsData} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} tickFormatter={(v: any) => `${Math.round(v)}L`} />
                    <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(32 90% 52% / 0.08)" }} formatter={(v: any) => cfLineFmt(v)} />
                    <Bar dataKey="Drawings" fill={GOLD} radius={[3, 3, 0, 0]} maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}
        </div>
      )}

      {hasTable && (
        <div>
          <h3 className="font-display text-[18px] mb-1">Projected Cash Flow Statement (₹)</h3>
          <p className="text-[12px] text-muted-foreground mb-3">Figures in rupees, exactly as stated in the report.</p>
          <div className="surface-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary border-0">
                    <TableHead className="text-eyebrow text-white/85 py-3.5 sticky left-0 bg-primary z-10">Particulars</TableHead>
                    {years.map((y) => (
                      <TableHead key={y} className="text-eyebrow text-white/85 text-right num-tabular">{y}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hasInflows && sectionRow("Cash Inflows", "text-emerald-700")}
                  {inflowRows.map((r, ri) => dataRow(r, ri))}
                  {totalInRow && dataRow({ ...totalInRow, tint: "bg-emerald-50", color: "text-emerald-700" }, 0, { total: true })}
                  {hasOutflows && sectionRow("Cash Outflows", "text-rose-700")}
                  {outflowRows.map((r, ri) => dataRow(r, ri))}
                  {totalOutRow && dataRow({ ...totalOutRow, tint: "bg-rose-50", color: "text-rose-700" }, 0, { total: true })}
                  {resultRows.map((r, ri) => dataRow(r, ri))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
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

  const years: string[] = ra.years;
  const at = (a: any, i: number): number | null => {
    const v = a?.[i];
    return typeof v === "number" && isFinite(v) ? v : null;
  };
  const has = (a: any): boolean => Array.isArray(a) && a.some((v: any) => typeof v === "number" && isFinite(v));
  const shortFy = (y: string) => {
    const m = y.match(/-(\d{2,4})$/);
    return m ? `FY${m[1].slice(-2)}` : y;
  };
  const fy = (y: string) => `FY${y}`;
  const fpi = years.length > 1 ? 1 : 0; // first full projected year (year 0 may be partial)
  const lpi = years.length - 1;
  const fyRange = years.length === 1 ? fy(years[0]) : `${fy(years[0])} to ${fy(years[lpi])}`;

  // Prefer explicitly extracted lines; TOL/TW falls back to debt-equity only when absent.
  const tolTw = has(ra.tolTw) ? ra.tolTw : ra.debtEquityRatio;

  // Percent-typed ratios may arrive either as percentages (e.g. 39.53) or as
  // decimal fractions (e.g. 0.16 for 16%), depending on how each DPR prints
  // them. A series whose every finite value sits within [-1, 1] is treated as
  // fractions and scaled to whole-percent for display only — stored data is
  // untouched. proprietaryRatio is intentionally excluded (a genuine ratio).
  const pctScale = (arr: any): number => {
    let any = false;
    for (const v of arr || []) {
      if (typeof v === "number" && isFinite(v)) {
        any = true;
        if (Math.abs(v) > 1) return 1; // any value beyond 1 means the series is already in whole-percent form
      }
    }
    return any ? 100 : 1; // every finite value within [-1, 1] → fractions, scale to whole-percent
  };
  const scaleArr = (arr: any): (number | null)[] => {
    const f = pctScale(arr);
    return (arr || []).map((v: any) => (typeof v === "number" && isFinite(v) ? v * f : null));
  };
  const gp = scaleArr(ra.grossProfitMargin);
  const np = scaleArr(ra.netProfitMargin);
  const roce = scaleArr(ra.roce);
  const roa = scaleArr(ra.returnOnAssets);

  // ── Headline metric cards (render each only when its data exists) ──
  const fmtX = (n: number) => `${n.toFixed(2)}x`;
  const fmtPctV = (n: number) => `${n.toFixed(2)}%`;
  const cards: { icon: any; value: string; label: string; sub: string; iconBg: string; iconColor: string }[] = [];
  const pushCard = (icon: any, val: number | null, fmt: (n: number) => string, label: string, sub: string, iconBg: string, iconColor: string) => {
    if (val != null) cards.push({ icon, value: fmt(val), label, sub, iconBg, iconColor });
  };
  pushCard(Target, at(ra.dscr, fpi), fmtX, `DSCR (${shortFy(years[fpi])})`, "Ideal: 1.75–3.0x", "bg-rose-50", "text-rose-500");
  pushCard(Scale, at(ra.currentRatio, fpi), fmtX, `Current Ratio (${shortFy(years[fpi])})`, "Ideal: >1.33x", "bg-amber-50", "text-amber-500");
  pushCard(TrendingUp, at(gp, 0), fmtPctV, `GP Ratio (${shortFy(years[0])})`, "Healthy gross margin", "bg-blue-50", "text-blue-500");
  pushCard(Activity, at(np, lpi), fmtPctV, `NP Ratio (${shortFy(years[lpi])})`, "Strong profitability", "bg-emerald-50", "text-emerald-500");
  pushCard(Shield, at(ra.interestCoverageRatio, fpi), fmtX, `ICR (${shortFy(years[fpi])})`, "Comfortably covers interest", "bg-sky-50", "text-sky-500");
  pushCard(TrendingDown, at(tolTw, fpi), (n) => n.toFixed(2), `TOL/TW (${shortFy(years[fpi])})`, "Declining → strength", "bg-pink-50", "text-pink-500");

  // ── Trend chart datasets ──
  const dscrData = years.map((y, i) => ({ year: y, DSCR: at(ra.dscr, i) }));
  const crData = years.map((y, i) => ({ year: y, "Current Ratio": at(ra.currentRatio, i) }));
  const marginData = years.map((y, i) => ({ year: y, "GP%": at(gp, i), "NP%": at(np, i) }));
  const icrData = years.map((y, i) => ({ year: y, ICR: at(ra.interestCoverageRatio, i) }));
  const tolData = years.map((y, i) => ({ year: y, "TOL/TW": at(tolTw, i) }));
  const returnData = years.map((y, i) => ({ year: y, ROCE: at(roce, i), ROA: at(roa, i) }));

  const hasDscr = has(ra.dscr);
  const hasCr = has(ra.currentRatio);
  const hasMargins = has(gp) || has(np);
  const hasIcr = has(ra.interestCoverageRatio);
  const hasTol = has(tolTw);
  const hasReturns = has(roce) || has(roa);
  const anyChart = hasDscr || hasCr || hasMargins || hasIcr || hasTol || hasReturns;

  // ── Comprehensive ratio summary rows (only what exists) ──
  const fmtNum2 = (n: number) => n.toFixed(2);
  const fmtPct2 = (n: number) => `${n.toFixed(2)}%`;
  const fmtDays = (n: number) => `${Math.round(n)} days`;
  const summaryDefs = [
    { label: "DSCR (A/B)", values: ra.dscr, ideal: "1.75–3.0x", fmt: fmtNum2 },
    { label: "Current Ratio", values: ra.currentRatio, ideal: ">1.33x", fmt: fmtNum2 },
    { label: "Gross Profit Ratio (%)", values: gp, ideal: ">30%", fmt: fmtPct2 },
    { label: "Net Profit Ratio (%)", values: np, ideal: ">10%", fmt: fmtPct2 },
    { label: "Debtors Turnover Ratio", values: ra.debtorsTurnover, ideal: "Higher better", fmt: fmtNum2 },
    { label: "Debtors Collection Days", values: ra.debtorsCollectionDays, ideal: "<60 days", fmt: fmtDays },
    { label: "TOL/TW", values: tolTw, ideal: "<3.0x", fmt: fmtNum2 },
    { label: "ROCE (PAT/Cap+LTL)", values: roce, ideal: ">10%", fmt: fmtPct2 },
    { label: "Interest Coverage Ratio", values: ra.interestCoverageRatio, ideal: ">1.5x", fmt: fmtNum2 },
    { label: "Return on Assets", values: roa, ideal: ">5%", fmt: fmtPct2 },
    { label: "Proprietary Ratio", values: ra.proprietaryRatio, ideal: "Growing", fmt: fmtNum2 },
  ].filter((r) => has(r.values));

  const insight = insightRatios(ra);

  return (
    <SectionPage>
      <PageHeader eyebrow="Financials" title="Ratio Analysis" description={`Key financial ratios — ${fyRange}`} />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />

      {cards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {cards.map((c, i) => (
            <RatioStatCard key={i} {...c} />
          ))}
        </div>
      )}

      {anyChart && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {hasDscr && (
            <DashCard title="DSCR Trend" subtitle="Debt Service Coverage Ratio (Ideal: 1.75–3.0×)">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dscrData} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} />
                    <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: any) => `${Number(v).toFixed(2)}×`} />
                    <ReferenceLine y={3.0} stroke={NAVY_LIGHT} strokeDasharray="5 4" label={{ value: "Max 3.0", position: "insideTopLeft", fill: NAVY_LIGHT, fontSize: 10 }} />
                    <ReferenceLine y={1.75} stroke={GOLD} strokeDasharray="5 4" label={{ value: "Min 1.75", position: "insideBottomLeft", fill: GOLD, fontSize: 10 }} />
                    <Line type="monotone" dataKey="DSCR" stroke={NAVY} strokeWidth={2.5} dot={{ r: 3, fill: NAVY }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}

          {hasCr && (
            <DashCard title="Current Ratio Trend" subtitle="Liquidity — Ideal > 1.33× (RBI norm)">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={crData} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} />
                    <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: any) => `${Number(v).toFixed(2)}×`} />
                    <ReferenceLine y={1.33} stroke={GOLD} strokeDasharray="5 4" label={{ value: "Min 1.33", position: "insideBottomLeft", fill: GOLD, fontSize: 10 }} />
                    <Line type="monotone" dataKey="Current Ratio" stroke={EMERALD} strokeWidth={2.5} dot={{ r: 3, fill: EMERALD }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}

          {hasMargins && (
            <DashCard title="GP% & NP% Margins" subtitle="Overall profitability indicators (%)">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={marginData} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} tickFormatter={(v: any) => `${v}%`} />
                    <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: any) => `${Number(v).toFixed(2)}%`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
                    <Line type="monotone" dataKey="GP%" stroke={NAVY} strokeWidth={2.5} dot={{ r: 3, fill: "white", stroke: NAVY, strokeWidth: 2 }} connectNulls />
                    <Line type="monotone" dataKey="NP%" stroke={EMERALD} strokeWidth={2.5} dot={{ r: 3, fill: EMERALD }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}

          {hasIcr && (
            <DashCard title="Interest Coverage Ratio (ICR)" subtitle="EBIT / Interest — higher is better">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={icrData} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} />
                    <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(262 83% 58% / 0.06)" }} formatter={(v: any) => `${Number(v).toFixed(2)}×`} />
                    <Bar dataKey="ICR" fill={PURPLE} radius={[4, 4, 0, 0]} maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}

          {hasTol && (
            <DashCard title="TOL/TW — Debt to Equity" subtitle="Total Outside Liabilities / Total Networth">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tolData} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} />
                    <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(32 90% 52% / 0.06)" }} formatter={(v: any) => Number(v).toFixed(2)} />
                    <Bar dataKey="TOL/TW" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}

          {hasReturns && (
            <DashCard title="ROCE & ROA (%)" subtitle="Return on Capital Employed & Return on Assets">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={returnData} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} tickFormatter={(v: any) => `${v}%`} />
                    <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: any) => `${Number(v).toFixed(2)}%`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
                    <Line type="monotone" dataKey="ROCE" stroke={NAVY} strokeWidth={2.5} dot={{ r: 3, fill: NAVY }} connectNulls />
                    <Line type="monotone" dataKey="ROA" stroke={EMERALD} strokeWidth={2.5} dot={{ r: 3, fill: EMERALD }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}
        </div>
      )}

      {summaryDefs.length > 0 && (
        <div className="mb-3">
          <h3 className="font-display text-[18px] mb-3">Comprehensive Ratio Summary</h3>
          <RatioSummaryTable years={years} rows={summaryDefs} />
          {insight && <p className="text-[12px] text-muted-foreground mt-2">{insight}</p>}
        </div>
      )}
    </SectionPage>
  );
}

function RatioStatCard({ icon: Icon, value, label, sub, iconBg, iconColor }: { icon: any; value: string; label: string; sub: string; iconBg: string; iconColor: string }) {
  return (
    <div className="surface-card rounded-2xl p-5 text-center">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 ${iconBg}`}>
        <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
      </div>
      <div className="font-display text-[24px] leading-none text-emerald-600 num-tabular tracking-tight">{value}</div>
      <div className="text-[12px] font-semibold text-foreground mt-2">{label}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function RatioSummaryTable({ years, rows }: { years: string[]; rows: { label: string; values: (number | null)[]; ideal: string; fmt: (n: number) => string }[] }) {
  return (
    <div className="surface-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary border-0">
              <TableHead className="text-eyebrow text-white/85 py-3.5 sticky left-0 bg-primary z-10">Ratio</TableHead>
              {years.map((y) => (
                <TableHead key={y} className="text-eyebrow text-white/85 text-right num-tabular">{y}</TableHead>
              ))}
              <TableHead className="text-eyebrow text-white/85 text-right">Ideal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, ri) => {
              const rowBg = ri % 2 === 1 ? "bg-muted/40" : "bg-card";
              return (
                <TableRow key={row.label} className={`border-border ${rowBg} hover:${rowBg}`}>
                  <TableCell className={`text-[13px] font-medium text-foreground sticky left-0 z-10 ${rowBg}`}>{row.label}</TableCell>
                  {years.map((_, i) => {
                    const v = row.values?.[i];
                    return (
                      <TableCell key={i} className="text-right num-tabular text-[13px] text-primary/90">
                        {typeof v === "number" && isFinite(v) ? row.fmt(v) : "—"}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right text-[11.5px] text-muted-foreground whitespace-nowrap">{row.ideal}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function LeverageSection({ ed }: { ed: any }) {
  const la = ed?.leverageAnalysis;
  const ds = ed?.depreciationSchedule;

  const has = (a: any): boolean => Array.isArray(a) && a.some((v: any) => typeof v === "number" && isFinite(v));
  const at = (a: any, i: number): number | null => {
    const v = a?.[i];
    return typeof v === "number" && isFinite(v) ? v : null;
  };
  const shortFy = (y: string) => {
    const m = y.match(/-(\d{2,4})$/);
    return m ? `FY${m[1].slice(-2)}` : y;
  };
  const fy = (y: string) => `FY${y}`;

  const lYears: string[] = Array.isArray(la?.years) ? la.years : [];
  const hasLeverage = lYears.length > 0 && (has(la?.operatingLeverage) || has(la?.financialLeverage) || has(la?.combinedLeverage));

  const dYears: string[] = Array.isArray(ds?.years) ? ds.years : [];
  const hasDep = dYears.length > 0 && (has(ds?.openingWdv) || has(ds?.additions) || has(ds?.depreciation) || has(ds?.closingWdv));

  if (!hasLeverage && !hasDep)
    return (
      <SectionPage>
        <PageHeader eyebrow="Financials" title="Leverage Ratios & Depreciation" />
        <EmptyState />
      </SectionPage>
    );

  const fpi = lYears.length > 1 ? 1 : 0; // first full projected year (year 0 may be partial)
  const fyTag = lYears.length ? shortFy(lYears[fpi]) : "";
  const fyRange = lYears.length ? (lYears.length === 1 ? fy(lYears[0]) : `${fy(lYears[0])} to ${fy(lYears[lYears.length - 1])}`) : "";

  // ── Headline leverage cards ──
  const cards = [
    { value: at(la?.operatingLeverage, fpi), label: `Operating Leverage (${fyTag})`, sub: "Contribution / EBIT", bg: "bg-blue-50", color: "text-blue-600" },
    { value: at(la?.financialLeverage, fpi), label: `Financial Leverage (${fyTag})`, sub: "EBIT / EBT", bg: "bg-purple-50", color: "text-purple-600" },
    { value: at(la?.combinedLeverage, fpi), label: `Combined Leverage (${fyTag})`, sub: "OL × FL", bg: "bg-orange-50", color: "text-orange-600" },
  ].filter((c) => c.value != null);

  // ── Chart dataset (shared by trend + bar) ──
  const trendData = lYears.map((y, i) => ({
    year: y,
    "Operating Leverage": at(la?.operatingLeverage, i),
    "Financial Leverage": at(la?.financialLeverage, i),
    "Combined Leverage": at(la?.combinedLeverage, i),
  }));

  // ── Leverage summary rows ──
  const fmtX = (n: number) => `${n.toFixed(2)}x`;
  const levRows = [
    { label: "Operating Leverage (OL)", values: la?.operatingLeverage, color: "text-blue-600" },
    { label: "Financial Leverage (FL)", values: la?.financialLeverage, color: "text-purple-600" },
    { label: "Combined Leverage (OL × FL)", values: la?.combinedLeverage, color: "text-orange-600" },
  ].filter((r) => has(r.values));

  // ── Depreciation schedule ──
  const depRate = typeof ds?.ratePct === "number" && isFinite(ds.ratePct) ? ds.ratePct : null;
  const depTitle = depRate != null ? `Depreciation Schedule (@ ${depRate}% WDV — Income Tax Act)` : "Depreciation Schedule (WDV — Income Tax Act)";
  // Figures may arrive already in lakhs (e.g. 35.00) or in raw rupees (e.g.
  // 975000). Auto-detect by magnitude and normalise everything to lakhs so the
  // "(Lacs)" table always reads correctly regardless of how a DPR printed it.
  const depNums: number[] = [ds?.openingWdv, ds?.additions, ds?.depreciation, ds?.closingWdv]
    .flatMap((a: any) => (Array.isArray(a) ? a : []))
    .filter((v: any) => typeof v === "number" && isFinite(v))
    .map((v: number) => Math.abs(v));
  const depScale = depNums.length && Math.max(...depNums) >= 1000 ? 1e5 : 1;
  const toL = (n: number | null) => (n != null ? (n / depScale).toFixed(2) : "—");
  const additionsArr: number[] = Array.isArray(ds?.additions) ? ds.additions.filter((v: any) => typeof v === "number" && isFinite(v)) : [];
  const assetCost = additionsArr.length ? Math.max(...additionsArr) / depScale : null;
  const depSubtitle = [ds?.assetName, assetCost != null ? `₹${assetCost.toFixed(2)}L (Lacs)` : null].filter(Boolean).join(" — ") || "Written-down-value method — figures in lacs";
  const depRateLabel = depRate != null ? `Depreciation @${depRate}%` : "Depreciation";

  return (
    <SectionPage>
      <PageHeader
        eyebrow="Financials"
        title="Leverage Ratios & Depreciation"
        description={hasLeverage ? `Operating, Financial & Combined Leverage Analysis — ${fyRange}` : "Depreciation Schedule"}
      />

      {cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {cards.map((c, i) => (
            <div key={i} className={`rounded-2xl p-5 ${c.bg}`}>
              <div className={`font-display text-[30px] leading-none num-tabular tracking-tight ${c.color}`}>{c.value!.toFixed(2)}</div>
              <div className="text-[13px] font-semibold text-foreground mt-2">{c.label}</div>
              <div className="text-[11.5px] text-muted-foreground mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      {hasLeverage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <DashCard title="Leverage Trends" subtitle="Operating, Financial & Combined leverage over time">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                  <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} />
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: any) => `${Number(v).toFixed(2)}×`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
                  <Line type="monotone" dataKey="Operating Leverage" stroke={NAVY} strokeWidth={2.5} dot={{ r: 3, fill: NAVY }} connectNulls />
                  <Line type="monotone" dataKey="Financial Leverage" stroke={PURPLE} strokeWidth={2.5} dot={{ r: 3, fill: PURPLE }} connectNulls />
                  <Line type="monotone" dataKey="Combined Leverage" stroke={GOLD} strokeWidth={2.5} dot={{ r: 3, fill: GOLD }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </DashCard>

          <DashCard title="Combined Leverage Bar Chart" subtitle="Operating, Financial & Combined leverage by year">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                  <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} />
                  <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(221 83% 53% / 0.06)" }} formatter={(v: any) => `${Number(v).toFixed(2)}×`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Operating Leverage" fill={NAVY} radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Financial Leverage" fill={PURPLE} radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Combined Leverage" fill={GOLD} radius={[3, 3, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DashCard>
        </div>
      )}

      {levRows.length > 0 && (
        <div className="mb-6">
          <h3 className="font-display text-[18px] mb-3">Leverage Ratio Summary</h3>
          <div className="surface-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary border-0">
                    <TableHead className="text-eyebrow text-white/85 py-3.5 sticky left-0 bg-primary z-10">Leverage Type</TableHead>
                    {lYears.map((y) => (
                      <TableHead key={y} className="text-eyebrow text-white/85 text-right num-tabular">{y}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {levRows.map((row, ri) => {
                    const rowBg = ri % 2 === 1 ? "bg-muted/40" : "bg-card";
                    return (
                      <TableRow key={row.label} className={`border-border ${rowBg} hover:${rowBg}`}>
                        <TableCell className={`text-[13px] font-medium text-foreground sticky left-0 z-10 ${rowBg}`}>{row.label}</TableCell>
                        {lYears.map((_, i) => {
                          const val = at(row.values, i);
                          return (
                            <TableCell key={i} className={`text-right num-tabular text-[13px] font-medium ${row.color}`}>
                              {val != null ? fmtX(val) : "—"}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900/90 leading-relaxed">
            <span className="font-semibold">Note:</span> A high OL and low FL indicates management is careful — the higher risk of OL has been balanced by low FL. The ideal scenario is low OL and high FL for stable earnings.
          </div>
        </div>
      )}

      {hasDep && (
        <div>
          <h3 className="font-display text-[18px] mb-1">{depTitle}</h3>
          <p className="text-[12px] text-muted-foreground mb-3">{depSubtitle}</p>
          <div className="surface-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary border-0">
                    <TableHead className="text-eyebrow text-white/85 py-3.5">Year</TableHead>
                    <TableHead className="text-eyebrow text-white/85 text-right">WDV (Opening)</TableHead>
                    <TableHead className="text-eyebrow text-white/85 text-right">Additions</TableHead>
                    <TableHead className="text-eyebrow text-white/85 text-right">{depRateLabel}</TableHead>
                    <TableHead className="text-eyebrow text-white/85 text-right">WDV (Closing)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dYears.map((y, i) => {
                    const rowBg = i % 2 === 1 ? "bg-muted/40" : "bg-card";
                    return (
                      <TableRow key={y} className={`border-border ${rowBg} hover:${rowBg}`}>
                        <TableCell className="text-[13px] font-medium text-foreground">{y}</TableCell>
                        <TableCell className="text-right num-tabular text-[13px] text-foreground/80">{toL(at(ds?.openingWdv, i))}</TableCell>
                        <TableCell className="text-right num-tabular text-[13px] text-blue-600">{toL(at(ds?.additions, i))}</TableCell>
                        <TableCell className="text-right num-tabular text-[13px] text-rose-600">{toL(at(ds?.depreciation, i))}</TableCell>
                        <TableCell className="text-right num-tabular text-[13px] text-emerald-600 font-medium">{toL(at(ds?.closingWdv, i))}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </SectionPage>
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

// ── Financial-evaluation formatters & helpers ───────────────
// Raw-rupee evaluation-table figures, Indian grouping, signed.
const fmtRupeeSigned = (n: number | null | undefined): string =>
  n == null || !isFinite(n) ? "—" : `${n < 0 ? "−" : ""}₹${Math.abs(n).toLocaleString("en-IN")}`;

// Short fiscal-year label for payback chart axes, e.g. "FY26" ("*" = partial year).
const fyShort = (y: any): string => {
  const s = String(y ?? "");
  if (/initial/i.test(s)) return "Initial";
  const m = s.match(/(\d{4})-(\d{2})/);
  if (!m) return s.slice(0, 8);
  return `FY${m[2]}${/sep|to|month|partial/i.test(s) ? "*" : ""}`;
};

function EvalChip({ label, tone }: { label: string; tone: "good" | "risk" | "neutral" }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "risk"
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : "bg-blue-50 text-blue-700 ring-blue-200";
  return <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ring-1 ${cls}`}>{label}</span>;
}

function EvalKpiCard({ label, value, sub, chip, chipTone, valueClass }: { label: string; value: string | null; sub?: string; chip?: string | null; chipTone: "good" | "risk" | "neutral"; valueClass?: string }) {
  return (
    <div className="surface-card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-eyebrow text-muted-foreground">{label}</div>
        {chip && <EvalChip label={chip} tone={chipTone} />}
      </div>
      <div className={`font-display text-[26px] leading-[1.05] num-tabular tracking-tight ${valueClass ?? "text-foreground"}`}>{value || "—"}</div>
      {sub && <div className="text-[11.5px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

// Pie of capital sources weighted by cost, with total WACC in the centre.
function WaccPieCard({ rows, totalWacc }: { rows: any[]; totalWacc: number | null }) {
  const comps = rows.filter((r) => !/total/i.test(String(r.source ?? "")));
  const data = comps.map((r) => ({ name: r.source, value: Number(r.amount ?? r.portionPct ?? 0) }));
  if (data.length === 0) return null;
  return (
    <DashCard title="Cost of Capital (WACC)" subtitle="Capital sources weighted by their cost.">
      <div className="h-[200px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} innerRadius={50} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: any) => `${fmtNum(Number(v))}L`} />
          </PieChart>
        </ResponsiveContainer>
        {totalWacc != null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="font-display text-[22px] num-tabular" style={{ color: NAVY }}>{totalWacc.toFixed(2)}%</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">WACC</div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 mt-3">
        {comps.map((r, i) => (
          <div key={i} className="flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="text-muted-foreground">{r.source}</span>
            </span>
            <span className="num-tabular text-foreground">{r.waccContributionPct != null ? `${r.waccContributionPct}%` : "—"}</span>
          </div>
        ))}
      </div>
    </DashCard>
  );
}

// PV of future cash flows vs initial investment → NPV.
function NpvCard({ npv }: { npv: any }) {
  if (!npv || (npv.pvFutureCashFlows == null && npv.initialInvestment == null && npv.netPresentValue == null)) return null;
  const rows = [
    { label: "PV of Future Cash Flows", value: npv.pvFutureCashFlows, tone: "text-foreground", strong: false },
    { label: "Initial Investment", value: npv.initialInvestment, tone: "text-foreground", strong: false },
    { label: "Net Present Value", value: npv.netPresentValue, tone: (npv.netPresentValue ?? 0) >= 0 ? "text-emerald-700" : "text-rose-700", strong: true },
  ];
  return (
    <DashCard title="NPV Analysis" subtitle="Discounted at the bank interest rate.">
      <div className="space-y-3 mt-1">
        {rows.map((r) => (
          <div key={r.label} className={`flex items-center justify-between ${r.strong ? "pt-3 border-t border-border" : ""}`}>
            <span className="text-[12.5px] text-muted-foreground">{r.label}</span>
            <span className={`num-tabular ${r.strong ? "font-display text-[20px]" : "text-[15px] font-medium"} ${r.tone}`}>{fmtRupeeSigned(r.value)}</span>
          </div>
        ))}
      </div>
    </DashCard>
  );
}

// Horizontal bars comparing IRR / MIRR / WACC plus a viability verdict.
function IrrBarsCard({ irr, mirr, wacc }: { irr: number | null; mirr: number | null; wacc: number | null }) {
  const rows = ([
    { label: "IRR", v: irr, color: EMERALD },
    { label: "MIRR", v: mirr, color: NAVY },
    { label: "WACC", v: wacc, color: GOLD },
  ].filter((r) => r.v != null)) as { label: string; v: number; color: string }[];
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.v)) * 1.2 || 1;
  const ok = irr != null && wacc != null && irr > wacc;
  return (
    <DashCard title="IRR vs MIRR vs WACC" subtitle="Returns measured against the cost of capital.">
      <div className="space-y-4 mt-2">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="num-tabular font-medium text-foreground">{r.v.toFixed(2)}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (r.v / max) * 100)}%`, backgroundColor: r.color }} />
            </div>
          </div>
        ))}
      </div>
      {irr != null && wacc != null && (
        <div className={`mt-5 rounded-xl p-3 text-[12px] leading-snug ${ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {ok
            ? `IRR (${irr.toFixed(2)}%) exceeds WACC (${wacc.toFixed(2)}%) — the project is value-accretive.`
            : `IRR (${irr.toFixed(2)}%) does not clear WACC (${wacc.toFixed(2)}%) — returns fall short of the cost of capital.`}
        </div>
      )}
    </DashCard>
  );
}

// Cumulative-recovery bar chart shared by the simple & discounted payback panels.
function PaybackChartCard({ title, subtitle, data, color }: { title: string; subtitle: string; data: { name: string; cum: number | null }[]; color: string }) {
  const pts = data.filter((d) => d.cum != null) as { name: string; cum: number }[];
  if (pts.length === 0) return null;
  const maxAbs = Math.max(...pts.map((d) => Math.abs(d.cum)), 1);
  const fmt = lakhFormatter(maxAbs);
  return (
    <DashCard title={title} subtitle={subtitle}>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pts} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
            <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v) => fmt(Number(v))} tick={axisTick} tickLine={false} axisLine={false} width={44} />
            <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: any) => fmtRupeeSigned(Number(v))} />
            <ReferenceLine y={0} stroke="hsl(215 16% 60%)" />
            <Bar dataKey="cum" radius={[4, 4, 0, 0]}>
              {pts.map((d, i) => (
                <Cell key={i} fill={d.cum >= 0 ? color : ROSE} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </DashCard>
  );
}

function WaccTableBlock({ rows }: { rows: any[] }) {
  if (!rows.length) return null;
  return (
    <DashCard title="WACC Calculation" subtitle="Weighted average cost of capital by source of funds.">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source of Funds</TableHead>
            <TableHead className="text-right">Amount (₹ Lacs)</TableHead>
            <TableHead className="text-right">Portion %</TableHead>
            <TableHead className="text-right">Cost %</TableHead>
            <TableHead className="text-right">WACC Contribution</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => {
            const isTotal = /total/i.test(String(r.source ?? ""));
            return (
              <TableRow key={i} className={isTotal ? "font-semibold bg-muted/40" : ""}>
                <TableCell>{r.source}</TableCell>
                <TableCell className="text-right num-tabular">{r.amount != null ? fmtNum(r.amount) : "—"}</TableCell>
                <TableCell className="text-right num-tabular">{r.portionPct != null ? `${r.portionPct}%` : "—"}</TableCell>
                <TableCell className="text-right num-tabular">{r.costPct != null ? `${r.costPct}%` : "—"}</TableCell>
                <TableCell className="text-right num-tabular">{r.waccContributionPct != null ? `${r.waccContributionPct}%` : "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DashCard>
  );
}

function SimplePaybackTableBlock({ rows }: { rows: any[] }) {
  if (!rows.length) return null;
  return (
    <DashCard title="Simple Payback Schedule" subtitle="Year-by-year recovery of the investment.">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Year</TableHead>
            <TableHead className="text-right">Cash Flow (₹)</TableHead>
            <TableHead className="text-right">Cumulative (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{/initial/i.test(String(r.year)) ? "Initial" : r.year}</TableCell>
              <TableCell className="text-right num-tabular">{fmtRupeeSigned(r.cashFlow)}</TableCell>
              <TableCell className={`text-right num-tabular ${(r.cumulative ?? 0) >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{fmtRupeeSigned(r.cumulative)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DashCard>
  );
}

function DcfPaybackTableBlock({ rows }: { rows: any[] }) {
  if (!rows.length) return null;
  return (
    <DashCard title="Discounted Payback Schedule" subtitle="Discounted cash flows recovering the investment.">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Year</TableHead>
            <TableHead className="text-right">Cash Flow (₹)</TableHead>
            <TableHead className="text-right">Discounted CF (₹)</TableHead>
            <TableHead className="text-right">Cumulative (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{/initial/i.test(String(r.year)) ? "Initial" : r.year}</TableCell>
              <TableCell className="text-right num-tabular">{fmtRupeeSigned(r.cashFlow)}</TableCell>
              <TableCell className="text-right num-tabular">{fmtRupeeSigned(r.discountedCashFlow)}</TableCell>
              <TableCell className={`text-right num-tabular ${(r.cumulativeDiscounted ?? 0) >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{fmtRupeeSigned(r.cumulativeDiscounted)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DashCard>
  );
}

function EvaluationSection({ ed, verdict, isLoadingVerdict }: { ed: any; verdict?: string | null; isLoadingVerdict?: boolean }) {
  const fe = ed?.financialEvaluation;
  if (!fe) return (
    <SectionPage>
      <PageHeader eyebrow="Methods" title="Financial Evaluation Methods" description="IRR · MIRR · WACC · NPV · PI · Payback Period" />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />
      <EmptyState />
    </SectionPage>
  );

  const irr = parseNumeric(fe.irr);
  const mirr = parseNumeric(fe.mirr);
  const wacc = parseNumeric(fe.wacc);
  const pi = parseNumeric(fe.profitabilityIndex);
  const simplePb = parseNumeric(fe.simplePaybackPeriod);

  const wb: any[] = Array.isArray(fe.waccBreakdown) ? fe.waccBreakdown : [];
  const npvA = fe.npvAnalysis ?? null;
  const simpleSched: any[] = Array.isArray(fe.simplePaybackSchedule) ? fe.simplePaybackSchedule : [];
  const dcfSched: any[] = Array.isArray(fe.dcfPaybackSchedule) ? fe.dcfPaybackSchedule : [];

  // Total WACC = explicit Total-row contribution, else sum of component
  // contributions, else fe.wacc. Only fall back to the sum when at least one
  // component contribution is a finite number (avoids a misleading 0%).
  const totalRow = wb.find((r) => /total/i.test(String(r.source ?? "")));
  const compContribs = wb
    .filter((r) => !/total/i.test(String(r.source ?? "")))
    .map((r) => Number(r.waccContributionPct))
    .filter((n) => isFinite(n));
  const totalWacc: number | null =
    (totalRow?.waccContributionPct ?? null) ??
    (compContribs.length ? compContribs.reduce((s, n) => s + n, 0) : null) ??
    wacc;

  // NPV headline in lakhs — prefer the rupee figure from the NPV table.
  let npvDisplay: string | null;
  if (npvA?.netPresentValue != null) {
    npvDisplay = fmtRupeesL(npvA.netPresentValue / 1e5);
  } else {
    const n = parseNumeric(fe.npv);
    npvDisplay = n == null ? (fe.npv || null) : fmtRupeesL(Math.abs(n) >= 1000 ? n / 1e5 : n);
  }
  const npvPositive = (npvA?.netPresentValue ?? parseNumeric(fe.npv) ?? 0) >= 0;

  const kpis = [
    { label: "IRR", value: fe.irr ?? null, sub: wacc != null ? `vs WACC ${wacc.toFixed(2)}%` : "Internal rate of return", chip: irr != null && wacc != null ? (irr > wacc ? "Accept" : "Review") : null, chipTone: (irr != null && wacc != null && irr > wacc ? "good" : "risk") as "good" | "risk" | "neutral", valueClass: "text-emerald-700" },
    { label: "MIRR", value: fe.mirr ?? null, sub: "Reinvested at FD rate", chip: mirr != null && wacc != null ? (mirr > wacc ? "Accept" : "Review") : null, chipTone: (mirr != null && wacc != null && mirr > wacc ? "good" : "risk") as "good" | "risk" | "neutral", valueClass: "text-emerald-700" },
    { label: "WACC", value: fe.wacc ?? null, sub: "Cost of capital", chip: "Hurdle", chipTone: "neutral" as "good" | "risk" | "neutral", valueClass: "text-foreground" },
    { label: "NPV", value: npvDisplay, sub: "Positive ⇒ viable", chip: npvDisplay ? (npvPositive ? "Accept" : "Review") : null, chipTone: (npvPositive ? "good" : "risk") as "good" | "risk" | "neutral", valueClass: npvPositive ? "text-emerald-700" : "text-rose-700" },
    { label: "PI", value: fe.profitabilityIndex ?? null, sub: "> 1 ⇒ profitable", chip: pi != null ? (pi > 1 ? "Accept" : "Review") : null, chipTone: (pi != null && pi > 1 ? "good" : "risk") as "good" | "risk" | "neutral", valueClass: "text-foreground" },
    { label: "Payback", value: simplePb != null ? `${simplePb} Yrs` : (fe.simplePaybackPeriod ?? null), sub: "Simple method", chip: simplePb != null ? "Accept" : null, chipTone: "good" as "good" | "risk" | "neutral", valueClass: "text-foreground" },
  ];

  // Risk/solvency metrics not covered by the six headline cards.
  const riskMetrics = [
    { label: "BEP", value: fe.bep, description: "Break-even point" },
    { label: "Margin of Safety", value: fe.marginOfSafety, description: "Sales cushion above BEP" },
    { label: "Altman Z-Score", value: fe.altmanZScore, description: "Bankruptcy risk indicator" },
    { label: "Average DSCR", value: fe.averageDscr, description: "Debt service coverage" },
  ].filter((m) => m.value);

  const simpleChart = simpleSched.filter((r) => !/initial/i.test(String(r.year))).map((r) => ({ name: fyShort(r.year), cum: r.cumulative ?? null }));
  const dcfChart = dcfSched.filter((r) => !/initial/i.test(String(r.year))).map((r) => ({ name: fyShort(r.year), cum: r.cumulativeDiscounted ?? null }));
  const dcfPb = parseNumeric(fe.discountedPaybackPeriod);

  return (
    <SectionPage>
      <PageHeader eyebrow="Methods" title="Financial Evaluation Methods" description="IRR · MIRR · WACC · NPV · PI · Payback Period" />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />

      {/* Six headline evaluation metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-9">
        {kpis.map((k) => (
          <EvalKpiCard key={k.label} label={k.label} value={k.value} sub={k.sub} chip={k.chip} chipTone={k.chipTone} valueClass={k.valueClass} />
        ))}
      </div>

      {/* Cost of capital · NPV · returns-vs-cost panels */}
      {(wb.length > 0 || npvA || irr != null) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-9">
          <WaccPieCard rows={wb} totalWacc={totalWacc} />
          <NpvCard npv={npvA} />
          <IrrBarsCard irr={irr} mirr={mirr} wacc={wacc} />
        </div>
      )}

      {/* Payback recovery charts */}
      {(simpleChart.length > 0 || dcfChart.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-9">
          <PaybackChartCard title="Payback — Simple Method" subtitle={simplePb != null ? `Cumulative recovery · ${simplePb} yrs` : "Cumulative cash-flow recovery"} data={simpleChart} color={EMERALD} />
          <PaybackChartCard title="Payback — Discounted Method" subtitle={dcfPb != null ? `Discounted recovery · ${dcfPb} yrs` : "Discounted cash-flow recovery"} data={dcfChart} color={PURPLE} />
        </div>
      )}

      {/* WACC calculation table */}
      {wb.length > 0 && (
        <div className="mb-9">
          <WaccTableBlock rows={wb} />
        </div>
      )}

      {/* Year-by-year payback schedules */}
      {(simpleSched.length > 0 || dcfSched.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-9">
          <SimplePaybackTableBlock rows={simpleSched} />
          <DcfPaybackTableBlock rows={dcfSched} />
        </div>
      )}

      {/* Risk & solvency metrics not in the six headline cards */}
      {riskMetrics.length > 0 && (
        <div className="mb-9">
          <div className="text-eyebrow text-gold mb-4">Risk & Solvency</div>
          <h3 className="font-display text-[22px] mb-5">Additional Indicators</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {riskMetrics.map((m) => (
              <MetricCard key={m.label} label={m.label} value={m.value} description={m.description} />
            ))}
          </div>
        </div>
      )}

      {/* Banker threshold gauges — does the project clear the bar? */}
      <ThresholdGaugesBlock fe={fe} />
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

// Transposed matrix table (particulars in rows, fiscal years in columns).
// Shared by BEP and MPBF sections.
type MatrixRow = {
  label: string;
  values?: (number | null | undefined)[];
  fmt?: (n: number | null | undefined) => string;
  kind?: "section";
  bold?: boolean;
  indent?: boolean;
  tone?: "blue" | "rose" | "emerald";
};
function MatrixTable({ years, rows, firstColLabel = "Particulars" }: { years: string[]; rows: MatrixRow[]; firstColLabel?: string }) {
  return (
    <div className="surface-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary">
              <th className="text-eyebrow text-white/85 py-3.5 px-4 text-left whitespace-nowrap">{firstColLabel}</th>
              {years.map((y, i) => (
                <th key={i} className="text-eyebrow text-white/85 text-right px-4 whitespace-nowrap">{shortYear(y)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => {
              if (r.kind === "section") {
                return (
                  <tr key={ri} className="bg-muted/60 border-t border-border">
                    <td colSpan={years.length + 1} className="text-eyebrow text-muted-foreground/90 px-4 py-2">{r.label}</td>
                  </tr>
                );
              }
              const fmt = r.fmt || rupee;
              const toneCls = r.tone === "blue" ? "text-brand" : r.tone === "rose" ? "text-rose-600" : r.tone === "emerald" ? "text-emerald-600" : "text-foreground";
              return (
                <tr key={ri} className={`border-t border-border ${r.bold ? "bg-muted/30" : ""}`}>
                  <td className={`text-[13px] py-2.5 px-4 whitespace-nowrap ${r.bold ? "font-semibold" : ""} ${r.indent ? "pl-8 text-foreground/80" : ""}`}>{r.label}</td>
                  {years.map((_, ci) => (
                    <td key={ci} className={`text-right num-tabular text-[13px] px-4 ${r.bold ? "font-semibold" : ""} ${toneCls}`}>{fmt(r.values?.[ci])}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════ LOAN SCHEDULE — DSCR layout ═══════════
// Derives a YEARLY term-loan amortization + DSCR table from clean yearly
// arrays (balanceSheet.termLoans = closing balances, plAccount.interestTermLoan,
// ratioAnalysis.dscr). The raw loanSchedule.schedule is monthly (84 rows), so it
// is intentionally not used for the per-year view.
function LoanSection({ ed, verdict, isLoadingVerdict }: { ed: any; verdict?: string | null; isLoadingVerdict?: boolean }) {
  const loan = ed?.loanSchedule;
  const bs = ed?.balanceSheet;
  const pl = ed?.plAccount;
  const ra = ed?.ratioAnalysis;
  const years: string[] = bs?.years || pl?.years || [];
  const closing: number[] | undefined = bs?.termLoans;

  if (!years.length || !Array.isArray(closing) || !closing.length) {
    return (
      <SectionPage>
        <PageHeader eyebrow="Debt Servicing" title="Loan Schedule" />
        <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />
        <EmptyState />
      </SectionPage>
    );
  }

  const principalAmt = parseNumeric(loan?.termLoanAmount) || closing[0] || 0;
  const opening = closing.map((_, i) => (i === 0 ? principalAmt : closing[i - 1]));
  const principal = opening.map((o, i) => Math.max(0, o - closing[i]));
  const interest: number[] = pl?.interestTermLoan || [];
  const debtService = principal.map((p, i) => p + (interest[i] || 0)); // B
  const dscr: (number | null)[] = ra?.dscr || [];
  const netInflow = debtService.map((b, i) => (dscr[i] != null ? (dscr[i] as number) * b : null)); // A

  const totalPrincipal = sumFinite(principal);
  const totalInterest = sumFinite(interest);
  // Average DSCR over the loan period — simple mean, but excluding anomalous
  // fully-repaid final years (DSCR balloons to ~100+ when debt service ≈ 0).
  const dscrSane = dscr.filter((d): d is number => d != null && isFinite(d) && d <= 10);
  const avgDscr = dscrSane.length ? dscrSane.reduce((a, b) => a + b, 0) / dscrSane.length : NaN;

  const rateNum = parseNumeric(loan?.interestRate) ?? NaN;
  const rateLabel = isFinite(rateNum) && rateNum > 0 ? `${rateNum % 1 === 0 ? rateNum : +rateNum.toFixed(2)}%` : (loan?.interestRate || "");
  const tenureRaw: string = loan?.tenure || "";
  const tenNum = parseNumeric(tenureRaw) ?? NaN;
  const tenureYears = /month/i.test(tenureRaw) ? tenNum / 12 : tenNum;
  const tenureLabel = isFinite(tenureYears) && tenureYears > 0 ? `${Math.round(tenureYears)} Years` : tenureRaw;

  const piData = years.map((y, i) => ({ year: shortYear(y), Principal: principal[i] / 1e5, Interest: (interest[i] || 0) / 1e5 }));
  const balData = years.map((y, i) => ({ year: shortYear(y), Opening: opening[i] / 1e5, Closing: closing[i] / 1e5 }));
  const dscrData = years.map((y, i) => ({ year: shortYear(y), DSCR: dscr[i] ?? null }));
  const dsData = years.map((y, i) => ({ year: shortYear(y), "Debt Service": debtService[i] / 1e5 }));

  // Final loan years can show anomalous DSCR (loan fully repaid → tiny debt service
  // inflates the ratio to ~100+). Cap the chart axis for readability; the table keeps raw values.
  const dscrFinite = dscr.filter((d): d is number => d != null && isFinite(d));
  const dscrMax = dscrFinite.length ? Math.max(...dscrFinite) : 0;
  const dscrCap = Math.min(Math.max(dscrMax, 3), 8);
  const hasDscrOutlier = dscrMax > dscrCap + 0.001;

  const avgTxt = avgDscr;
  const dscrNote = !isFinite(avgTxt)
    ? "DSCR data was not available in this DPR, so debt-servicing capacity could not be assessed automatically."
    : `An average DSCR of ${fmt2(avgTxt)} over the loan period indicates the project generates about ${avgTxt.toFixed(1)}× the cash required to service its debt. ` +
      (avgTxt >= 1.75
        ? "This sits comfortably above the 1.5–2.0× banking comfort band and demonstrates strong repayment capacity."
        : avgTxt >= 1.2
        ? "This clears the 1.2× banking floor but leaves only a modest cushion."
        : "This is below the 1.2× banking floor and signals potential repayment stress.");

  return (
    <SectionPage>
      <PageHeader eyebrow="Debt Servicing" title="Term Loan Repayment Schedule" description={`DSCR Analysis — Term Loan ${toL(principalAmt)}${rateLabel ? ` @ ${rateLabel} p.a.` : ""}${tenureLabel ? ` | Repayment: ${tenureLabel}` : ""}`} />
      <SectionVerdict verdict={verdict} isLoading={isLoadingVerdict} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="surface-card rounded-xl px-6 py-5 bg-brand/[0.04]">
          <div className="font-display text-[26px] leading-[1.1] text-brand num-tabular">{toL(principalAmt)}</div>
          <div className="text-eyebrow text-muted-foreground mt-2">Loan Amount</div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5">{rateLabel ? `@ ${rateLabel} p.a.` : "Term loan"}</div>
        </div>
        <div className="surface-card rounded-xl px-6 py-5 bg-emerald-50/50">
          <div className="font-display text-[26px] leading-[1.1] text-emerald-600 num-tabular">{toL(totalPrincipal)}</div>
          <div className="text-eyebrow text-muted-foreground mt-2">Total Principal Repaid</div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5">{tenureLabel ? `Over ${tenureLabel.toLowerCase()}` : "Over loan tenure"}</div>
        </div>
        <div className="surface-card rounded-xl px-6 py-5 bg-amber-50/50">
          <div className="font-display text-[26px] leading-[1.1] text-amber-600 num-tabular">{toL(totalInterest)}</div>
          <div className="text-eyebrow text-muted-foreground mt-2">Total Interest Paid</div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5">{tenureLabel ? `Over ${tenureLabel.toLowerCase()}` : "Over loan tenure"}</div>
        </div>
        <div className="surface-card rounded-xl px-6 py-5 bg-violet-50/50">
          <div className="font-display text-[26px] leading-[1.1] text-violet-600 num-tabular">{isFinite(avgTxt) ? `${fmt2(avgTxt)}x` : "—"}</div>
          <div className="text-eyebrow text-muted-foreground mt-2">Average DSCR</div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5">Ideal: 1.75–3.0x</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartFrame eyebrow="Amortization" title="Principal vs Interest Payment (₹ Lacs)" chartHeight={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={piData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(220 16% 90%)" />
              <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtAxisL} />
              <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => `₹${(+v).toFixed(2)}L`} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
              <Bar dataKey="Principal" fill={NAVY} radius={[3, 3, 0, 0]} maxBarSize={26} />
              <Bar dataKey="Interest" fill={ROSE} radius={[3, 3, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame eyebrow="Outstanding" title="Loan Balance — Opening vs Closing (₹ Lacs)" chartHeight={300}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={balData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="loanOpen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={NAVY} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={NAVY} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(220 16% 90%)" />
              <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtAxisL} />
              <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => `₹${(+v).toFixed(2)}L`} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
              <Area type="monotone" dataKey="Opening" stroke={NAVY} strokeWidth={2.5} fill="url(#loanOpen)" dot={{ r: 3, fill: NAVY }} />
              <Area type="monotone" dataKey="Closing" stroke={EMERALD} strokeWidth={2.5} fill="transparent" dot={{ r: 3, fill: EMERALD }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame eyebrow="Coverage" title="DSCR Year-Wise" description={`Debt Service Coverage Ratio (A/B).${hasDscrOutlier ? " Final fully-repaid years exceed the axis and are capped for readability — see table for exact figures." : ""}`} chartHeight={300}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dscrData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(220 16% 90%)" />
              <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} domain={[0, dscrCap]} allowDataOverflow />
              <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => `${(+v).toFixed(2)}x`} />
              <ReferenceLine y={1.2} stroke={ROSE} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="DSCR" stroke={PURPLE} strokeWidth={2.5} dot={{ r: 3, fill: PURPLE }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame eyebrow="Outflow" title="Total Debt Service (Principal + Interest) (₹ Lacs)" description="Annual outflow to service the term loan." chartHeight={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dsData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(220 16% 90%)" />
              <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtAxisL} />
              <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => `₹${(+v).toFixed(2)}L`} />
              <Bar dataKey="Debt Service" fill={NAVY} radius={[3, 3, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      <div className="mt-6 surface-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary">
                <th className="text-eyebrow text-white/85 py-3.5 px-4 text-left whitespace-nowrap">Year</th>
                <th className="text-eyebrow text-white/85 text-right px-4 whitespace-nowrap">Opening Balance</th>
                <th className="text-eyebrow text-white/85 text-right px-4 whitespace-nowrap">Interest{rateLabel ? ` @ ${rateLabel}` : ""}</th>
                <th className="text-eyebrow text-white/85 text-right px-4 whitespace-nowrap">Principal Repaid</th>
                <th className="text-eyebrow text-white/85 text-right px-4 whitespace-nowrap">Total Repayment</th>
                <th className="text-eyebrow text-white/85 text-right px-4 whitespace-nowrap">Closing Balance</th>
                <th className="text-eyebrow text-white/85 text-right px-4 whitespace-nowrap">Net Cash Inflow (A)</th>
                <th className="text-eyebrow text-white/85 text-right px-4 whitespace-nowrap">Total Debt Service (B)</th>
                <th className="text-eyebrow text-white/85 text-right px-4 whitespace-nowrap">DSCR (A/B)</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y, i) => (
                <tr key={i} className={`border-t border-border ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                  <td className="font-medium text-[13px] py-3 px-4 whitespace-nowrap">{shortYear(y)}</td>
                  <td className="text-right num-tabular text-[13px] px-4">{rupee(opening[i])}</td>
                  <td className="text-right num-tabular text-[13px] px-4 text-rose-600">{rupee(interest[i])}</td>
                  <td className="text-right num-tabular text-[13px] px-4 text-brand">{rupee(principal[i])}</td>
                  <td className="text-right num-tabular text-[13px] px-4">{rupee(debtService[i])}</td>
                  <td className={`text-right num-tabular text-[13px] px-4 ${closing[i] > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>{rupee(closing[i])}</td>
                  <td className="text-right num-tabular text-[13px] px-4">{rupee(netInflow[i])}</td>
                  <td className="text-right num-tabular text-[13px] px-4">{rupee(debtService[i])}</td>
                  <td className="text-right num-tabular text-[13px] px-4 font-semibold text-brand">{dscr[i] != null ? `${fmt2(dscr[i] as number)}x` : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-primary text-white">
                <td className="text-eyebrow text-white/90 py-3.5 px-4" colSpan={7}>Average</td>
                <td className="text-right text-eyebrow text-white/90 px-4 whitespace-nowrap">Avg DSCR (Loan Period)</td>
                <td className="text-right num-tabular text-[14px] font-semibold px-4">{isFinite(avgDscr) ? `${fmt2(avgDscr)}x` : "—"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-5 py-4 bg-emerald-50/60 border-t border-emerald-100">
          <span className="text-[12.5px] font-semibold text-emerald-800">DSCR Interpretation: </span>
          <span className="text-[12.5px] text-emerald-900/80 leading-relaxed">{dscrNote}</span>
        </div>
      </div>
    </SectionPage>
  );
}

// ═══════════ ALTMAN Z-SCORE ═══════════
function AltmanSection({ ed }: { ed: any }) {
  const az = ed?.altmanZScore;
  const bs = ed?.balanceSheet;
  const pl = ed?.plAccount;

  let years: string[] = [];
  let A: number[] = [], B: number[] = [], C: number[] = [], D: number[] = [], E: number[] = [], Z: number[] = [];
  let computed = false;

  if (az && Array.isArray(az.zScore) && az.zScore.length) {
    years = az.years || bs?.years || [];
    A = az.workingCapitalToTotalAssets || [];
    B = az.earningsToTotalAssets || [];
    C = az.ebitToTotalAssets || [];
    D = az.equityToTotalLiabilities || [];
    E = az.salesToTotalAssets || [];
    Z = az.zScore;
  } else if (bs?.totalAssets && pl?.revenue) {
    // Fallback: compute from balance sheet + P&L (original Altman formula).
    computed = true;
    years = bs.years || [];
    const TA: number[] = bs.totalAssets || [];
    const NWC: number[] = bs.netWorkingCapital || [];
    const EBT: number[] = pl.ebt || [];
    const EBIT: number[] = pl.ebit || [];
    const EQ: number[] = bs.equity || [];
    const SALES: number[] = pl.revenue || [];
    const TL: number[] = (bs.termLoans || []).map((t: number, i: number) => (t || 0) + (bs.currentLiabilities?.[i] || 0));
    A = TA.map((ta, i) => (ta ? (NWC[i] || 0) / ta : NaN));
    B = TA.map((ta, i) => (ta ? (EBT[i] || 0) / ta : NaN));
    C = TA.map((ta, i) => (ta ? (EBIT[i] || 0) / ta : NaN));
    D = TL.map((tl, i) => (tl ? (EQ[i] || 0) / tl : NaN));
    E = TA.map((ta, i) => (ta ? (SALES[i] || 0) / ta : NaN));
    Z = A.map((a, i) => 1.2 * a + 1.4 * B[i] + 3.3 * C[i] + 0.6 * D[i] + 1.0 * E[i]);
  }

  if (!years.length || !Z.length) {
    return (
      <SectionPage>
        <PageHeader eyebrow="Solvency" title="Altman Z-Score Analysis" />
        <EmptyState />
      </SectionPage>
    );
  }

  const zoneCls: Record<Zone, { card: string; text: string; sub: string }> = {
    distress: { card: "bg-rose-50 border-rose-200", text: "text-rose-600", sub: "Distress Zone" },
    grey: { card: "bg-amber-50 border-amber-200", text: "text-amber-600", sub: "Grey Zone" },
    safe: { card: "bg-emerald-50 border-emerald-200", text: "text-emerald-600", sub: "Safe Zone" },
  };
  const trendData = years.map((y, i) => ({ year: shortYear(y), Z: +Z[i]?.toFixed(2) }));
  const compData = years.map((y, i) => ({ year: shortYear(y), A: 1.2 * A[i], B: 1.4 * B[i], C: 3.3 * C[i], D: 0.6 * D[i], E: 1.0 * E[i] }));
  const firstZone = altmanZone(Z[0]);
  const lastZone = altmanZone(Z[Z.length - 1]);
  const interp = `The Z-Score ${firstZone === lastZone ? `holds in the ${zoneCls[lastZone].sub} (${fmt2(Z[0])} → ${fmt2(Z[Z.length - 1])})` : `moves from ${fmt2(Z[0])} (${zoneCls[firstZone].sub}) to ${fmt2(Z[Z.length - 1])} (${zoneCls[lastZone].sub})`} across the projection${lastZone === "safe" ? ", indicating the business strengthens into a financially healthy position." : lastZone === "grey" ? ", indicating financial health that warrants monitoring." : ", signalling elevated bankruptcy risk that needs attention."}`;

  return (
    <SectionPage>
      <PageHeader eyebrow="Solvency" title="Altman Z-Score Analysis" description={`Financial health prediction model — FY${shortYear(years[0])} to FY${shortYear(years[years.length - 1])}.${computed ? " Computed from balance sheet & P&L." : ""}`} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border p-5 bg-rose-50 border-rose-200">
          <div className="font-display text-[19px] text-rose-700">Distress Zone</div>
          <div className="num-tabular text-[13px] text-rose-600 mt-1">Z &lt; 1.81</div>
          <div className="text-[12px] text-muted-foreground mt-1">High risk of bankruptcy</div>
        </div>
        <div className="rounded-2xl border p-5 bg-amber-50 border-amber-200">
          <div className="font-display text-[19px] text-amber-700">Grey Zone</div>
          <div className="num-tabular text-[13px] text-amber-600 mt-1">1.81 ≤ Z &lt; 2.99</div>
          <div className="text-[12px] text-muted-foreground mt-1">Uncertain — monitor closely</div>
        </div>
        <div className="rounded-2xl border p-5 bg-emerald-50 border-emerald-200">
          <div className="font-display text-[19px] text-emerald-700">Safe Zone</div>
          <div className="num-tabular text-[13px] text-emerald-600 mt-1">Z ≥ 2.99</div>
          <div className="text-[12px] text-muted-foreground mt-1">Financially healthy</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        {years.map((y, i) => {
          const zn = altmanZone(Z[i]);
          const c = zoneCls[zn];
          return (
            <div key={i} className={`rounded-xl border px-3 py-3 text-center ${c.card}`}>
              <div className="text-[10px] text-muted-foreground mb-1">{shortYear(y)}</div>
              <div className={`font-display text-[22px] leading-none num-tabular ${c.text}`}>{fmt2(Z[i])}</div>
              <div className={`text-[10px] mt-1 ${c.text}`}>{c.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartFrame eyebrow="Trend" title="Altman Z-Score Trend" description="Formula: 1.2·A + 1.4·B + 3.3·C + 0.6·D + 1.0·E" chartHeight={300}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(220 16% 90%)" />
              <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => `${(+v).toFixed(2)}`} />
              <ReferenceLine y={2.99} stroke={EMERALD} strokeDasharray="4 4" />
              <ReferenceLine y={1.81} stroke={ROSE} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="Z" stroke={NAVY} strokeWidth={2.5} dot={{ r: 3, fill: NAVY }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame eyebrow="Decomposition" title="Z-Score Components (Bar)" description="Weighted contribution of each component." chartHeight={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(220 16% 90%)" />
              <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => `${(+v).toFixed(2)}`} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
              <Bar dataKey="A" name="A (WC/TA)" stackId="z" fill={NAVY} maxBarSize={30} />
              <Bar dataKey="B" name="B (Earnings/TA)" stackId="z" fill={EMERALD} maxBarSize={30} />
              <Bar dataKey="C" name="C (EBIT/TA)" stackId="z" fill={GOLD} maxBarSize={30} />
              <Bar dataKey="D" name="D (Equity/Liab)" stackId="z" fill={PURPLE} maxBarSize={30} />
              <Bar dataKey="E" name="E (Sales/TA)" stackId="z" fill={NAVY_LIGHT} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 bg-muted/40 border-b border-border">
          <div className="text-[13px] font-semibold text-foreground">Formula (Private Firm): Z = 1.2·A + 1.4·B + 3.3·C + 0.6·D + 1.0·E</div>
          <div className="text-[11.5px] text-muted-foreground mt-1">A = Working Capital / Total Assets · B = Earnings / Total Assets · C = EBIT / Total Assets · D = Equity / Total Liabilities · E = Sales / Total Assets</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary">
                <th className="text-eyebrow text-white/85 py-3.5 px-4 text-left whitespace-nowrap">Component</th>
                {years.map((y, i) => (<th key={i} className="text-eyebrow text-white/85 text-right px-4 whitespace-nowrap">{shortYear(y)}</th>))}
              </tr>
            </thead>
            <tbody>
              {([
                ["A = WC / Total Assets", A],
                ["B = Earnings / Total Assets", B],
                ["C = EBIT / Total Assets", C],
                ["D = Equity / Total Liabilities", D],
                ["E = Sales / Total Assets", E],
              ] as [string, number[]][]).map(([label, arr], ri) => (
                <tr key={ri} className={`border-t border-border ${ri % 2 === 1 ? "bg-muted/30" : ""}`}>
                  <td className="text-[13px] py-2.5 px-4 whitespace-nowrap">{label}</td>
                  {years.map((_, ci) => (<td key={ci} className="text-right num-tabular text-[13px] px-4">{fmt2(arr[ci])}</td>))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-primary text-white">
                <td className="text-eyebrow text-white/90 py-3.5 px-4 whitespace-nowrap">Altman Z-Score</td>
                {years.map((_, ci) => {
                  const zn = altmanZone(Z[ci]);
                  const col = zn === "safe" ? "text-emerald-300" : zn === "grey" ? "text-amber-300" : "text-rose-300";
                  return (<td key={ci} className={`text-right num-tabular text-[13.5px] font-semibold px-4 ${col}`}>{fmt2(Z[ci])} {zn === "safe" ? "✓" : zn === "distress" ? "●" : "▲"}</td>);
                })}
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-5 py-4 bg-brand/[0.05] border-t border-border">
          <span className="text-[12.5px] font-semibold text-brand">Interpretation: </span>
          <span className="text-[12.5px] text-foreground/80 leading-relaxed">{interp}</span>
        </div>
      </div>
    </SectionPage>
  );
}

// ═══════════ BREAK-EVEN POINT & SENSITIVITY ═══════════
function BreakEvenSection({ ed }: { ed: any }) {
  const be = ed?.breakEvenAnalysis;
  const pl = ed?.plAccount;
  if (!be) {
    return (
      <SectionPage>
        <PageHeader eyebrow="Risk Analysis" title="Break-Even Point & Sensitivity Analysis" />
        <EmptyState />
      </SectionPage>
    );
  }
  const years: string[] = be.years || pl?.years || [];
  const hasBep = Array.isArray(be.bepKg) && be.bepKg.some((x: number | null) => x != null);
  const hasMos = Array.isArray(be.mosPercentage) && be.mosPercentage.some((x: number | null) => x != null);
  const hasSens = Array.isArray(be.sensitivityPriceDown10) && be.sensitivityPriceDown10.some((x: number | null) => x != null);

  if (!years.length || (!hasBep && !hasMos && !hasSens)) {
    return (
      <SectionPage>
        <PageHeader eyebrow="Risk Analysis" title="Break-Even Point & Sensitivity Analysis" />
        <EmptyState />
      </SectionPage>
    );
  }

  const lastIdx = years.length - 1;
  const baseEbt: number[] = pl?.ebt || [];
  const salesBepData = hasMos ? years.map((y, i) => ({ year: shortYear(y), "Actual Sales": (be.actualSales?.[i] || 0) / 1e5, "BEP Sales": (be.breakEvenSales?.[i] || 0) / 1e5, MOS: (be.mosValue?.[i] || 0) / 1e5 })) : [];
  const mosTrend = hasMos ? years.map((y, i) => ({ year: shortYear(y), "MOS %": be.mosPercentage?.[i] ?? null })) : [];
  const capData = hasBep ? years.map((y, i) => ({ year: shortYear(y), "Capacity %": be.operatingCapacityPct?.[i] ?? null })) : [];
  const divL = (v: number | null | undefined): number | null => (v == null || !isFinite(v) ? null : v / 1e5);
  const sensData = hasSens ? years.map((y, i) => ({ year: shortYear(y), "Base EBT": divL(baseEbt[i]), "Price ↓10%": divL(be.sensitivityPriceDown10?.[i]), "Cost ↑10%": divL(be.sensitivityExpenseUp10?.[i]) })) : [];

  return (
    <SectionPage>
      <PageHeader eyebrow="Risk Analysis" title="Break-Even Point & Sensitivity Analysis" description="BEP · Margin of Safety · Sensitivity Analysis." />

      {(hasBep || hasMos) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {hasBep && (
            <div className="surface-card rounded-xl px-6 py-5 bg-amber-50/50">
              <div className="font-display text-[24px] leading-[1.1] text-amber-600 num-tabular">{rupee(be.bepKg?.[0])} KGs</div>
              <div className="text-eyebrow text-muted-foreground mt-2">BEP ({shortYear(years[0])})</div>
              <div className="text-[11px] text-muted-foreground/70 mt-0.5">{be.operatingCapacityPct?.[0] != null ? `${fmt2(be.operatingCapacityPct[0])}% capacity` : ""}</div>
            </div>
          )}
          {hasBep && years.length > 1 && (
            <div className="surface-card rounded-xl px-6 py-5 bg-brand/[0.04]">
              <div className="font-display text-[24px] leading-[1.1] text-brand num-tabular">{rupee(be.bepKg?.[1])} KGs</div>
              <div className="text-eyebrow text-muted-foreground mt-2">BEP ({shortYear(years[1])})</div>
              <div className="text-[11px] text-muted-foreground/70 mt-0.5">{be.operatingCapacityPct?.[1] != null ? `${fmt2(be.operatingCapacityPct[1])}% capacity` : ""}</div>
            </div>
          )}
          {hasMos && (
            <div className="surface-card rounded-xl px-6 py-5 bg-emerald-50/50">
              <div className="font-display text-[24px] leading-[1.1] text-emerald-600 num-tabular">{fmtPct(be.mosPercentage?.[0])}</div>
              <div className="text-eyebrow text-muted-foreground mt-2">MOS% ({shortYear(years[0])})</div>
              <div className="text-[11px] text-muted-foreground/70 mt-0.5">{be.mosValue?.[0] != null ? `${toL(be.mosValue[0])} safety buffer` : ""}</div>
            </div>
          )}
          {hasMos && (
            <div className="surface-card rounded-xl px-6 py-5 bg-emerald-50/50">
              <div className="font-display text-[24px] leading-[1.1] text-emerald-600 num-tabular">{fmtPct(be.mosPercentage?.[lastIdx])}</div>
              <div className="text-eyebrow text-muted-foreground mt-2">MOS% ({shortYear(years[lastIdx])})</div>
              <div className="text-[11px] text-muted-foreground/70 mt-0.5">Strong safety margin</div>
            </div>
          )}
        </div>
      )}

      {!hasBep && !hasMos && hasSens && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-amber-50/60 border border-amber-100 text-[12.5px] text-amber-900/80">
          This DPR did not include the full Break-Even / Margin-of-Safety tables. The sensitivity analysis (EBT under price/cost stress) is shown below.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {hasMos && (
          <ChartFrame eyebrow="Safety" title="Actual Sales vs BEP Sales (₹ Lacs)" description="The gap between actual and BEP sales = Margin of Safety." chartHeight={300}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesBepData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(220 16% 90%)" />
                <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtAxisL} />
                <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => `₹${(+v).toFixed(2)}L`} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                <Bar dataKey="Actual Sales" fill={NAVY} radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="BEP Sales" fill={GOLD} radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="MOS" fill={EMERALD} radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        )}
        {hasMos && (
          <ChartFrame eyebrow="Trend" title="Margin of Safety % Trend" description="Rising MOS % indicates increasing financial safety." chartHeight={300}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mosTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mosGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={EMERALD} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={EMERALD} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(220 16% 90%)" />
                <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Math.round(v)}%`} />
                <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => `${(+v).toFixed(2)}%`} />
                <Area type="monotone" dataKey="MOS %" stroke={EMERALD} strokeWidth={2.5} fill="url(#mosGrad)" dot={{ r: 3, fill: EMERALD }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
        )}
        {hasBep && (
          <ChartFrame eyebrow="Utilization" title="Capacity Utilization %" description={be.installedCapacityKg?.[0] != null ? `Installed capacity = ${rupee(be.installedCapacityKg[0])} KGs per annum.` : undefined} chartHeight={300}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={capData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(220 16% 90%)" />
                <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} domain={[0, 110]} tickFormatter={(v: number) => `${Math.round(v)}%`} />
                <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => `${(+v).toFixed(2)}%`} />
                <ReferenceLine y={100} stroke={ROSE} strokeDasharray="4 4" />
                <Bar dataKey="Capacity %" fill={PURPLE} radius={[3, 3, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        )}
        {hasSens && (
          <ChartFrame eyebrow="Stress Test" title="Sensitivity Analysis — EBT (₹ Lacs)" description="Impact of price decrease 10% or cost increase 10%." chartHeight={300}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sensData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(220 16% 90%)" />
                <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtAxisL} />
                <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => `₹${(+v).toFixed(2)}L`} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                <ReferenceLine y={0} stroke={SLATE} />
                <Bar dataKey="Base EBT" fill={NAVY} radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="Price ↓10%" fill={ROSE} radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="Cost ↑10%" fill={GOLD} radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        )}
      </div>

      {hasBep && (
        <div className="mb-6">
          <div className="text-eyebrow text-gold mb-2">Break-Even Point — Detailed Calculation (₹)</div>
          <MatrixTable
            years={years}
            rows={[
              { label: "Gross Revenue (₹)", values: be.grossRevenue, bold: true, tone: "blue" },
              { label: "Cost of Goods Sold (₹)", values: be.variableCost },
              { label: "Contribution (₹)", values: be.contribution, bold: true },
              { label: "Selling Price per KG (₹)", values: be.sellingPricePerKg, fmt: fmt2 },
              { label: "Quantity (KGs)", values: be.quantityKg },
              { label: "Contribution per KG (₹)", values: be.contributionPerKg, fmt: fmt2 },
              { label: "Fixed Costs (₹)", values: be.fixedCost },
              { label: "BEP in KGs", values: be.bepKg, bold: true, tone: "blue" },
              { label: "Installed Capacity (KGs)", values: be.installedCapacityKg },
              { label: "Operating Capacity %", values: be.operatingCapacityPct, fmt: fmtPct },
            ]}
          />
        </div>
      )}

      {hasMos && (
        <div className="mb-6">
          <div className="text-eyebrow text-gold mb-2">Margin of Safety (₹)</div>
          <MatrixTable
            years={years}
            rows={[
              { label: "Actual Sales (₹)", values: be.actualSales, tone: "blue" },
              { label: "BEP Sales (₹)", values: be.breakEvenSales },
              { label: "MOS Value (₹)", values: be.mosValue, bold: true, tone: "emerald" },
              { label: "MOS Ratio", values: be.mosRatio, fmt: fmt2 },
              { label: "MOS Percentage (%)", values: be.mosPercentage, fmt: fmtPct, bold: true, tone: "emerald" },
            ]}
          />
        </div>
      )}

      {hasSens && (
        <div className="surface-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary">
                  <th className="text-eyebrow text-white/85 py-3.5 px-4 text-left whitespace-nowrap">Year</th>
                  <th className="text-eyebrow text-white/85 text-right px-4 whitespace-nowrap">Base EBT (₹)</th>
                  <th className="text-eyebrow text-white/85 text-right px-4 whitespace-nowrap">Selling Price ↓10% EBT (₹)</th>
                  <th className="text-eyebrow text-white/85 text-right px-4 whitespace-nowrap">Direct Cost ↑10% EBT (₹)</th>
                </tr>
              </thead>
              <tbody>
                {years.map((y, i) => {
                  const p = be.sensitivityPriceDown10?.[i];
                  const c = be.sensitivityExpenseUp10?.[i];
                  return (
                    <tr key={i} className={`border-t border-border ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                      <td className="font-medium text-[13px] py-3 px-4 whitespace-nowrap">{shortYear(y)}</td>
                      <td className="text-right num-tabular text-[13px] px-4 text-brand">{rupee(baseEbt[i])}</td>
                      <td className={`text-right num-tabular text-[13px] px-4 ${p != null && p < 0 ? "text-rose-600" : "text-emerald-600"}`}>{rupee(p)}</td>
                      <td className={`text-right num-tabular text-[13px] px-4 ${c != null && c < 0 ? "text-rose-600" : "text-amber-600"}`}>{rupee(c)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SectionPage>
  );
}

// ═══════════ MPBF (WORKING CAPITAL) ASSESSMENT ═══════════
// Tandon Committee (Method 1) & Chore Committee (Method 2) maximum permissible
// bank finance, computed entirely client-side from the balance sheet.
function MpbfSection({ ed }: { ed: any }) {
  const bs = ed?.balanceSheet;
  const years: string[] = bs?.years || [];
  const stock: number[] = bs?.closingStock || [];
  const recv: number[] = bs?.receivables || [];
  const curLiab: number[] = bs?.currentLiabilities || [];
  const wcLoan: number[] = bs?.workingCapitalLoan || [];

  if (!years.length || !stock.length || !curLiab.length) {
    return (
      <SectionPage>
        <PageHeader eyebrow="Working Capital" title="Working Capital — MPBF Analysis" />
        <EmptyState />
      </SectionPage>
    );
  }

  const totalCA = years.map((_, i) => (stock[i] || 0) + (recv[i] || 0));
  const otherCL = years.map((_, i) => (curLiab[i] || 0) - (wcLoan[i] || 0));
  const nwcGap = totalCA.map((ca, i) => ca - otherCL[i]);
  const margin25 = totalCA.map((ca) => 0.25 * ca);
  const m1 = nwcGap.map((g) => 0.75 * g);
  const m2 = totalCA.map((ca, i) => 0.75 * ca - otherCL[i]);
  const wcSanctioned = years.map((_, i) => wcLoan[i] || 0);
  const wcSanctionDisplay = wcSanctioned.find((x) => x > 0) || wcSanctioned[0] || 0;

  const cmpData = years.map((y, i) => ({ year: shortYear(y), "MPBF (M1)": m1[i] / 1e5, "MPBF (M2)": m2[i] / 1e5, "WC Limit": wcSanctioned[i] / 1e5 }));
  const caData = years.map((y, i) => ({ year: shortYear(y), "Total CA": totalCA[i] / 1e5, "Current Liab (excl WC)": otherCL[i] / 1e5, NWC: nwcGap[i] / 1e5 }));

  return (
    <SectionPage>
      <PageHeader eyebrow="Working Capital" title="Working Capital — MPBF Analysis" description={`Maximum Permissible Bank Finance — Methods 1 & 2 | WC Loan ${toL(wcSanctionDisplay)}.`} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="surface-card rounded-xl px-6 py-5 bg-brand/[0.04]">
          <div className="font-display text-[26px] leading-[1.1] text-brand num-tabular">{toL(wcSanctionDisplay)}</div>
          <div className="text-eyebrow text-muted-foreground mt-2">WC Loan Sanctioned</div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5">Cash-credit limit</div>
        </div>
        <div className="surface-card rounded-xl px-6 py-5 bg-emerald-50/50">
          <div className="font-display text-[26px] leading-[1.1] text-emerald-600 num-tabular">{toL(m1[0])}</div>
          <div className="text-eyebrow text-muted-foreground mt-2">MPBF M1 ({shortYear(years[0])})</div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5">75% of (CA − CL)</div>
        </div>
        <div className="surface-card rounded-xl px-6 py-5 bg-violet-50/50">
          <div className="font-display text-[26px] leading-[1.1] text-violet-600 num-tabular">{toL(m2[0])}</div>
          <div className="text-eyebrow text-muted-foreground mt-2">MPBF M2 ({shortYear(years[0])})</div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5">75% × CA − CL</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-brand/20 bg-brand/[0.04] p-5">
          <div className="font-display text-[16px] text-foreground mb-1">Method 1 (M1) — Tandon Committee</div>
          <div className="num-tabular text-[12.5px] text-brand mb-2">MPBF = 75% × (CA − CL)</div>
          <ul className="text-[12.5px] text-foreground/75 space-y-1 list-disc pl-4">
            <li>Borrower contributes 25% of (Current Assets − Current Liabilities)</li>
            <li>Bank finances up to 75% of the net working-capital gap</li>
            <li>Current margin: minimum 25% of NWC</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5">
          <div className="font-display text-[16px] text-foreground mb-1">Method 2 (M2) — Chore Committee</div>
          <div className="num-tabular text-[12.5px] text-violet-600 mb-2">MPBF = 75% × CA − CL</div>
          <ul className="text-[12.5px] text-foreground/75 space-y-1 list-disc pl-4">
            <li>Borrower contributes 25% of Total Current Assets</li>
            <li>More stringent — borrower needs higher own contribution</li>
            <li>Preferred by banks for better credit discipline</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartFrame eyebrow="Comparison" title="MPBF Methods Comparison (₹ Lacs)" chartHeight={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cmpData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(220 16% 90%)" />
              <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtAxisL} />
              <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => `₹${(+v).toFixed(2)}L`} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
              <Bar dataKey="MPBF (M1)" fill={NAVY} radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Bar dataKey="MPBF (M2)" fill={PURPLE} radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Bar dataKey="WC Limit" fill={EMERALD} radius={[3, 3, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
        <ChartFrame eyebrow="Position" title="Current Assets vs Liabilities (₹ Lacs)" chartHeight={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={caData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(220 16% 90%)" />
              <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtAxisL} />
              <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => `₹${(+v).toFixed(2)}L`} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
              <Bar dataKey="Total CA" fill={NAVY} radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Bar dataKey="Current Liab (excl WC)" fill={ROSE} radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Bar dataKey="NWC" fill={EMERALD} radius={[3, 3, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      <div className="mb-3">
        <div className="text-eyebrow text-gold mb-2">MPBF Working Capital Assessment (₹)</div>
        <MatrixTable
          years={years}
          rows={[
            { kind: "section", label: "Current Assets" },
            { label: "Inventory / Stock", values: stock, indent: true },
            { label: "Receivables / Debtors", values: recv, indent: true },
            { label: "Total Current Assets (CA)", values: totalCA, bold: true, tone: "blue" },
            { kind: "section", label: "Current Liabilities (excl. WC Loan)" },
            { label: "Sundry Creditors & Others", values: otherCL, indent: true },
            { kind: "section", label: "Working Capital Gap & MPBF" },
            { label: "Net Working Capital (NWC = CA − CL)", values: nwcGap, bold: true },
            { label: "25% of CA (Margin Required)", values: margin25 },
            { label: "MPBF — Method 1 = 75% × NWC", values: m1, bold: true, tone: "blue" },
            { label: "MPBF — Method 2 = 75%×CA − CL", values: m2, bold: true, tone: "rose" },
            { label: `WC Limit Sanctioned (${toL(wcSanctionDisplay)})`, values: wcSanctioned, bold: true, tone: "emerald" },
          ]}
        />
      </div>

      <div className="px-5 py-4 rounded-xl bg-amber-50/60 border border-amber-100">
        <span className="text-[12.5px] font-semibold text-amber-900">Note: </span>
        <span className="text-[12.5px] text-amber-900/80 leading-relaxed">The WC loan sanctioned ({toL(wcSanctionDisplay)}) is the lower of MPBF Method 1 and Method 2. As the business grows, the working-capital requirement rises while the bank limit stays fixed, requiring greater internal accruals. Inventory is shown as a single line where the raw-material / WIP / finished-goods split is not itemised in the DPR.</span>
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
function FinancialDashboardSection({ ed }: { ed: any }) {
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
  const fs = ed?.financialSummary;
  const pc = ed?.projectCost;
  const ls = ed?.loanSchedule;

  const num = (v: any): number | null => (typeof v === "number" && isFinite(v) ? v : null);
  const snapshot = insightFinancialSnapshot(ed);

  // ── Headline KPIs — only rendered when the report carries the figure ──
  const totalCost = pc?.totalCost != null ? fmtRupeesL(pc.totalCost) : (fs?.totalProjectCost || null);
  const avgDscrNum = parseNumeric(fe?.averageDscr) ?? meanFinite(ra?.dscr || []);
  const avgDscrStr = fe?.averageDscr || (avgDscrNum != null ? `${avgDscrNum.toFixed(2)}×` : null);
  const npvNum = parseNumeric(fe?.npv);

  const kpis = [
    { icon: Coins, label: "Total Project Cost", sub: "Capex + Working Capital", value: totalCost, valueClass: "text-blue-600", iconClass: "bg-blue-50 text-blue-600" },
    { icon: Landmark, label: "Term Loan", sub: ls?.interestRate ? `@ ${ls.interestRate}` : "Debt funding", value: fs?.termLoan || null, valueClass: "text-sky-600", iconClass: "bg-sky-50 text-sky-600" },
    { icon: TrendingUp, label: "IRR", sub: fe?.wacc ? `vs WACC ${fe.wacc}` : "Internal rate of return", value: fe?.irr || null, valueClass: "text-emerald-600", iconClass: "bg-emerald-50 text-emerald-600" },
    { icon: CheckCircle2, label: "NPV", sub: npvNum != null ? (npvNum > 0 ? "Positive — Viable" : "Negative — Review") : "Net present value", value: fe?.npv || null, valueClass: "text-emerald-600", iconClass: "bg-emerald-50 text-emerald-600" },
    { icon: Clock, label: "Payback Period", sub: "Simple method", value: fe?.simplePaybackPeriod || null, valueClass: "text-orange-600", iconClass: "bg-orange-50 text-orange-600" },
    { icon: Target, label: "Avg DSCR", sub: "Ideal: 1.75–3.0×", value: avgDscrStr, valueClass: "text-purple-600", iconClass: "bg-purple-50 text-purple-600" },
    { icon: BarChart3, label: "Profitability Index", sub: ">1 → Invest", value: fe?.profitabilityIndex || null, valueClass: "text-blue-600", iconClass: "bg-blue-50 text-blue-600" },
    { icon: Activity, label: "MIRR", sub: "Modified IRR", value: fe?.mirr || null, valueClass: "text-sky-600", iconClass: "bg-sky-50 text-sky-600" },
  ].filter((k) => k.value);

  // ── Chart series — all index-aligned to their statement's own year axis ──
  const plYears: string[] = pl?.years || [];
  const revProfitData = plYears.map((y, i) => ({
    year: y,
    Revenue: num(pl?.revenue?.[i]),
    "Gross Profit": num(pl?.grossProfit?.[i]),
    "Net Profit": num(pl?.netProfit?.[i]),
  }));
  const hasRevProfit = revProfitData.some((d) => d.Revenue != null || d["Gross Profit"] != null || d["Net Profit"] != null);
  const revMax = Math.max(0, ...revProfitData.flatMap((d) => [d.Revenue, d["Gross Profit"], d["Net Profit"]].map((x) => (x == null ? 0 : Math.abs(x)))));
  const fmtRevL = lakhFormatter(revMax);

  const marginData = plYears.map((y, i) => {
    const rev = num(pl?.revenue?.[i]);
    const gpAbs = num(pl?.grossProfit?.[i]);
    const npAbs = num(pl?.netProfit?.[i]);
    // Only derive a margin when both numerator and denominator exist — never
    // fabricate a 0% point from missing data.
    const gp = num(ra?.grossProfitMargin?.[i]) ?? (rev && gpAbs != null ? (gpAbs / rev) * 100 : null);
    const np = num(ra?.netProfitMargin?.[i]) ?? (rev && npAbs != null ? (npAbs / rev) * 100 : null);
    return { year: y, "GP %": gp != null ? +gp.toFixed(1) : null, "NP %": np != null ? +np.toFixed(1) : null };
  });
  const hasMargins = marginData.some((d) => d["GP %"] != null || d["NP %"] != null);

  const raYears: string[] = ra?.years || [];
  const ratioData = raYears.map((y, i) => ({
    year: y,
    DSCR: num(ra?.dscr?.[i]),
    "Current Ratio": num(ra?.currentRatio?.[i]),
    "Debt-Equity": num(ra?.debtEquityRatio?.[i]),
  }));
  const hasRatios = ratioData.some((d) => d.DSCR != null || d["Current Ratio"] != null || d["Debt-Equity"] != null);

  const cfYears: string[] = cf?.years || [];
  const cashSource = (cf?.netCashFlow || []).some((v: any) => num(v) != null) ? cf?.netCashFlow : cf?.operatingCashFlow;
  const cashData = cfYears.map((y, i) => ({ year: y, value: num(cashSource?.[i]) }));
  const hasCash = cashData.some((d) => d.value != null);
  const cashMax = Math.max(0, ...cashData.map((d) => (d.value == null ? 0 : Math.abs(d.value))));
  const fmtCashL = lakhFormatter(cashMax);

  // ── Actual sales vs break-even sales ──
  // Break-even sales is derived from the report's own P&L using the standard
  // formula: BEP Sales = Fixed Costs ÷ Contribution Margin Ratio, where
  // contribution ratio = grossProfit / revenue and fixed costs = operating
  // expenses + depreciation + interest. Computed per-year only when the inputs
  // exist (revenue, positive grossProfit, expenses) — never fabricated.
  const bepData = plYears.map((y, i) => {
    const rev = num(pl?.revenue?.[i]);
    const gp = num(pl?.grossProfit?.[i]);
    const exp = num(pl?.expenses?.[i]);
    let bep: number | null = null;
    if (rev != null && rev > 0 && gp != null && gp > 0 && exp != null) {
      const fixedCost = exp + (num(pl?.depreciation?.[i]) ?? 0) + (num(pl?.interest?.[i]) ?? 0);
      bep = (fixedCost * rev) / gp;
    }
    return { year: y, "Actual Sales": rev, "BEP Sales": bep };
  });
  const hasBep = bepData.some((d) => d["BEP Sales"] != null && d["Actual Sales"] != null);
  const bepMax = Math.max(0, ...bepData.flatMap((d) => [d["Actual Sales"], d["BEP Sales"]].map((x) => (x == null ? 0 : Math.abs(x)))));
  const fmtBepL = lakhFormatter(bepMax);

  // ── Investment summary — skips any metric the report doesn't provide ──
  const invRows = [
    { label: "Total Investment", value: totalCost, tint: "bg-blue-50/70", vc: "text-blue-700" },
    { label: "IRR", value: fe?.irr, tint: "bg-emerald-50/70", vc: "text-emerald-700" },
    { label: "MIRR", value: fe?.mirr, tint: "bg-sky-50/70", vc: "text-sky-700" },
    { label: "WACC", value: fe?.wacc, tint: "bg-purple-50/70", vc: "text-purple-700" },
    { label: "NPV", value: fe?.npv, tint: "bg-emerald-50/70", vc: "text-emerald-700" },
    { label: "Profitability Index", value: fe?.profitabilityIndex, tint: "bg-blue-50/70", vc: "text-blue-700" },
    { label: "Break-Even Point", value: fe?.bep, tint: "bg-sky-50/70", vc: "text-sky-700" },
    { label: "Margin of Safety", value: fe?.marginOfSafety, tint: "bg-blue-50/70", vc: "text-blue-700" },
    { label: "Altman Z-Score", value: fe?.altmanZScore, tint: "bg-purple-50/70", vc: "text-purple-700" },
    { label: "Average DSCR", value: avgDscrStr, tint: "bg-sky-50/70", vc: "text-sky-700" },
    { label: "Payback (Simple)", value: fe?.simplePaybackPeriod, tint: "bg-orange-50/70", vc: "text-orange-700" },
    { label: "Payback (DCF)", value: fe?.discountedPaybackPeriod, tint: "bg-rose-50/70", vc: "text-rose-700" },
  ].filter((r) => r.value);

  const anyChart = hasRevProfit || hasMargins || hasRatios || hasCash || hasBep;

  return (
    <SectionPage>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <PageHeader
          eyebrow="At a Glance"
          title="Financial Dashboard"
          description="The complete projection overview — every key figure, trend and ratio in one read."
        />
        {fs?.fiscalYear && (
          <span className="shrink-0 mt-1 rounded-full bg-amber-50 text-amber-700 text-[12px] font-medium px-3.5 py-1.5 border border-amber-100">
            {fs.fiscalYear}
          </span>
        )}
      </div>

      {snapshot && (
        <div className="surface-card rounded-2xl p-8 mb-8 border-l-2 border-l-brand">
          <div className="text-eyebrow text-brand mb-2">Financial Snapshot</div>
          <p className="font-display text-[19px] leading-[1.55] text-foreground/90">{snapshot}</p>
        </div>
      )}

      {kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map((k) => (
            <DashKpi key={k.label} {...k} />
          ))}
        </div>
      )}

      {anyChart && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {hasRevProfit && (
            <DashCard title="Revenue & Profitability" subtitle="Projected P&L summary (₹ in Lakhs)">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={revProfitData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtRevL} width={48} />
                    <RechartsTooltip contentStyle={tooltipStyle} formatter={(val: any) => `₹${fmtRevL(Number(val))}`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="Revenue" stroke={NAVY} fill={NAVY} fillOpacity={0.12} strokeWidth={2.5} connectNulls />
                    <Line type="monotone" dataKey="Gross Profit" stroke={EMERALD} strokeWidth={2} dot={false} connectNulls />
                    <Line type="monotone" dataKey="Net Profit" stroke={GOLD} strokeWidth={2} dot={false} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}

          {hasMargins && (
            <DashCard title="Profitability Margins (%)" subtitle="Gross profit % & net profit % trends">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={marginData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <RechartsTooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="GP %" stroke={NAVY} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    <Line type="monotone" dataKey="NP %" stroke={EMERALD} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}

          {hasRatios && (
            <DashCard title="Key Financial Ratios" subtitle="DSCR, current ratio & debt-equity">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ratioData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="DSCR" stroke={NAVY} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    <Line type="monotone" dataKey="Current Ratio" stroke={EMERALD} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    <Line type="monotone" dataKey="Debt-Equity" stroke={PURPLE} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}

          {hasCash && (
            <DashCard title="Net Cash Inflows (₹ Lakhs)" subtitle="Annual surplus cash generated">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtCashL} width={48} />
                    <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(221 83% 53% / 0.05)" }} formatter={(val: any) => `₹${fmtCashL(Number(val))}`} />
                    <Bar dataKey="value" name="Net Cash Inflow" fill={NAVY} radius={[5, 5, 0, 0]} maxBarSize={46} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}

          {hasBep && (
            <DashCard title="Actual Sales vs Break-Even Sales (₹ Lakhs)" subtitle="Gap between actual and break-even shows margin of safety">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bepData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 92%)" vertical={false} />
                    <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={fmtBepL} width={48} />
                    <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(221 83% 53% / 0.05)" }} formatter={(val: any) => `₹${fmtBepL(Number(val))}`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Actual Sales" fill={NAVY} radius={[5, 5, 0, 0]} maxBarSize={26} />
                    <Bar dataKey="BEP Sales" fill={GOLD} radius={[5, 5, 0, 0]} maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashCard>
          )}
        </div>
      )}

      {invRows.length > 0 && (
        <DashCard title="Investment Summary" subtitle="Headline viability metrics at a glance">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {invRows.map((r) => (
              <div key={r.label} className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${r.tint}`}>
                <span className="text-[13px] text-muted-foreground">{r.label}</span>
                <span className={`font-display text-[15px] num-tabular font-semibold ${r.vc}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </DashCard>
      )}

      {kpis.length === 0 && !anyChart && invRows.length === 0 && <EmptyState />}
    </SectionPage>
  );
}

function DashCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="surface-card rounded-2xl p-7">
      <h3 className="font-display text-[18px] mb-1">{title}</h3>
      {subtitle && <p className="text-[12.5px] text-muted-foreground mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

function DashKpi({ icon: Icon, label, value, sub, valueClass, iconClass }: { icon: any; label: string; value: string | null; sub?: string; valueClass: string; iconClass: string }) {
  return (
    <div className="surface-card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconClass}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <span className="text-eyebrow text-muted-foreground/50">Key</span>
      </div>
      <div className={`font-display text-[22px] leading-[1.1] num-tabular tracking-tight ${valueClass}`}>{value || "—"}</div>
      <div className="text-[13px] font-medium text-foreground mt-1">{label}</div>
      {sub && <div className="text-[11.5px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
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
