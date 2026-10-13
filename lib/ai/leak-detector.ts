import { ExpenseLeakResult } from '@/types/ai';
import { DBService } from '@/lib/data/db-service';
import { getTodayKey } from '@/lib/ui/date';
import { analyzeExpenses } from './expense-analysis';

/**
 * Spending checks: flags expense categories that are higher than the gym's usual months,
 * and suggests money-saving tips sized to what the gym actually spends.
 */
export function detectExpenseLeaks(): ExpenseLeakResult {
  return analyzeExpenses(DBService.getExpenses(), getTodayKey());
}
