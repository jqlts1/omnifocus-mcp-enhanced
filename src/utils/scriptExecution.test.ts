import assert from 'node:assert/strict';
import test from 'node:test';

import { executeOmniFocusScript } from './scriptExecution.js';

test('executeOmniFocusScript rejects external script paths', async () => {
  await assert.rejects(
    executeOmniFocusScript('/tmp/untrusted.js'),
    /@-prefixed built-in script name/
  );
});

test('executeOmniFocusScript rejects path traversal in built-in script names', async () => {
  await assert.rejects(
    executeOmniFocusScript('@../untrusted.js'),
    /Invalid OmniFocus script name/
  );
});
