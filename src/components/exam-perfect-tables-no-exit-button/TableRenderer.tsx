'use client';

import React, { useState } from 'react';

interface TableData {
  page: number;
  table_id: number;
  strategy: string;
  bbox: number[];
  rows: number;
  cols: number;
  headers: string[];
  data: string[][];
  raw: string[][];
  type?: 'tick_table' | 'data_table';
}

interface TableRendererProps {
  tables: { [page: string]: TableData[] };
  currentPage?: number;
  onAnswerChange?: (tableId: string, answers: { [rowIndex: number]: number }) => void;
  savedAnswers?: { [tableId: string]: { [rowIndex: number]: number } };
}

export const TableRenderer: React.FC<TableRendererProps> = ({
  tables,
  currentPage,
  onAnswerChange,
  savedAnswers = {}
}) => {
  // State to track tick table selections: { tableId: { rowIndex: columnIndex } }
  const [tickSelections, setTickSelections] = useState<{ [tableId: string]: { [rowIndex: number]: number } }>(savedAnswers);
  
  console.log('[TableRenderer] Received tables prop:', tables);
  console.log('[TableRenderer] Tables type:', typeof tables);
  console.log('[TableRenderer] Tables keys:', tables ? Object.keys(tables) : 'null');
  
  if (!tables || Object.keys(tables).length === 0) {
    console.log('[TableRenderer] No tables to render - returning null');
    return null;
  }

  // Handle tick selection
  const handleTickSelection = (tableId: string, rowIndex: number, colIndex: number) => {
    setTickSelections(prev => {
      const newSelections = {
        ...prev,
        [tableId]: {
          ...prev[tableId],
          [rowIndex]: colIndex
        }
      };
      
      // Notify parent component of answer change
      if (onAnswerChange) {
        onAnswerChange(tableId, newSelections[tableId]);
      }
      
      return newSelections;
    });
  };

  // Validation function to check if table is real
  const isValidTable = (table: TableData): boolean => {
    // Must have at least 2 columns
    if (table.cols < 2) return false;
    
    // Must have at least 2 rows
    if (table.rows < 2) return false;
    
    // Check for answer lines (lots of dots)
    const allCells = [...table.headers, ...table.data.flat()];
    const totalCells = allCells.length;
    const dotCells = allCells.filter(cell => cell && cell.split('').filter(c => c === '.').length > cell.length * 0.7).length;
    const emptyCells = allCells.filter(cell => !cell || cell.trim() === '').length;
    
    // Reject if more than 50% dots (answer lines)
    if (totalCells > 0 && dotCells / totalCells > 0.5) return false;
    
    // Reject if more than 70% empty
    if (totalCells > 0 && emptyCells / totalCells > 0.7) return false;
    
    // Check for UI/menu text
    const uiKeywords = ['files', 'edit', 'view', 'insert', 'format', 'tools', 'help', 'reply', 'forward'];
    const headerText = table.headers.join(' ').toLowerCase();
    const uiMatches = uiKeywords.filter(kw => headerText.includes(kw)).length;
    if (uiMatches >= 3) return false;
    
    // Check if header has meaningful content
    const nonEmptyHeaders = table.headers.filter(h => h && h.trim()).length;
    if (nonEmptyHeaders < table.cols * 0.5) return false;
    
    // NEW: Check for broken sentences (question text incorrectly detected as table)
    // Real tables have short, complete cell values. Question text has long, broken sentences.
    const avgCellLength = allCells.filter(c => c).reduce((sum, cell) => sum + cell.length, 0) / allCells.filter(c => c).length;
    if (avgCellLength > 50) return false; // Cells too long - likely paragraph text
    
    // Check for incomplete words/sentences (text cut mid-word)
    const brokenTextPatterns = [
      /\s[a-z]$/,  // Ends with single lowercase letter
      /^[a-z]\s/,  // Starts with single lowercase letter
      /\s(he|she|the|and|or|of|to|in|is|are|was|were)\s*$/i,  // Ends with common word fragments
    ];
    const hasBrokenText = allCells.some(cell =>
      cell && brokenTextPatterns.some(pattern => pattern.test(cell))
    );
    if (hasBrokenText) return false;
    
    // Real tables should have consistent column structure
    // Check if all rows have similar content lengths
    const rowLengths = table.data.map(row => row.join('').length);
    if (rowLengths.length > 0) {
      const avgLength = rowLengths.reduce((a, b) => a + b, 0) / rowLengths.length;
      const variance = rowLengths.some(len => Math.abs(len - avgLength) > avgLength * 2);
      if (variance) return false; // Too much variation - likely not a real table
    }
    
    return true;
  };

  // Get tables for current page or all tables
  let tablesToRender = currentPage
    ? tables[currentPage.toString()] || []
    : Object.values(tables).flat();

  // Filter out tables from page 1 (cover page) and last page (copyright)
  const pageNumbers = Object.keys(tables).map(Number).sort((a, b) => a - b);
  const lastPage = pageNumbers[pageNumbers.length - 1];
  
  tablesToRender = tablesToRender.filter(table =>
    table.page !== 1 && table.page !== lastPage && isValidTable(table)
  );

  console.log('[TableRenderer] Tables to render (after filtering):', tablesToRender.length);

  if (tablesToRender.length === 0) {
    console.log('[TableRenderer] No tables after filtering - returning null');
    return null;
  }

  // Render tick table with checkboxes
  const renderTickTable = (table: TableData, idx: number) => {
    const tableId = `table-${table.page}-${table.table_id}`;
    const selections = tickSelections[tableId] || {};
    
    return (
      <div key={tableId} className="table-container tick-table-container">
        <div className="table-wrapper">
          <table className="extracted-table tick-table">
            {table.headers && table.headers.length > 0 && (
              <thead>
                <tr>
                  {table.headers.map((header, i) => (
                    <th key={i}>{header || '\u00A0'}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {table.data && table.data.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className={cellIdx === 0 ? 'label-cell' : 'checkbox-cell'}>
                      {cellIdx === 0 ? (
                        // First column: row label
                        <span>{cell || '\u00A0'}</span>
                      ) : (
                        // Other columns: checkbox
                        <label className="checkbox-label">
                          <input
                            type="radio"
                            name={`${tableId}-row-${rowIdx}`}
                            checked={selections[rowIdx] === cellIdx}
                            onChange={() => handleTickSelection(tableId, rowIdx, cellIdx)}
                            className="tick-checkbox"
                          />
                          <span className="checkbox-custom"></span>
                        </label>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render regular data table
  const renderDataTable = (table: TableData, idx: number) => {
    return (
      <div key={`table-${table.page}-${table.table_id}`} className="table-container">
        <div className="table-wrapper">
          <table className="extracted-table">
            {table.headers && table.headers.length > 0 && (
              <thead>
                <tr>
                  {table.headers.map((header, i) => (
                    <th key={i}>{header || '\u00A0'}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {table.data && table.data.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx}>{cell || '\u00A0'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="tables-section">
      {tablesToRender.map((table, idx) =>
        table.type === 'tick_table'
          ? renderTickTable(table, idx)
          : renderDataTable(table, idx)
      )}
    </div>
  );
};

// Made with Bob
