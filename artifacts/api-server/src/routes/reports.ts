import { Router, type IRouter } from "express";
import multer from "multer";
// Import the internal module to avoid pdf-parse@1.1.1 reading a test file at startup
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { db, reportsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { extractDprData, extractSupplementalDpr, generateExecutiveSummary, generateSectionVerdicts } from "../lib/extractDpr";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

/**
 * Background pipeline for a single report: extract the DPR, then pre-generate
 * the AI executive summary and per-section verdicts BEFORE flipping status to
 * "ready". The launch cinematic waits on "ready", so this work is covered by
 * that window and the dashboard opens with the briefing already in place
 * instead of kicking off ~15s LLM calls after the user arrives. The summary and
 * verdicts are cached inside extractedData (reserved `_executiveSummary` /
 * `_sectionVerdicts` keys) so no schema/migration is required. A failure in the
 * AI step does NOT block the report from becoming ready — those endpoints fall
 * back to on-demand generation.
 */
async function processReport(id: number, rawText: string): Promise<void> {
  try {
    const extractedData = await extractDprData(rawText);
    const bp = extractedData.businessProfile as Record<string, unknown> | undefined;
    const fs = extractedData.financialSummary as Record<string, unknown> | undefined;

    const [summaryRes, verdictsRes] = await Promise.allSettled([
      generateExecutiveSummary(extractedData),
      generateSectionVerdicts(extractedData),
    ]);
    if (summaryRes.status === "rejected") {
      logger.error({ id, err: summaryRes.reason }, "Executive summary generation failed; will lazy-generate on demand");
    }
    if (verdictsRes.status === "rejected") {
      logger.error({ id, err: verdictsRes.reason }, "Section verdicts generation failed; will lazy-generate on demand");
    }

    const enriched: Record<string, unknown> = {
      ...extractedData,
      _executiveSummary: summaryRes.status === "fulfilled" ? summaryRes.value : null,
      _sectionVerdicts: verdictsRes.status === "fulfilled" ? verdictsRes.value : null,
    };

    await db
      .update(reportsTable)
      .set({
        firmName: (bp?.firmName as string) || "Unknown Firm",
        proprietorName: (bp?.proprietorName as string) || "Unknown Proprietor",
        lineOfActivity: (bp?.lineOfActivity as string) || null,
        totalProjectCost: (fs?.totalProjectCost as string) || null,
        extractedData: enriched,
        status: "ready",
        errorMessage: null,
      })
      .where(eq(reportsTable.id, id));

    logger.info({ id }, "Report processing completed (extraction + AI briefing)");
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, id }, "Report processing failed");
    await db
      .update(reportsTable)
      .set({ status: "failed", errorMessage: errMsg })
      .where(eq(reportsTable.id, id));
  }
}

router.get("/reports", async (req, res): Promise<void> => {
  const reports = await db
    .select({
      id: reportsTable.id,
      firmName: reportsTable.firmName,
      proprietorName: reportsTable.proprietorName,
      lineOfActivity: reportsTable.lineOfActivity,
      totalProjectCost: reportsTable.totalProjectCost,
      status: reportsTable.status,
      createdAt: reportsTable.createdAt,
    })
    .from(reportsTable)
    .orderBy(desc(reportsTable.createdAt));

  res.json(reports.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/reports/upload", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No PDF file uploaded. Send a file with key 'file'." });
    return;
  }

  if (req.file.mimetype !== "application/pdf" && !req.file.originalname.endsWith(".pdf")) {
    res.status(400).json({ error: "Only PDF files are accepted." });
    return;
  }

  let rawText = "";
  try {
    const parsed = await pdfParse(req.file.buffer);
    rawText = parsed.text;
  } catch (err) {
    req.log.error({ err }, "Failed to parse PDF");
    res.status(400).json({ error: "Could not read the PDF file. Please ensure it is a valid, text-based PDF." });
    return;
  }

  const [placeholder] = await db
    .insert(reportsTable)
    .values({
      firmName: "Processing...",
      proprietorName: "Processing...",
      status: "processing",
      rawText,
    })
    .returning();

  res.status(201).json({
    id: placeholder.id,
    firmName: placeholder.firmName,
    proprietorName: placeholder.proprietorName,
    createdAt: placeholder.createdAt.toISOString(),
    status: placeholder.status,
    theme: placeholder.theme,
    extractedData: {},
  });

  setImmediate(() => {
    void processReport(placeholder.id, rawText);
  });
});

router.post("/reports/:id/retry", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }

  const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, id));
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  if (!report.rawText) {
    res.status(400).json({ error: "No raw text stored for this report; please re-upload." });
    return;
  }

  await db
    .update(reportsTable)
    .set({ status: "processing", errorMessage: null })
    .where(eq(reportsTable.id, id));

  res.status(202).json({ id, status: "processing" });

  setImmediate(() => {
    void processReport(id, report.rawText!);
  });
});

// One-off backfill: extract ONLY the report-specific MPBF working-capital
// schedule + production series and MERGE them into the existing extractedData
// without touching any other previously-extracted fields.
router.post("/reports/:id/supplemental", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }

  const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, id));
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  if (!report.rawText) {
    res.status(400).json({ error: "No raw text stored for this report; please re-upload." });
    return;
  }

  try {
    const supplemental = await extractSupplementalDpr(report.rawText);
    const merged = {
      ...((report.extractedData as Record<string, unknown>) ?? {}),
      mpbfSchedule: supplemental.mpbfSchedule ?? null,
      productionSeries: supplemental.productionSeries ?? null,
    };
    await db
      .update(reportsTable)
      .set({ extractedData: merged })
      .where(eq(reportsTable.id, id));
    logger.info({ id }, "Supplemental extraction merged");
    res.json({
      id,
      mpbfSchedule: supplemental.mpbfSchedule ?? null,
      productionSeries: supplemental.productionSeries ?? null,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    req.log.error({ err, id }, "Supplemental extraction failed");
    res.status(500).json({ error: errMsg });
  }
});

router.get("/reports/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }

  const [report] = await db
    .select()
    .from(reportsTable)
    .where(eq(reportsTable.id, id));

  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  res.json({
    id: report.id,
    firmName: report.firmName,
    proprietorName: report.proprietorName,
    createdAt: report.createdAt.toISOString(),
    status: report.status,
    theme: report.theme,
    extractedData: report.extractedData ?? {},
  });
});

const VALID_THEMES = ["finny", "blue", "white-gold"] as const;

router.patch("/reports/:id/theme", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }

  const theme = (req.body as { theme?: unknown })?.theme;
  if (typeof theme !== "string" || !VALID_THEMES.includes(theme as (typeof VALID_THEMES)[number])) {
    res.status(400).json({ error: `Invalid theme. Must be one of: ${VALID_THEMES.join(", ")}` });
    return;
  }

  const [updated] = await db
    .update(reportsTable)
    .set({ theme })
    .where(eq(reportsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  res.json({
    id: updated.id,
    firmName: updated.firmName,
    proprietorName: updated.proprietorName,
    createdAt: updated.createdAt.toISOString(),
    status: updated.status,
    theme: updated.theme,
    extractedData: updated.extractedData ?? {},
  });
});

router.delete("/reports/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }

  const [deleted] = await db
    .delete(reportsTable)
    .where(eq(reportsTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/reports/:id/summary", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }

  const [report] = await db
    .select()
    .from(reportsTable)
    .where(eq(reportsTable.id, id));

  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  const ed = report.extractedData as Record<string, unknown> | null;
  if (report.status !== "ready" || !ed) {
    res.status(400).json({ error: "Report is not yet processed. Please wait for extraction to complete." });
    return;
  }

  // Serve the briefing pre-generated during background processing; only fall
  // back to an on-demand LLM call for older reports that predate caching.
  const cachedSummary = ed._executiveSummary as Record<string, unknown> | null | undefined;
  if (cachedSummary) {
    res.json({ id, ...cachedSummary });
    return;
  }

  try {
    const summary = await generateExecutiveSummary(ed);
    const patch = JSON.stringify({ _executiveSummary: summary });
    await db
      .update(reportsTable)
      .set({ extractedData: sql`COALESCE(${reportsTable.extractedData}, '{}'::jsonb) || ${patch}::jsonb` })
      .where(eq(reportsTable.id, id));
    res.json({ id, ...summary });
  } catch (err) {
    req.log.error({ err }, "Failed to generate executive summary");
    res.status(500).json({ error: "Failed to generate executive summary" });
  }
});

router.get("/reports/:id/verdicts", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }

  const [report] = await db
    .select()
    .from(reportsTable)
    .where(eq(reportsTable.id, id));

  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  const ed = report.extractedData as Record<string, unknown> | null;
  if (report.status !== "ready" || !ed) {
    res.status(400).json({ error: "Report is not yet processed. Please wait for extraction to complete." });
    return;
  }

  const cachedVerdicts = ed._sectionVerdicts as Record<string, unknown> | null | undefined;
  if (cachedVerdicts) {
    res.json({ id, verdicts: cachedVerdicts });
    return;
  }

  try {
    const verdicts = await generateSectionVerdicts(ed);
    const patch = JSON.stringify({ _sectionVerdicts: verdicts });
    await db
      .update(reportsTable)
      .set({ extractedData: sql`COALESCE(${reportsTable.extractedData}, '{}'::jsonb) || ${patch}::jsonb` })
      .where(eq(reportsTable.id, id));
    res.json({ id, verdicts });
  } catch (err) {
    req.log.error({ err }, "Failed to generate section verdicts");
    res.status(500).json({ error: "Failed to generate section verdicts" });
  }
});

export default router;
