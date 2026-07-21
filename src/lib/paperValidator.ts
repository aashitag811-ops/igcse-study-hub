// 1. Define the structural types for our hierarchy
export interface SubjectNode {
  code: string;
  name: string;
  validComponents: string[];
}

// 2. The single source of truth for your 13 subjects (The Parents)
export const SUBJECT_HIERARCHY: Record<string, SubjectNode> = {
  "0610": { code: "0610", name: "Biology", validComponents: ["1", "2", "3", "4", "5", "6"] },
  "0620": { code: "0620", name: "Chemistry", validComponents: ["1", "2", "3", "4", "5", "6"] },
  "0625": { code: "0625", name: "Physics", validComponents: ["1", "2", "3", "4", "5", "6"] },
  "0580": { code: "0580", name: "Mathematics", validComponents: ["1", "2", "3", "4"] },
  "0606": { code: "0606", name: "Additional Mathematics", validComponents: ["1", "2"] },
  "0450": { code: "0450", name: "Business Studies", validComponents: ["1", "2"] },
  "0452": { code: "0452", name: "Accounting", validComponents: ["1", "2"] },
  "0455": { code: "0455", name: "Economics", validComponents: ["1", "2"] },
  "0500": { code: "0500", name: "First Language English", validComponents: ["1", "2"] },
  "0520": { code: "0520", name: "French - Foreign Language", validComponents: ["1", "2", "4"] },
  "0549": { code: "0549", name: "Hindi as a Second Language", validComponents: ["1", "2"] },
  "0457": { code: "0457", name: "Global Perspectives", validComponents: ["1"] },
  "0417": { code: "0417", name: "Information and Communication Technology (ICT)", validComponents: ["1", "2", "3"] }
};

// 3. Complete structural validator engine (Checks Session + Variant Matrix Rules)
export interface SelectionPayload {
  subjectCode: string;     // e.g., "0610"
  session: 'm' | 's' | 'w'; // m = March, s = June, w = Nov
  component: string;       // e.g., "4"
  variant: string;         // e.g., "2"
}

export function validatePaperSelection(selection: SelectionPayload): { isValid: boolean; reason?: string } {
  const { subjectCode, session, component, variant } = selection;

  // Step A: Check if the parent subject exists in our 13 allowed subjects
  const subject = SUBJECT_HIERARCHY[subjectCode];
  if (!subject) {
    return { isValid: false, reason: `Subject code ${subjectCode} is not part of the active workspace configuration.` };
  }

  // Step B: Check if the child component belongs to that parent subject
  if (!subject.validComponents.includes(component)) {
    return { isValid: false, reason: `${subject.name} does not have a Paper ${component}.` };
  }

  // Step C: Enforce Cambridge March session scheduling rule (March is Variant 2 ONLY)
  if (session === 'm' && variant !== '2') {
    return { isValid: false, reason: `February/March session papers are only administered as Variant 2.` };
  }

  // Everything passes the relationship check!
  return { isValid: true };
}

// Helper to get valid components for a subject
export function getValidComponents(subjectCode: string): string[] {
  return SUBJECT_HIERARCHY[subjectCode]?.validComponents || [];
}

// Helper to get valid variants for a session
export function getValidVariants(session: 'm' | 's' | 'w'): string[] {
  if (session === 'm') {
    return ['2']; // March only has Variant 2
  }
  return ['1', '2', '3']; // May/June and Oct/Nov have all variants
}

// Made with Bob