import type {
  RepetitionAnchorDateKey,
  RepetitionScheduleType,
} from '../../types.js';

export const REPETITION_SCHEDULE_TYPES: readonly RepetitionScheduleType[] = [
  'Regularly',
  'FromCompletion',
];

export const REPETITION_ANCHOR_DATE_KEYS: readonly RepetitionAnchorDateKey[] = [
  'DueDate',
  'DeferDate',
  'PlannedDate',
];

export type RepetitionErrorCode =
  | 'INVALID_REPETITION'
  | 'REPETITION_WRITE_FAILED_RESTORED'
  | 'REPETITION_VERIFICATION_FAILED_RESTORED'
  | 'REPETITION_RESTORE_UNCONFIRMED';

/** The repetition fields a caller may request. Omitted fields keep OmniFocus defaults. */
export interface RepetitionInput {
  ruleString: string;
  scheduleType?: RepetitionScheduleType;
  anchorDateKey?: RepetitionAnchorDateKey;
  catchUpAutomatically?: boolean;
}

/** What OmniFocus reports back for a task that repeats. */
export interface RepetitionSnapshot {
  ruleString: string;
  scheduleType: RepetitionScheduleType | null;
  anchorDateKey: RepetitionAnchorDateKey | null;
  catchUpAutomatically: boolean;
  nextOccurrence?: string | null;
}

/**
 * Strip the optional `RRULE:` prefix, drop empty segments, and require a `FREQ=`
 * component. OmniFocus itself is the final authority on rule validity, so this
 * only rejects input that could never reach a usable rule.
 */
export function normalizeRepetitionRuleString(value: string): string {
  const trimmed = String(value ?? '')
    .trim()
    .replace(/^RRULE:/i, '');
  const parts = trimmed
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    throw new Error('ruleString must not be empty');
  }
  if (!parts.some((part) => /^FREQ=/i.test(part))) {
    throw new Error('ruleString must contain a FREQ= component');
  }

  return parts.join(';');
}

export function validateRepetitionInput(input: RepetitionInput): {
  valid: boolean;
  error?: string;
} {
  try {
    normalizeRepetitionRuleString(input?.ruleString);
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  if (
    input.scheduleType !== undefined &&
    !REPETITION_SCHEDULE_TYPES.includes(input.scheduleType)
  ) {
    return {
      valid: false,
      error: `scheduleType must be one of ${REPETITION_SCHEDULE_TYPES.join(', ')}`,
    };
  }

  if (
    input.anchorDateKey !== undefined &&
    !REPETITION_ANCHOR_DATE_KEYS.includes(input.anchorDateKey)
  ) {
    return {
      valid: false,
      error: `anchorDateKey must be one of ${REPETITION_ANCHOR_DATE_KEYS.join(', ')}`,
    };
  }

  if (
    input.catchUpAutomatically !== undefined &&
    typeof input.catchUpAutomatically !== 'boolean'
  ) {
    return { valid: false, error: 'catchUpAutomatically must be a boolean' };
  }

  return { valid: true };
}

/**
 * ICS components carry no ordering guarantee, so compare them as a keyed set
 * with case-insensitive keys and exact values.
 */
export function repetitionRuleStringsMatch(
  actual: string,
  expected: string,
): boolean {
  const toMap = (value: string): Map<string, string> => {
    const entries = new Map<string, string>();
    for (const part of normalizeRepetitionRuleString(value).split(';')) {
      const separator = part.indexOf('=');
      const key = part.slice(0, separator).toUpperCase();
      entries.set(key, part.slice(separator + 1));
    }
    return entries;
  };

  try {
    const actualParts = toMap(actual);
    const expectedParts = toMap(expected);
    if (actualParts.size !== expectedParts.size) return false;
    for (const [key, value] of expectedParts) {
      if (actualParts.get(key) !== value) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Report every field the caller requested that OmniFocus did not honour.
 * Fields the caller left unset are OmniFocus defaults and are not compared.
 */
export function repetitionMismatches(
  expected: RepetitionInput,
  actual: RepetitionSnapshot | null,
): string[] {
  if (!actual) return ['repetitionRule'];

  const mismatches: string[] = [];
  if (!repetitionRuleStringsMatch(actual.ruleString, expected.ruleString)) {
    mismatches.push('ruleString');
  }
  if (
    expected.scheduleType !== undefined &&
    actual.scheduleType !== expected.scheduleType
  ) {
    mismatches.push('scheduleType');
  }
  if (
    expected.anchorDateKey !== undefined &&
    actual.anchorDateKey !== expected.anchorDateKey
  ) {
    mismatches.push('anchorDateKey');
  }
  if (
    expected.catchUpAutomatically !== undefined &&
    actual.catchUpAutomatically !== expected.catchUpAutomatically
  ) {
    mismatches.push('catchUpAutomatically');
  }
  return mismatches;
}
