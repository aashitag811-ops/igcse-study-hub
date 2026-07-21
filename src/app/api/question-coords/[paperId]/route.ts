import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * API endpoint to fetch question coordinates for a specific paper
 * Returns JSON with question numbers and their Y-coordinates per page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  try {
    const { paperId } = await params;
    
    // Check for cached coordinates JSON
    // Format: 0610_m20_qp_22_coords.json
    const coordsFileName = `${paperId}_coords.json`;
    const coordsPath = path.join(process.cwd(), 'public', 'question-coords', coordsFileName);
    
    if (fs.existsSync(coordsPath)) {
      const coords = JSON.parse(fs.readFileSync(coordsPath, 'utf-8'));
      return NextResponse.json(coords);
    }
    
    // If no coordinates exist, return empty array
    return NextResponse.json({ 
      pdfPath: paperId,
      totalPages: 0,
      questionsFound: 0,
      coordinates: [] 
    });
    
  } catch (error) {
    console.error('Error fetching question coordinates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question coordinates' },
      { status: 500 }
    );
  }
}

// Made with Bob