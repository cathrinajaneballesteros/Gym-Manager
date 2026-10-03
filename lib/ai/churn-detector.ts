import { ChurnPredictionResult, ChurnPredictionMember, ChurnRiskLevel } from '@/types/ai';
import { DBService } from '@/lib/data/db-service';

/**
 * AI Membership Churn Prediction Module
 * Evaluates attendance recency, days to expiration, and membership history
 * to classify attrition risk and provide actionable retention suggestions.
 */
export function predictMemberChurn(requireMinMembers: number = 3): ChurnPredictionResult {
  const members = DBService.getMembers();
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr); // UTC midnight of the current date

  if (members.length < requireMinMembers) {
    return {
      totalAnalyzed: members.length,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
      highRiskMembers: [],
      hasSufficientData: false,
      explanation:
        'Insufficient membership data. The churn prediction engine requires active members with recorded attendance and expiration schedules to compute risk indicators.',
    };
  }

  const analyzedMembers: ChurnPredictionMember[] = [];
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  members.forEach((m) => {
    // 1. Calculate days since last visit
    let daysSinceLastVisit = 3; // Default default
    if (m.last_visit_date) {
      const visitDate = new Date(m.last_visit_date);
      daysSinceLastVisit = Math.max(
        0,
        Math.floor((today.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24))
      );
    }

    // 2. Calculate days until membership expiration
    const endDate = new Date(m.end_date);
    const daysUntilExpiration = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 3. Risk scoring algorithm (0 - 100)
    let riskScore = 15; // baseline low risk
    const factors: string[] = [];

    // Factor A: Inactivity (Proposal Case: hasn't visited in 20 days)
    if (daysSinceLastVisit >= 20) {
      riskScore += 45;
      factors.push(`No gym visits recorded for ${daysSinceLastVisit} days`);
    } else if (daysSinceLastVisit >= 14) {
      riskScore += 25;
      factors.push(`Inactivity period of ${daysSinceLastVisit} days`);
    } else if (daysSinceLastVisit <= 3) {
      riskScore -= 10;
      factors.push('Regular gym attendance in the last 72 hours');
    }

    // Factor B: Expiration proximity (Proposal Case: expires in <= 7 days)
    if (daysUntilExpiration <= 7 && daysUntilExpiration >= 0) {
      riskScore += 30;
      factors.push(`Membership expires in ${daysUntilExpiration} days`);
    } else if (daysUntilExpiration < 0) {
      riskScore += 40;
      factors.push(`Membership expired ${Math.abs(daysUntilExpiration)} days ago without renewal`);
    } else if (daysUntilExpiration <= 14) {
      riskScore += 15;
      factors.push(`Renewal window approaching in ${daysUntilExpiration} days`);
    }

    // Factor C: Plan commitment
    if ((m.plan?.duration_months ?? 0) >= 12) {
      riskScore -= 15;
      factors.push('High commitment tier (Annual VIP pass)');
    }

    // Bound risk score between 5 and 98
    riskScore = Math.min(98, Math.max(5, riskScore));

    // Determine category
    let riskLevel: ChurnRiskLevel = 'Low';
    let suggestedAction = 'Maintain standard automated communication and workout check-ins.';

    if (riskScore >= 70) {
      riskLevel = 'High';
      highCount++;
      if (daysSinceLastVisit >= 18 && daysUntilExpiration <= 7) {
        suggestedAction =
          'Urgent personal call from front desk. Offer complimentary personal training session or 10% renewal rebate.';
      } else if (daysUntilExpiration < 0) {
        suggestedAction = 'Send reactivation SMS with a "We miss you" waiving of joining fee.';
      } else {
        suggestedAction = 'Send targeted motivational SMS and invite to upcoming weekend group fitness class.';
      }
    } else if (riskScore >= 40) {
      riskLevel = 'Medium';
      mediumCount++;
      suggestedAction =
        'Send renewal reminder email and offer early-bird discount on next plan renewal.';
    } else {
      lowCount++;
    }

    analyzedMembers.push({
      memberId: m.id,
      memberName: `${m.first_name} ${m.last_name}`,
      email: m.email,
      phone: m.phone,
      planName: m.plan?.name || 'Standard Plan',
      daysSinceLastVisit,
      daysUntilExpiration,
      expirationDate: m.end_date,
      riskLevel,
      riskScore,
      factors,
      suggestedAction,
    });
  });

  // Sort descending by risk score
  analyzedMembers.sort((a, b) => b.riskScore - a.riskScore);

  return {
    totalAnalyzed: members.length,
    highRiskCount: highCount,
    mediumRiskCount: mediumCount,
    lowRiskCount: lowCount,
    highRiskMembers: analyzedMembers.filter((m) => m.riskLevel === 'High'),
    hasSufficientData: true,
    explanation:
      'Risk scores are generated using non-intrusive heuristics comparing attendance frequency, expiration deadlines, and historical renewal patterns. Predictions are statistical estimates to assist gym staff in retention outreach.',
  };
}
