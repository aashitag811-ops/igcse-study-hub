import {
  END_LINE_MARK_TOKEN_REGEX,
  NOISE_LINE_REGEXES,
  QUESTION_START_REGEX,
  SUBPART_REGEX,
  SUBSUBPART_REGEX,
} from '@/lib/exam/regex';
import { ParsedPaper, PaperQuestion, PaperSelector } from '@/lib/exam/types';

export interface ExtractionInput {
  selector: PaperSelector;
  title: string;
  sourceKind: 'text_pdf' | 'image_pdf' | 'png';
  textByPage: string[];
}

interface NormalizedLine {
  text: string;
  page: number;
}

export function extractPaperToStructuredJson(input: ExtractionInput): ParsedPaper {
  const lines = normalizeLines(input.textByPage);
  const questions = parseQuestions(lines);

  return {
    id: buildPaperId(input.selector),
    selector: input.selector,
    title: input.title,
    questions,
  };
}

export function cleanPageText(page: string): string {
  return page
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !NOISE_LINE_REGEXES.some((regex) => regex.test(line)))
    .join('\n');
}

function normalizeLines(textByPage: string[]): NormalizedLine[] {
  return textByPage.flatMap((rawPage, pageIndex) => {
    const cleaned = cleanPageText(rawPage);
    if (/^BLANK PAGE$/im.test(cleaned)) {
      return [];
    }

    return cleaned.split('\n').map((text) => ({ text, page: pageIndex + 1 }));
  });
}

function parseQuestions(lines: NormalizedLine[]): PaperQuestion[] {
  const questions: PaperQuestion[] = [];
  let currentRoot: PaperQuestion | null = null;
  let currentSubpart: PaperQuestion | null = null;
  let currentSubsubpart: PaperQuestion | null = null;

  for (const { text, page } of lines) {
    const rootMatch = text.match(QUESTION_START_REGEX);
    if (rootMatch) {
      const qNumber = rootMatch[1];
      const remainder = text.replace(QUESTION_START_REGEX, '').trim();
      const parsed = parsePromptLine(remainder);

      currentRoot = {
        qid: qNumber,
        prompt: parsed.prompt,
        marks: parsed.marks,
        answerType: inferAnswerType(parsed.prompt),
        expectedItems: inferExpectedItems(parsed.prompt),
        sourcePage: page,
        children: [],
      };
      questions.push(currentRoot);
      currentSubpart = null;
      currentSubsubpart = null;
      continue;
    }

    const subpartMatch = text.match(SUBPART_REGEX);
    if (subpartMatch && currentRoot) {
      const subLabel = subpartMatch[1];
      const remainder = text.replace(SUBPART_REGEX, '').trim();
      const parsed = parsePromptLine(remainder);

      currentSubpart = {
        qid: `${currentRoot.qid}${subLabel}`,
        prompt: parsed.prompt,
        marks: parsed.marks,
        answerType: inferAnswerType(parsed.prompt),
        expectedItems: inferExpectedItems(parsed.prompt),
        sourcePage: page,
        children: [],
      };
      currentRoot.children = [...(currentRoot.children ?? []), currentSubpart];
      currentSubsubpart = null;
      continue;
    }

    const subsubpartMatch = text.match(SUBSUBPART_REGEX);
    if (subsubpartMatch && currentSubpart) {
      const subsubLabel = subsubpartMatch[1].toLowerCase();
      const remainder = text.replace(SUBSUBPART_REGEX, '').trim();
      const parsed = parsePromptLine(remainder);

      currentSubsubpart = {
        qid: `${currentSubpart.qid}${subsubLabel}`,
        prompt: parsed.prompt,
        marks: parsed.marks,
        answerType: inferAnswerType(parsed.prompt),
        expectedItems: inferExpectedItems(parsed.prompt),
        sourcePage: page,
      };

      currentSubpart.children = [...(currentSubpart.children ?? []), currentSubsubpart];
      continue;
    }

    const markOnlyLine = parseIsolatedMarkLine(text);
    if (markOnlyLine !== null) {
      const target = currentSubsubpart ?? currentSubpart ?? currentRoot;
      if (target && target.marks === 0) {
        target.marks = markOnlyLine;
      }
      continue;
    }

    appendContinuation(text, currentSubsubpart ?? currentSubpart ?? currentRoot);
  }

  return questions;
}

function appendContinuation(line: string, target: PaperQuestion | null): void {
  if (!target || !line) return;

  const nextPrompt = `${target.prompt} ${line}`.replace(/\s+/g, ' ').trim();
  target.prompt = nextPrompt;

  if (!target.expectedItems) {
    target.expectedItems = inferExpectedItems(nextPrompt);
  }
}

function parsePromptLine(line: string): { prompt: string; marks: number } {
  const markMatch = line.match(END_LINE_MARK_TOKEN_REGEX);
  if (!markMatch) {
    return { prompt: line, marks: 0 };
  }

  const marks = Number.parseInt(markMatch[1], 10);
  return {
    prompt: line.replace(END_LINE_MARK_TOKEN_REGEX, '').trim(),
    marks: Number.isFinite(marks) ? marks : 0,
  };
}

function parseIsolatedMarkLine(line: string): number | null {
  const markOnly = line.match(/^\[(\d+)]\s*$/);
  if (!markOnly) return null;

  const marks = Number.parseInt(markOnly[1], 10);
  return Number.isFinite(marks) ? marks : null;
}

function inferAnswerType(prompt: string): PaperQuestion['answerType'] {
  const lower = prompt.toLowerCase();

  if (/circle|choose|tick|select/.test(lower)) return 'multi_select';
  if (/state one|state two|give two|list/.test(lower)) return 'list_n';
  if (/calculate|work out|estimate/.test(lower)) return 'numeric';
  if (/explain what is meant|what is meant by|define/.test(lower)) return 'short_text';
  if (/discuss|evaluate|compare|benefits and drawbacks|for and against/.test(lower)) return 'long_response';
  if (/state|identify|name/.test(lower)) return 'short_text';
  return 'short_text';
}

function inferExpectedItems(prompt: string): number | undefined {
  const lower = prompt.toLowerCase();
  if (/\bone\b/.test(lower)) return 1;
  if (/\btwo\b/.test(lower)) return 2;
  if (/\bthree\b/.test(lower)) return 3;
  if (/\bfour\b/.test(lower)) return 4;
  if (/\bfive\b/.test(lower)) return 5;
  return undefined;
}

function buildPaperId(selector: PaperSelector): string {
  return `${selector.subjectCode}_${selector.year}_${selector.session}_${selector.paper}${selector.variant}`;
}

// Made with Bob
