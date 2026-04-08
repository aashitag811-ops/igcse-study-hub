import { NextRequest, NextResponse } from 'next/server';
import { extractPaperToStructuredJson } from '@/lib/exam/paper-extraction';
import { ICT_0417_12_FM_2025_PAPER_ID } from '@/lib/exam/fixtures/ict_0417_12_fm_2025';
import { Session } from '@/lib/exam/types';

function isValidSession(session: string): session is Session {
  return session === 'feb_march' || session === 'may_june' || session === 'oct_nov';
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const subjectCode = params.get('subject');
  const year = Number.parseInt(params.get('year') ?? '', 10);
  const sessionRaw = params.get('session') ?? '';
  const paper = Number.parseInt(params.get('paper') ?? '', 10);
  const variant = Number.parseInt(params.get('variant') ?? '', 10);

  if (
    !subjectCode ||
    !isValidSession(sessionRaw) ||
    Number.isNaN(year) ||
    Number.isNaN(paper) ||
    Number.isNaN(variant)
  ) {
    return NextResponse.json(
      { error: 'Invalid selector. Expected subject, year, session(feb_march|may_june|oct_nov), paper, variant.' },
      { status: 400 },
    );
  }

  // TODO: Replace sample text with OCR/text extraction from storage based on selector.
  const parsed = extractPaperToStructuredJson({
    selector: { subjectCode, year, session: sessionRaw, paper, variant },
    title: `${subjectCode}/${paper}${variant} ${year} ${sessionRaw}`,
    sourceKind: 'text_pdf',
    textByPage: [
      '1 Circle two input devices. [2]\n2 (a) Describe the following software.\n(i) Spreadsheet [2]\n(ii) Database [2]\n(iii) Applet [2]\n(b) State three types of system software. [3]',
      '3 A doctor uses an expert system to diagnose a patient\'s illness.\n(a) Describe how expert systems produce diagnoses of an illness. [4]\n(b) Explain how an expert system could produce an incorrect diagnosis of an illness. [2]',
      '13 (a) State the need for generic file formats. [2]\n(b) Give two examples of generic file formats used for images. [2]',
      'BLANK PAGE',
    ],
  });

  // Keep a deterministic paperId used by /api/mark rule registry for this known calibration paper.
  parsed.id = ICT_0417_12_FM_2025_PAPER_ID;

  return NextResponse.json(parsed);
}

// Made with Bob
