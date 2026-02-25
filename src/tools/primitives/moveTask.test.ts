import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMoveTaskEditParams, validateMoveTaskParams } from './moveTask.js';

test('validateMoveTaskParams requires source task identifier', () => {
  const validation = validateMoveTaskParams({
    targetInbox: true
  });

  assert.equal(validation.valid, false);
  assert.match(validation.error || '', /Either id or name must be provided/);
});

test('validateMoveTaskParams enforces exactly one destination type', () => {
  const validation = validateMoveTaskParams({
    id: 'task-1',
    targetProjectId: 'project-1',
    targetInbox: true
  });

  assert.equal(validation.valid, false);
  assert.match(validation.error || '', /Exactly one destination/);
});

test('buildMoveTaskEditParams maps to task edit parameters', () => {
  const mapped = buildMoveTaskEditParams({
    id: 'task-1',
    targetParentTaskName: 'Parent Task'
  });

  assert.equal(mapped.itemType, 'task');
  assert.equal(mapped.id, 'task-1');
  assert.equal(mapped.newParentTaskName, 'Parent Task');
  assert.equal(mapped.moveToInbox, false);
});
