import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTagAssignmentScript } from './addOmniFocusTask.js';

test('buildTagAssignmentScript creates missing tags before assignment', () => {
  const script = buildTagAssignmentScript(['mcp-test-tag'], 'newTask');

  assert.match(script, /set theTag to first flattened tag where name = "mcp-test-tag"/);
  assert.match(script, /if theTag is missing value then/);
  assert.match(script, /set theTag to make new tag with properties \{name:"mcp-test-tag"\}/);
  assert.match(script, /add theTag to tags of newTask/);
});
