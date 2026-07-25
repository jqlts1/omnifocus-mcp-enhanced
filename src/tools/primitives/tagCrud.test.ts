import assert from 'node:assert/strict';
import test from 'node:test';
import { generateAppleScript as genAdd } from './addTag.js';
import { generateAppleScript as genEdit, validateEditTagParams } from './editTag.js';
import { generateAppleScript as genRemove } from './removeTag.js';

test('addTag rejects duplicate tag names and creates at root by default', () => {
  const script = genAdd({ name: 'Work' });

  assert.match(script, /Tag already exists: Work/);
  assert.match(script, /if "" is "" then/);
  assert.match(script, /make new tag with properties \{name:"Work"\}/);
});

test('addTag nests under a parent tag with duplicate protection', () => {
  const script = genAdd({ name: 'Deep', parentTagName: 'Focus' });

  assert.match(script, /flattened tags where name = "Focus"/);
  assert.match(script, /Ambiguous parent tag name: Focus/);
  assert.match(script, /at end of tags of parentTag/);
});

test('editTag validation requires an identifier and at least one change', () => {
  assert.equal(validateEditTagParams({ newName: 'x' }).valid, false);
  assert.match(validateEditTagParams({ newName: 'x' }).error || '', /id or name/);

  assert.equal(validateEditTagParams({ name: 'Work' }).valid, false);
  assert.match(validateEditTagParams({ name: 'Work' }).error || '', /Nothing to update/);

  assert.equal(validateEditTagParams({ name: 'Work', newName: 'Job' }).valid, true);
});

test('editTag maps status values to OmniFocus tag properties', () => {
  assert.match(genEdit({ name: 'T', newStatus: 'active' }), /set hidden of foundTag to false/);
  assert.match(genEdit({ name: 'T', newStatus: 'onHold' }), /set allows next action of foundTag to false/);
  assert.match(genEdit({ name: 'T', newStatus: 'dropped' }), /set hidden of foundTag to true/);
});

test('editTag move to root uses the document tag list and guards cycles when moving under a tag', () => {
  const toRoot = genEdit({ name: 'Child', newParentTagName: '' });
  assert.match(toRoot, /move foundTag to end of tags\b/);
  assert.match(toRoot, /parent \(root\)/);

  const toParent = genEdit({ name: 'Child', newParentTagName: 'Parent' });
  assert.match(toParent, /cannot move a tag into itself or its descendants/);
  assert.match(toParent, /move foundTag to end of tags of destTag/);
});

test('removeTag reports affected task and child tag counts', () => {
  const script = genRemove({ name: 'Obsolete' });

  assert.match(script, /set affectedTaskCount to count of \(tasks of foundTag\)/);
  assert.match(script, /set childTagCount to count of \(flattened tags of foundTag\)/);
  assert.match(script, /delete foundTag/);
});

test('removeTag errors without an identifier', () => {
  const script = genRemove({});
  assert.match(script, /Either id or name must be provided/);
});
