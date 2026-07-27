import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('prompt and resource task reads pass their requested bound to OmniFocus', async () => {
  const source = await readFile(new URL('./omnifocusData.js', import.meta.url), 'utf8');
  assert.match(source, /exactTagMatch: options\.exactTagMatch \?\? false,\s+limit,/);
  assert.doesNotMatch(source, /Math\.max\(limit \* 5, 2000\)/);
});
