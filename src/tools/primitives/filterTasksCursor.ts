import { createHash } from 'node:crypto';
import type { FilterTasksOptions } from './filterTasks.js';

const CURSOR_VERSION = 1;
const MAX_CURSOR_BYTES = 2048;

export type CursorSortValue = string | number | boolean | null;

export interface FilterTasksContinuation {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  lastValue: CursorSortValue;
  lastId: string;
}

interface FilterTasksCursorPayload extends FilterTasksContinuation {
  version: number;
  fingerprint: string;
}

const outputControls = new Set([
  'cursor',
  'limit',
  'outputMode',
  'showSubtasks',
  'maxSubtaskDepth',
]);

function canonicalize(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) {
    const values = value.map(item => canonicalize(item));
    return key === 'taskStatus' || key === 'tagFilter'
      ? values.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
      : values;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([childKey, item]) => [childKey, canonicalize(item, childKey)]),
    );
  }
  return value;
}

export function filterTasksQueryFingerprint(options: FilterTasksOptions): string {
  const query: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(options)) {
    if (!outputControls.has(key) && value !== undefined) query[key] = value;
  }
  query.perspective = options.perspective || 'all';
  query.exactTagMatch = options.exactTagMatch ?? false;
  query.sortBy = options.sortBy || 'name';
  query.sortOrder = options.sortOrder || 'asc';
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(query)))
    .digest('base64url');
}

function isSortValue(value: unknown): value is CursorSortValue {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function isSortSpecificValue(sortBy: string, value: CursorSortValue): boolean {
  if (value === null) return true;
  if (sortBy === 'flagged') return typeof value === 'number' && (value === 0 || value === 1);
  return typeof value === 'string';
}

export function encodeFilterTasksCursor(
  options: FilterTasksOptions,
  continuation: FilterTasksContinuation,
): string {
  const payload: FilterTasksCursorPayload = {
    version: CURSOR_VERSION,
    fingerprint: filterTasksQueryFingerprint(options),
    ...continuation,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeFilterTasksCursor(
  cursor: string,
  options: FilterTasksOptions,
): FilterTasksContinuation {
  if (!cursor || Buffer.byteLength(cursor, 'utf8') > MAX_CURSOR_BYTES) {
    throw new Error('Invalid filter_tasks cursor: empty or too large');
  }

  let payload: unknown;
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error('invalid base64url');
    const decoded = Buffer.from(cursor, 'base64url');
    if (decoded.toString('base64url') !== cursor.replace(/=+$/, '')) {
      throw new Error('non-canonical base64url');
    }
    payload = JSON.parse(decoded.toString('utf8'));
  } catch {
    throw new Error('Invalid filter_tasks cursor: malformed encoding');
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid filter_tasks cursor: malformed payload');
  }
  const value = payload as Partial<FilterTasksCursorPayload>;
  if (value.version !== CURSOR_VERSION) {
    throw new Error('Invalid filter_tasks cursor: unsupported version');
  }
  if (
    typeof value.fingerprint !== 'string' ||
    typeof value.sortBy !== 'string' ||
    (value.sortOrder !== 'asc' && value.sortOrder !== 'desc') ||
    !isSortValue(value.lastValue) ||
    typeof value.lastId !== 'string' ||
    value.lastId.length === 0
  ) {
    throw new Error('Invalid filter_tasks cursor: incomplete payload');
  }
  if (value.fingerprint !== filterTasksQueryFingerprint(options)) {
    throw new Error('Invalid filter_tasks cursor: query or sorting changed');
  }
  const requestedSortBy = options.sortBy || 'name';
  const requestedSortOrder = options.sortOrder || 'asc';
  if (value.sortBy !== requestedSortBy || value.sortOrder !== requestedSortOrder) {
    throw new Error('Invalid filter_tasks cursor: query or sorting changed');
  }
  if (!isSortSpecificValue(value.sortBy, value.lastValue)) {
    throw new Error('Invalid filter_tasks cursor: sort value has the wrong type');
  }

  return {
    sortBy: value.sortBy,
    sortOrder: value.sortOrder,
    lastValue: value.lastValue,
    lastId: value.lastId,
  };
}
