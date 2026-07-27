import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { getPackageVersion } from './version.js';

test('MCP package version comes from package.json', () => {
  const packageMetadata = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { version: string };

  assert.equal(getPackageVersion(), packageMetadata.version);
});
