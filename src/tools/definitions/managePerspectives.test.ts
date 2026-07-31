import assert from 'node:assert/strict';
import test from 'node:test';
import { createHandler, schema } from './managePerspectives.js';

const extra = undefined as never;

const sampleDocument = {
  match: 'all' as const,
  rules: [{ type: 'availability' as const, value: 'available' as const }],
};

function stubDependencies() {
  const calls: Array<{ method: string; args: unknown }> = [];
  return {
    calls,
    dependencies: {
      listPerspectives: async () => {
        calls.push({ method: 'list', args: undefined });
        return [
          {
            name: 'Today',
            identifier: 'p-1',
            aggregation: 'all' as const,
            ruleCount: 3,
          },
          {
            name: 'Review',
            identifier: 'p-2',
            aggregation: 'any' as const,
            ruleCount: 1,
          },
        ];
      },
      getPerspective: async (args: unknown) => {
        calls.push({ method: 'get', args });
        return {
          name: 'Today',
          identifier: 'p-1',
          document: sampleDocument,
          native: [{ actionAvailability: 'available' }],
          diagnostics: ['top level: matches nothing.'],
        };
      },
      updatePerspective: async (args: unknown) => {
        calls.push({ method: 'update', args });
        return {
          name: 'Today',
          identifier: 'p-1',
          dryRun: false,
          refreshedDisplay: true,
          before: sampleDocument,
          after: sampleDocument,
          changes: ['added: status is flagged'],
        };
      },
    },
  };
}

test('get and update require an id or a name', () => {
  for (const action of ['get', 'update'] as const) {
    const parsed = schema.safeParse(
      action === 'get' ? { action } : { action, newName: 'x' },
    );
    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.match(parsed.error.issues[0]?.message ?? '', /id or name is required/);
    }
  }
});

test('update requires something to change', () => {
  const parsed = schema.safeParse({ action: 'update', name: 'Today' });
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.match(
      parsed.error.issues.map((issue) => issue.message).join(' '),
      /at least one of rules, newName, or iconColor/,
    );
  }
});

test('an unknown rule type is rejected by the schema', () => {
  const parsed = schema.safeParse({
    action: 'update',
    name: 'Today',
    rules: { match: 'all', rules: [{ type: 'invented-rule' }] },
  });
  assert.equal(parsed.success, false);
});

test('the non-functional "changed" date field is rejected by the schema', () => {
  const parsed = schema.safeParse({
    action: 'update',
    name: 'Today',
    rules: {
      match: 'all',
      rules: [{ type: 'date', field: 'changed', when: 'today' }],
    },
  });
  assert.equal(parsed.success, false);
});

test('an unbounded date range bound is accepted', () => {
  const parsed = schema.safeParse({
    action: 'update',
    name: 'Today',
    rules: {
      match: 'all',
      rules: [
        {
          type: 'date',
          field: 'defer',
          when: { between: { after: 'tomorrow', before: null } },
        },
      ],
    },
  });
  assert.equal(parsed.success, true);
});

test('nested groups are accepted by the schema', () => {
  const parsed = schema.safeParse({
    action: 'update',
    name: 'Today',
    rules: {
      match: 'all',
      rules: [
        {
          match: 'any',
          rules: [
            { type: 'status', value: 'flagged' },
            { match: 'all', rules: [{ type: 'has-due-date' }] },
          ],
        },
      ],
    },
  });
  assert.equal(parsed.success, true);
});

test('list output names each perspective with its id and rule count', async () => {
  const { dependencies } = stubDependencies();
  const result = await createHandler(dependencies)({ action: 'list' }, extra);
  const text = result.content[0]?.text ?? '';
  assert.match(text, /Today \(id:p-1, match:all, rules:3\)/);
  assert.match(text, /Review \(id:p-2/);
});

test('get output explains the rules and includes diagnostics', async () => {
  const { dependencies, calls } = stubDependencies();
  const result = await createHandler(dependencies)(
    { action: 'get', name: 'Today' },
    extra,
  );
  const text = result.content[0]?.text ?? '';
  assert.deepEqual(calls[0], { method: 'get', args: { id: undefined, name: 'Today' } });
  assert.match(text, /availability is available/);
  assert.match(text, /Editable rule document/);
  assert.match(text, /Diagnostics/);
  assert.match(text, /matches nothing/);
});

test('update reports the changes and whether the display was refreshed', async () => {
  const { dependencies } = stubDependencies();
  const result = await createHandler(dependencies)(
    { action: 'update', name: 'Today', rules: sampleDocument },
    extra,
  );
  const text = result.content[0]?.text ?? '';
  assert.match(text, /Perspective "Today" updated/);
  assert.match(text, /display refreshed: yes/);
  assert.match(text, /added: status is flagged/);
});

test('a dry run is labelled as having written nothing', async () => {
  const { dependencies } = stubDependencies();
  dependencies.updatePerspective = async () => ({
    name: 'Today',
    identifier: 'p-1',
    dryRun: true,
    refreshedDisplay: false,
    before: sampleDocument,
    after: sampleDocument,
    changes: [],
  });
  const result = await createHandler(dependencies)(
    { action: 'update', name: 'Today', rules: sampleDocument, dryRun: true },
    extra,
  );
  const text = result.content[0]?.text ?? '';
  assert.match(text, /nothing was written/);
  assert.doesNotMatch(text, /display refreshed/);
});

test('duplicate perspective names are called out because lookups become ambiguous', async () => {
  const { dependencies } = stubDependencies();
  dependencies.listPerspectives = async () => [
    { name: 'Weekly', identifier: 'p-1', aggregation: 'all' as const, ruleCount: 2 },
    { name: 'Weekly', identifier: 'p-2', aggregation: 'all' as const, ruleCount: 4 },
  ];
  const result = await createHandler(dependencies)({ action: 'list' }, extra);
  const text = result.content[0]?.text ?? '';
  assert.match(text, /Duplicate names: Weekly/);
});

test('a failure surfaces as an error result rather than a thrown exception', async () => {
  const { dependencies } = stubDependencies();
  dependencies.getPerspective = async () => {
    throw new Error('Custom perspective not found: Nope');
  };
  const result = await createHandler(dependencies)(
    { action: 'get', name: 'Nope' },
    extra,
  );
  assert.equal(result.isError, true);
  assert.match(result.content[0]?.text ?? '', /Custom perspective not found/);
});
