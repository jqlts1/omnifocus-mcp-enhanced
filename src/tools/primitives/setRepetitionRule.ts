import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import type {
  RepetitionAnchorDateKey,
  RepetitionScheduleType,
} from '../../types.js';
import {
  normalizeRepetitionRuleString,
  validateRepetitionInput,
  type RepetitionErrorCode,
} from './repetitionRule.js';

export interface SetRepetitionRuleParams {
  taskId: string;
  ruleString?: string;
  scheduleType?: RepetitionScheduleType;
  anchorDateKey?: RepetitionAnchorDateKey;
  catchUpAutomatically?: boolean;
  endDate?: string; // ISO date string, merged into ruleString as UNTIL=
  count?: number; // merged into ruleString as COUNT=
  clear?: boolean; // when true, removes the repetition rule
}

export interface SetRepetitionRuleResult {
  success: boolean;
  code?: RepetitionErrorCode;
  ruleString?: string;
  scheduleType?: RepetitionScheduleType;
  anchorDateKey?: RepetitionAnchorDateKey;
  catchUpAutomatically?: boolean;
  nextOccurrence?: string | null;
  cleared?: boolean;
  restored?: boolean;
  residualTaskId?: string;
  recovery?: string;
  error?: string;
}

/**
 * Build the ICS rule string from components. Exposed for testing.
 */
export function buildRepetitionRuleString(params: {
  ruleString?: string;
  count?: number;
  endDate?: string;
}): string {
  let ruleString = params.ruleString || 'FREQ=WEEKLY';
  ruleString = ruleString.trim().replace(/^RRULE:/i, '');
  ruleString = ruleString.replace(/;?(COUNT|UNTIL)=[^;]*/gi, '');

  if (params.count && params.count > 0) {
    ruleString += `;COUNT=${params.count}`;
  }

  if (params.endDate) {
    const until = toICSDateTime(params.endDate);
    if (until) {
      ruleString += `;UNTIL=${until}`;
    }
  }

  return normalizeRepetitionRuleString(ruleString);
}

function toICSDateTime(isoDate: string): string | null {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;

  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

export function validateSetRepetitionRuleParams(
  params: SetRepetitionRuleParams,
): { valid: boolean; error?: string } {
  if (!params.taskId) {
    return { valid: false, error: 'taskId is required' };
  }

  if (params.clear === true) {
    return { valid: true };
  }

  const repetition = validateRepetitionInput({
    ruleString: params.ruleString || 'FREQ=WEEKLY',
    scheduleType: params.scheduleType,
    anchorDateKey: params.anchorDateKey,
    catchUpAutomatically: params.catchUpAutomatically,
  });
  if (!repetition.valid) {
    return repetition;
  }

  if (
    params.count !== undefined &&
    (typeof params.count !== 'number' || params.count <= 0)
  ) {
    return { valid: false, error: 'count must be a positive number' };
  }

  if (params.endDate) {
    const date = new Date(params.endDate);
    if (Number.isNaN(date.getTime())) {
      return { valid: false, error: 'endDate must be a valid ISO date string' };
    }
  }

  return { valid: true };
}

/**
 * Set, update, or clear the repetition rule on an OmniFocus task.
 */
export async function setRepetitionRule(
  params: SetRepetitionRuleParams,
): Promise<SetRepetitionRuleResult> {
  const validation = validateSetRepetitionRuleParams(params);
  if (!validation.valid) {
    return {
      success: false,
      code: 'INVALID_REPETITION',
      error: validation.error,
    };
  }

  const result = await executeOmniFocusScript('@setRepetitionRule.js', {
    taskId: params.taskId,
    ruleString: params.clear ? undefined : buildRepetitionRuleString(params),
    scheduleType: params.scheduleType,
    anchorDateKey: params.anchorDateKey,
    catchUpAutomatically: params.catchUpAutomatically,
    clear: params.clear,
  });

  if (typeof result === 'string') {
    try {
      return JSON.parse(result) as SetRepetitionRuleResult;
    } catch {
      return { success: false, error: result };
    }
  }

  return result as SetRepetitionRuleResult;
}
