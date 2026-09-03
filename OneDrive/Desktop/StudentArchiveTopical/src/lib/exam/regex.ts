export const QUESTION_START_REGEX = /^\s*(\d{1,2})\s+/;
export const SUBPART_REGEX = /^\s*\(([a-z])\)\s+/;
export const SUBSUBPART_REGEX = /^\s*\(([ivx]+)\)\s+/i;
export const LIST_ITEM_REGEX = /^\s*\d+\.\s+/;
export const END_LINE_MARK_TOKEN_REGEX = /\[(\d+)]\s*$/;

export const NOISE_LINE_REGEXES = [
  /DO NOT WRITE IN THIS MARGIN/i,
  /^\s*BLANK PAGE\s*$/i,
  /^\s*\d+\s*$/,
  /^\*\s*\d{10,}\s*\*$/,
  /^©\s*UCLES/i,
  /^03_0417_12_2025_1\.10$/,
  /^\[Turn over]$/i,
];

// Made with Bob
