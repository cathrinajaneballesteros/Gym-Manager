import { CostSavingPlaybook, ExpenseAnomaly, ExpenseLeakResult } from '@/types/ai';
import { Expense, ExpenseCategory } from '@/types/database';

// How many earlier months with expenses are needed before spending is called unusual.
const MIN_HISTORY_MONTHS = 2;
// Look back at most this many months for the gym's normal spending.
const HISTORY_WINDOW = 6;
// Ignore tiny differences (e.g. ₱50 → ₱100 is +100% but not worth a warning).
const MIN_DIFFERENCE = 200;
// The most a tip can realistically save, as a share of what the gym spends in that category.
const SAVINGS_SHARE: Partial<Record<ExpenseCategory, number>> = {
  Utilities: 0.15,
  Maintenance: 0.2,
  Supplies: 0.15,
  Other: 0.1,
};

const monthsBefore = (monthKey: string, count: number): string => {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 - count, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (monthKey: string): string => {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

const peso = (n: number) => `₱${Math.round(n).toLocaleString()}`;

// Practical tips for small Philippine open gyms; savings are filled in from the gym's own spending.
const PLAYBOOKS: (Omit<CostSavingPlaybook, 'estimatedMonthlySavings' | 'estimatedAnnualSavings'> & {
  category: ExpenseCategory;
  maxMonthlySavings: number;
})[] = [
  {
    id: 'playbook-fans-lighting',
    title: 'Industrial Fan & Lighting Schedule',
    category: 'Utilities',
    maxMonthlySavings: 800,
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
    id: 'playbook-wifi-counter',
    title: 'Affordable Prepaid Wi-Fi & Counter Bandwidth',
    category: 'Utilities',
    maxMonthlySavings: 800,
    difficulty: 'Easy',
    timeline: '1 Day',
    description:
      'Use an affordable prepaid fiber or basic Wi-Fi plan (₱899–₱1,299/mo) and keep the management counter on a dedicated connection so members do not hog bandwidth.',
    actionChecklist: [
      'Switch to a cost-effective prepaid fiber or community broadband promo',
      'Set a separate Wi-Fi password for the gym counter system so the app runs smoothly',
    ],
  },
  {
    id: 'playbook-welder-rust',
    title: 'Barbell Rust Prevention & Local Welder Repairs',
    category: 'Maintenance',
    maxMonthlySavings: 1200,
    difficulty: 'Easy',
    timeline: 'Weekly',
    description:
      'Humidity rusts iron weights quickly. Regular oil wiping prevents plate deterioration, while a trusted local welder can reinforce bench frames at a fraction of replacement cost.',
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
    maxMonthlySavings: 700,
    difficulty: 'Easy',
    timeline: 'Monthly',
    description:
      'Partner with a nearby water refilling station for 5-gallon container discounts, and buy cleaning supplies and chalk from public market wholesalers.',
    actionChecklist: [
      'Negotiate bulk refill rates (₱20–₱25 per 5-gal jug vs standard ₱35 retail)',
      'Buy powdered detergent, bleach, and mop rags in bulk from public market wholesalers',
      'Keep gym chalk (magnesium block) in a covered tub to prevent dropping and waste',
    ],
  },
  {
    id: 'playbook-drinks-wholesale',
    title: 'Wholesale Cold Drinks Sourcing',
    category: 'Supplies',
    maxMonthlySavings: 1500,
    difficulty: 'Easy',
    timeline: '1 Day',
    description:
      'Buy drinks (Cobra, Sting, bottled water) by the case from wholesale supermarkets rather than retail from convenience stores.',
    actionChecklist: [
      'Buy energy drinks and bottled water by the 24-case at wholesale prices',
      'Keep the cooler stocked before the 4 PM – 8 PM peak crowd',
      'Record drink sales so bottles don’t go missing unnoticed',
    ],
  },
];

// Why a category is higher than usual, and what to do about it.
function explain(category: ExpenseCategory, current: number, baseline: number, pct: number) {
  switch (category) {
    case 'Utilities':
      return {
        severity: (pct >= 40 ? 'critical' : 'moderate') as ExpenseAnomaly['severity'],
        reason: `Utilities came to ${peso(current)}, ${pct}% more than your usual ${peso(baseline)}. Common causes: big fans or the sound system left on after closing, or a faulty water dispenser.`,
        action: 'Switch off big fans during quiet midday hours, unplug the sound system overnight, and keep lights off until dusk.',
      };
    case 'Equipment':
      return {
        severity: 'low' as ExpenseAnomaly['severity'],
        reason: `You spent ${peso(current)} on equipment, more than your usual ${peso(baseline)}. This looks like a one-time purchase, so it isn't counted as monthly savings.`,
        action: 'Before buying new, ask a local welder or machine shop if benches, racks or pulleys can be repaired.',
      };
    case 'Maintenance':
      return {
        severity: (pct >= 35 ? 'moderate' : 'low') as ExpenseAnomaly['severity'],
        reason: `Maintenance is ${pct}% above your usual ${peso(baseline)}. Humidity and sweat speed up rust on bars and tears in bench vinyl.`,
        action: 'Oil barbells and plates regularly, and patch torn bench vinyl early before the foam gets ruined.',
      };
    case 'Supplies':
      return {
        severity: 'low' as ExpenseAnomaly['severity'],
        reason: `Supplies are ${pct}% above your usual ${peso(baseline)}. Small purchases from sari-sari stores add up because of retail markups.`,
        action: 'Buy water refills, chalk and cleaning supplies in bulk from the palengke or a refill station.',
      };
    case 'Marketing':
      return {
        severity: 'low' as ExpenseAnomaly['severity'],
        reason: `Marketing is ${pct}% above your usual ${peso(baseline)}.`,
        action: 'Try member referral perks (e.g. 3 free days for bringing a friend) before paying for ads.',
      };
    default:
      return {
        severity: 'low' as ExpenseAnomaly['severity'],
        reason: `${category} is ${pct}% above your usual ${peso(baseline)}.`,
        action: 'Check recent receipts for anything that was unexpected or could be skipped.',
      };
  }
}

/**
 * Compares a month's spending with the gym's own earlier months and suggests realistic savings.
 * `todayKey` is the local date (YYYY-MM-DD); pure so it can be checked with sample data.
 */
export function analyzeExpenses(expenses: Expense[], todayKey: string): ExpenseLeakResult {
  const dated = expenses.filter((e) => e.expense_date);
  if (dated.length === 0) {
    return {
      anomalies: [],
      totalCategoriesAnalyzed: 0,
      hasSufficientData: false,
      hasEnoughHistory: false,
      alertSummary: 'No expenses recorded yet. Add your expenses to get spending checks and saving tips.',
      potentialMonthlySavings: 0,
      potentialAnnualSavings: 0,
      savingOpportunities: [],
    };
  }

  // Check this month; if nothing is recorded yet, the latest month that has expenses (never a future month).
  const thisMonth = todayKey.slice(0, 7);
  const pastKeys = dated.map((e) => e.expense_date.slice(0, 7)).filter((k) => k <= thisMonth);
  const evaluated = pastKeys.includes(thisMonth) ? thisMonth : pastKeys.sort().pop() || thisMonth;

  const totals = new Map<string, Map<ExpenseCategory, number>>();
  dated.forEach((e) => {
    const key = e.expense_date.slice(0, 7);
    const byCat = totals.get(key) || new Map<ExpenseCategory, number>();
    byCat.set(e.category, (byCat.get(e.category) || 0) + Number(e.amount));
    totals.set(key, byCat);
  });

  // Earlier months the gym actually recorded expenses in (months before they used the app don't count as ₱0).
  const historyMonths = Array.from({ length: HISTORY_WINDOW }, (_, i) => monthsBefore(evaluated, i + 1)).filter((k) =>
    totals.has(k)
  );
  const hasEnoughHistory = historyMonths.length >= MIN_HISTORY_MONTHS;
  const current = totals.get(evaluated) || new Map<ExpenseCategory, number>();
  const usual = (category: ExpenseCategory) =>
    historyMonths.reduce((sum, k) => sum + (totals.get(k)?.get(category) || 0), 0) / (historyMonths.length || 1);

  const anomalies: ExpenseAnomaly[] = [];
  let recurringOverage = 0;
  if (hasEnoughHistory) {
    current.forEach((amount, category) => {
      const baseline = Math.round(usual(category));
      const difference = amount - baseline;
      // A category with no earlier spending has nothing to compare against.
      if (baseline <= 0 || amount <= baseline * 1.2 || difference < MIN_DIFFERENCE) return;
      const pct = Number(((difference / baseline) * 100).toFixed(1));
      const { severity, reason, action } = explain(category, amount, baseline, pct);
      const isOneOff = category === 'Equipment';
      anomalies.push({
        id: `leak_${category.toLowerCase()}_${evaluated}`,
        category,
        currentAmount: amount,
        historicalAverage: baseline,
        differenceAmount: difference,
        percentageIncrease: pct,
        severity,
        detectionReason: reason,
        suggestedAction: action,
        dateDetected: todayKey,
        isOneOff,
      });
      if (!isOneOff) recurringOverage += difference;
    });
  }
  const severityRank = { critical: 3, moderate: 2, low: 1 };
  anomalies.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

  // Tips: what the gym could realistically save, based on its average monthly spend (history + this month).
  const monthsCounted = [...historyMonths, evaluated];
  const averageSpend = (category: ExpenseCategory) =>
    monthsCounted.reduce((sum, k) => sum + (totals.get(k)?.get(category) || 0), 0) / monthsCounted.length;
  const remainingCap = new Map<ExpenseCategory, number>();
  const savingOpportunities: CostSavingPlaybook[] = [];
  PLAYBOOKS.forEach(({ maxMonthlySavings, ...playbook }) => {
    const share = SAVINGS_SHARE[playbook.category] ?? 0;
    if (!remainingCap.has(playbook.category)) {
      remainingCap.set(playbook.category, Math.round(averageSpend(playbook.category) * share));
    }
    // Tips in the same category share one cap, so together they never promise more than is realistic.
    const monthly = Math.min(maxMonthlySavings, remainingCap.get(playbook.category) || 0);
    if (monthly <= 0) return;
    remainingCap.set(playbook.category, (remainingCap.get(playbook.category) || 0) - monthly);
    savingOpportunities.push({ ...playbook, estimatedMonthlySavings: monthly, estimatedAnnualSavings: monthly * 12 });
  });

  const tipSavings = savingOpportunities.reduce((sum, p) => sum + p.estimatedMonthlySavings, 0);
  const potentialMonthlySavings = recurringOverage + tipSavings;
  const label = evaluated === thisMonth ? 'this month' : monthLabel(evaluated);

  let alertSummary: string;
  if (!hasEnoughHistory) {
    alertSummary = `Spending checks start once you have ${MIN_HISTORY_MONTHS} months of expenses recorded.${
      tipSavings > 0 ? ` Meanwhile, these tips could save about ${peso(tipSavings)}/mo.` : ''
    }`;
  } else if (anomalies.length > 0) {
    alertSummary = `${anomalies.length} ${anomalies.length === 1 ? 'category is' : 'categories are'} higher than usual ${label}. You could save about ${peso(potentialMonthlySavings)}/mo.`;
  } else {
    alertSummary = `Spending ${label} is in line with your usual months.${
      tipSavings > 0 ? ` These tips could still save about ${peso(tipSavings)}/mo.` : ''
    }`;
  }

  return {
    anomalies,
    totalCategoriesAnalyzed: current.size,
    hasSufficientData: true,
    hasEnoughHistory,
    alertSummary,
    potentialMonthlySavings,
    potentialAnnualSavings: potentialMonthlySavings * 12,
    savingOpportunities,
  };
}
