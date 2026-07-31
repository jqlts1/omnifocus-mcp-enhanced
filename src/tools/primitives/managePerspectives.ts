import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import {
  type Aggregation,
  type NativeRule,
  type PerspectiveRuleDocument,
  type RefNameLookup,
  describeRuleDocument,
  diagnoseRuleDocument,
  friendlyToNative,
  nativeToFriendly,
  validateRuleDocument,
} from './perspectiveRuleDsl.js';

export interface PerspectiveSummary {
  name: string;
  identifier: string;
  aggregation: Aggregation | null;
  ruleCount: number;
}

export interface PerspectiveDetail {
  name: string;
  identifier: string;
  document: PerspectiveRuleDocument;
  native: NativeRule[];
  diagnostics: string[];
}

interface NativePerspective {
  name: string;
  identifier: string;
  aggregation: unknown;
  rules: unknown;
  refNames?: RefNameLookup;
}

function parseScriptResult(result: unknown): Record<string, unknown> {
  const data = typeof result === 'string' ? JSON.parse(result) : result;
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid perspective script response');
  }
  const response = data as Record<string, unknown>;
  if (response.success !== true) {
    throw new Error(
      typeof response.error === 'string'
        ? response.error
        : 'Unknown OmniFocus perspective error',
    );
  }
  return response;
}

export async function listPerspectives(): Promise<PerspectiveSummary[]> {
  const response = parseScriptResult(
    await executeOmniFocusScript('@getPerspectiveRules.js', { listAll: true }),
  );
  const perspectives = Array.isArray(response.perspectives)
    ? (response.perspectives as NativePerspective[])
    : [];
  return perspectives.map((entry) => ({
    name: entry.name,
    identifier: entry.identifier,
    aggregation:
      entry.aggregation === 'all' ||
      entry.aggregation === 'any' ||
      entry.aggregation === 'none'
        ? entry.aggregation
        : null,
    ruleCount: Array.isArray(entry.rules) ? entry.rules.length : 0,
  }));
}

export async function getPerspective(params: {
  id?: string;
  name?: string;
}): Promise<PerspectiveDetail> {
  const response = parseScriptResult(
    await executeOmniFocusScript('@getPerspectiveRules.js', {
      perspectiveId: params.id || null,
      perspectiveName: params.name || null,
    }),
  );
  const entry = response.perspective as NativePerspective | undefined;
  if (!entry) throw new Error('Invalid response: perspective is missing');

  const document = nativeToFriendly(
    entry.rules,
    entry.aggregation,
    entry.refNames ?? {},
  );
  return {
    name: entry.name,
    identifier: entry.identifier,
    document,
    native: Array.isArray(entry.rules) ? (entry.rules as NativeRule[]) : [],
    diagnostics: diagnoseRuleDocument(document),
  };
}

export interface UpdatePerspectiveParams {
  id?: string;
  name?: string;
  newName?: string;
  rules?: PerspectiveRuleDocument;
  iconColor?: string;
  dryRun?: boolean;
}

export interface UpdatePerspectiveResult {
  name: string;
  identifier: string;
  dryRun: boolean;
  refreshedDisplay: boolean;
  before: PerspectiveRuleDocument;
  after: PerspectiveRuleDocument;
  changes: string[];
}

/**
 * Summarises what actually changed. OmniFocus reports no diff of its own, and
 * a client should never claim an edit it cannot name.
 */
function describeChanges(
  before: PerspectiveRuleDocument,
  after: PerspectiveRuleDocument,
  previousName: string,
  nextName: string,
): string[] {
  const changes: string[] = [];
  if (previousName !== nextName) {
    changes.push(`renamed "${previousName}" to "${nextName}"`);
  }
  if (before.match !== after.match) {
    changes.push(`top-level match changed from ${before.match} to ${after.match}`);
  }

  const beforeLines = describeRuleDocument(before).split('\n').slice(1);
  const afterLines = describeRuleDocument(after).split('\n').slice(1);
  const removed = beforeLines.filter((line) => !afterLines.includes(line));
  const added = afterLines.filter((line) => !beforeLines.includes(line));

  for (const line of removed) changes.push(`removed:${line.trim().slice(1)}`);
  for (const line of added) changes.push(`added:${line.trim().slice(1)}`);
  return changes;
}

export async function updatePerspective(
  params: UpdatePerspectiveParams,
): Promise<UpdatePerspectiveResult> {
  let nativeRules: NativeRule[] | null = null;
  let aggregation: Aggregation | null = null;

  if (params.rules) {
    const errors = validateRuleDocument(params.rules);
    if (errors.length > 0) {
      throw new Error(
        `Refusing to write invalid rules. OmniFocus stores rules without validating them, so an invalid rule would silently make this perspective match everything:\n- ${errors.join(
          '\n- ',
        )}`,
      );
    }
    const converted = friendlyToNative(params.rules);
    nativeRules = converted.rules;
    aggregation = converted.aggregation;
  }

  const response = parseScriptResult(
    await executeOmniFocusScript('@updatePerspectiveRules.js', {
      perspectiveId: params.id || null,
      perspectiveName: params.name || null,
      newName: params.newName ?? null,
      rules: nativeRules,
      aggregation,
      iconColor: params.iconColor ?? null,
      dryRun: params.dryRun === true,
    }),
  );

  if (params.dryRun === true) {
    const current = response.perspective as NativePerspective;
    const proposed = response.proposed as NativePerspective;
    const before = nativeToFriendly(
      current.rules,
      current.aggregation,
      current.refNames ?? {},
    );
    const after = nativeToFriendly(
      proposed.rules,
      proposed.aggregation,
      proposed.refNames ?? {},
    );
    return {
      name: current.name,
      identifier: current.identifier,
      dryRun: true,
      refreshedDisplay: false,
      before,
      after,
      changes: describeChanges(before, after, current.name, proposed.name),
    };
  }

  const entry = response.perspective as NativePerspective;
  const previous = response.previous as NativePerspective;
  const before = nativeToFriendly(
    previous.rules,
    previous.aggregation,
    previous.refNames ?? {},
  );
  const after = nativeToFriendly(
    entry.rules,
    entry.aggregation,
    entry.refNames ?? {},
  );

  return {
    name: entry.name,
    identifier: entry.identifier,
    dryRun: false,
    refreshedDisplay: response.refreshedDisplay === true,
    before,
    after,
    changes: describeChanges(before, after, previous.name, entry.name),
  };
}
