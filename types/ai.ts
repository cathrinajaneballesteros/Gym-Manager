// AI Types for Revenue Forecast, Churn Prediction, and Expense Leak Detection

export interface RevenueForecastPoint {
  period: string; // e.g., "Nov 2026", "Month +1"
  projectedRevenue: number;
  lowerConfidence: number;
  upperConfidence: number;
  isForecast: boolean;
  projectedRenewals: number;
  projectedNewMembers: number;
}

export interface RevenueForecastResult {
  currentMonthlyRevenue: number;
  forecastedNextMonthRevenue: number;
  projectedGrowthPercent: number;
  confidenceScore: number; // 0 - 100%
  expectedRenewals: number;
  predictedNewMembers: number;
  trendSeries: RevenueForecastPoint[];
  hasSufficientData: boolean;
  explanation: string;
  dataPointsCount: number;
  seasonalFactors: string[];
}

export type ChurnRiskLevel = 'Low' | 'Medium' | 'High';

export interface ChurnPredictionMember {
  memberId: string;
  memberName: string;
  email: string;
  phone: string;
  planName: string;
  daysSinceLastVisit: number;
  daysUntilExpiration: number;
  expirationDate: string;
  riskLevel: ChurnRiskLevel;
  riskScore: number; // 0 - 100
  factors: string[];
  suggestedAction: string;
}

export interface ChurnPredictionResult {
  totalAnalyzed: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  highRiskMembers: ChurnPredictionMember[];
  hasSufficientData: boolean;
  explanation: string;
}

export interface ExpenseAnomaly {
  id: string;
  category: string;
  currentAmount: number;
  historicalAverage: number;
  differenceAmount: number;
  percentageIncrease: number;
  severity: 'low' | 'moderate' | 'critical';
  detectionReason: string;
  suggestedAction: string;
  dateDetected: string;
}

export interface ExpenseLeakResult {
  anomalies: ExpenseAnomaly[];
  totalCategoriesAnalyzed: number;
  hasSufficientData: boolean;
  alertSummary: string;
  potentialMonthlySavings: number;
}
