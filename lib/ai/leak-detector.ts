import { ExpenseLeakResult, ExpenseAnomaly, CostSavingPlaybook } from '@/types/ai';
import { DBService } from '@/lib/data/db-service';
import { ExpenseCategory } from '@/types/database';

// Standard baseline benchmarks per category for a small-to-medium fitness center
const CATEGORY_HISTORICAL_BASELINES: Record<ExpenseCategory, number> = {
  Rent: 45000,
  Salaries: 36000,
  Utilities: 8500, // Proposed benchmark: ₱8,000 - ₱8,500
  Equipment: 8000,
  Maintenance: 5500,
  Supplies: 3000,
  Marketing: 3500,
  Other: 2000,
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
      histData && histData.monthlyAvg > 1000
        ? histData.monthlyAvg
        : CATEGORY_HISTORICAL_BASELINES[category] || 5000;

    const difference = currentAmount - baseline;

    // Trigger anomaly when current outlay exceeds historical baseline by >= 20%
    if (difference > 0 && currentAmount > baseline * 1.2) {
      const percentageIncrease = Number(((difference / baseline) * 100).toFixed(1));

      let severity: 'low' | 'moderate' | 'critical' = 'low';
      let reason = `${category} spending is ${percentageIncrease}% above the historical monthly baseline.`;
      let suggestedAction = 'Review recent line-item invoices and enforce pre-approval limits.';

      if (category === 'Utilities') {
        severity = percentageIncrease >= 40 ? 'critical' : 'moderate';
        reason = `Utility bill surged to ₱${currentAmount.toLocaleString()} (${percentageIncrease}% above the ₱${baseline.toLocaleString()} historical average). Typical leak source: 24/7 air conditioning left idling during off-peak hours or water heating cycles.`;
        suggestedAction =
          'Program commercial thermostats to 24°C, shut down floor AC units 10 PM - 5 AM, and inspect water heaters for thermal sensor faults.';
      } else if (category === 'Equipment') {
        severity = percentageIncrease > 75 ? 'moderate' : 'low';
        reason = `Equipment expenditures rose by ${percentageIncrease}% (₱${currentAmount.toLocaleString()} vs ₱${baseline.toLocaleString()} baseline). If this is a long-term asset acquisition (e.g., plates or treadmills), capitalize over 36 months rather than expensing as immediate operational overhead.`;
        suggestedAction =
          'Distinguish capital improvements (CapEx) from regular maintenance; review equipment warranty terms before authorizing vendor repairs.';
      } else if (category === 'Maintenance') {
        severity = percentageIncrease >= 35 ? 'moderate' : 'low';
        reason = `Maintenance spending is ${percentageIncrease}% higher than the typical ₱${baseline.toLocaleString()}/mo upkeep allocation. Spikes often correlate with emergency breakdown service fees.`;
        suggestedAction =
          'Lock in a fixed quarterly preventative maintenance SLA with certified gym equipment technicians to eliminate emergency call-out surcharges.';
      } else if (category === 'Supplies') {
        severity = 'low';
        reason = `Consumables and cleaning supplies outlays exceed baseline by ${percentageIncrease}%. Frequent ad-hoc retail purchases incur 20-30% markups.`;
        suggestedAction =
          'Switch to quarterly wholesale bulk procurement for gym wipes, sanitation liquid, and paper towels directly from commercial distributors.';
      } else if (category === 'Marketing') {
        severity = 'low';
        reason = `Promotional spend increased by ${percentageIncrease}%. Ensure digital ad spend correlates with tracked member conversions.`;
        suggestedAction =
          'Review cost-per-acquisition across paid social channels and prioritize zero-cost member referral incentives.';
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

  // Generate actionable, tailored Cost-Saving Playbooks for gym profitability
  const savingOpportunities: CostSavingPlaybook[] = [
    {
      id: 'playbook-energy',
      title: 'HVAC & Power Automation Protocol',
      category: 'Utilities',
      estimatedMonthlySavings: 4500,
      estimatedAnnualSavings: 54000,
      difficulty: 'Easy',
      timeline: '1-2 Days',
      description:
        'Air conditioning and industrial ventilation represent 45-60% of gym electricity consumption. Implementing zone scheduling during off-peak hours generates immediate cash savings.',
      actionChecklist: [
        'Set main gym floor thermostats to 23°C - 24°C (dropping each degree below 24°C adds ~6-8% power cost)',
        'Install digital timers on heavy exhaust fans and studio AC units to power down between 10:00 PM and 5:00 AM',
        'Clean air conditioning condenser filters bi-weekly to boost heat exchange efficiency by up to 15%',
        'Switch remaining cardio room and locker room lighting to high-lumen commercial LEDs',
      ],
    },
    {
      id: 'playbook-preventative-sla',
      title: 'Preventative Maintenance SLA vs Emergency Calls',
      category: 'Maintenance',
      estimatedMonthlySavings: 2800,
      estimatedAnnualSavings: 33600,
      difficulty: 'Moderate',
      timeline: '1 Week',
      description:
        'Emergency technician calls for snapped treadmill belts and cable crossover pulleys cost 2.5x more than scheduled preventative upkeep while damaging member trust.',
      actionChecklist: [
        'Establish weekly staff cable inspection, guide rod lubrication (silicone-only), and bolt-tightening routine',
        'Negotiate a flat quarterly preventative maintenance contract with a local fitness equipment technician',
        'Maintain a basic on-site spare parts kit (universal cables, pulleys, carabiners, treadmill lube)',
        'Track equipment serial numbers and warranty expirations in the maintenance log',
      ],
    },
    {
      id: 'playbook-supplies-wholesale',
      title: 'Bulk Sourcing & Sanitation Procurement',
      category: 'Supplies',
      estimatedMonthlySavings: 1500,
      estimatedAnnualSavings: 18000,
      difficulty: 'Easy',
      timeline: '3-4 Days',
      description:
        'Buying disinfectant spray, microfiber towels, and dispenser tissue from retail grocery or hardware stores incurs a 25-35% price premium.',
      actionChecklist: [
        'Open a commercial B2B account with institutional cleaning chemical and paper distributors',
        'Purchase hospital-grade concentrate sanitizer in 20-liter drums rather than pre-diluted spray bottles',
        'Order a 90-day supply of dispenser rolls to trigger free freight and volume pricing tier',
        'Audit member-accessible towel stations to reduce laundering loss and water heating overhead',
      ],
    },
    {
      id: 'playbook-merchant-software',
      title: 'Vendor Auditing & Software Pruning',
      category: 'Other',
      estimatedMonthlySavings: 1200,
      estimatedAnnualSavings: 14400,
      difficulty: 'Moderate',
      timeline: '2 Days',
      description:
        'Audit third-party SaaS subscriptions, POS merchant rates, and recurring service charges to eliminate dead overhead.',
      actionChecklist: [
        'Audit bank statements for auto-renewing software tools (SMS providers, duplicate music licenses, graphic apps)',
        'Compare QR PH merchant settlement fees to ensure your payment gateway fee is capped under standard rates',
        'Audit internet and CCTV broadband plans — re-contracting often yields double speed at lower promo rates',
      ],
    },
  ];

  // Calculate total potential monthly savings
  // Blend direct leak overages + actionable playbook baseline optimizations
  const playbookMonthlySavings = savingOpportunities.reduce((sum, p) => sum + p.estimatedMonthlySavings, 0);
  const totalPotentialMonthly = Math.max(directLeakSavings, Math.round(directLeakSavings * 0.75 + playbookMonthlySavings * 0.45));
  const totalPotentialAnnual = totalPotentialMonthly * 12;

  const alertSummary =
    anomalies.length > 0
      ? `${anomalies.length} spending anomalies flagged in ${evaluatedMonthLabel}. Total potential optimization: ₱${totalPotentialMonthly.toLocaleString()}/mo (₱${totalPotentialAnnual.toLocaleString()}/yr).`
      : `Operating expenses are tracking within historical norms. AI playbooks identify up to ₱${totalPotentialMonthly.toLocaleString()}/mo in proactive cash-flow savings.`;

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
