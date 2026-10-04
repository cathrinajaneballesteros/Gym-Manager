import { NextResponse } from 'next/server';
import { GeminiService, ExecutiveReportRequest } from '@/lib/ai/gemini-service';

export async function POST(req: Request) {
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
      const { memberName, daysInactive, daysUntilExpiry, gymName } = body;
      const message = await GeminiService.generateRetentionMessage(
        memberName || 'Valued Member',
        Number(daysInactive) || 14,
        Number(daysUntilExpiry) || 7,
        gymName || 'IronPeak Fitness'
      );
      return NextResponse.json({ success: true, message });
    }

    if (action === 'cost-saving-plan') {
      const plan = await GeminiService.generateCostSavingPlan({
        gymName: body.gymName,
        currency: body.currency,
        totalExpenses: Number(body.totalExpenses) || 0,
        potentialMonthlySavings: Number(body.potentialMonthlySavings) || 0,
        potentialAnnualSavings: Number(body.potentialAnnualSavings) || 0,
        topExpenseCategory: body.topExpenseCategory,
        anomalies: body.anomalies || [],
      });
      return NextResponse.json({ success: true, report: plan });
    }

    // Default: Executive Financial Report
    const stats: ExecutiveReportRequest = {
      gymName: body.gymName,
      currency: body.currency,
      totalRevenue: Number(body.totalRevenue) || 0,
      totalExpenses: Number(body.totalExpenses) || 0,
      netProfit: Number(body.netProfit) || 0,
      profitMargin: Number(body.profitMargin) || 0,
      activeMembers: Number(body.activeMembers) || 0,
      churnRiskCount: Number(body.churnRiskCount) || 0,
      topExpenseCategory: body.topExpenseCategory,
    };

    const report = await GeminiService.generateExecutiveReport(stats);
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error('Error generating AI narrative:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate AI insights',
      },
      { status: 500 }
    );
  }
}
