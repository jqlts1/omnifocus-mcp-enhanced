import assert from 'node:assert/strict';
import test from 'node:test';
import { siblingsToRemove } from './applyTagsExclusive.js';

test('siblingsToRemove returns empty when group is not exclusive', () => {
  const result = siblingsToRemove(false, ['High', 'Medium', 'Low'], ['High'], 'Medium');
  assert.deepEqual(result, []);
});

test('siblingsToRemove returns empty when tag has no parent group', () => {
  const result = siblingsToRemove(true, [], ['High'], 'Medium');
  assert.deepEqual(result, []);
});

test('siblingsToRemove removes current siblings but not target', () => {
  const result = siblingsToRemove(true, ['High', 'Medium', 'Low'], ['High', 'Low'], 'Medium');
  assert.deepEqual(result, ['High', 'Low']);
});

test('siblingsToRemove ignores siblings not currently applied', () => {
  const result = siblingsToRemove(true, ['High', 'Medium', 'Low'], ['Low'], 'Medium');
  assert.deepEqual(result, ['Low']);
});
