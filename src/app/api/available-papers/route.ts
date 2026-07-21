import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

// Session name mapping
const SESSION_MAP: { [key: string]: string } = {
  'March': 'm',
  'Summer': 's',
  'Winter': 'w'
};

// Subject folder to code mapping
const SUBJECT_FOLDER_TO_CODE: { [key: string]: string } = {
  '0417-Information and Communication Technology': '0417',
  '0450-Business Studies': '0450',
  '0452-Accounting': '0452',
  '0455-Economics': '0455',
  '0457-Global Perspectives': '0457',
  '0500-First Language English': '0500',
  '0520-French - Foreign Language': '0520',
  '0549-Hindi as a Second Language': '0549',
  '0580-Mathematics': '0580',
  '0606-Additional Mathematics': '0606',
  '0610-Biology': '0610',
  '0620-Chemistry': '0620',
  '0625-Physics': '0625'
};

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
    const pastpapersPath = join(process.cwd(), 'scripts', 'pastpapers');

    // Read all subject folders
    const subjectFolders = await readdir(pastpapersPath, { withFileTypes: true });

    for (const subjectFolder of subjectFolders) {
      if (!subjectFolder.isDirectory()) continue;

      const subjectCode = SUBJECT_FOLDER_TO_CODE[subjectFolder.name];
      if (!subjectCode) continue;

      const subjectPath = join(pastpapersPath, subjectFolder.name);

      // Read all year folders
      const yearFolders = await readdir(subjectPath, { withFileTypes: true });

      for (const yearFolder of yearFolders) {
        if (!yearFolder.isDirectory()) continue;

        const year = parseInt(yearFolder.name);
        if (isNaN(year)) continue;

        const yearPath = join(subjectPath, yearFolder.name);

        // Read all session folders (March, Summer, Winter)
        const sessionFolders = await readdir(yearPath, { withFileTypes: true });

        for (const sessionFolder of sessionFolders) {
          if (!sessionFolder.isDirectory()) continue;

          const sessionCode = SESSION_MAP[sessionFolder.name];
          if (!sessionCode) continue;

          const sessionPath = join(yearPath, sessionFolder.name);

          // Read all PDF files in this session
          const files = await readdir(sessionPath);
          const pdfFiles = files.filter(f => f.endsWith('.pdf') && f.includes('_qp_'));

          for (const pdfFile of pdfFiles) {
            // Parse filename: 0610_m20_qp_22.pdf
            const match = pdfFile.match(/(\d{4})_([msw])(\d{2})_qp_(\d)(\d)\.pdf/);
            if (!match) continue;

            const [, , , , componentStr, variantStr] = match;
            const component = parseInt(componentStr);
            const variant = parseInt(variantStr);

            const paperId = pdfFile.replace('.pdf', '');

            papers.push({
              id: paperId,
              subjectCode,
              year,
              session: sessionCode,
              component,
              variant
            });
          }
        }
      }
    }

    return NextResponse.json(papers);
  } catch (error) {
    console.error('Error scanning papers:', error);
    return NextResponse.json({ error: 'Failed to scan papers' }, { status: 500 });
  }
}

// Made with Bob
