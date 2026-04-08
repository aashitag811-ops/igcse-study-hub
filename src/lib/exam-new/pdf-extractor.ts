import { Question, QuestionPart, ExamPaper } from './types';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for pdfjs
if (typeof window === 'undefined') {
  // Server-side
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

/**
 * Extract text from PDF buffer using pdfjs-dist
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  const data = new Uint8Array(pdfBuffer);
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}

/**
 * Remove Cambridge exam boilerplate noise
 */
function removeBoilerplate(text: string): string {
  const noisePatterns = [
    /DO NOT WRITE IN THIS MARGIN/gi,
    /\[Turn over\]/gi,
    /UCLES 2025/gi,
    /\d{2}0417\d{2}2025\d\.\d+/g,
    /--- PAGE \d+ ---/g,
    /L\n/g,
  ];
  
  for (const pattern of noisePatterns) {
    text = text.replace(pattern, '');
  }
  
  return text;
}

/**
 * Parse exam paper text using Cambridge ICT algorithm
 */
export function parseExamPaper(text: string, paperPath: string): ExamPaper {
  // Extract metadata from path
  const pathParts = paperPath.split('/');
  const filename = pathParts[pathParts.length - 1];
  const seasonFolder = pathParts[pathParts.length - 2];
  
  const fileMatch = filename.match(/(\d{4})_([msw])(\d{2})_qp_1(\d)\.pdf/);
  if (!fileMatch) {
    throw new Error('Invalid filename format');
  }
  
  const [, subjectCode, seasonCode, yearShort, variant] = fileMatch;
  const year = 2000 + parseInt(yearShort);
  
  const seasonMap: { [key: string]: string } = {
    'm': 'February March',
    's': 'May June',
    'w': 'October November'
  };
  
  // Clean text
  const cleanText = removeBoilerplate(text);
  
  // Parse questions
  const questions = parseCambridgeICT(cleanText);
  
  // Calculate total marks
  const totalMarks = questions.reduce((sum, q) => sum + q.totalMarks, 0);
  
  return {
    id: paperPath,
    subject: `ICT ${subjectCode}`,
    year,
    season: seasonMap[seasonCode] || seasonFolder,
    variant: parseInt(variant),
    totalMarks,
    duration: 90,
    questions
  };
}

/**
 * Parse Cambridge ICT paper structure
 */
function parseCambridgeICT(cleanText: string): Question[] {
  const questions: Question[] = [];
  
  // Split by main question numbers at start of line
  const mainBlocks = ("\n" + cleanText).split(/\n(\d{1,2})\s+/);
  
  for (let i = 1; i < mainBlocks.length; i += 2) {
    const qNum = parseInt(mainBlocks[i]);
    const content = mainBlocks[i + 1];
    
    if (!content) continue;
    
    // Get intro text before sub-parts
    const introText = content.split('(a)')[0].trim();
    
    // Split into sub-parts (a), (b), (c)
    const subParts = content.split(/\(([a-z])\)/);
    
    const parts: QuestionPart[] = [];
    let totalMarks = 0;
    
    if (subParts.length > 1) {
      // Has sub-parts
      for (let j = 1; j < subParts.length; j += 2) {
        const letter = subParts[j];
        const subContent = subParts[j + 1];
        
        if (!subContent) continue;
        
        // Check for sub-sub-parts (i), (ii), (iii)
        const subSubParts = subContent.split(/\(([ivx]+)\)/);
        
        if (subSubParts.length > 1) {
          // Has sub-sub-parts
          for (let k = 1; k < subSubParts.length; k += 2) {
            const roman = subSubParts[k];
            const finalText = subSubParts[k + 1];
            
            if (!finalText) continue;
            
            const marks = extractMarks(finalText);
            totalMarks += marks;
            
            parts.push({
              id: `${qNum}${letter}${roman}`,
              text: cleanQuestionText(finalText, introText),
              marks,
              level: 2,
              parentId: `${qNum}${letter}`
            });
          }
        } else {
          // Just sub-part, no sub-sub-parts
          const marks = extractMarks(subContent);
          totalMarks += marks;
          
          parts.push({
            id: `${qNum}${letter}`,
            text: cleanQuestionText(subContent, introText),
            marks,
            level: 1,
            parentId: `${qNum}`
          });
        }
      }
    } else {
      // Standalone question
      const marks = extractMarks(content);
      totalMarks += marks;
      
      parts.push({
        id: `${qNum}`,
        text: cleanQuestionText(content),
        marks,
        level: 0
      });
    }
    
    questions.push({
      number: qNum,
      parts,
      totalMarks
    });
  }
  
  return questions;
}

/**
 * Extract marks from question text
 */
function extractMarks(text: string): number {
  const match = text.match(/\[(\d+)\]/);
  return match ? parseInt(match[1]) : 1;
}

/**
 * Clean question text
 */
function cleanQuestionText(text: string, context: string = ''): string {
  // Remove marks notation
  text = text.replace(/\[\d+\]/g, '');
  
  // Add context if provided
  if (context) {
    text = `${context}\n${text}`;
  }
  
  // Clean whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Remove answer lines
  text = text.replace(/\.{3,}.*$/g, '');
  text = text.replace(/_+.*$/g, '');
  
  return text;
}

/**
 * Main function to extract exam paper from PDF
 */
export async function extractExamPaper(pdfBuffer: Buffer, paperPath: string): Promise<ExamPaper> {
  const text = await extractTextFromPDF(pdfBuffer);
  return parseExamPaper(text, paperPath);
}

// Made with Bob
