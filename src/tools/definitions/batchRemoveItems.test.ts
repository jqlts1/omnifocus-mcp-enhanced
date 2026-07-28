import assert from 'node:assert/strict';
import test from 'node:test';
import { schema } from './batchRemoveItems.js';

test('batch_remove_items accepts stable IDs only', () => {
  const parsed = schema.parse({
    items: [{ id: 'task-1', itemType: 'task' }],
  });
  assert.equal(parsed.items[0].id, 'task-1');
});

test('batch_remove_items rejects name fallback and duplicate IDs', () => {
  assert.throws(() =>
    schema.parse({
      items: [{ name: 'Ambiguous', itemType: 'task' }],
    }),
  );
  assert.throws(() =>
    schema.parse({
      items: [
        { id: 'task-1', itemType: 'task' },
        { id: 'task-1', itemType: 'task' },
      ],
    }),
  );
});
