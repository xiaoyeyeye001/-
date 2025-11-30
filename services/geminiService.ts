import { GoogleGenAI } from "@google/genai";
import { FinancialSummary, Period } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeBusiness = async (
  summary: FinancialSummary,
  period: Period,
  trendDescription: string
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Unable to connect to AI Analyst. Please check your API configuration.";

  const prompt = `
    You are an expert E-commerce Business Analyst. 
    Analyze the following financial data for the current ${period}:
    
    Metrics:
    - GMV (Gross Merchandise Value): ¥${summary.totalGmv.toFixed(2)}
    - Net Sales (after refunds): ¥${summary.netSales.toFixed(2)}
    - Net Profit: ¥${summary.netProfit.toFixed(2)}
    - Gross Margin: ${summary.grossMarginPercent.toFixed(1)}%
    - ROI: ${summary.roi.toFixed(1)}%
    
    Cost Structure:
    - COGS: ¥${summary.costBreakdown.cogs.toFixed(2)}
    - Ads: ¥${summary.costBreakdown.ads.toFixed(2)}
    - Shipping: ¥${summary.costBreakdown.shipping.toFixed(2)}
    - Platform Fees: ¥${summary.costBreakdown.fees.toFixed(2)}
    
    Trend Context: ${trendDescription}

    Please provide a concise diagnosis.
    1. Briefly summarize the health of the business (Profitability, Margins).
    2. Identify the biggest cost driver or risk.
    3. Give 2-3 specific, actionable recommendations to improve profit or scale revenue.

    Keep the tone professional, encouraging, and data-driven. Use Markdown for formatting. Limit to 200 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster response on simple analysis
      }
    });
    return response.text || "Analysis could not be generated at this time.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "An error occurred while communicating with the AI Analyst.";
  }
};
