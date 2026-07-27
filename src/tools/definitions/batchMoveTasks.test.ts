import assert from 'node:assert/strict';
import test from 'node:test';
import { schema } from './batchMoveTasks.js';

test('batch_move_tasks accepts simple stable-id destinations', () => {
  const parsed = schema.parse({
    moves: [
      { taskId: 'task-1', projectId: 'project-1' },
      { taskId: 'task-2', parentTaskId: 'parent-1' },
      { taskId: 'task-3', inbox: true },
    ],
  });

  assert.equal(parsed.moves.length, 3);
});

test('batch_move_tasks requires exactly one destination', () => {
  assert.throws(() => schema.parse({
    moves: [{ taskId: 'task-1', projectId: 'project-1', inbox: true }],
  }), /exactly one destination/);
});

test('batch_move_tasks rejects duplicate source IDs', () => {
  assert.throws(() => schema.parse({
    moves: [
      { taskId: 'task-1', inbox: true },
      { taskId: 'task-1', projectId: 'project-1' },
    ],
  }), /Duplicate source task ID/);
});

test('batch_move_tasks rejects unknown move fields', () => {
  assert.throws(() => schema.parse({
    moves: [{ taskId: 'task-1', projectName: 'Planning' }],
  }));
});
