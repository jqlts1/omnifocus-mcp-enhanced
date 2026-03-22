import assert from 'node:assert/strict';
import test from 'node:test';
import { batchAddItems } from './batchAddItems.js';

test('batchAddItems returns a clear validation error when a subtask also includes projectName', async () => {
  const result = await batchAddItems([
    {
      type: 'task',
      name: 'Child task',
      projectName: 'Demo Project',
      parentTaskName: 'Parent task'
    }
  ]);

  assert.equal(result.success, false);
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].success, false);
  assert.match(
    result.results[0].error || '',
    /Item 1 \("Child task"\): Do not provide projectName when parentTaskId or parentTaskName is set/
  );
});
