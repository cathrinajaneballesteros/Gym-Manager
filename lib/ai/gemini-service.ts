/**
 * Google Gemini AI Integration Service
 * Uses Google Gemini API (gemini-3.8-flash) for autonomous gym business intelligence,
 * financial narrative generation, churn retention tactics, and expense optimization.
 */

export interface ExecutiveReportRequest {
  gymName?: string;
  currency?: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  activeMembers: number;
  churnRiskCount: number;
  topExpenseCategory?: string;
  recentTrends?: { period: string; revenue: number; expenses: number }[];
}

export class GeminiService {
  private static getApiKey(): string | null {
    return process.env.GEMINI_API_KEY || null;
  }

  /**
   * Check if Gemini API is configured
   */
  static isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 10 && !key.includes('your-gemini'));
  }

  /**
   * Generic prompt runner using Google Gemini
   */
  static async prompt(systemInstruction: string, userPrompt: string): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in .env.local');
    }

    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite-preview',
      'gemini-flash-latest',
    ];

    let lastError: unknown = null;

    for (const model of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const payload = {
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            // Room for models that think before answering; thinking counts against this limit.
            maxOutputTokens: 2048,
          },
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          // A stalled model would leave the button spinning; give up and try the next one.
          signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = new Error(`Model ${model} returned ${response.status}: ${errText}`);
          continue; // Try next fallback model
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        // The answer can be split over several parts; thought summaries are skipped.
        const parts: { text?: string; thought?: boolean }[] = candidate?.content?.parts || [];
        const text = parts
          .filter((part) => !part.thought && part.text)
          .map((part) => part.text)
          .join('');

        if (text) {
          return text.trim();
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('All Gemini model fallbacks failed.');
  }

  /**
   * Generates a concise Executive Financial & Retention Brief
   */
  static async generateExecutiveReport(stats: ExecutiveReportRequest): Promise<string> {
    const system =
      'You are a elite gym business consultant and CFO advisor for independent gym owners. ' +
      'Write professional, motivating, punchy, and actionable financial summaries. ' +
      'Keep your output organized with bullet points and bold highlights. Keep it under 250 words.';

    const user = `Analyze this gym\'s monthly business performance:
- Gym Name: ${stats.gymName || 'Fitness Center'}
- Currency: ${stats.currency || '₱'}
- Monthly Gross Revenue: ${stats.currency}${stats.totalRevenue.toLocaleString()}
- Monthly Operating Expenses: ${stats.currency}${stats.totalExpenses.toLocaleString()}
- Net Profit: ${stats.currency}${stats.netProfit.toLocaleString()} (${stats.profitMargin.toFixed(1)}% margin)
- Active Members: ${stats.activeMembers}
- Members at Risk of Churning: ${stats.churnRiskCount}
- Highest Expense Category: ${stats.topExpenseCategory || 'General Operations'}

Provide:
1. Executive Health Scorecard (Overall rating & 1-sentence verdict)
2. 2-3 High-Impact Revenue & Expense Actions
3. Immediate Retention Strategy for at-risk members`;

    return this.prompt(system, user);
  }

  /**
   * Generates personalized retention messages for at-risk gym members
   */
  static async generateRetentionMessage(
    memberName: string,
    daysInactive: number,
    daysUntilExpiry: number,
    gymName: string = 'Our Gym'
  ): Promise<string> {
    const system =
      'You are a friendly, motivating gym community manager. Write a short, warm, non-pushy message (SMS/WhatsApp style, 2-3 sentences max) to re-engage a gym member who has not visited recently.';

    const user = `Member: ${memberName}
Inactive for: ${daysInactive} days
Membership expires in: ${daysUntilExpiry} days
Gym name: ${gymName}

Write an engaging, warm check-in message offering encouragement or inviting them back for a workout.`;

    return this.prompt(system, user);
  }

  /**
   * Generates a tailored Cost-Cutting Action Plan for gym owner to save money
   */
  static async generateCostSavingPlan(data: {
    gymName?: string;
    currency?: string;
    totalExpenses: number;
    potentialMonthlySavings: number;
    potentialAnnualSavings: number;
    topExpenseCategory?: string;
    anomalies?: { category: string; currentAmount: number; baseline: number; difference: number }[];
  }): Promise<string> {
    const system =
      'You are a seasoned fitness business consultant and financial controller specializing in gym profitability. ' +
      'Your sole objective is to help the gym owner eliminate operational waste, reduce unnecessary expenses, and maximize net take-home profit. ' +
      'Be direct, practical, and highly specific with concrete monetary targets and operational steps. Keep under 300 words.';

    const anomaliesText =
      data.anomalies && data.anomalies.length > 0
        ? data.anomalies
            .map(
              (a) =>
                `  * ${a.category}: Spent ${data.currency || '₱'}${a.currentAmount.toLocaleString()} vs ${data.currency || '₱'}${a.baseline.toLocaleString()} baseline (+${data.currency || '₱'}${a.difference.toLocaleString()} overage)`
            )
            .join('\n')
        : '  * General operations baseline tracking';

    const user = `Analyze our gym expenditures and design an aggressive cost-cutting action plan:
- Gym Name: ${data.gymName || 'Fitness Center'}
- Currency: ${data.currency || '₱'}
- Total Monthly Expenses: ${data.currency || '₱'}${data.totalExpenses.toLocaleString()}
- Detected Potential Monthly Savings: ${data.currency || '₱'}${data.potentialMonthlySavings.toLocaleString()}
- Detected Potential Annual Savings: ${data.currency || '₱'}${data.potentialAnnualSavings.toLocaleString()}
- Largest Expense Category: ${data.topExpenseCategory || 'Utilities'}
- Spending Anomalies Flagged:
${anomaliesText}

Provide:
1. Top 3 Immediate Quick Wins (Actions to take this week to stop cash bleed)
2. Strategic Cost-Cutting Initiatives (Vendors, utilities, maintenance, supplies)
3. 30-Day Expense Reduction Checklist for staff
4. Projected Bottom-Line Profit Increase`;

    return this.prompt(system, user);
  }
}
