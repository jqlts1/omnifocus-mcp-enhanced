import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTagAssignmentScript, generateAppleScript } from './addOmniFocusTask.js';

test('buildTagAssignmentScript creates missing tags before assignment', () => {
  const script = buildTagAssignmentScript(['mcp-test-tag'], 'newTask');

  assert.match(script, /set theTag to first flattened tag where name = "mcp-test-tag"/);
  assert.match(script, /if theTag is missing value then/);
  assert.match(script, /set theTag to make new tag with properties \{name:"mcp-test-tag"\}/);
  assert.match(script, /add theTag to tags of newTask/);
});

test('generateAppleScript builds date variables before OmniFocus tell block', () => {
  const script = generateAppleScript({
    name: 'Task with dates',
    dueDate: '2026-02-27',
    deferDate: '2026-02-25',
    plannedDate: '2026-02-24'
  });

  const tellIndex = script.indexOf('tell application "OmniFocus"');
  const preambleIndex = script.indexOf('set dueDateValue to current date');
  assert.ok(preambleIndex > -1 && preambleIndex < tellIndex);

  assert.match(script, /set due date of newTask to dueDateValue/);
  assert.match(script, /set defer date of newTask to deferDateValue/);
  assert.match(script, /set planned date of newTask to plannedDateValue/);

  assert.doesNotMatch(script, /set due date of newTask to date "/);
  assert.doesNotMatch(script, /set defer date of newTask to date "/);
  assert.doesNotMatch(script, /set planned date of newTask to date "/);
});

test('generateAppleScript keeps apostrophes and doubles backslashes in task text fields', () => {
  const script = generateAppleScript({
    name: "Review client's \\ draft",
    note: "Check Bob's file in C:\\Temp"
  });

  assert.match(script, /make new inbox task with properties \{name:"Review client's \\\\ draft"\}/);
  assert.match(script, /set note of newTask to "Check Bob's file in C:\\\\Temp"/);
  assert.doesNotMatch(script, /\\'/);
});

test('generateAppleScript escapes JSON response values through AppleScript helper', () => {
  const script = generateAppleScript({
    name: "Review client's \\ draft"
  });

  assert.match(script, /on jsonEscape\(inputText\)/);
  assert.match(script, /set taskNameValue to name of newTask/);
  assert.match(script, /my jsonEscape\(taskId\)/);
  assert.match(script, /my jsonEscape\(taskNameValue\)/);
});
