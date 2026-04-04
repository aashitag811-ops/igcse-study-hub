import { SupabaseClient } from '@supabase/supabase-js';
import { PaperSelector, Session } from '@/lib/exam/types';

export type PaperAssetType = 'qp' | 'ms' | 'gt' | 'er' | 'unknown';

export interface ParsedAssetName {
  filename: string;
  subjectCode: string;
  session: Session;
  year: number;
  assetType: PaperAssetType;
  paper?: number;
  variant?: number;
}

export interface PaperAssetGroup {
  selector: PaperSelector;
  paperId: string;
  questionPaper?: string;
  markScheme?: string;
  gradeThreshold?: string;
  examinerReport?: string;
}

const SESSION_CODE_MAP: Record<string, Session> = {
  m: 'feb_march',
  s: 'may_june',
  w: 'oct_nov',
};

export function parsePastPaperFilename(filename: string): ParsedAssetName | null {
  const lower = filename.toLowerCase().trim();

  const qpMsMatch = lower.match(/^(\d{4})_([msw])(\d{2})_(qp|ms)_(\d)(\d)\.pdf$/);
  if (qpMsMatch) {
    const [, subjectCode, seasonCode, year2, assetType, paper, variant] = qpMsMatch;
    return {
      filename,
      subjectCode,
      session: SESSION_CODE_MAP[seasonCode],
      year: 2000 + Number.parseInt(year2, 10),
      assetType: assetType as PaperAssetType,
      paper: Number.parseInt(paper, 10),
      variant: Number.parseInt(variant, 10),
    };
  }

  const genericDocMatch = lower.match(/^(\d{4})_([msw])(\d{2})_(gt|er)\.pdf$/);
  if (genericDocMatch) {
    const [, subjectCode, seasonCode, year2, assetType] = genericDocMatch;
    return {
      filename,
      subjectCode,
      session: SESSION_CODE_MAP[seasonCode],
      year: 2000 + Number.parseInt(year2, 10),
      assetType: assetType as PaperAssetType,
    };
  }

  return null;
}

export function groupPastPaperAssets(filenames: string[]): PaperAssetGroup[] {
  const groups = new Map<string, PaperAssetGroup>();

  filenames.forEach((filename) => {
    const parsed = parsePastPaperFilename(filename);
    if (!parsed || parsed.paper === undefined || parsed.variant === undefined) {
      return;
    }

    const selector: PaperSelector = {
      subjectCode: parsed.subjectCode,
      year: parsed.year,
      session: parsed.session,
      paper: parsed.paper,
      variant: parsed.variant,
    };

    const paperId = `${selector.subjectCode}_${selector.year}_${selector.session}_${selector.paper}${selector.variant}`;
    const key = paperId;

    if (!groups.has(key)) {
      groups.set(key, { selector, paperId });
    }

    const current = groups.get(key);
    if (!current) return;

    if (parsed.assetType === 'qp') current.questionPaper = filename;
    if (parsed.assetType === 'ms') current.markScheme = filename;
  });

  const parsedGenerics = filenames
    .map(parsePastPaperFilename)
    .filter((entry): entry is ParsedAssetName => Boolean(entry));

  groups.forEach((group) => {
    const sharedDocs = parsedGenerics.filter(
      (entry) =>
        entry.subjectCode === group.selector.subjectCode &&
        entry.year === group.selector.year &&
        entry.session === group.selector.session,
    );

    const gt = sharedDocs.find((entry) => entry.assetType === 'gt');
    const er = sharedDocs.find((entry) => entry.assetType === 'er');
    if (gt) group.gradeThreshold = gt.filename;
    if (er) group.examinerReport = er.filename;
  });

  return [...groups.values()].sort((a, b) => a.paperId.localeCompare(b.paperId));
}

export async function discoverPapersFromSupabase(
  supabase: SupabaseClient,
  bucket: string,
  folderPath: string,
): Promise<PaperAssetGroup[]> {
  const { data, error } = await supabase.storage.from(bucket).list(folderPath, { limit: 1000 });
  if (error) {
    throw new Error(`Supabase storage list failed: ${error.message}`);
  }

  const filenames = (data ?? []).map((entry) => entry.name).filter((name): name is string => Boolean(name));
  return groupPastPaperAssets(filenames);
}

// Made with Bob
