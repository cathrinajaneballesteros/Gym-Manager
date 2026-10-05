import { ExpenseLeakResult, ExpenseAnomaly, CostSavingPlaybook } from '@/types/ai';
import { DBService } from '@/lib/data/db-service';
import { ExpenseCategory } from '@/types/database';

// Standard baseline benchmarks per category for a provincial open-air fitness center
const CATEGORY_HISTORICAL_BASELINES: Record<ExpenseCategory, number> = {
  Rent: 10000,
  Salaries: 8000,
  Utilities: 2500,
  Equipment: 2000,
  Maintenance: 1500,
  Supplies: 800,
  Marketing: 500,
  Other: 1000,
};

/**
 * AI Expense Leak Detector & Cost-Saving Advisory Engine
 * Analyzes operational expenses against multi-month historical trends.
 * Pinpoints spending leaks and generates actionable cost-saving playbooks.
 */
export function detectExpenseLeaks(): ExpenseLeakResult {
  const allExpenses = DBService.getExpenses();

  if (allExpenses.length === 0) {
    return {
      anomalies: [],
      totalCategoriesAnalyzed: 0,
      hasSufficientData: false,
      alertSummary: 'No expense records found. Record operational expenses to enable AI cost optimization.',
      potentialMonthlySavings: 0,
      potentialAnnualSavings: 0,
      savingOpportunities: [],
    };
  }

  // Retrieve multi-month historical breakdown
  const historySummary = DBService.getHistoricalExpenseSummary();
  const currentMonthKey = new Date().toISOString().slice(0, 7);

  // Check if current month has records; if not, evaluate latest month with recorded expenses
  let activeMonthExpenses = allExpenses.filter((e) => (e.expense_date || '').startsWith(currentMonthKey));
  let evaluatedMonthLabel = 'current month';

  if (activeMonthExpenses.length === 0) {
    const latestRecorded = allExpenses
      .filter((e) => e.expense_date)
      .sort((a, b) => b.expense_date.localeCompare(a.expense_date))[0];
    if (latestRecorded) {
      const targetKey = latestRecorded.expense_date.slice(0, 7);
      activeMonthExpenses = allExpenses.filter((e) => (e.expense_date || '').startsWith(targetKey));
      evaluatedMonthLabel = `month of ${targetKey}`;
    } else {
      activeMonthExpenses = allExpenses;
    }
  }

  // Aggregate evaluated month's expenses by category
  const activeCategoryTotals = new Map<ExpenseCategory, number>();
  activeMonthExpenses.forEach((e) => {
    const current = activeCategoryTotals.get(e.category) || 0;
    activeCategoryTotals.set(e.category, current + Number(e.amount));
  });

  const anomalies: ExpenseAnomaly[] = [];
  let directLeakSavings = 0;

  activeCategoryTotals.forEach((currentAmount, category) => {
    // Prefer real multi-month historical average if available and positive, else use standard benchmark
    const histData = historySummary.categories[category];
    const baseline =
      histData && histData.monthlyAvg > 500
        ? histData.monthlyAvg
        : CATEGORY_HISTORICAL_BASELINES[category] || 2500;

    const difference = currentAmount - baseline;

    // Trigger anomaly when current outlay exceeds historical baseline by >= 20%
    if (difference > 0 && currentAmount > baseline * 1.2) {
      const percentageIncrease = Number(((difference / baseline) * 100).toFixed(1));

      let severity: 'low' | 'moderate' | 'critical' = 'low';
      let reason = `${category} spending is ${percentageIncrease}% above the historical monthly baseline.`;
      let suggestedAction = 'Review recent receipts and check for unneeded store purchases.';

      if (category === 'Utilities') {
        severity = percentageIncrease >= 40 ? 'critical' : 'moderate';
        reason = `Utility bill surged to ₱${currentAmount.toLocaleString()} (${percentageIncrease}% above baseline). Common sources in open gyms: high-velocity industrial fans left running during closed hours, sound system amplifier on overnight, or water dispenser cooling faults.`;
        suggestedAction =
          'Turn off large industrial fans during midday lull hours, unplug sound amplifiers overnight, and keep high-bay gym lights off until dusk.';
      } else if (category === 'Equipment') {
        severity = percentageIncrease > 75 ? 'moderate' : 'low';
        reason = `Equipment expenditures rose by ${percentageIncrease}% (₱${currentAmount.toLocaleString()} vs ₱${baseline.toLocaleString()} baseline). For iron weights, bars, or pulley benches, prioritize local welding and refurbishing over expensive brand replacements.`;
        suggestedAction =
          'Consult a local welder or machine shop to repair benches, racks, and pulleys before ordering expensive new equipment.';
      } else if (category === 'Maintenance') {
        severity = percentageIncrease >= 35 ? 'moderate' : 'low';
        reason = `Maintenance spending is ${percentageIncrease}% above normal baseline. In an open-air provincial gym, humidity and sweat accelerate barbell rust and bench vinyl tears.`;
        suggestedAction =
          'Apply routine oil/WD-40 to barbells and plates to stop rust, and patch torn bench leatherette early before the foam core gets ruined.';
      } else if (category === 'Supplies') {
        severity = 'low';
        reason = `Supplies expenses rose by ${percentageIncrease}%. Buying small ad-hoc supplies at nearby sari-sari stores carries high retail markups.`;
        suggestedAction =
          'Purchase 5-gallon water refills, gym chalk, and floor disinfectant in bulk from public market (palengke) wholesalers or local refill stations.';
      } else if (category === 'Marketing') {
        severity = 'low';
        reason = `Promotional spend increased by ${percentageIncrease}%. In provincial towns, community word-of-mouth and Facebook group updates work best.`;
        suggestedAction =
          'Focus on member referral perks (e.g., 3 free gym days for bringing a friend) rather than paid digital ads.';
      }

      anomalies.push({
        id: `leak_${category.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        category,
        currentAmount,
        historicalAverage: baseline,
        differenceAmount: difference,
        percentageIncrease,
        severity,
        detectionReason: reason,
        suggestedAction,
        dateDetected: new Date().toISOString().split('T')[0],
      });

      directLeakSavings += difference;
    }
  });

  // Sort anomalies critical first
  const severityRank = { critical: 3, moderate: 2, low: 1 };
  anomalies.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

  // Feasible, tailored recommendations for provincial open-air gyms ("bakal gyms")
  const savingOpportunities: CostSavingPlaybook[] = [
    {
      id: 'playbook-fans-lighting',
      title: 'Industrial Fan & Lighting Schedule',
      category: 'Utilities',
      estimatedMonthlySavings: 800,
      estimatedAnnualSavings: 9600,
      difficulty: 'Easy',
      timeline: 'Immediate',
      description:
        'Turn off heavy industrial stand fans during low-traffic midday hours (11 AM – 2:30 PM), rely on natural open-air cross-ventilation, and turn on lights only at dusk.',
      actionChecklist: [
        'Power down 2–3 big industrial fans during midday lull hours when gym is empty',
        'Maximize natural daylight through open walls; switch on gym lights only at 5:30 PM',
        'Unplug sound system amplifier and water dispenser heater overnight',
      ],
    },
    {
      id: 'playbook-welder-rust',
      title: 'Barbell Rust Prevention & Local Welder Repairs',
      category: 'Maintenance',
      estimatedMonthlySavings: 1200,
      estimatedAnnualSavings: 14400,
      difficulty: 'Easy',
      timeline: 'Weekly',
      description:
        'Provincial humidity rusts iron weights quickly. Regular oil wiping prevents plate deterioration, while a trusted local welder can reinforce bench frames at a fraction of replacement cost.',
      actionChecklist: [
        'Wipe Olympic barbells and iron plates with WD-40 or light mineral oil twice a month',
        'Have a neighborhood welder re-weld loose bench joints and barbell collars',
        'Patch torn bench vinyl leatherette with heavy upholstery cloth before foam rots',
      ],
    },
    {
      id: 'playbook-water-supplies',
      title: '5-Gallon Water Refill Deal & Bulk Palengke Sourcing',
      category: 'Supplies',
      estimatedMonthlySavings: 700,
      estimatedAnnualSavings: 8400,
      difficulty: 'Easy',
      timeline: 'Monthly',
      description:
        'Partner with a nearby water refilling station for commercial 5-gallon blue container discounts, and buy cleaning detergent and chalk from public market wholesalers.',
      actionChecklist: [
        'Negotiate bulk refill rates (₱20–₱25 per 5-gal jug vs standard ₱35 retail)',
        'Buy powdered detergent, bleach, and mop rags in bulk from public market wholesalers',
        'Keep gym chalk (magnesium block) in a covered tub to prevent dropping and waste',
      ],
    },
    {
      id: 'playbook-drinks-wholesale',
      title: 'Wholesale Cold Drinks & Energy Drinks Sourcing',
      category: 'Other',
      estimatedMonthlySavings: 1500,
      estimatedAnnualSavings: 18000,
      difficulty: 'Easy',
      timeline: '1 Day',
      description:
        'Cold drinks (Cobra, Sting, bottled water) are high-margin in open gyms. Buy by the case from wholesale supermarkets rather than buying retail from convenience stores.',
      actionChecklist: [
        'Buy energy drinks and bottled water by the 24-case at wholesale prices (earn ₱10–₱15 margin/bottle)',
        'Keep ice cooler or mini chiller fully stocked before the 4 PM – 8 PM peak crowd',
        'Track daily drink payments in the log to prevent unrecorded bottle shrinkage',
      ],
    },
    {
      id: 'playbook-wifi-counter',
      title: 'Affordable Prepaid Wi-Fi & Counter Bandwidth',
      category: 'Utilities',
      estimatedMonthlySavings: 800,
      estimatedAnnualSavings: 9600,
      difficulty: 'Easy',
      timeline: '1 Day',
      description:
        'Use an affordable provincial prepaid fiber or basic Wi-Fi plan (₱899–₱1,299/mo) and keep the management counter on a dedicated connection so members do not hog bandwidth.',
      actionChecklist: [
        'Switch to a cost-effective prepaid fiber or community broadband promo',
        'Set a separate Wi-Fi password for the gym counter system so the app runs smoothly',
      ],
    },
  ];

  // Calculate total potential monthly savings (direct leaks + playbook opportunities)
  const playbookMonthlySavings = savingOpportunities.reduce((sum, p) => sum + p.estimatedMonthlySavings, 0);
  const totalPotentialMonthly = directLeakSavings > 0 ? directLeakSavings + playbookMonthlySavings : playbookMonthlySavings;
  const totalPotentialAnnual = totalPotentialMonthly * 12;

  const alertSummary =
    anomalies.length > 0
      ? `${anomalies.length} spending ${anomalies.length === 1 ? 'anomaly' : 'anomalies'} flagged in ${evaluatedMonthLabel}. Total potential savings: ₱${totalPotentialMonthly.toLocaleString()}/mo.`
      : `Operating expenses are tracking within normal limits for an open gym. Following these practical tips can save up to ₱${totalPotentialMonthly.toLocaleString()}/mo.`;

  return {
    anomalies,
    totalCategoriesAnalyzed: activeCategoryTotals.size,
    hasSufficientData: true,
    alertSummary,
    potentialMonthlySavings: totalPotentialMonthly,
    potentialAnnualSavings: totalPotentialAnnual,
    savingOpportunities,
  };
}
