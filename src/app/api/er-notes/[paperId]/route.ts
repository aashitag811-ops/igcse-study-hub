import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * API endpoint to fetch Examiner Report notes for a specific paper
 * Returns JSON with question numbers and their corresponding ER notes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  try {
    const { paperId } = await params;
    
    // Parse paper ID to get ER file path
    // Format: 0610_m20_qp_22 -> 0610_m20_er.pdf
    const match = paperId.match(/(\d{4})_([msw]\d{2})_qp_(\d)(\d)/);
    
    if (!match) {
      return NextResponse.json(
        { error: 'Invalid paper ID format' },
        { status: 400 }
      );
    }
    
    const [, subjectCode, sessionYear, component, variant] = match;
    const componentCode = `${component}${variant}`; // e.g., "12", "22", "31"
    
    // Try component-specific file first: 0417_m20_er_12.json
    const specificFileName = `${subjectCode}_${sessionYear}_er_${componentCode}.json`;
    const specificPath = path.join(process.cwd(), 'public', 'er-cache', specificFileName);
    
    if (fs.existsSync(specificPath)) {
      const data = JSON.parse(fs.readFileSync(specificPath, 'utf-8'));
      // New format: { notes: {...}, labels: {...} }
      // Old format: { "1": "...", "2": "..." } (flat, no labels)
      if (data.notes) {
        return NextResponse.json({ notes: data.notes, labels: data.labels ?? {} });
      }
      return NextResponse.json({ notes: data, labels: {} });
    }
    
    // Fallback to general ER notes file: 0417_m20_er_notes.json
    const generalFileName = `${subjectCode}_${sessionYear}_er_notes.json`;
    const generalPath = path.join(process.cwd(), 'public', 'er-cache', generalFileName);
    
    if (fs.existsSync(generalPath)) {
      const data = JSON.parse(fs.readFileSync(generalPath, 'utf-8'));
      if (data.notes) {
        return NextResponse.json({ notes: data.notes, labels: data.labels ?? {} });
      }
      return NextResponse.json({ notes: data, labels: {} });
    }
    
    // No ER notes available
    return NextResponse.json({ notes: {}, labels: {}, erFileExists: false });
    
  } catch (error) {
    console.error('Error fetching ER notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ER notes' },
      { status: 500 }
    );
  }
}

// Made with Bob
