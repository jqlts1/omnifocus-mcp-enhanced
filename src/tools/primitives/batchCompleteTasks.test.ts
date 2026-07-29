import assert from 'node:assert/strict';
import test from 'node:test';
import { batchCompleteTasks } from './batchCompleteTasks.js';

test('batchCompleteTasks rejects empty items array', async () => {
  const result = await batchCompleteTasks({ items: [] });
  assert.equal(result.success, false);
  assert.equal(result.code, 'INVALID_COMPLETION');
});

test('batchCompleteTasks rejects duplicate task IDs', async () => {
  const result = await batchCompleteTasks({
    items: [
      { taskId: 'task-1', action: 'complete' },
      { taskId: 'task-1', action: 'incomplete' },
    ],
  });
  assert.equal(result.success, false);
  assert.match(result.error || '', /duplicate/);
});

test('batchCompleteTasks rejects completionDate with incomplete', async () => {
  const result = await batchCompleteTasks({
    items: [
      {
        taskId: 'task-1',
        action: 'incomplete',
        completionDate: '2026-07-28T18:00:00+08:00',
      },
    ],
  });
  assert.equal(result.success, false);
  assert.match(result.error || '', /completionDate only valid/);
});

test('batchCompleteTasks rejects invalid completionDate', async () => {
  const result = await batchCompleteTasks({
    items: [
      { taskId: 'task-1', action: 'complete', completionDate: 'not-a-date' },
    ],
  });
  assert.equal(result.success, false);
  assert.match(result.error || '', /invalid completionDate/);
});

test('batchCompleteTasks rejects over 100 items', async () => {
  const items = Array.from({ length: 101 }, (_, i) => ({
    taskId: `task-${i}`,
    action: 'complete' as const,
  }));
  const result = await batchCompleteTasks({ items });
  assert.equal(result.success, false);
  assert.match(result.error || '', /100/);
});
