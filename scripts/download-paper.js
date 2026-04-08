const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function downloadPaper() {
  try {
    // Path in Supabase: past-papers/ICT 0417 Paper 1/February March 2025/[filename].pdf
    const filePath = 'ICT 0417 Paper 1/February March 2025/0417_m25_qp_12.pdf';
    
    console.log('Downloading from Supabase storage...');
    console.log('Bucket: past-papers');
    console.log('Path:', filePath);
    
    const { data, error } = await supabase.storage
      .from('past-papers')
      .download(filePath);
    
    if (error) {
      console.error('Error downloading:', error);
      return;
    }
    
    // Save to workspace
    const outputPath = path.join(__dirname, '..', 'temp', '0417_m25_qp_12.pdf');
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const buffer = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    
    console.log('✅ PDF downloaded successfully to:', outputPath);
    console.log('File size:', buffer.length, 'bytes');
    console.log('\nNext: Install pdf-parse to extract text:');
    console.log('npm install pdf-parse');
    console.log('Then run: node scripts/extract-text.js');
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

downloadPaper();

// Made with Bob
