import Anthropic from "@anthropic-ai/sdk";
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
    "grossProfit": (number|null)[],
    "netProfit": (number|null)[],
    "expenses": (number|null)[],
    "depreciation": (number|null)[],
    "interest": (number|null)[]
  },
  "balanceSheet": {
    "years": string[],
    "currentAssets": (number|null)[],
    "fixedAssets": (number|null)[],
    "currentLiabilities": (number|null)[],
    "longTermLiabilities": (number|null)[],
    "equity": (number|null)[]
  },
  "ratioAnalysis": {
    "years": string[],
    "currentRatio": (number|null)[],
    "debtEquityRatio": (number|null)[],
    "grossProfitMargin": (number|null)[],
    "netProfitMargin": (number|null)[],
    "returnOnEquity": (number|null)[],
    "dscr": (number|null)[]
  },
  "cashFlow": {
    "years": string[],
    "operatingCashFlow": (number|null)[],
    "investingCashFlow": (number|null)[],
    "financingCashFlow": (number|null)[],
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
    const parsed = JSON.parse(jsonText);
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
    const parsed = JSON.parse(jsonText);
    logger.info("Executive summary generated");
    return parsed;
  } catch (err) {
    logger.error({ err, snippet: jsonText.slice(0, 500) }, "Failed to parse summary JSON");
    throw new Error(`AI returned invalid JSON: ${(err as Error).message}`);
  }
}
