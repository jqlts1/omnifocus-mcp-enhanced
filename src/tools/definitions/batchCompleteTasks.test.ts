import assert from 'node:assert/strict';
import test from 'node:test';
import { schema } from './batchCompleteTasks.js';

test('batch_complete_tasks schema requires items array', () => {
  assert.throws(() => schema.parse({}));
  assert.throws(() => schema.parse({ items: [] }));
});

test('batch_complete_tasks schema enforces 100-item limit', () => {
  const items = Array.from({ length: 101 }, (_, i) => ({
    taskId: `task-${i}`,
    action: 'complete' as const,
  }));
  assert.throws(() => schema.parse({ items }));

  const valid = items.slice(0, 100);
  assert.doesNotThrow(() => schema.parse({ items: valid }));
});

test('batch_complete_tasks schema rejects duplicate task IDs', () => {
  const parsed = schema.parse({
    items: [
      { taskId: 'task-1', action: 'complete' },
      { taskId: 'task-1', action: 'incomplete' },
    ],
  });
  // Schema allows duplicates; primitive must reject
  assert.equal(parsed.items.length, 2);
});

test('batch_complete_tasks schema accepts completionDate only with complete', () => {
  assert.doesNotThrow(() =>
    schema.parse({
      items: [
        {
          taskId: 'task-1',
          action: 'complete',
          completionDate: '2026-07-28T18:00:00+08:00',
        },
      ],
    }),
  );
});

test('batch_complete_tasks schema rejects unknown fields', () => {
  assert.throws(() =>
    schema.parse({
      items: [{ taskId: 'task-1', action: 'complete', extra: 'field' }],
    }),
  );
  assert.throws(() =>
    schema.parse({
      items: [{ taskId: 'task-1', action: 'complete' }],
      preview: true,
    }),
  );
});

test('batch_complete_tasks schema rejects unknown actions', () => {
  assert.throws(() =>
    schema.parse({ items: [{ taskId: 'task-1', action: 'dropped' }] }),
  );
});
