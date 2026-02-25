import assert from 'node:assert/strict';
import test from 'node:test';
import { generateAppleScript, validateEditItemParams } from './editItem.js';

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

test('validateEditItemParams rejects task move parameters for project edits', () => {
  const validation = validateEditItemParams({
    id: 'project-1',
    itemType: 'project',
    newProjectName: 'ShouldFail'
  });

  assert.equal(validation.valid, false);
  assert.match(validation.error || '', /only supported when itemType is "task"/);
});

test('validateEditItemParams rejects conflicting destination types', () => {
  const validation = validateEditItemParams({
    id: 'task-1',
    itemType: 'task',
    newProjectId: 'proj-1',
    moveToInbox: true
  });

  assert.equal(validation.valid, false);
  assert.match(validation.error || '', /Invalid destination selection/);
});

test('generateAppleScript adds duplicate-safe source lookup by task name', () => {
  const script = generateAppleScript({
    name: 'Duplicate Name',
    itemType: 'task',
    newFlagged: true
  });

  assert.match(script, /set nameMatches to \(flattened tasks where name = "Duplicate Name"\)/);
  assert.match(script, /Ambiguous task name: Duplicate Name\. Multiple matches found; please use id\./);
});

test('generateAppleScript moves task to project before applying property edits', () => {
  const script = generateAppleScript({
    id: 'task-123',
    itemType: 'task',
    newProjectName: 'Roadmap',
    newName: 'Renamed Task'
  });

  const moveIndex = script.indexOf('move foundItem to end of tasks of destinationProject');
  const renameIndex = script.indexOf('set name of foundItem to "Renamed Task"');

  assert.ok(moveIndex > -1);
  assert.ok(renameIndex > -1);
  assert.ok(moveIndex < renameIndex);
  assert.match(script, /set end of changedProperties to "moved \(project\)"/);
});

test('generateAppleScript protects against moving task under itself or descendants', () => {
  const script = generateAppleScript({
    id: 'task-123',
    itemType: 'task',
    newParentTaskName: 'Parent Candidate'
  });

  assert.match(script, /set cursorTask to destinationParentTask/);
  assert.match(script, /cannot move a task into itself or its descendants/);
  assert.match(script, /move foundItem to end of tasks of destinationParentTask/);
});

test('generateAppleScript supports moving task to inbox', () => {
  const script = generateAppleScript({
    id: 'task-123',
    itemType: 'task',
    moveToInbox: true
  });

  assert.match(script, /move foundItem to end of inbox tasks/);
  assert.match(script, /set end of changedProperties to "moved \(inbox\)"/);
});
