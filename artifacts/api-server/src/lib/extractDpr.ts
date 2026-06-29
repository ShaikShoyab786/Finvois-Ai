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
    "averageDscr": string|null
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

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\nDPR TEXT:\n${truncatedText}`,
      },
    ],
  });

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
