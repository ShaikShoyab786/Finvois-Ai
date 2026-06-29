import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import { logger } from "./logger";

const client = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

const EXTRACTION_PROMPT = `You are a financial analyst specializing in DPR (Detailed Project Report) analysis for MSME business loan proposals in India.

You will be given the raw text of a DPR PDF. Extract ALL financial data and business information into a structured JSON object.

CRITICAL RULES:
1. NEVER modify, recalculate, or round any financial values — preserve them exactly as they appear in the document.
2. If a field is not found in the document, set it to null.
3. All monetary amounts should be strings preserving the original format (e.g. "31.50 Lacs", "₹35.00L", "50,000").
4. For arrays of yearly data, ensure all arrays have the same length.
5. Return ONLY valid JSON, no markdown, no explanation.
6. For plAccount, capture the full Projected P&L statement line-by-line when present:
   - COGS / direct costs: openingStock, directMaterial (direct material / direct expenses), closingStock, costOfGoodsSold.
   - Operating expenses: adminSellingExpenses (total admin & selling), and its components salaries (salaries & wages), otherExpenses, miscExpenses, processingFees.
   - Profit tiers: grossProfit, ebdit (a.k.a. EBITDA / operating profit), ebit, ebt (earnings before tax). "expenses" = total operating expenses, "interest" = total interest.
   - Interest split: interestTermLoan, interestCCLoan (cash-credit / working-capital interest).
   - Use values exactly as printed; set any line absent from the document to null. Keep every array the same length as "years".
   - periodNote: any note about a partial first year (e.g. "FY2025-26: September to March (7 months)"), else null.
7. For balanceSheet, capture the full Projected Balance Sheet line-by-line when present:
   - Sources of funds: netCapital (Net Capital = Opening + Net Profit − Drawings, a.k.a. own capital / net worth / equity), termLoans (term loan outstanding).
   - Current liabilities: workingCapitalLoan (WC / cash-credit loan), shortTermLoan, and currentLiabilities (total current liabilities).
   - Application of funds: fixedAssets (Fixed Assets at WDV / net block).
   - Current assets: closingStock (closing stock / inventory), receivables (receivables / debtors / sundry debtors), cashEquivalents (cash & cash equivalents / bank balance), and currentAssets (total current assets).
   - Totals: totalFunds (total sources), totalAssets (total application), netWorkingCapital (current assets − current liabilities).
   - Keep equity == netCapital and longTermLiabilities == termLoans for compatibility. Use values exactly as printed; set any line absent to null. Keep every array the same length as "years".
   - periodNote: any note about a partial first year (e.g. "FY2025-26: September to March (7 months)"), else null.
8. For ratioAnalysis, capture the full ratio summary table when present — one value per projected year, every array the same length as "years":
   - Liquidity & coverage: currentRatio, dscr (debt service coverage ratio, A/B), interestCoverageRatio (ICR = EBIT / interest).
   - Profitability/return ratios — grossProfitMargin (gross profit ratio), netProfitMargin (net profit ratio), roce (return on capital employed = PAT / (capital + long-term liabilities)), returnOnAssets (ROA): record exactly as printed, whether the document shows a percentage (e.g. 42.05) or a decimal fraction (e.g. 0.42). Do not convert between the two forms.
   - Activity: debtorsTurnover (debtors turnover ratio), debtorsCollectionDays (debtors collection period in days).
   - Leverage & solvency: tolTw (total outside liabilities / total net worth), proprietaryRatio (net worth / total assets), debtEquityRatio.
   - Use values exactly as printed; set any ratio absent from the document to null.
9. For leverageAnalysis (often titled "Leverage Ratio Analysis" / "Calculation of Operating/Financial/Combined Leverage"), capture one value per projected year, every array the same length as "years": operatingLeverage (OL = Contribution / EBIT), financialLeverage (FL = EBIT / EBT), combinedLeverage (CL = OL × FL). Use values exactly as printed; set an absent series to null.
10. For depreciationSchedule (the "Depreciation Schedule", normally the written-down-value (WDV) method under the Income Tax Act, figures in lakhs): assetName (e.g. "Plant & Machinery"), ratePct (depreciation rate as a number, e.g. 15 for 15%), method (e.g. "WDV — Income Tax Act"), years[], and per-year arrays openingWdv (WDV at beginning of year), additions (additions during the year), depreciation (depreciation charged for the year), closingWdv (WDV at year end). Use values exactly as printed; set any absent field to null.
11. For cashFlow (the "Projected Cash Flow Statement", figures in rupees exactly as printed), capture one value per projected year, every array the same length as "years":
   - Cash inflows: profitBeforeInterestTax (Profit before Bank Interest & Tax, after depreciation), depreciation (Add: Depreciation), increaseInTermLoan (Increase in Term Loan), increaseInWcLoan (Increase in WC / working-capital / CC Loan), increaseInCapital (Increase in Capital), increaseInCapitalDuringYear (Increase in Capital during year), and totalInflows (Total Inflows).
   - Cash outflows: capitalExpenditure (Capital Expenditure), termLoanInterest (Term Loan Interest), ccLoanInterest (CC / working-capital interest), termLoanRepayment (Term Loan Repayment), increaseInReceivables (Increase in Receivables), increaseInStock (Increase in Stock), and totalOutflows (Total Outflows).
   - Resulting cash: grossSurplus (Gross Surplus = Total Inflows − Total Outflows), drawings (Less: Drawings), openingBalance (Opening Balance of Cash), closingBalance (Closing Balance of Cash).
   - Also set netCashFlow equal to grossSurplus (the annual net cash generated). Leave operatingCashFlow as nulls unless the document provides a distinct operating-cash figure.
   - Use values exactly as printed; set any line absent from the document to null.
12. For implementationTimeline (the project implementation schedule / phasing, often titled "Implementation Schedule" or "Time Schedule of Implementation"), capture each phase IN ORDER as an array: phase (phase name, e.g. "Construction", "Machinery Erection", "Trial Run", "Commercial Production"), startDate (start date as printed), endDate (end / completion date as printed), status (any status note such as "Ongoing", else null). Set any absent field to null. If no schedule is present, return an empty array.
13. For productPortfolio (the product range / list of products with capacities, often titled "Product Profile", "Product Range" or "Installed Capacity"), capture each row as an array: product (product name with specification exactly as printed, e.g. "U Bolts (20MM to 300MM)"), productionCapacity (production capacity per annum exactly as printed, e.g. "10-15 tonnes", "5 to 7 Lacs Nos"). Set any absent field to null. If no product list is present, return an empty array.
14. For the detailed financial-evaluation tables below, OVERRIDE rule #3: these specific fields must be plain JSON NUMBERS (no commas, no currency symbols, no "%"); preserve negatives as negative numbers. Set the whole structure to null / empty array if the corresponding table is absent.
   - financialEvaluation.waccBreakdown (the "Calculation of Weighted Average Cost of Capital (WACC)" table): one object per row IN ORDER, including the TOTAL row, with source (e.g. "Equity Capital", "Term Loan", "Working capital Loan", "Total"), amount (Sources of Funds in Rs Lacs — keep in lakhs, e.g. 31.5), portionPct (Portion %), costPct (Cost %), waccContributionPct (the WACC column / contribution %). Set a missing cell to null (the Total row usually has only amount + waccContributionPct).
   - financialEvaluation.npvAnalysis (the "Present Value of Future Cash Flows & Net Present Value (NPV)" block, figures in rupees): pvFutureCashFlows (PRESENT VALUE OF FUTURE CASH FLOWS), initialInvestment (CASH OUTFLOWS), netPresentValue (NET PRESENT VALUE).
   - financialEvaluation.simplePaybackSchedule (the "Investment Payback Period (Simple Method)" table, rupees): one object per row IN ORDER. The first row is the initial outflow — set year to "Initial" with a negative cashFlow and cumulative. Each subsequent row: year (the period label exactly as printed, e.g. "2025-26 Sep to Mar", "2026-27"), cashFlow (Amount Rs for that year), cumulative (Cumulative Cash flows Rs, negative until recovered).
   - financialEvaluation.dcfPaybackSchedule (the "Investment Payback Period (Discounted Cashflows Method)" table, rupees): one object per row IN ORDER. First row is the initial outflow with year "Initial". Each subsequent row: year (period label), cashFlow (undiscounted Amount Rs), discountedCashFlow (Discounted Cash Flows Rs), cumulativeDiscounted (Cumulative Discounted Cash flows Rs).
15. For mpbfSchedule (the working-capital / "MPBF" / "Maximum Permissible Bank Finance" assessment, or the current-asset holding-levels breakdown — figures in rupees). OVERRIDE rule #3: every value must be a plain JSON NUMBER (no commas/symbols). Capture per projected year, every array the same length as "years": rawMaterialStock (Raw Material Stock), wipStock (Work-in-Progress / WIP Stock), finishedGoodsStock (Finished Goods Stock), and wcLimitSanctioned (the sanctioned Working-Capital / Cash-Credit limit — usually a single figure repeated each year). Set any row absent from the document to null; set the whole structure to null if no current-asset / working-capital breakdown is present.
16. For productionSeries (the per-year production / sales-volume figures, usually inside the BEP table or a production schedule). OVERRIDE rule #3: every value must be a plain JSON NUMBER. Capture per projected year, every array the same length as "years": sellingPricePerKg (Selling Price per KG / per unit), installedCapacityKg (Plant Installed Capacity in KGs / units per annum), quantityKg (Quantity Manufactured / Sold in KGs / units). Set any row absent from the document to null; set the whole structure to null for service businesses or any DPR with no per-unit production figures.

Extract the following structure:
{
  "businessProfile": {
    "firmName": string|null,
    "proprietorName": string|null,
    "constitution": string|null,
    "lineOfActivity": string|null,
    "unitAddress": string|null,
    "location": string|null,
    "panNo": string|null,
    "aadharNo": string|null,
    "mobile": string|null,
    "age": string|null,
    "gender": string|null,
    "caste": string|null,
    "education": string|null,
    "experience": string|null,
    "powerRequirement": string|null,
    "commercialProductionDate": string|null,
    "preparedBy": string|null
  },
  "financialSummary": {
    "termLoan": string|null,
    "workingCapitalLoan": string|null,
    "equityCapital": string|null,
    "totalProjectCost": string|null,
    "averageDscr": string|null,
    "fiscalYear": string|null
  },
  "plAccount": {
    "years": string[],
    "revenue": (number|null)[],
    "openingStock": (number|null)[],
    "directMaterial": (number|null)[],
    "closingStock": (number|null)[],
    "costOfGoodsSold": (number|null)[],
    "grossProfit": (number|null)[],
    "adminSellingExpenses": (number|null)[],
    "salaries": (number|null)[],
    "otherExpenses": (number|null)[],
    "miscExpenses": (number|null)[],
    "processingFees": (number|null)[],
    "expenses": (number|null)[],
    "ebdit": (number|null)[],
    "depreciation": (number|null)[],
    "ebit": (number|null)[],
    "interestTermLoan": (number|null)[],
    "interestCCLoan": (number|null)[],
    "interest": (number|null)[],
    "ebt": (number|null)[],
    "netProfit": (number|null)[],
    "periodNote": string|null
  },
  "balanceSheet": {
    "years": string[],
    "netCapital": (number|null)[],
    "termLoans": (number|null)[],
    "workingCapitalLoan": (number|null)[],
    "shortTermLoan": (number|null)[],
    "currentLiabilities": (number|null)[],
    "totalFunds": (number|null)[],
    "fixedAssets": (number|null)[],
    "closingStock": (number|null)[],
    "receivables": (number|null)[],
    "cashEquivalents": (number|null)[],
    "currentAssets": (number|null)[],
    "totalAssets": (number|null)[],
    "netWorkingCapital": (number|null)[],
    "equity": (number|null)[],
    "longTermLiabilities": (number|null)[],
    "periodNote": string|null
  },
  "ratioAnalysis": {
    "years": string[],
    "dscr": (number|null)[],
    "currentRatio": (number|null)[],
    "grossProfitMargin": (number|null)[],
    "netProfitMargin": (number|null)[],
    "debtorsTurnover": (number|null)[],
    "debtorsCollectionDays": (number|null)[],
    "tolTw": (number|null)[],
    "roce": (number|null)[],
    "interestCoverageRatio": (number|null)[],
    "returnOnAssets": (number|null)[],
    "proprietaryRatio": (number|null)[],
    "debtEquityRatio": (number|null)[],
    "returnOnEquity": (number|null)[]
  },
  "leverageAnalysis": {
    "years": string[],
    "operatingLeverage": (number|null)[],
    "financialLeverage": (number|null)[],
    "combinedLeverage": (number|null)[]
  },
  "depreciationSchedule": {
    "assetName": string|null,
    "ratePct": number|null,
    "method": string|null,
    "years": string[],
    "openingWdv": (number|null)[],
    "additions": (number|null)[],
    "depreciation": (number|null)[],
    "closingWdv": (number|null)[]
  },
  "cashFlow": {
    "years": string[],
    "profitBeforeInterestTax": (number|null)[],
    "depreciation": (number|null)[],
    "increaseInTermLoan": (number|null)[],
    "increaseInWcLoan": (number|null)[],
    "increaseInCapital": (number|null)[],
    "increaseInCapitalDuringYear": (number|null)[],
    "totalInflows": (number|null)[],
    "capitalExpenditure": (number|null)[],
    "termLoanInterest": (number|null)[],
    "ccLoanInterest": (number|null)[],
    "termLoanRepayment": (number|null)[],
    "increaseInReceivables": (number|null)[],
    "increaseInStock": (number|null)[],
    "totalOutflows": (number|null)[],
    "grossSurplus": (number|null)[],
    "drawings": (number|null)[],
    "openingBalance": (number|null)[],
    "closingBalance": (number|null)[],
    "operatingCashFlow": (number|null)[],
    "netCashFlow": (number|null)[]
  },
  "loanSchedule": {
    "termLoanAmount": string|null,
    "interestRate": string|null,
    "tenure": string|null,
    "moratorium": string|null,
    "schedule": [
      {
        "year": string|null,
        "openingBalance": number|null,
        "principal": number|null,
        "interest": number|null,
        "totalEmi": number|null,
        "closingBalance": number|null
      }
    ]
  },
  "swotAnalysis": {
    "strengths": string[],
    "weaknesses": string[],
    "opportunities": string[],
    "threats": string[]
  },
  "financialEvaluation": {
    "irr": string|null,
    "mirr": string|null,
    "npv": string|null,
    "wacc": string|null,
    "profitabilityIndex": string|null,
    "simplePaybackPeriod": string|null,
    "discountedPaybackPeriod": string|null,
    "bep": string|null,
    "marginOfSafety": string|null,
    "altmanZScore": string|null,
    "averageDscr": string|null,
    "waccBreakdown": [{ "source": string, "amount": number|null, "portionPct": number|null, "costPct": number|null, "waccContributionPct": number|null }],
    "npvAnalysis": { "pvFutureCashFlows": number|null, "initialInvestment": number|null, "netPresentValue": number|null },
    "simplePaybackSchedule": [{ "year": string, "cashFlow": number|null, "cumulative": number|null }],
    "dcfPaybackSchedule": [{ "year": string, "cashFlow": number|null, "discountedCashFlow": number|null, "cumulativeDiscounted": number|null }]
  },
  "employmentGeneration": {
    "skilled": number|null,
    "semiSkilled": number|null,
    "unskilled": number|null,
    "totalDirect": number|null,
    "indirect": number|null
  },
  "projectCost": {
    "items": [{ "label": string, "amount": number|null }],
    "totalCost": number|null,
    "financeBreakdown": [{ "label": string, "amount": number|null, "percentage": number|null }]
  },
  "implementationTimeline": [
    { "phase": string, "startDate": string|null, "endDate": string|null, "status": string|null }
  ],
  "productPortfolio": [
    { "product": string, "productionCapacity": string|null }
  ],
  "mpbfSchedule": {
    "years": string[]|null,
    "rawMaterialStock": number[]|null,
    "wipStock": number[]|null,
    "finishedGoodsStock": number[]|null,
    "wcLimitSanctioned": number[]|null
  },
  "productionSeries": {
    "years": string[]|null,
    "sellingPricePerKg": number[]|null,
    "installedCapacityKg": number[]|null,
    "quantityKg": number[]|null
  }
}`;

function extractJsonFromText(text: string): string {
  let t = text.trim();
  // Strip leading/trailing markdown code fences like ```json ... ``` or ``` ... ```
  const fenceMatch = t.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenceMatch) {
    t = fenceMatch[1].trim();
  }
  // Fallback: slice between first '{' and last '}'
  const firstBrace = t.indexOf("{");
  const lastBrace = t.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    t = t.slice(firstBrace, lastBrace + 1);
  }
  return t;
}

/**
 * Parse JSON emitted by the model. The happy path is a plain `JSON.parse`; when
 * that fails we run `jsonrepair`, which fixes the malformations LLMs commonly
 * produce on large payloads (leading-zero numbers like `075206`, missing or
 * trailing commas, unquoted keys) and parse the repaired text. This keeps the
 * fast path untouched while making extraction resilient to occasional defects.
 */
function parseLlmJson(jsonText: string): unknown {
  try {
    return JSON.parse(jsonText);
  } catch {
    return JSON.parse(jsonrepair(jsonText));
  }
}

export async function extractDprData(rawText: string): Promise<Record<string, unknown>> {
  logger.info({ textLength: rawText.length }, "Starting DPR extraction via Anthropic Claude");

  const truncatedText = rawText.slice(0, 60000);

  const response = await client.messages.create(
    {
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: `${EXTRACTION_PROMPT}\n\nDPR TEXT:\n${truncatedText}`,
        },
      ],
    },
    // Explicit timeout: the full DPR schema can push output past the SDK's
    // 10-minute non-streaming auto-timeout heuristic, which otherwise throws
    // before the request is even sent. Real extractions complete in ~1-2 min.
    { timeout: 600000 },
  );

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  const jsonText = extractJsonFromText(content.text);
  try {
    const parsed = parseLlmJson(jsonText) as Record<string, unknown>;
    logger.info("DPR extraction completed successfully");
    return parsed;
  } catch (err) {
    logger.error({ err, snippet: jsonText.slice(0, 500) }, "Failed to parse AI JSON response");
    throw new Error(`AI returned invalid JSON: ${(err as Error).message}`);
  }
}

const SUPPLEMENTAL_PROMPT = `You are a financial analyst extracting two specific, report-specific tables from the raw text of an Indian MSME DPR (Detailed Project Report).

Return ONLY valid JSON (no markdown, no commentary) with EXACTLY this shape:
{
  "mpbfSchedule": {
    "years": string[]|null,
    "rawMaterialStock": number[]|null,
    "wipStock": number[]|null,
    "finishedGoodsStock": number[]|null,
    "wcLimitSanctioned": number[]|null
  },
  "productionSeries": {
    "years": string[]|null,
    "sellingPricePerKg": number[]|null,
    "installedCapacityKg": number[]|null,
    "quantityKg": number[]|null
  }
}

RULES:
1. Every numeric value must be a plain JSON NUMBER (no commas, no currency symbols, no "%"). Parenthesised figures like "(106,282)" are NEGATIVE numbers.
2. mpbfSchedule comes from the working-capital / "MPBF" / "Maximum Permissible Bank Finance" assessment or the current-asset holding-levels breakdown (figures in rupees). Capture the per-year inventory split: rawMaterialStock (Raw Material Stock), wipStock (Work-in-Progress / WIP Stock), finishedGoodsStock (Finished Goods Stock), and wcLimitSanctioned (the sanctioned Working-Capital / Cash-Credit limit — usually one figure repeated each year).
3. productionSeries comes from the BEP table or a production schedule: sellingPricePerKg (Selling Price per KG / per unit), installedCapacityKg (Plant Installed Capacity in KGs / units per annum), quantityKg (Quantity Manufactured / Sold in KGs / units).
4. The values are printed as run-together digit strings (column separators were lost). First determine the number of projected years from the "years" header, then split EACH row into EXACTLY that many numbers, preserving the printed number of decimal places. Years usually look like "2025-26 Sep to Mar", "2026-27", … "2032-33".
5. Set any individual row that is absent to null. Set mpbfSchedule (or productionSeries) as a whole to null if that entire table is missing from the text (e.g. service businesses have no production series).`;

/**
 * Focused, low-cost extraction of ONLY the report-specific MPBF working-capital
 * schedule and production series. Used to backfill these fields onto reports extracted
 * before the schema was extended, WITHOUT re-running (and overwriting) the full
 * extraction. Returns an object containing at most { mpbfSchedule, productionSeries }.
 */
export async function extractSupplementalDpr(rawText: string): Promise<Record<string, unknown>> {
  logger.info({ textLength: rawText.length }, "Starting supplemental DPR extraction (MPBF + production series)");

  const truncatedText = rawText.slice(0, 60000);

  const response = await client.messages.create(
    {
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `${SUPPLEMENTAL_PROMPT}\n\nDPR TEXT:\n${truncatedText}`,
        },
      ],
    },
    { timeout: 600000 },
  );

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  const jsonText = extractJsonFromText(content.text);
  const parsed = parseLlmJson(jsonText) as Record<string, unknown>;
  logger.info("Supplemental DPR extraction completed successfully");
  return parsed;
}

export async function generateExecutiveSummary(extractedData: Record<string, unknown>): Promise<{
  summary: string;
  keyStrengths: string[];
  riskFactors: string[];
  viabilityVerdict: string;
}> {
  logger.info("Generating executive summary");

  const dataStr = JSON.stringify(extractedData, null, 2).slice(0, 20000);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `You are a senior financial analyst reviewing a DPR for a bank loan proposal.

Based on the extracted DPR data below, generate an executive summary in JSON format:
{
  "summary": "3-4 sentence executive overview of the project, its viability, and financial standing",
  "keyStrengths": ["strength 1", "strength 2", "strength 3"],
  "riskFactors": ["risk 1", "risk 2", "risk 3"],
  "viabilityVerdict": "Viable" | "Conditionally Viable" | "High Risk"
}

Return ONLY valid JSON. Base your analysis strictly on the data provided — do not invent figures.

DPR DATA:
${dataStr}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  const jsonText = extractJsonFromText(content.text);
  try {
    const parsed = parseLlmJson(jsonText) as {
      summary: string;
      keyStrengths: string[];
      riskFactors: string[];
      viabilityVerdict: string;
    };
    logger.info("Executive summary generated");
    return parsed;
  } catch (err) {
    logger.error({ err, snippet: jsonText.slice(0, 500) }, "Failed to parse summary JSON");
    throw new Error(`AI returned invalid JSON: ${(err as Error).message}`);
  }
}

export interface SectionVerdictMap {
  profile: string | null;
  pl: string | null;
  balanceSheet: string | null;
  ratios: string | null;
  cashFlow: string | null;
  loan: string | null;
  evaluation: string | null;
}

/**
 * Generates a 1–2 sentence banker's verdict for each substantive section of
 * the report in a single Claude call. Returned as a flat map keyed by section
 * id; missing or unjudgeable sections come back as null so the UI can hide
 * the verdict gracefully instead of showing a placeholder.
 */
export async function generateSectionVerdicts(
  extractedData: Record<string, unknown>,
): Promise<SectionVerdictMap> {
  logger.info("Generating section verdicts");

  const dataStr = JSON.stringify(extractedData, null, 2).slice(0, 20000);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a senior credit analyst reviewing a DPR (Detailed Project Report) for a bank loan proposal.

For each of the seven sections below, produce a SHORT verdict (1–2 sentences, ≤ 220 characters) capturing the banker's read of that section's evidence — what stands out, whether the data supports the loan, and any red flag. Be specific to the numbers in the data; never use generic phrasing. If a section is empty or unjudgeable, return null for that key.

Tone: confident, evidence-grounded, no marketing fluff. Address what a credit committee would care about.

Return ONLY this JSON shape:
{
  "profile": string|null,         // Business Profile — promoter quality, sector fit, location/scale
  "pl": string|null,              // P&L Account — revenue trajectory, margin trend, profitability quality
  "balanceSheet": string|null,    // Balance Sheet — capital structure, deleveraging, asset base
  "ratios": string|null,          // Ratio Analysis — liquidity, leverage, return metrics vs benchmarks
  "cashFlow": string|null,        // Cash Flow — operating cash quality, dependency on financing
  "loan": string|null,            // Loan Schedule — EMI burden, coverage, repayment realism
  "evaluation": string|null       // Financial Evaluation — IRR vs WACC, payback, Altman/DSCR risk signal
}

DPR DATA:
${dataStr}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  const jsonText = extractJsonFromText(content.text);
  let parsed: Partial<SectionVerdictMap>;
  try {
    parsed = parseLlmJson(jsonText) as Partial<SectionVerdictMap>;
  } catch (err) {
    logger.error({ err, snippet: jsonText.slice(0, 500) }, "Failed to parse verdicts JSON");
    throw new Error(`AI returned invalid JSON: ${(err as Error).message}`);
  }

  const normalize = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t ? t : null;
  };

  logger.info("Section verdicts generated");
  return {
    profile: normalize(parsed.profile),
    pl: normalize(parsed.pl),
    balanceSheet: normalize(parsed.balanceSheet),
    ratios: normalize(parsed.ratios),
    cashFlow: normalize(parsed.cashFlow),
    loan: normalize(parsed.loan),
    evaluation: normalize(parsed.evaluation),
  };
}
