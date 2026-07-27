import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeFilterTasksCursor,
  encodeFilterTasksCursor,
  filterTasksQueryFingerprint,
} from './filterTasksCursor.js';

const query = {
  flagged: true,
  taskStatus: ['Next', 'Available'],
  sortBy: 'dueDate',
  sortOrder: 'asc' as const,
  limit: 20,
  outputMode: 'compact' as const,
};

test('filter cursor round trips continuation metadata', () => {
  const cursor = encodeFilterTasksCursor(query, {
    sortBy: 'dueDate',
    sortOrder: 'asc',
    lastValue: '2026-07-27T10:00:00.000Z',
    lastId: 'task-1',
  });
  assert.deepEqual(decodeFilterTasksCursor(cursor, query), {
    sortBy: 'dueDate',
    sortOrder: 'asc',
    lastValue: '2026-07-27T10:00:00.000Z',
    lastId: 'task-1',
  });
});

test('filter cursor fingerprint normalizes defaults and set-like arrays', () => {
  assert.equal(
    filterTasksQueryFingerprint(query),
    filterTasksQueryFingerprint({
      flagged: true,
      taskStatus: ['Available', 'Next'],
      sortBy: 'dueDate',
      sortOrder: 'asc',
      perspective: 'all',
      exactTagMatch: false,
      limit: 5,
      outputMode: 'detailed',
      showSubtasks: true,
    }),
  );
});

test('filter cursor rejects changed membership and sorting', () => {
  const cursor = encodeFilterTasksCursor(query, {
    sortBy: 'dueDate', sortOrder: 'asc', lastValue: null, lastId: 'task-1',
  });
  assert.throws(() => decodeFilterTasksCursor(cursor, { ...query, flagged: false }), /query or sorting changed/);
  assert.throws(() => decodeFilterTasksCursor(cursor, { ...query, sortOrder: 'desc' }), /query or sorting changed/);
  const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  payload.sortBy = 'name';
  const tampered = Buffer.from(JSON.stringify(payload)).toString('base64url');
  assert.throws(() => decodeFilterTasksCursor(tampered, query), /query or sorting changed/);
});

test('filter cursor rejects malformed, incomplete, unknown, and oversized values', () => {
  assert.throws(() => decodeFilterTasksCursor('not-json', query), /malformed/);
  assert.throws(() => decodeFilterTasksCursor('%%%%', query), /malformed/);
  assert.throws(
    () => decodeFilterTasksCursor(Buffer.from(JSON.stringify({ version: 1 })).toString('base64url'), query),
    /incomplete/,
  );
  assert.throws(
    () => decodeFilterTasksCursor(Buffer.from(JSON.stringify({ version: 99 })).toString('base64url'), query),
    /unsupported version/,
  );
  assert.throws(() => decodeFilterTasksCursor('a'.repeat(2049), query), /too large/);
  const wrongType = encodeFilterTasksCursor(query, {
    sortBy: 'dueDate', sortOrder: 'asc', lastValue: 1, lastId: 'task-1',
  });
  assert.throws(() => decodeFilterTasksCursor(wrongType, query), /wrong type/);
});
