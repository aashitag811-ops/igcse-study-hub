import { ICT_0417_12_FM_2025_PAPER_ID, ICT_0417_12_FM_2025_RULES } from '@/lib/exam/fixtures/ict_0417_12_fm_2025';
import { MarkRule } from '@/lib/exam/types';

const RULE_SETS: Record<string, MarkRule[]> = {
  [ICT_0417_12_FM_2025_PAPER_ID]: ICT_0417_12_FM_2025_RULES,
};

export function getRulesForPaper(paperId: string): MarkRule[] {
  return RULE_SETS[paperId] ?? [];
}

// Made with Bob
