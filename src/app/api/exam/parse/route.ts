import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

// This endpoint reads pre-processed JSON files from public/papers/
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Paper path is required' },
        { status: 400 }
      );
    }

    // Extract filename from path
    // Path format: "ICT 0417 Paper 1/February March 2025/0417_m25_qp_12.pdf"
    const pathMatch = path.match(/(\d{4}_[msw]\d{2}_qp_\d+)\.pdf/);
    
    if (!pathMatch) {
      return NextResponse.json(
        { error: 'Invalid paper path format' },
        { status: 400 }
      );
    }

    const filename = pathMatch[1] + '.json';
    
    // Read JSON file from public/papers/
    const filePath = join(process.cwd(), 'public', 'papers', filename);
    
    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const paperData = JSON.parse(fileContent);
      
      return NextResponse.json(paperData);
    } catch (fileError) {
      console.error('File not found:', filePath);
      return NextResponse.json(
        { 
          error: 'Paper not found. Please run the conversion script first.',
          details: `Looking for: ${filename}`,
          instructions: 'Run: python scripts/convert-paper-to-json.py <year> <season> <variant>'
        },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Error loading exam paper:', error);
    return NextResponse.json(
      { error: 'Failed to load exam paper', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Made with Bob
