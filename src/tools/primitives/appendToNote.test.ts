import assert from 'node:assert/strict';
import test from 'node:test';
import { generateAppleScript } from './appendToNote.js';

test('appendToNote appends with a real newline (linefeed) separator by default', () => {
  const script = generateAppleScript({
    itemType: 'task',
    name: 'My Task',
    text: 'progress update'
  });

  // Reads existing note, appends using AppleScript's linefeed constant (real newline).
  assert.match(script, /set existingNote to note of foundItem/);
  assert.match(script, /set newNote to existingNote & linefeed & "progress update"/);
  assert.match(script, /set note of foundItem to newNote/);
});

test('appendToNote respects an explicit empty separator', () => {
  const script = generateAppleScript({
    itemType: 'task',
    name: 'My Task',
    text: 'more',
    separator: ''
  });

  assert.match(script, /set newNote to existingNote & "" & "more"/);
});

test('appendToNote targets flattened projects when itemType is project', () => {
  const script = generateAppleScript({
    itemType: 'project',
    name: 'My Project',
    text: 'note'
  });

  assert.match(script, /flattened projects where name = "My Project"/);
  assert.doesNotMatch(script, /flattened tasks where name = "My Project"/);
});

test('appendToNote keeps apostrophes and doubles backslashes in text', () => {
  const script = generateAppleScript({
    itemType: 'task',
    name: 'T',
    text: "didn't work in C:\\Temp"
  });

  assert.match(script, /didn't work in C:\\\\Temp/);
  assert.doesNotMatch(script, /\\'/);
});

test('appendToNote errors when neither id nor name provided', () => {
  const script = generateAppleScript({ itemType: 'task', text: 'x' } as any);
  assert.match(script, /Either id or name must be provided/);
});
