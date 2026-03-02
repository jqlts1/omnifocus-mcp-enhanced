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

test('generateAppleScript JSON-escapes quotes in error return strings', () => {
  const script = generateAppleScript({
    name: 'Test Task',
    projectName: 'My "Quoted" Project'
  });

  // The error string should use the JSON-safe variable (\\\" not just \")
  // so that a " in the project name doesn't break JSON parsing
  assert.match(script, /Project not found: My \\\\\\"Quoted\\\\\\" Project/);
});

test('generateAppleScript JSON-escapes quotes in success return string', () => {
  const script = generateAppleScript({
    name: 'My "Quoted" Task'
  });

  // The success return name should use JSON-safe escaping
  assert.match(script, /name.*My \\\\\\"Quoted\\\\\\" Task/);
});

test('generateAppleScript handles carriage returns in notes', () => {
  const script = generateAppleScript({
    name: 'CR Test',
    note: 'line1\r\nline2\rline3\nline4'
  });

  // All \r\n, \r, and \n should be converted to AppleScript return concatenation
  assert.doesNotMatch(script, /line1\\r/);
  assert.match(script, /line1" & return & "line2" & return & "line3" & return & "line4/);
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
