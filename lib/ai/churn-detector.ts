import { ChurnPredictionResult, ChurnPredictionMember, ChurnRiskLevel } from '@/types/ai';
import { DBService } from '@/lib/data/db-service';
import { getTodayKey, daysAgoKey, toDateKey } from '@/lib/ui/date';

/**
 * AI Membership Churn Prediction Module
 * Evaluates attendance recency, days to expiration, and membership history
 * to classify attrition risk and provide actionable retention suggestions.
 */
export function predictMemberChurn(requireMinMembers: number = 3): ChurnPredictionResult {
  // Members who never paid aren't at risk of leaving yet; they're still waiting on a first payment.
  const members = DBService.getMembers().filter((m) => m.status !== 'pending');
  const todayStr = getTodayKey();
  const today = new Date(todayStr); // Today's local date, read as UTC midnight like the stored dates

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

  // Check-in dates per member, for comparing the last 30 days with the 30 days before.
  const visitDaysByMember = new Map<string, string[]>();
  DBService.getAttendance().forEach((a) => {
    const days = visitDaysByMember.get(a.member_id) || [];
    days.push(toDateKey(new Date(a.check_in_time)));
    visitDaysByMember.set(a.member_id, days);
  });
  const recentStart = daysAgoKey(29);
  const previousStart = daysAgoKey(59);

  const analyzedMembers: ChurnPredictionMember[] = [];
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  members.forEach((m) => {
    // 1. Calculate days since last visit. A new member's last visit starts out as their start date,
    // so without any check-ins it's counted from when they joined, not as a recent visit.
    const hasCheckIns = visitDaysByMember.has(m.id);
    const lastVisit = hasCheckIns ? m.last_visit_date : m.start_date;
    let daysSinceLastVisit = 3; // Default default
    if (lastVisit) {
      const visitDate = new Date(lastVisit);
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
    } else if (daysSinceLastVisit <= 3 && hasCheckIns) {
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

    // Factor D: Visit drop-off (last 30 days vs the 30 days before)
    const visitDays = visitDaysByMember.get(m.id) || [];
    const visitsLast30Days = visitDays.filter((d) => d >= recentStart).length;
    const visitsPrevious30Days = visitDays.filter((d) => d >= previousStart && d < recentStart).length;
    if (visitsPrevious30Days >= 4 && visitsLast30Days < visitsPrevious30Days / 2) {
      riskScore += 15;
      factors.push(`Visits dropped from ${visitsPrevious30Days} to ${visitsLast30Days} in the last 30 days`);
    } else if (visitsLast30Days >= 8) {
      riskScore -= 5;
      factors.push(`Visits regularly: ${visitsLast30Days} times in the last 30 days`);
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
      visitsLast30Days,
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
