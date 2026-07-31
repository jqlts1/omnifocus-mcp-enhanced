// Live smoke test: drives manage_perspectives against the real OmniFocus app.
// Every mutation is reverted before exit.
import { createHandler } from '../dist/tools/definitions/managePerspectives.js';
import { getPerspective } from '../dist/tools/primitives/managePerspectives.js';
import {
  getPerspective as get2,
  listPerspectives,
  updatePerspective,
} from '../dist/tools/primitives/managePerspectives.js';

const handler = createHandler({ listPerspectives, getPerspective: get2, updatePerspective });
const call = async (args) => (await handler(args, undefined)).content[0].text;
const TARGET = 'think-box';

const step = (n, t) => console.log(`\n${'='.repeat(70)}\n${n}. ${t}\n${'='.repeat(70)}`);

const original = await getPerspective({ name: TARGET });
console.log('captured original rules:', JSON.stringify(original.document));

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  PASS' : '  FAIL'} ${label}${detail ? ' :: ' + detail : ''}`);
  if (!ok) failures += 1;
};

try {
  step(1, 'list');
  const list = await call({ action: 'list' });
  console.log(list.split('\n').slice(0, 5).join('\n'), '\n  ...');
  check('lists perspectives', list.includes(TARGET));

  step(2, 'get — rules explained in plain language');
  const got = await call({ action: 'get', name: TARGET });
  console.log(got);
  check('renders readable rules', got.includes('Match ALL'));
  check('emits an editable document', got.includes('"match"'));

  step(3, 'update dryRun — must not write');
  const proposed = {
    match: 'all',
    rules: [
      ...original.document.rules,
      { type: 'status', value: 'flagged' },
    ],
  };
  const dry = await call({ action: 'update', name: TARGET, rules: proposed, dryRun: true });
  console.log(dry);
  const afterDry = await getPerspective({ name: TARGET });
  check(
    'dry run wrote nothing',
    JSON.stringify(afterDry.document) === JSON.stringify(original.document),
  );

  step(4, 'update — real write, then verify persistence');
  const applied = await call({ action: 'update', name: TARGET, rules: proposed });
  console.log(applied);
  const afterWrite = await getPerspective({ name: TARGET });
  check(
    'rule was persisted',
    afterWrite.document.rules.length === original.document.rules.length + 1,
    `${original.document.rules.length} -> ${afterWrite.document.rules.length}`,
  );
  check('change was reported', applied.includes('added:'));

  step(5, 'update — invalid rule type must be refused');
  const bad = await call({
    action: 'update',
    name: TARGET,
    rules: { match: 'all', rules: [{ type: 'availability', value: 'sometimes' }] },
  });
  console.log(bad.split('\n').slice(0, 4).join('\n'));
  check('invalid enum refused', bad.includes('Invalid manage_perspectives arguments'));

  step(6, 'update — unknown tag name must be refused, not silently skipped');
  const unknownTag = await call({
    action: 'update',
    name: TARGET,
    rules: { match: 'all', rules: [{ type: 'tagged-any', refs: [{ name: 'no-such-tag-xyz' }] }] },
  });
  console.log(unknownTag);
  check('unknown tag refused', unknownTag.includes('No tag named'));
  const afterBad = await getPerspective({ name: TARGET });
  check(
    'perspective untouched after refusal',
    afterBad.document.rules.length === original.document.rules.length + 1,
  );

  step(7, 'update — a name reference resolves to an id');
  const withTag = await call({
    action: 'update',
    name: TARGET,
    rules: {
      match: 'all',
      rules: [
        { type: 'availability', value: 'available' },
        { type: 'tagged-any', refs: [{ name: original.document.rules
            .flatMap((r) => (r.type === 'tagged-any' ? r.refs : []))
            .map((r) => r.name)
            .filter(Boolean)[0] ?? 'zz' }] },
      ],
    },
  });
  const resolved = await getPerspective({ name: TARGET });
  const nativeStr = JSON.stringify(resolved.native);
  check('name resolved to a primary key', /actionHasAnyOfTags":\["[A-Za-z0-9_-]+"\]/.test(nativeStr), nativeStr);
} finally {
  step(9, 'restore original rules');
  await updatePerspective({ name: TARGET, rules: original.document });
  const restored = await getPerspective({ name: TARGET });
  const ok = JSON.stringify(restored.document) === JSON.stringify(original.document);
  console.log(ok ? '  RESTORED cleanly' : '  !!! RESTORE MISMATCH');
  console.log('  final native:', JSON.stringify(restored.native));
  if (!ok) failures += 1;
}

console.log(`\n${failures === 0 ? 'ALL SMOKE CHECKS PASSED' : failures + ' SMOKE CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
