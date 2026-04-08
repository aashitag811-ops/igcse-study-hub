import {
  ComponentRule,
  MarkRule,
  MarkingPolicy,
  MarkingResult,
  QuestionScore,
  StrictnessProfile,
  StudentAnswer,
} from '@/lib/exam/types';

const CAMBRIDGE_LIKE_THRESHOLD: Record<StrictnessProfile, number> = {
  general: 0.82,
  technical: 0.9,
  acronym: 0.97,
};

const PRACTICE_STRICT_THRESHOLD: Record<StrictnessProfile, number> = {
  general: 0.9,
  technical: 0.95,
  acronym: 1,
};

export const PRACTICE_STRICT_POLICY: MarkingPolicy = {
  mode: 'practice_strict',
  allowSynonyms: true,
  disallowAcronymFuzzy: true,
  minTokenOverlapGeneral: 0.55,
  minTokenOverlapTechnical: 0.7,
};

export function markSubmission(
  answers: StudentAnswer[],
  rules: MarkRule[],
  policy: MarkingPolicy = PRACTICE_STRICT_POLICY,
): MarkingResult {
  const scoreByQuestion = rules.map((rule) =>
    markOneQuestion(rule, answers.find((entry) => entry.qid === rule.qid), policy),
  );

  const totalAwarded = scoreByQuestion.reduce((sum, item) => sum + item.awarded, 0);
  const totalAvailable = scoreByQuestion.reduce((sum, item) => sum + item.maxMarks, 0);

  return {
    totalAwarded,
    totalAvailable,
    percentage: totalAvailable === 0 ? 0 : Number(((totalAwarded / totalAvailable) * 100).toFixed(2)),
    questions: scoreByQuestion,
  };
}

function markOneQuestion(rule: MarkRule, answer: StudentAnswer | undefined, policy: MarkingPolicy): QuestionScore {
  if (!answer) {
    return {
      qid: rule.qid,
      awarded: 0,
      maxMarks: rule.maxMarks,
      matchedPointIds: [],
      feedback: ['NAQ: answer missing.'],
    };
  }

  const fragments = toFragments(answer.answer);
  const feedback: string[] = [];
  const matchedPointIds = new Set<string>();

  let pointMarks = 0;
  if (rule.points?.length) {
    for (const point of rule.points) {
      if (point.requires && !point.requires.every((dependency) => matchedPointIds.has(dependency))) {
        continue;
      }

      const candidates = [...point.acceptable, ...(policy.allowSynonyms ? point.synonyms ?? [] : [])];
      const matched = fragments.some((fragment) =>
        isAcceptable(fragment, candidates, point.strictness ?? 'general', policy),
      );

      if (!matched || matchedPointIds.has(point.id)) {
        continue;
      }

      matchedPointIds.add(point.id);
      pointMarks += point.marks;
      feedback.push(`✓ ${point.id} (+${point.marks})`);

      if (rule.selectCount && matchedPointIds.size >= rule.selectCount) {
        feedback.push(`MAX: required number of points reached (${rule.selectCount}).`);
        break;
      }
    }
  }

  const componentMarks = markComponents(rule.components, fragments, feedback, policy);
  const totalRaw = pointMarks + componentMarks;
  const awarded = Math.min(totalRaw, rule.cap ?? rule.maxMarks);

  if (awarded < totalRaw) {
    feedback.push(`MAX cap applied (${awarded}/${totalRaw}).`);
  }

  if (!feedback.some((entry) => entry.startsWith('✓'))) {
    feedback.push('✗ No accepted mark-scheme point was identified.');
  }

  return {
    qid: rule.qid,
    awarded,
    maxMarks: rule.maxMarks,
    matchedPointIds: [...matchedPointIds],
    feedback,
  };
}

function markComponents(
  components: ComponentRule[] | undefined,
  fragments: string[],
  feedback: string[],
  policy: MarkingPolicy,
): number {
  if (!components?.length) return 0;

  let marks = 0;
  for (const component of components) {
    const strictness: StrictnessProfile = component.acceptable.some(isAcronymToken) ? 'acronym' : 'general';
    const matched = fragments.some((fragment) => isAcceptable(fragment, component.acceptable, strictness, policy));

    if (matched) {
      marks += component.marks;
      feedback.push(`✓ component:${component.id} (+${component.marks})`);
    }
  }

  return marks;
}

function toFragments(answer: StudentAnswer['answer']): string[] {
  if (Array.isArray(answer)) return answer.map(normalizeText).filter(Boolean);
  if (typeof answer === 'number') return [String(answer)];

  return answer
    .split(/[\n;,]+/)
    .map(normalizeText)
    .filter(Boolean);
}

function isAcceptable(
  fragment: string,
  rawCandidates: string[],
  strictness: StrictnessProfile,
  policy: MarkingPolicy,
): boolean {
  const candidates = rawCandidates.map(normalizeText).filter(Boolean);
  const thresholds = policy.mode === 'practice_strict' ? PRACTICE_STRICT_THRESHOLD : CAMBRIDGE_LIKE_THRESHOLD;

  for (const candidate of candidates) {
    if (fragment === candidate) return true;

    const acronymLike = strictness === 'acronym' || isAcronymToken(candidate);
    if (acronymLike && policy.disallowAcronymFuzzy) {
      continue;
    }

    const similarity = normalizedSimilarity(fragment, candidate);
    if (similarity < thresholds[strictness]) {
      continue;
    }

    const overlap = tokenOverlap(fragment, candidate);
    const overlapMin = strictness === 'general' ? policy.minTokenOverlapGeneral : policy.minTokenOverlapTechnical;
    if (overlap < overlapMin) {
      continue;
    }

    if (strictness !== 'general' && createsTermCollision(fragment, candidates)) {
      return false;
    }

    return true;
  }

  return false;
}

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s.+-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const aTokens = new Set(a.split(' ').filter(Boolean));
  const bTokens = new Set(b.split(' ').filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let intersection = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) intersection += 1;
  });

  return intersection / Math.max(aTokens.size, bTokens.size);
}

function normalizedSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + substitutionCost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function createsTermCollision(fragment: string, candidates: string[]): boolean {
  const near = candidates.filter((candidate) => normalizedSimilarity(fragment, candidate) > 0.85);
  return near.length > 1;
}

function isAcronymToken(value: string): boolean {
  return /^[a-z0-9]{2,5}$/.test(value.replace(/[^a-z0-9]/g, ''));
}

// Made with Bob
