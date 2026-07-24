import assert from 'node:assert/strict';
import test from 'node:test';

import { parseListTagsResult } from './listTags.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('parseListTagsResult preserves tag hierarchy and inactive state', () => {
  const result = parseListTagsResult(JSON.stringify({
    success: true,
    count: 2,
    tags: [
      { id: 'parent', name: 'Contexts', parentTagID: null, active: true },
      { id: 'child', name: 'Deferred', parentTagID: 'parent', active: false }
    ]
  }));

  assert.equal(result.count, 2);
  assert.equal(result.tags[1].parentTagID, 'parent');
  assert.equal(result.tags[1].active, false);
});

test('parseListTagsResult rejects malformed responses', () => {
  assert.throws(
    () => parseListTagsResult({ success: true, tags: null }),
    /tags must be an array/
  );
  assert.throws(
    () => parseListTagsResult({ success: false, error: 'OmniFocus unavailable' }),
    /OmniFocus unavailable/
  );
});

test('listTags OmniJS includes inactive tags by default and preserves hierarchy', () => {
  const script = readFileSync(
    new URL('../../utils/omnifocusScripts/listTags.js', import.meta.url),
    'utf8'
  );
  const parent = { id: { primaryKey: 'parent' }, name: 'Contexts', parent: null, active: true };
  const child = { id: { primaryKey: 'child' }, name: 'Deferred', parent, active: false };
  const result = vm.runInNewContext(script, {
    includeInactive: true,
    flattenedTags: [parent, child]
  });
  const parsed = JSON.parse(result);

  assert.equal(parsed.count, 2);
  assert.equal(parsed.tags[1].parentTagID, 'parent');
  assert.equal(parsed.tags[1].active, false);
});

test('listTags OmniJS can exclude inactive tags', () => {
  const script = readFileSync(
    new URL('../../utils/omnifocusScripts/listTags.js', import.meta.url),
    'utf8'
  );
  const result = vm.runInNewContext(script, {
    includeInactive: false,
    flattenedTags: [
      { id: { primaryKey: 'active' }, name: 'Work', parent: null, active: true },
      { id: { primaryKey: 'inactive' }, name: 'Deferred', parent: null, active: false }
    ]
  });

  assert.deepEqual(JSON.parse(result).tags.map((tag: { id: string }) => tag.id), ['active']);
});
