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
  visitsLast30Days: number;
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
  /** A one-time purchase (equipment): shown, but not counted as monthly savings. */
  isOneOff?: boolean;
}

export interface CostSavingPlaybook {
  id: string;
  title: string;
  category: string;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
  difficulty: 'Easy' | 'Moderate' | 'Advanced';
  timeline: string;
  description: string;
  actionChecklist: string[];
}

export interface ExpenseLeakResult {
  anomalies: ExpenseAnomaly[];
  totalCategoriesAnalyzed: number;
  hasSufficientData: boolean;
  /** At least 2 earlier months of expenses to compare against; before that, nothing is flagged. */
  hasEnoughHistory: boolean;
  alertSummary: string;
  potentialMonthlySavings: number;
  potentialAnnualSavings: number;
  savingOpportunities: CostSavingPlaybook[];
}
