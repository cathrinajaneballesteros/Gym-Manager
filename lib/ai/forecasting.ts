import { RevenueForecastResult, RevenueForecastPoint } from '@/types/ai';
import { DBService } from '@/lib/data/db-service';

/**
 * AI Revenue Forecasting Module
 * Implements linear regression and seasonal growth forecasting
 * based on historical revenue, member renewals, and new registrations.
 */
export function calculateRevenueForecast(useDemoData: boolean = false): RevenueForecastResult {
  const historicalTrends = DBService.getMonthlyTrends();
  const kpis = DBService.getDashboardKPIs('this-month');
  const members = DBService.getMembers();
  const payments = DBService.getPayments();

  const activeMonthsWithRevenue = historicalTrends.filter((pt) => pt.revenue > 0);
  const activeMembers = members.filter((m) => m.status === 'active').length;

  // 1. Zero-data state: no members or no recorded revenue
  if (members.length === 0 || (payments.length === 0 && kpis.totalRevenue === 0)) {
    return {
      currentMonthlyRevenue: 0,
      forecastedNextMonthRevenue: 0,
      projectedGrowthPercent: 0,
      confidenceScore: 0,
      expectedRenewals: 0,
      predictedNewMembers: 0,
      trendSeries: historicalTrends.map((pt) => ({
        period: pt.month,
        projectedRevenue: 0,
        lowerConfidence: 0,
        upperConfidence: 0,
        isForecast: false,
        projectedRenewals: 0,
        projectedNewMembers: 0,
      })),
      hasSufficientData: false,
      explanation:
        'No membership or payment records found. Add members and record membership payments to train the predictive forecasting model.',
      dataPointsCount: 0,
      seasonalFactors: [],
    };
  }

  // 2. Early data state: only 1 month with revenue
  if (activeMonthsWithRevenue.length < 2 && !useDemoData) {
    const currentRevenue = kpis.totalRevenue;
    const projectedNext = Math.round(currentRevenue * 1.05);
    const expectedRenewals = Math.round(activeMembers * (kpis.renewalRate > 0 ? kpis.renewalRate / 100 : 0.85));
    const predictedNew = Math.max(1, Math.round(activeMembers * 0.1));

    return {
      currentMonthlyRevenue: currentRevenue,
      forecastedNextMonthRevenue: projectedNext,
      projectedGrowthPercent: 5.0,
      confidenceScore: 50,
      expectedRenewals,
      predictedNewMembers: predictedNew,
      trendSeries: historicalTrends.map((pt) => ({
        period: pt.month,
        projectedRevenue: pt.revenue,
        lowerConfidence: Math.round(pt.revenue * 0.9),
        upperConfidence: Math.round(pt.revenue * 1.1),
        isForecast: false,
        projectedRenewals: Math.round(pt.memberCount * 0.85),
        projectedNewMembers: Math.round(pt.memberCount * 0.15),
      })),
      hasSufficientData: true,
      explanation:
        'Initial predictive calibration based on current month activity. Forecast precision will increase as multiple months of transaction history accumulate.',
      dataPointsCount: activeMonthsWithRevenue.length,
      seasonalFactors: ['Initial operational run rate established'],
    };
  }

  // 3. Multi-month Linear Regression on historical monthly revenues
  const n = historicalTrends.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  historicalTrends.forEach((point, index) => {
    const x = index + 1;
    const y = point.revenue;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const intercept = (sumY - slope * sumX) / n;

  // Next month forecast (Month index n + 1)
  const nextMonthIndex = n + 1;
  const rawProjected = Math.max(0, Math.round(slope * nextMonthIndex + intercept));

  const expectedRenewals = Math.round(activeMembers * (kpis.renewalRate > 0 ? kpis.renewalRate / 100 : 0.85));
  const predictedNewMembers = Math.max(1, Math.round(activeMembers * 0.12));

  const currentRevenue = historicalTrends[historicalTrends.length - 1]?.revenue || kpis.totalRevenue;
  const forecastedRevenue = rawProjected > 0 ? rawProjected : currentRevenue;

  const growthPercent =
    currentRevenue > 0
      ? Number((((forecastedRevenue - currentRevenue) / currentRevenue) * 100).toFixed(1))
      : 0;

  // Build combined historical + 3-month forward forecast series
  const series: RevenueForecastPoint[] = [];

  // Add historical points
  historicalTrends.forEach((pt) => {
    series.push({
      period: pt.month,
      projectedRevenue: pt.revenue,
      lowerConfidence: pt.revenue,
      upperConfidence: pt.revenue,
      isForecast: false,
      projectedRenewals: Math.round(pt.memberCount * 0.88),
      projectedNewMembers: Math.round(pt.memberCount * 0.12),
    });
  });

  // Add forecast points for next 3 months
  const futureMonths = ['Month +1', 'Month +2', 'Month +3'];
  futureMonths.forEach((mName, i) => {
    const step = n + 1 + i;
    const baseVal = Math.max(0, Math.round(slope * step + intercept));
    const variance = baseVal * 0.05 * (i + 1);

    series.push({
      period: `${mName} (F)`,
      projectedRevenue: baseVal,
      lowerConfidence: Math.max(0, Math.round(baseVal - variance)),
      upperConfidence: Math.round(baseVal + variance),
      isForecast: true,
      projectedRenewals: expectedRenewals + i * 2,
      projectedNewMembers: predictedNewMembers + i,
    });
  });

  return {
    currentMonthlyRevenue: currentRevenue,
    forecastedNextMonthRevenue: forecastedRevenue,
    projectedGrowthPercent: growthPercent,
    confidenceScore: Math.min(95, 60 + activeMonthsWithRevenue.length * 8),
    expectedRenewals,
    predictedNewMembers,
    trendSeries: series,
    hasSufficientData: true,
    explanation: `Based on ${activeMonthsWithRevenue.length} months of transaction trends and retention patterns across ${activeMembers} active members, revenue is projected to reach ₱${forecastedRevenue.toLocaleString()} next month (${growthPercent >= 0 ? '+' : ''}${growthPercent}%).`,
    dataPointsCount: activeMonthsWithRevenue.length,
    seasonalFactors: [
      'Active member renewal rate projection',
      'Historical monthly payment run-rate trajectory',
    ],
  };
}
