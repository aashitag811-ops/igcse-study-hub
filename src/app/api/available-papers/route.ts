import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

interface PaperInfo {
  id: string;
  subjectCode: string;
  year: number;
  session: string;
  component: number;
  variant: number;
}

export async function GET() {
  try {
    const papers: PaperInfo[] = [];
    const papersPath = join(process.cwd(), 'public', 'papers');

    const files = await readdir(papersPath);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      // Parse filename: 0610_m20_qp_22.json
      const match = file.match(/^(\d{4})_([msw])(\d{2})_qp_(\d)(\d)\.json$/);
      if (!match) continue;

      const [, subjectCode, sessionCode, yearShort, componentStr, variantStr] = match;
      const year = 2000 + parseInt(yearShort);
      const component = parseInt(componentStr);
      const variant = parseInt(variantStr);
      const id = file.replace('.json', '');

      papers.push({
        id,
        subjectCode,
        year,
        session: sessionCode,
        component,
        variant,
      });
    }

    // Sort by subject, year desc, session
    papers.sort((a, b) => {
      if (a.subjectCode !== b.subjectCode) return a.subjectCode.localeCompare(b.subjectCode);
      if (a.year !== b.year) return b.year - a.year;
      return a.session.localeCompare(b.session);
    });

    return NextResponse.json(papers);
  } catch (error) {
    console.error('Error scanning papers:', error);
    return NextResponse.json({ error: 'Failed to scan papers' }, { status: 500 });
  }
}

// Made with Bob
