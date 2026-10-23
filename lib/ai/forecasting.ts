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

  // The trend is fitted on full months only: this month is still in progress, so its revenue so far would
  // drag the line down. Months before the gym's first payment are left out too, as they aren't a real ₱0.
  const firstRevenueIndex = historicalTrends.findIndex((pt) => pt.revenue > 0);
  const fullMonths = firstRevenueIndex === -1 ? [] : historicalTrends.slice(firstRevenueIndex, -1);
  const thisMonthSoFar = historicalTrends[historicalTrends.length - 1]?.revenue || 0;
  const activeMembers = members.filter((m) => m.status === 'active').length;
  const currency = DBService.getProfile().currency || '₱';
  // No members means no new sign-ups to extrapolate from.
  const newMembersAt = (rate: number) => (activeMembers > 0 ? Math.max(1, Math.round(activeMembers * rate)) : 0);

  // 1. Zero-data state: no recorded revenue (a walk-in-only gym still has revenue to forecast)
  if (payments.length === 0 && kpis.totalRevenue === 0) {
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

  // 2. Early data state: fewer than 2 full months with revenue. Too little to see a trend, so assume next
  // month matches the latest month instead of inventing growth.
  if (fullMonths.length < 2 && !useDemoData) {
    const currentRevenue = Math.max(fullMonths[fullMonths.length - 1]?.revenue || 0, thisMonthSoFar);
    const projectedNext = currentRevenue;
    const expectedRenewals = Math.round(activeMembers * (kpis.renewalRate > 0 ? kpis.renewalRate / 100 : 0.85));
    const predictedNew = newMembersAt(0.1);

    return {
      currentMonthlyRevenue: currentRevenue,
      forecastedNextMonthRevenue: projectedNext,
      projectedGrowthPercent: 0,
      confidenceScore: 25,
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
        "Not enough history yet: a trend needs two full months of payments, so next month is shown at the latest month's level.",
      dataPointsCount: fullMonths.length,
      seasonalFactors: ['Based on the latest month only'],
    };
  }

  // 3. Multi-month Linear Regression on the full months' revenues
  const n = fullMonths.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  fullMonths.forEach((point, index) => {
    const x = index + 1;
    const y = point.revenue;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;

  // The trend (slope) is applied from last month's actual revenue, so the forecast carries on from the
  // last full month instead of jumping to where the fitted line ends. Next month is two steps after it.
  const lastFullRevenue = fullMonths[n - 1]?.revenue || 0;
  const projectAhead = (monthsAhead: number) => Math.max(0, Math.round(lastFullRevenue + slope * (monthsAhead + 1)));
  const rawProjected = projectAhead(1);

  const expectedRenewals = Math.round(activeMembers * (kpis.renewalRate > 0 ? kpis.renewalRate / 100 : 0.85));
  const predictedNewMembers = newMembersAt(0.12);

  // Growth is measured against last month, the latest full month.
  const currentRevenue = lastFullRevenue;
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

  // Add forecast points for the next 3 months, labelled with real month names, e.g. "Nov"
  const now = new Date();
  const futureMonths = [1, 2, 3].map((i) =>
    new Date(now.getFullYear(), now.getMonth() + i, 1).toLocaleString('en-US', { month: 'short' })
  );
  futureMonths.forEach((mName, i) => {
    const baseVal = projectAhead(i + 1);
    const variance = baseVal * 0.05 * (i + 1);

    series.push({
      period: mName,
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
    // Grows with each full month of history, capped at 85%: a small gym's few months of data never justify more.
    confidenceScore: Math.min(85, 50 + n * 5),
    expectedRenewals,
    predictedNewMembers,
    trendSeries: series,
    hasSufficientData: true,
    explanation: `Based on ${n} full months of transaction trends and retention patterns across ${activeMembers} active members, revenue is projected to reach ${currency}${forecastedRevenue.toLocaleString()} next month (${growthPercent >= 0 ? '+' : ''}${growthPercent}% vs last month).`,
    dataPointsCount: n,
    seasonalFactors: [
      'Active member renewal rate projection',
      'Historical monthly payment run-rate trajectory',
    ],
  };
}
