import assert from 'node:assert/strict';
import test from 'node:test';
import { generateAppleScript } from './addProject.js';

test('addProject date handling uses preamble variables outside OmniFocus tell block', () => {
  const script = generateAppleScript({
    name: 'Project with dates',
    dueDate: '2026-02-27',
    deferDate: '2026-02-25',
    plannedDate: '2026-02-24'
  });

  const tellIndex = script.indexOf('tell application "OmniFocus"');
  const preambleIndex = script.indexOf('set dueDateValue to current date');
  assert.ok(preambleIndex > -1 && preambleIndex < tellIndex);

  assert.match(script, /set due date of newProject to dueDateValue/);
  assert.match(script, /set defer date of newProject to deferDateValue/);
  assert.match(script, /set planned date of newProject to plannedDateValue/);

  assert.doesNotMatch(script, /set due date of newProject to date "/);
  assert.doesNotMatch(script, /set defer date of newProject to date "/);
  assert.doesNotMatch(script, /set planned date of newProject to date "/);
});
