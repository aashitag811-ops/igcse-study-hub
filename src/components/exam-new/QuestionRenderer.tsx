'use client';

import React, { useEffect, useRef } from 'react';
import {
  ExamQuestion,
  ExamTableData,
  PairedAnswerItem,
  StudentAnswer,
} from '@/lib/exam-new/types';

interface QuestionRendererProps {
  question: ExamQuestion;
  questionPath: string;
  answers: { [questionId: string]: StudentAnswer };
  onAnswerChange: (questionId: string, answer: StudentAnswer['answer'], flagged?: boolean) => void;
  level: number;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

const WORD_FIXES: Array<[string, string]> = [
  ['thi s', 'this'],
  ['th is', 'this'],
  ['h is', 'his'],
  ['the ir', 'their'],
  ['whe the r', 'whether'],
  ['whe re', 'where'],
  ['for m at', 'format'],
  ['format t in g', 'formatting'],
  ['for m at t in g', 'formatting'],
  ['word process in g', 'word processing'],
  ['process in g', 'processing'],
  ['computerprocess in g', 'computer processing'],
  ['in form at i on', 'information'],
  ['c on ta in', 'contain'],
  ['c on ta in s', 'contains'],
  ['c on s is ts', 'consists'],
  ['d at a', 'data'],
  ['de vice', 'device'],
  ['de vices', 'devices'],
  ['de scribe', 'describe'],
  ['d is cuss', 'discuss'],
  ['enter in g', 'entering'],
  ['fe at ure', 'feature'],
  ['fe at ures', 'features'],
  ['g re at', 'great'],
  ['hardw are', 'hardware'],
  ['im age', 'image'],
  ['im ages', 'images'],
  ['in put', 'input'],
  ['in ternal', 'internal'],
  ['in tern al', 'internal'],
  ['in ternet', 'internet'],
  ['lap top', 'laptop'],
  ['m at ch', 'match'],
  ['m at rix', 'matrix'],
  ['m is s to red', 'is stored'],
  ['m on i to rs', 'monitors'],
  ['ne two rk', 'network'],
  ['of fice', 'office'],
  ['orig in al', 'original'],
  ['out put', 'output'],
  ['pho to graphs', 'photographs'],
  ['pre sen t at i on', 'presentation'],
  ['pr in ter', 'printer'],
  ['pro cessor', 'processor'],
  ['questi on', 'question'],
  ['questi on s', 'questions'],
  ['reg is ter', 'register'],
  ['reg is ters', 'registers'],
  ['reg is tr at i on', 'registration'],
  ['schoolreg is ter', 'school register'],
  ['s of tw are', 'software'],
  ['st at e', 'state'],
  ['stor in g', 'storing'],
  ['Tawaraschool', 'Tawara school'],
  ['TawaraStoreshas', 'Tawara Stores has'],
  ['Tawara Storesare', 'Tawara Stores are'],
  ['Tawara Carsis', 'Tawara Cars is'],
  ['us in g', 'using'],
  ['web s ite', 'website'],
  ['Wi Fi', 'WiFi'],
  ['Blue to oth', 'Bluetooth'],
  ['P IN', 'PIN'],
  ['IN R', 'INR'],
  ['ofthe', 'of the'],
  ['inthe', 'in the'],
  ['tothe', 'to the'],
  ['thereg is ter', 'the register'],
  ['thereg is tr at i on', 'the registration'],
  ['computerprocess', 'computer process'],
  ['Actu at or', 'Actuator'],
  ['s to res', 'stores'],
  ['s to r in g', 'storing'],
];

function normalizeQuestionText(text: string): string {
  if (!text) return text;

  let result = text;
  for (const [wrong, right] of WORD_FIXES) {
    result = result.replace(new RegExp(wrong, 'gi'), right);
  }

  result = result.replace(/([a-z])([A-Z])/g, '$1 $2');
  result = result.replace(/(\d)([A-Za-z])/g, '$1 $2');
  result = result.replace(/([A-Za-z])(\d)/g, '$1 $2');
  result = result.replace(/\b([a-z] ){3,}[a-z]\b/gi, (match) => match.replace(/ /g, ''));
  result = result.replace(/\b([Tt]awara)([A-Z][a-z]+)/g, '$1 $2');
  result = result.replace(/\b([A-Za-z]{3,})\s+in\s+g\b/g, (_match, stem) => `${stem}ing`);
  result = result.replace(/\b([A-Za-z]{3,})\s+ed\b/g, '$1ed');
  result = result.replace(/\s+/g, ' ');
  result = result.replace(/\s+([.,;:!?)\]])/g, '$1');
  result = result.replace(/([.,;:!?])(\w)/g, '$1 $2');
  return result.trim();
}

function stripBoilerplate(text: string): string {
  if (!text) return text;

  let result = normalizeQuestionText(text);
  const patterns = [
    /Permission to reproduce items.*/i,
    /Every reasonable effort.*/i,
    /To avoid the issue of disclosure.*/i,
    /all copyright acknowledgements.*/i,
    /Copyright Acknowledgements Booklet.*/i,
    /Cambridge Assessment International Education.*/i,
    /Cambridge Assessment Group.*/i,
    /University of Cambridge Local Examinations Syndicate.*/i,
    /www\.cambridgeinternational\.org.*/i,
    /www\.dynamicpapers\.com.*/i,
    /Booklet\.Thisisproducedforeachseries.*/i,
    /Permissiontoreproduceitems.*/i,
    /Toavoidtheissueofdisclosure.*/i,
    /CambridgeAssessmentInternationalEducation.*/i,
    /\bDFD\b.*/i,
    /\*\s*\d{7,}\s*\*.*/i,
  ];

  for (const pattern of patterns) {
    result = result.replace(pattern, '');
  }

  return result.replace(/\s+/g, ' ').trim();
}

function extractSelectionCount(text: string, fallback = 1): number {
  const lowered = text.toLowerCase();
  for (const [word, count] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(lowered)) return count;
  }
  return fallback;
}

function buildSelectionTableFromText(text: string): ExamTableData | undefined {
  if (!text) return undefined;
  const normalized = stripBoilerplate(text).replace(/\(\s*[?3xX]?\s*\)/g, '');

  if (/internal or external hardware devices/i.test(normalized)) {
    const items = normalized.match(/Mouse|Video card|Printer|Actuator|Keyboard|Monitor|Speakers|Microphone/gi);
    if (items?.length) {
      return {
        headers: ['Item', 'internal', 'external'],
        rows: items.map((item) => [normalizeQuestionText(item)]),
        kind: 'selection',
        maxSelectionsPerRow: 1,
      };
    }
  }

  if (/examples of personal data/i.test(normalized)) {
    const items = normalized.match(/Full name|Capital of England|Gender|Number of flowers in a garden/gi);
    if (items?.length) {
      return {
        headers: ['Item', 'Yes', 'No'],
        rows: items.map((item) => [normalizeQuestionText(item)]),
        kind: 'selection',
        maxSelectionsPerRow: 1,
      };
    }
  }

  if (/generic image files/i.test(normalized) && /jpg\s+png\s+gif/i.test(normalized)) {
    const statements = [
      'This file type stores still or moving images',
      'This file type uses lossy compression',
      'This file type is used for storing photographs on a digital camera',
      'This file type is limited to 256 colours',
    ].filter((statement) => normalized.toLowerCase().includes(statement.toLowerCase()));
    if (statements.length) {
      return {
        headers: ['Statement', 'jpg', 'png', 'gif'],
        rows: statements.map((statement) => [normalizeQuestionText(statement)]),
        kind: 'selection',
        maxSelectionsPerRow: 1,
      };
    }
  }

  if (/recognition system/i.test(normalized) && /MICR\s+OCR\s+OMR/i.test(normalized)) {
    const statements = [
      'This system magnetises the special characters on cheques in order to read them',
      'This method is used to read car number plates',
      'A bar code is an example of this system',
      'If the media from this system is photocopied it cannot be read by the recognition system',
    ].filter((statement) => normalized.toLowerCase().includes(statement.toLowerCase()));
    if (statements.length) {
      return {
        headers: ['Statement', 'MICR', 'OCR', 'OMR'],
        rows: statements.map((statement) => [normalizeQuestionText(statement)]),
        kind: 'selection',
        maxSelectionsPerRow: 1,
      };
    }
  }

  if (/method of implementation/i.test(normalized) && /Direct\s+Parallel\s+Pilot/i.test(normalized)) {
    const statements = [
      'All of the benefits are immediate',
      'If the new system fails the whole of the old system is still operational',
      'This is the cheapest implementation method',
      'The system is implemented in one branch of the company',
    ].filter((statement) => normalized.toLowerCase().includes(statement.toLowerCase()));
    if (statements.length) {
      return {
        headers: ['Statement', 'Direct', 'Parallel', 'Pilot'],
        rows: statements.map((statement) => [normalizeQuestionText(statement)]),
        kind: 'selection',
        maxSelectionsPerRow: 1,
      };
    }
  }

  if (/Tick.*printer.*statements/i.test(normalized) && /3D\s+Dot matrix\s+Laser/i.test(normalized)) {
    const statements = normalized.match(/This printer[^T]+(?=This printer|$)/gi);
    if (statements?.length) {
      return {
        headers: ['Statement', '3D', 'Dot matrix', 'Laser'],
        rows: statements.map((statement) => [normalizeQuestionText(statement)]),
        kind: 'selection',
        maxSelectionsPerRow: 1,
      };
    }
  }

  return undefined;
}

function inferTableData(question: ExamQuestion): ExamTableData | undefined {
  if (question.tableData?.headers?.length && question.tableData.rows?.length) return question.tableData;

  const normalized = stripBoilerplate(question.text);
  const selectionTable = buildSelectionTableFromText(normalized);
  if (selectionTable) return selectionTable;

  if (/Name of fitness tracker/i.test(normalized) && /Battery life in days/i.test(normalized)) {
    const nameMatch = normalized.match(/Name of fitness tracker\s+(.+?)\s+Battery life in days/i);
    const batteryMatch = normalized.match(/Battery life in days\s+(.+?days)\s+(.+?days)\s+Method of internet connection/i);
    const methodMatch = normalized.match(/Method of internet connection\s+(.+?)\s+(WiFi|Bluetooth)\s+Water resistant/i);
    const waterMatch = normalized.match(/Water resistant\s+(.+?m)\s+(.+?m)\s+GPS/i);
    const gpsMatch = normalized.match(/GPS\s+([YN])\s+([YN])\s+Cost/i);
    const costMatch = normalized.match(/Cost\s+(.+?)\s+(INR\s*[\d ]+)/i);

    if (nameMatch && batteryMatch && methodMatch && waterMatch && gpsMatch && costMatch) {
      const nameTokens = nameMatch[1].trim().split(/\s+/);
      return {
        headers: ['Name of fitness tracker', nameTokens.slice(0, 2).join(' '), nameTokens.slice(2, 4).join(' ')],
        rows: [
          ['Battery life in days', batteryMatch[1], batteryMatch[2]],
          ['Method of internet connection', methodMatch[1], methodMatch[2]],
          ['Water resistant', waterMatch[1], waterMatch[2]],
          ['GPS', gpsMatch[1], gpsMatch[2]],
          ['Cost', costMatch[1].trim(), costMatch[2].trim()],
        ],
        kind: 'reference',
      };
    }
  }

  return undefined;
}

function inferWordBankItems(question: ExamQuestion): string[] {
  if (question.wordBankItems?.length) {
    return question.wordBankItems.map((item) => normalizeQuestionText(item));
  }

  const normalized = stripBoilerplate(question.text).toLowerCase();
  const items = ['bar code reader', 'chip reader', 'MICR', 'magnetic stripe reader', 'OCR', 'OMR', 'PIN pad', 'RFID reader'];
  return items.filter((item) => normalized.includes(item.toLowerCase()));
}

function getQuestionImage(question: ExamQuestion) {
  if (question.promptImage?.src) return question.promptImage;
  if (question.hasImage && question.image) {
    return {
      src: question.image,
      alt: question.imageAlt || 'Question prompt image',
      mode: question.imageMode || 'full-width',
    };
  }
  return null;
}

function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  minRows = 1,
  lined = true,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minRows?: number;
  lined?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const lineHeight = 28;

  const resize = () => {
    if (!ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = `${Math.max(ref.current.scrollHeight, minRows * lineHeight + 18)}px`;
  };

  useEffect(() => {
    resize();
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        requestAnimationFrame(resize);
      }}
      rows={minRows}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '2px 14px 6px',
        fontSize: '0.95rem',
        border: 'none',
        borderRadius: '10px',
        background: lined
          ? 'repeating-linear-gradient(to bottom, #f8fafc 0, #f8fafc 27px, #dbe5f0 27px, #dbe5f0 28px)'
          : '#f8fafc',
        resize: 'none',
        overflow: 'hidden',
        fontFamily: 'inherit',
        lineHeight: `${lineHeight}px`,
        outline: 'none',
        boxShadow: 'inset 0 0 0 2px #e2e8f0',
        backgroundPositionY: '0px',
      }}
    />
  );
}

export function QuestionRenderer({ question, questionPath, answers, onAnswerChange, level }: QuestionRendererProps) {
  const isTerminal = !question.subparts || question.subparts.length === 0;
  const hasMarks = question.marks !== null && question.marks !== undefined;
  const currentAnswer = answers[questionPath];
  const normalizedText = stripBoilerplate(question.text);
  const needsAnswerInput = isTerminal && hasMarks;
  const image = getQuestionImage(question);
  const inferredTableData = inferTableData(question);
  const shouldRenderSelectionTable = inferredTableData?.kind === 'selection';
  const shouldRenderReferenceTable = inferredTableData?.kind === 'reference';

  const getIndentation = () => level * 30;
  const getNumberFormat = () => (level === 0 ? question.number : `(${question.number})`);

  const renderImageBlock = () => {
    if (!image) return null;
    const preserve = image.mode === 'preserve-format';
    return (
      <div style={{ marginTop: '16px', marginBottom: '16px', padding: preserve ? '16px' : '0', background: '#fff', border: '2px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <img src={image.src} alt={image.alt || 'Question prompt image'} style={{ width: preserve ? '100%' : 'min(100%, 720px)', display: 'block', margin: '0 auto', height: 'auto', objectFit: 'contain' }} />
        {image.caption && <div style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#64748b' }}>{image.caption}</div>}
      </div>
    );
  };

  const renderPromptLayoutFallback = () => {
    const looksStructured =
      /tick|circle|table|internal|external|jpg|png|gif|micr|ocr|omr|direct|parallel|pilot/i.test(normalizedText);

    if (!looksStructured || shouldRenderSelectionTable || shouldRenderReferenceTable || image) return null;

    return (
      <div style={{ marginTop: '14px', marginBottom: '14px', border: '2px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
          Source layout
        </div>
        <div style={{ padding: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.7', color: '#334155' }}>
          {normalizedText}
        </div>
      </div>
    );
  };

  const renderMarks = () => (
    <div style={{ position: 'absolute', bottom: '-20px', right: '0', fontSize: '0.9rem', color: '#475569', fontWeight: '700' }}>
      [{question.marks}]
    </div>
  );

  const renderLinedAnswer = (placeholder: string, minRows = 1, value?: string, change?: (value: string) => void) => (
    <AutoGrowTextarea value={value || ''} onChange={(next) => change?.(next)} placeholder={placeholder} minRows={minRows} lined />
  );

  const renderCircleSelection = () => {
    const options = question.options?.length ? question.options : [];
    if (!options.length) return renderBoxAnswer();
    const selectedOptions = Array.isArray(currentAnswer?.answer) ? (currentAnswer.answer as string[]) : [];
    const maxSelections = question.maxSelections || extractSelectionCount(question.text, 1);

    const handleOptionToggle = (option: string) => {
      let next = selectedOptions;
      if (selectedOptions.includes(option)) next = selectedOptions.filter((item) => item !== option);
      else if (selectedOptions.length < maxSelections) next = [...selectedOptions, option];
      onAnswerChange(questionPath, next);
    };

    return (
      <div style={{ marginTop: '12px', position: 'relative', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {options.map((option) => {
            const isSelected = selectedOptions.includes(option);
            return (
              <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${isSelected ? '#2563eb' : '#cbd5e1'}`, padding: '12px', borderRadius: '8px', background: isSelected ? '#eff6ff' : '#fff' }}>
                <input type="checkbox" checked={isSelected} onChange={() => handleOptionToggle(option)} style={{ width: '18px', height: '18px', accentColor: '#2563eb' }} />
                <span>{normalizeQuestionText(option)}</span>
              </label>
            );
          })}
        </div>
        {renderMarks()}
      </div>
    );
  };

  const renderBoxAnswer = () => {
    const marks = question.marks || 1;
    const minRows = marks <= 1 ? 1 : Math.min(Math.max(marks, 2), 8);
    return (
      <div style={{ marginTop: '12px', position: 'relative', marginBottom: '24px' }}>
        {renderLinedAnswer('Write your answer here...', minRows, typeof currentAnswer?.answer === 'string' ? currentAnswer.answer : '', (value) => onAnswerChange(questionPath, value))}
        {renderMarks()}
      </div>
    );
  };

  const renderEssay = () => {
    const marks = question.marks || 6;
    const minRows = Math.max(6, marks * 2);
    return (
      <div style={{ marginTop: '12px', position: 'relative', marginBottom: '24px' }}>
        {renderLinedAnswer('Discuss your answer here...', minRows, typeof currentAnswer?.answer === 'string' ? currentAnswer.answer : '', (value) => onAnswerChange(questionPath, value))}
        {renderMarks()}
      </div>
    );
  };

  const renderShortAnswer = () => (
    <div style={{ marginTop: '12px', position: 'relative', marginBottom: '24px' }}>
      {renderLinedAnswer('Your answer...', 1, typeof currentAnswer?.answer === 'string' ? currentAnswer.answer : '', (value) => onAnswerChange(questionPath, value))}
      {renderMarks()}
    </div>
  );

  const renderListAnswer = () => {
    const listCount = question.listCount || extractSelectionCount(question.text, 3);
    const currentAnswers = Array.isArray(currentAnswer?.answer) ? (currentAnswer.answer as string[]) : Array(listCount).fill('');

    const handleListChange = (index: number, value: string) => {
      const next = [...currentAnswers];
      next[index] = value;
      onAnswerChange(questionPath, next);
    };

    return (
      <div style={{ marginTop: '12px', position: 'relative', marginBottom: '24px' }}>
        {Array.from({ length: listCount }).map((_, index) => (
          <div key={index} style={{ marginBottom: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ minWidth: '24px', paddingTop: '10px', fontWeight: 700, color: '#475569' }}>{index + 1}.</div>
            {renderLinedAnswer(`Point ${index + 1}...`, 2, currentAnswers[index] || '', (value) => handleListChange(index, value))}
          </div>
        ))}
        {renderMarks()}
      </div>
    );
  };

  const renderPairedNotebook = () => {
    const pairCount = Math.max(1, Math.ceil((question.marks || 2) / 2));
    const value = Array.isArray(currentAnswer?.answer)
      ? (currentAnswer.answer as PairedAnswerItem[])
      : Array.from({ length: pairCount }, () => ({ method: '', description: '' }));

    const handlePairChange = (index: number, field: keyof PairedAnswerItem, fieldValue: string) => {
      const next = [...value];
      next[index] = next[index] || { method: '', description: '' };
      next[index] = { ...next[index], [field]: fieldValue };
      onAnswerChange(questionPath, next);
    };

    return (
      <div style={{ marginTop: '12px', position: 'relative', marginBottom: '24px' }}>
        {Array.from({ length: pairCount }).map((_, index) => (
          <div key={index} style={{ borderLeft: '4px solid #2563eb', background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '14px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Method {index + 1}</div>
            {renderLinedAnswer('Method...', 1, value[index]?.method || '', (fieldValue) => handlePairChange(index, 'method', fieldValue))}
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', margin: '10px 0 6px' }}>Description</div>
            {renderLinedAnswer('Description...', 3, value[index]?.description || '', (fieldValue) => handlePairChange(index, 'description', fieldValue))}
          </div>
        ))}
        {renderMarks()}
      </div>
    );
  };

  const renderMatrixTickTable = () => {
    const tableData = inferredTableData;
    if (!tableData || tableData.headers.length < 2 || tableData.rows.length === 0) return renderBoxAnswer();

    const headers = tableData.headers;
    const rows = tableData.rows;
    const stored = typeof currentAnswer?.answer === 'object' && !Array.isArray(currentAnswer.answer) ? (currentAnswer.answer as Record<string, string>) : {};
    const selected = Object.fromEntries(Object.entries(stored).filter(([key]) => key !== '__note'));
    const noteValue = stored.__note || '';

    const handleCellToggle = (rowIndex: number, header: string) => {
      const key = String(rowIndex);
      const next = { ...stored };
      if (next[key] === header) delete next[key];
      else next[key] = header;
      if (!next.__note) delete next.__note;
      onAnswerChange(questionPath, next);
    };

    const handleNoteChange = (value: string) => {
      const next = { ...stored };
      if (value.trim()) next.__note = value;
      else delete next.__note;
      onAnswerChange(questionPath, next);
    };

    return (
      <div style={{ marginTop: '12px', position: 'relative', marginBottom: '24px' }}>
        <div style={{ marginBottom: '10px', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#475569', fontSize: '0.9rem' }}>
          Choose one box per row. If the original paper layout matters, use the typed answer area below as well.
        </div>
        <div style={{ overflowX: 'auto', border: '2px solid #e2e8f0', borderRadius: '10px', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {headers.map((header, index) => (
                  <th key={`${header}-${index}`} style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', borderLeft: index === 0 ? 'none' : '1px solid #e2e8f0', textAlign: index === 0 ? 'left' : 'center', color: '#334155' }}>
                    {normalizeQuestionText(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  <td style={{ padding: '12px', borderTop: '1px solid #e2e8f0', color: '#1e293b' }}>{normalizeQuestionText(row[0])}</td>
                  {headers.slice(1).map((header, colIndex) => {
                    const isChecked = selected[String(rowIndex)] === header;
                    return (
                      <td key={`${rowIndex}-${colIndex}`} style={{ padding: '12px', borderTop: '1px solid #e2e8f0', borderLeft: '1px solid #e2e8f0', textAlign: 'center', background: isChecked ? '#eff6ff' : '#fff' }}>
                        <input type="checkbox" checked={isChecked} onChange={() => handleCellToggle(rowIndex, header)} style={{ width: '18px', height: '18px', accentColor: '#2563eb' }} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '12px', color: '#64748b', fontSize: '0.85rem' }}>If you prefer, you can also type your choices below.</div>
        {renderLinedAnswer('Example: Mouse - external; Video card - internal', 2, noteValue, handleNoteChange)}
        {renderMarks()}
      </div>
    );
  };

  const renderDataTable = () => {
    const tableData = inferredTableData;
    if (!tableData || tableData.headers.length < 2 || tableData.rows.length === 0) return renderBoxAnswer();

    return (
      <div style={{ marginTop: '12px', position: 'relative', marginBottom: '24px' }}>
        <div style={{ overflowX: 'auto', border: '2px solid #e2e8f0', borderRadius: '10px', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {tableData.headers.map((header, index) => (
                  <th key={`${header}-${index}`} style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', borderLeft: index === 0 ? 'none' : '1px solid #e2e8f0', textAlign: index === 0 ? 'left' : 'center', color: '#334155' }}>
                    {normalizeQuestionText(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${rowIndex}-${cellIndex}`} style={{ padding: '12px', borderTop: '1px solid #e2e8f0', borderLeft: cellIndex === 0 ? 'none' : '1px solid #e2e8f0', color: '#1e293b', fontWeight: cellIndex === 0 ? 600 : 400 }}>
                      {normalizeQuestionText(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '12px' }}>
          {renderLinedAnswer('Write your answer based on the table above...', 3, typeof currentAnswer?.answer === 'string' ? currentAnswer.answer : '', (value) => onAnswerChange(questionPath, value))}
        </div>
        {renderMarks()}
      </div>
    );
  };

  const renderWordBank = () => {
    const items = inferWordBankItems(question);
    return (
      <div style={{ marginTop: '12px', position: 'relative', marginBottom: '24px' }}>
        {items.length > 0 && (
          <div style={{ padding: '16px', background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: '10px', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: '#1d4ed8', fontWeight: '700', marginBottom: '10px' }}>Word bank</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {items.map((item) => (
                <div key={item} style={{ padding: '8px 12px', background: '#fff', border: '1px solid #93c5fd', borderRadius: '999px', color: '#1e40af', fontWeight: 600 }}>
                  {normalizeQuestionText(item)}
                </div>
              ))}
            </div>
          </div>
        )}
        {renderLinedAnswer('Complete the answer using the word bank...', 3, typeof currentAnswer?.answer === 'string' ? currentAnswer.answer : '', (value) => onAnswerChange(questionPath, value))}
        {renderMarks()}
      </div>
    );
  };

  const renderByType = () => {
    if (shouldRenderSelectionTable) return renderMatrixTickTable();
    if (shouldRenderReferenceTable) return renderDataTable();

    switch (question.type) {
      case 'word_bank':
        return renderWordBank();
      case 'circle_selection':
      case 'mcq':
      case 'selection':
        return renderCircleSelection();
      case 'tick_selection':
      case 'matrix_tick_table':
        return renderMatrixTickTable();
      case 'paired_list':
      case 'paired_notebook':
        return renderPairedNotebook();
      case 'numbered_list':
      case 'list':
        return renderListAnswer();
      case 'essay':
      case 'standard_notebook':
        return renderEssay();
      case 'short_answer':
        return renderShortAnswer();
      case 'data_table':
        return renderDataTable();
      default:
        return renderBoxAnswer();
    }
  };

  return (
    <div style={{ marginBottom: '24px' }} id={`question-${questionPath}`}>
      <div style={{ marginLeft: `${getIndentation()}px`, marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ fontWeight: '700', fontSize: level === 0 ? '1.1rem' : '1rem', color: '#1e293b', minWidth: level === 0 ? '30px' : '40px', flexShrink: 0 }}>
            {getNumberFormat()}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', flex: 1 }}>{normalizedText}</div>
              {needsAnswerInput && (
                <button
                  onClick={() => onAnswerChange(questionPath, currentAnswer?.answer || '', !currentAnswer?.flagged)}
                  style={{ padding: '6px 12px', background: currentAnswer?.flagged ? '#fef3c7' : '#f1f5f9', border: `2px solid ${currentAnswer?.flagged ? '#f59e0b' : '#e2e8f0'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: currentAnswer?.flagged ? '#d97706' : '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {currentAnswer?.flagged ? 'Flagged' : 'Flag'}
                </button>
              )}
            </div>

            {renderImageBlock()}
            {renderPromptLayoutFallback()}
            {needsAnswerInput && <div>{renderByType()}</div>}
          </div>
        </div>
      </div>

      {question.subparts && question.subparts.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          {question.subparts.map((subpart, index) => (
            <QuestionRenderer
              key={index}
              question={subpart}
              questionPath={`${questionPath}.${subpart.number}`}
              answers={answers}
              onAnswerChange={onAnswerChange}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Made with Bob
