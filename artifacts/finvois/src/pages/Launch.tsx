import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetReport, useSetReportTheme } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, ArrowRight, Check, AlertCircle } from "lucide-react";
import {
  useTheme,
  resolveTheme,
  THEMES,
  THEME_ORDER,
  type ThemeId,
} from "@/contexts/theme";

import finnyHello from "@/assets/finny/finny-hello.png";
import finnyReading from "@/assets/finny/finny-reading.png";
import finnyAnalyzing from "@/assets/finny/finny-analyzing.png";
import finnyProcessing from "@/assets/finny/finny-processing.png";
import finnyDone from "@/assets/finny/finny-done.png";
import ffMark from "@/assets/finny/ff-mark.png";

type Step = "select" | "processing";

// Cinematic minimum so Finny's processing always feels deliberate, even if the
// backend finishes extraction sooner.
const MIN_DURATION_MS = 27_000;

interface Stage {
  at: number; // fraction of MIN_DURATION when this stage begins
  label: string;
  sub: string;
  img: string;
}

const STAGES: Stage[] = [
  { at: 0.0, label: "Finny is reading your DPR", sub: "Scanning every page for the numbers that matter…", img: finnyReading },
  { at: 0.18, label: "Extracting financial statements", sub: "Pulling P&L, balance sheet and cash flows…", img: finnyProcessing },
  { at: 0.4, label: "Crunching ratios & DSCR", sub: "Computing leverage, liquidity and coverage…", img: finnyProcessing },
  { at: 0.62, label: "Running viability checks", sub: "Altman Z-Score, break-even and sensitivity…", img: finnyAnalyzing },
  { at: 0.85, label: "Polishing your dashboard", sub: "Almost there — assembling your briefing…", img: finnyDone },
];

export default function Launch() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const { setTheme } = useTheme();
  const setThemeMutation = useSetReportTheme();

  const [step, setStep] = useState<Step>("select");
  const [selected, setSelected] = useState<ThemeId | null>(null);
  const [preview, setPreview] = useState<ThemeId>("finny");
  const [pendingTheme, setPendingTheme] = useState<ThemeId | null>(null);
  const [progress, setProgress] = useState(0);
  const startedAt = useRef<number | null>(null);
  const lastPoll = useRef(0);

  // Poll the report until extraction settles. Keep polling for ANY non-terminal
  // status (including the brief window before the first response) and stop only
  // once it's "ready"/"failed". refetchIntervalInBackground is essential here:
  // the app runs inside the Replit preview iframe, which is often not the
  // focused window, and React Query pauses interval polling for unfocused
  // windows by default — that's what left the bar stuck at 95%.
  const { data: report, refetch } = useGetReport(id, {
    query: {
      refetchInterval: (q: { state: { data?: { status?: string } } }) => {
        const s = q.state.data?.status;
        return s === "ready" || s === "failed" ? false : 1500;
      },
      refetchIntervalInBackground: true,
    } as never,
  });
  const status = report?.status;

  // Live-preview the chosen/hovered theme across the whole launch surface.
  const activeTheme = selected ?? preview;
  useEffect(() => {
    setTheme(activeTheme);
  }, [activeTheme, setTheme]);

  // If the report already has a saved theme, default the highlight to it.
  useEffect(() => {
    if (report?.theme) setPreview(resolveTheme(report.theme));
  }, [report?.theme]);

  const handleChoose = async (theme: ThemeId) => {
    setSelected(theme);
    setStep("processing");
    startedAt.current = Date.now();
    try {
      await setThemeMutation.mutateAsync({ id, data: { theme } });
    } catch {
      // Non-fatal: the cinematic continues; theme is applied client-side and
      // the dashboard will re-read on load.
    }
  };

  // Drive the cinematic progress bar + navigate when both the minimum duration
  // has elapsed AND the backend reports the report is ready.
  useEffect(() => {
    if (step !== "processing") return;
    let raf = 0;
    const tick = () => {
      // Extraction failed: stop the cinematic loop so we don't burn CPU
      // animating behind the failed-state UI.
      if (status === "failed") return;
      const start = startedAt.current ?? Date.now();
      const elapsed = Date.now() - start;
      const timeFrac = Math.min(elapsed / MIN_DURATION_MS, 1);
      const ready = status === "ready";
      // While processing, track the cinematic up to 95%. Once the cinematic has
      // elapsed but the report still isn't ready, keep the bar visibly alive by
      // creeping asymptotically toward 0.99 (instead of freezing at 95%, which
      // reads as "stuck"). Snap to 100% the moment the report is ready.
      let target: number;
      if (ready) {
        target = timeFrac;
      } else if (timeFrac < 1) {
        target = Math.min(timeFrac, 0.95);
      } else {
        const waitMs = elapsed - MIN_DURATION_MS;
        target = 0.95 + 0.04 * (1 - Math.exp(-waitMs / 9000));
      }
      setProgress(target);
      if (timeFrac >= 1 && ready) {
        setLocation(`/reports/${id}`);
        return;
      }
      // Safety net: if the cinematic has finished but we still haven't seen a
      // terminal status, force a (throttled) refetch so a stalled background
      // poll can never leave the user stranded at 95%.
      if (timeFrac >= 1 && !ready && status !== "failed") {
        const now = Date.now();
        if (now - lastPoll.current > 1500) {
          lastPoll.current = now;
          refetch();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, status, id, setLocation, refetch]);

  const currentStage = useMemo(() => {
    let s = STAGES[0];
    for (const stage of STAGES) if (progress >= stage.at) s = stage;
    return s;
  }, [progress]);

  const failed = status === "failed";

  return (
    <div className="relative min-h-screen overflow-hidden bg-shell-stage flex items-center justify-center p-6">
      {/* soft grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <AnimatePresence mode="wait">
        {step === "select" ? (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-5xl"
          >
            <div className="flex flex-col items-center text-center mb-10">
              <motion.img
                src={finnyHello}
                alt="Finny"
                className="w-28 md:w-32 mb-5 drop-shadow-2xl"
                initial={{ scale: 0.85, rotate: -4 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 14 }}
              />
              <div className="text-eyebrow-lg text-shell-hero-eyebrow mb-3">
                Step 1 of 2 · Choose a look
              </div>
              <h1 className="font-display text-[34px] md:text-[44px] leading-tight text-shell-hero-fg mb-3">
                How should this report look?
              </h1>
              <p className="text-shell-hero-fg/65 max-w-xl">
                Pick a branding theme for this report. You can always tell — the
                numbers, charts and tables stay exactly the same.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {THEME_ORDER.map((tid) => {
                const t = THEMES[tid];
                const isPreview = activeTheme === tid;
                return (
                  <button
                    key={tid}
                    type="button"
                    onMouseEnter={() => !selected && setPreview(tid)}
                    onFocus={() => !selected && setPreview(tid)}
                    onClick={() => { setPreview(tid); setPendingTheme(tid); }}
                    disabled={setThemeMutation.isPending}
                    data-testid={`theme-card-${tid}`}
                    className={`group relative text-left rounded-2xl p-5 transition-all focus:outline-none ${
                      isPreview
                        ? "ring-2 ring-shell-accent scale-[1.02]"
                        : "ring-1 ring-white/10 hover:ring-white/25"
                    } bg-glass-tile backdrop-blur`}
                  >
                    {/* Theme mini-preview using the theme's own swatch */}
                    <div
                      className="h-28 rounded-xl mb-4 overflow-hidden flex"
                      style={{ background: t.swatch.bg }}
                    >
                      <div
                        className="w-1/3 h-full flex flex-col gap-1.5 p-2.5"
                        style={{ borderRight: `1px solid ${t.swatch.accent}33` }}
                      >
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ background: t.swatch.accent }}
                        />
                        <div className="w-full h-1.5 rounded-full bg-white/20" />
                        <div className="w-3/4 h-1.5 rounded-full bg-white/15" />
                        <div className="w-2/3 h-1.5 rounded-full bg-white/10" />
                      </div>
                      <div className="flex-1 p-3 flex flex-col justify-between">
                        <div
                          className="w-2/3 h-2 rounded-full"
                          style={{ background: t.swatch.accent }}
                        />
                        <div className="grid grid-cols-3 gap-1.5">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="h-7 rounded-md"
                              style={{ background: `${t.swatch.accent}22`, border: `1px solid ${t.swatch.accent}44` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-display text-[17px] text-shell-tile-fg">
                          {t.name}
                        </div>
                        <div className="text-eyebrow text-shell-tile-label mt-0.5">
                          {t.tagline}
                        </div>
                      </div>
                      <span
                        className={`flex items-center justify-center w-7 h-7 rounded-full transition-all ${
                          isPreview ? "bg-shell-accent text-shell-accent-foreground" : "bg-white/10 text-shell-tile-label"
                        }`}
                      >
                        {isPreview ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-shell-tile-label mt-2 leading-snug">
                      {t.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center mt-8">
              <Button
                size="lg"
                onClick={() => setPendingTheme(activeTheme)}
                disabled={setThemeMutation.isPending}
                className="bg-shell-accent text-shell-accent-foreground hover:opacity-90 gap-2 px-8"
                data-testid="button-confirm-theme"
              >
                {setThemeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Continue with {THEMES[activeTheme].name}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative w-full max-w-lg text-center"
          >
            {failed ? (
              <div className="flex flex-col items-center">
                <AlertCircle className="w-12 h-12 text-rose-400 mb-4" />
                <h2 className="font-display text-2xl text-shell-hero-fg mb-2">
                  Finny hit a snag
                </h2>
                <p className="text-shell-hero-fg/65 mb-6">
                  We couldn't process this report. Please try uploading it again.
                </p>
                <Button
                  onClick={() => setLocation("/")}
                  className="bg-shell-accent text-shell-accent-foreground hover:opacity-90"
                  data-testid="button-launch-home"
                >
                  Back to Home
                </Button>
              </div>
            ) : (
              <>
                <div className="relative mx-auto w-44 h-44 mb-8">
                  {/* pulsing halo */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ background: "radial-gradient(circle, hsl(var(--shell-accent-glow, 43 74% 52%) / 0.0) 60%, transparent 70%)" }}
                    animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.9, 0.5] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute inset-2 rounded-full border-2 border-shell-accent/40"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  />
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentStage.img}
                      src={currentStage.img}
                      alt="Finny working"
                      className="absolute inset-0 m-auto w-36 h-36 object-contain drop-shadow-2xl"
                      initial={{ opacity: 0, scale: 0.9, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -8 }}
                      transition={{ duration: 0.5 }}
                    />
                  </AnimatePresence>
                </div>

                <AnimatePresence mode="wait">
                  <motion.h2
                    key={currentStage.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                    className="font-display text-[26px] md:text-[30px] text-shell-hero-fg mb-2"
                    data-testid="processing-label"
                  >
                    {currentStage.label}
                  </motion.h2>
                </AnimatePresence>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentStage.sub}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="text-shell-hero-fg/60 mb-8 min-h-[24px]"
                  >
                    {currentStage.sub}
                  </motion.p>
                </AnimatePresence>

                {/* progress bar */}
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-shell-accent"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-center gap-2 mt-4 text-shell-hero-fg/50 text-[13px]">
                  <img src={ffMark} alt="" className="w-4 h-4 opacity-80" />
                  <span>{Math.round(progress * 100)}% · Finvois AI</span>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog
        open={pendingTheme !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTheme(null);
        }}
      >
        <AlertDialogContent data-testid="dialog-confirm-theme">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Continue with {pendingTheme ? THEMES[pendingTheme].name : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to proceed with{" "}
              {pendingTheme ? THEMES[pendingTheme].name : ""}? This branding will
              be applied to your report — you can change it later from the
              dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-theme">
              Go back
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-proceed-theme"
              onClick={() => {
                if (pendingTheme) {
                  const chosen = pendingTheme;
                  setPendingTheme(null);
                  handleChoose(chosen);
                }
              }}
            >
              Yes, proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
