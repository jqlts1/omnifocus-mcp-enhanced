import assert from 'node:assert/strict';
import test from 'node:test';
import { handler, schema } from './moveTask.js';

test('move_task schema accepts source and destination fields', () => {
  const parsed = schema.parse({
    id: 'task-1',
    targetProjectId: 'project-1'
  }) as any;

  assert.equal(parsed.id, 'task-1');
  assert.equal(parsed.targetProjectId, 'project-1');
});

test('move_task schema preserves targetInbox boolean', () => {
  const parsed = schema.parse({
    name: 'My Task',
    targetInbox: true
  }) as any;

  assert.equal(parsed.targetInbox, true);
});

test('move_task handler returns validation errors for conflicting destinations', async () => {
  const result = await handler({
    id: 'task-1',
    targetProjectId: 'project-1',
    targetInbox: true
  }, {} as any);

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /Exactly one destination/);
});
