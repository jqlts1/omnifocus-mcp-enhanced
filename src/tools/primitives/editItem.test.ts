import assert from 'node:assert/strict';
import test from 'node:test';
import { generateAppleScript } from './editItem.js';

test('editItem date handling uses preamble variables outside OmniFocus tell block', () => {
  const script = generateAppleScript({
    id: 'abc123',
    itemType: 'task',
    newDueDate: '2026-02-24',
    newDeferDate: '2026-02-23',
    newPlannedDate: '2026-02-22'
  });

  const tellIndex = script.indexOf('tell application "OmniFocus"');
  const preambleIndex = script.indexOf('set newDueDateValue to current date');
  assert.ok(preambleIndex > -1 && preambleIndex < tellIndex);

  assert.match(script, /set due date of foundItem to newDueDateValue/);
  assert.match(script, /set defer date of foundItem to newDeferDateValue/);
  assert.match(script, /set planned date of foundItem to newPlannedDateValue/);

  assert.doesNotMatch(script, /set due date of foundItem to date "/);
  assert.doesNotMatch(script, /set defer date of foundItem to date "/);
  assert.doesNotMatch(script, /set planned date of foundItem to date "/);
});
