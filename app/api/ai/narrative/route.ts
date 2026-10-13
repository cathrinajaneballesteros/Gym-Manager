import { NextResponse } from 'next/server';
import { cleanText, requireGymMember } from '@/lib/supabase/require-user';
import { GeminiService, ExecutiveReportRequest } from '@/lib/ai/gemini-service';

const toNumber = (value: unknown) => Number(value) || 0;

export async function POST(req: Request) {
  const access = await requireGymMember('ai', 30, '1 hour');
  if (access.error) return access.error;
  const { role, gym } = access;

  // Only Analytics asks the AI, and Analytics is owner-only.
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Only the gym owner can use AI insights.' }, { status: 403 });
  }

  try {
    if (!GeminiService.isConfigured()) {
      return NextResponse.json(
        {
          error: 'Gemini API key is not configured in .env.local',
          isConfigured: false,
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const action = body.action || 'executive-report';

    if (action === 'retention-message') {
      const message = await GeminiService.generateRetentionMessage(
        cleanText(body.memberName, 80) || 'Valued Member',
        toNumber(body.daysInactive) || 14,
        toNumber(body.daysUntilExpiry) || 7,
        gym.name
      );
      return NextResponse.json({ success: true, message });
    }

    if (action === 'cost-saving-plan') {
      const anomalies = (Array.isArray(body.anomalies) ? body.anomalies : []).slice(0, 10).map(
        (a: Record<string, unknown>) => ({
          category: cleanText(a?.category, 60) || 'Other',
          currentAmount: toNumber(a?.currentAmount),
          baseline: toNumber(a?.baseline),
          difference: toNumber(a?.difference),
        })
      );
      const plan = await GeminiService.generateCostSavingPlan({
        gymName: gym.name,
        currency: gym.currency,
        totalExpenses: toNumber(body.totalExpenses),
        potentialMonthlySavings: toNumber(body.potentialMonthlySavings),
        potentialAnnualSavings: toNumber(body.potentialAnnualSavings),
        topExpenseCategory: cleanText(body.topExpenseCategory, 60) || undefined,
        anomalies,
      });
      return NextResponse.json({ success: true, report: plan });
    }

    // Default: Executive Financial Report
    const stats: ExecutiveReportRequest = {
      gymName: gym.name,
      currency: gym.currency,
      totalRevenue: toNumber(body.totalRevenue),
      totalExpenses: toNumber(body.totalExpenses),
      netProfit: toNumber(body.netProfit),
      profitMargin: toNumber(body.profitMargin),
      activeMembers: toNumber(body.activeMembers),
      churnRiskCount: toNumber(body.churnRiskCount),
      topExpenseCategory: cleanText(body.topExpenseCategory, 60) || undefined,
    };

    const report = await GeminiService.generateExecutiveReport(stats);
    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Error generating AI narrative:', error);
    return NextResponse.json({ error: 'Failed to generate AI insights. Please try again.' }, { status: 500 });
  }
}
