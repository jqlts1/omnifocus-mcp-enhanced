import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('benchmark declares pagination rows and never emits cursor values', async () => {
  const source = await readFile(new URL('./benchmark-smoke.mjs', import.meta.url), 'utf8');
  assert.match(source, /filter_compact_page_1/);
  assert.match(source, /filter_compact_page_2/);
  assert.match(source, /filter_detailed_page_1/);
  assert.match(source, /fullMatchCount/);
  assert.match(source, /pageCount/);
  assert.match(source, /hasMore/);
  assert.doesNotMatch(source, /process\.stdout\.write\([^\n]*cursor/i);
});
