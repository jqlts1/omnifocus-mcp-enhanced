import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeAppleScriptString } from './appleScriptString.js';

test('escapeAppleScriptString escapes quotes and backslashes but preserves apostrophes', () => {
  const escaped = escapeAppleScriptString(`Client's "draft" in C:\\Temp`);

  assert.equal(escaped, `Client's \\"draft\\" in C:\\\\Temp`);
});
