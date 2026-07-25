import assert from 'node:assert/strict';
import test from 'node:test';
import { generateAppleScript } from './addFolder.js';

test('addFolder creates folder at root level when no parent specified', () => {
  const script = generateAppleScript({ name: 'Work' });

  // Root branch is selected at AppleScript runtime via the empty parent name check.
  assert.match(script, /if "" is "" then/);
  assert.match(script, /make new folder with properties \{name:"Work"\}/);
  assert.match(script, /my jsonEscape\(folderId\)/);
});

test('addFolder nests under a parent folder with duplicate protection', () => {
  const script = generateAppleScript({ name: 'Sub', parentFolderName: 'Parent' });

  assert.match(script, /flattened folders where name = "Parent"/);
  assert.match(script, /Ambiguous parent folder name: Parent/);
  assert.match(script, /make new folder with properties \{name:"Sub"\} at end of folders of parentFolder/);
});

test('addFolder keeps apostrophes and doubles backslashes in the name', () => {
  const script = generateAppleScript({ name: "Client's \\ Files" });

  assert.match(script, /name:"Client's \\\\ Files"/);
  assert.doesNotMatch(script, /\\'/);
});

test('addFolder escapes JSON response values through AppleScript helper', () => {
  const script = generateAppleScript({ name: 'Work' });

  assert.match(script, /on jsonEscape\(inputText\)/);
  assert.match(script, /my jsonEscape\(folderId\)/);
  assert.match(script, /my jsonEscape\(folderNameValue\)/);
});
