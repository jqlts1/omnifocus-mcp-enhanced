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

test('addProject keeps apostrophes and doubles backslashes in text fields', () => {
  const script = generateAppleScript({
    name: "Client's \\ Roadmap",
    note: "Things that didn't work in C:\\Temp"
  });

  assert.match(script, /name:"Client's \\\\ Roadmap"/);
  assert.match(script, /set note of newProject to "Things that didn't work in C:\\\\Temp"/);
  assert.doesNotMatch(script, /\\'/);
});

test('addProject escapes JSON response values through AppleScript helper', () => {
  const script = generateAppleScript({
    name: "Client's \\ Roadmap"
  });

  assert.match(script, /on jsonEscape\(inputText\)/);
  assert.match(script, /set projectNameValue to name of newProject/);
  assert.match(script, /my jsonEscape\(projectId\)/);
  assert.match(script, /my jsonEscape\(projectNameValue\)/);
});
