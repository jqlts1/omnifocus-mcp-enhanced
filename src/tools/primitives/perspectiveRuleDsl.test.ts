import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEAD_RULE_KEYS,
  MAX_RULE_DEPTH,
  type PerspectiveRuleDocument,
  describeRuleDocument,
  diagnoseRuleDocument,
  friendlyToNative,
  nativeToFriendly,
  validateRuleDocument,
} from './perspectiveRuleDsl.js';
import { PERSPECTIVE_RULE_FIXTURES } from './perspectiveRuleFixtures.js';

/*
 * Round-trip fidelity is the property that matters most. OmniFocus stores rules
 * without validating them, so a rule this translator fails to understand must
 * survive untouched rather than be dropped or corrupted.
 */
test('every real perspective survives a native -> friendly -> native round trip', () => {
  for (const fixture of PERSPECTIVE_RULE_FIXTURES) {
    const document = nativeToFriendly(fixture.rules, fixture.aggregation);
    const { rules } = friendlyToNative(document);
    assert.deepEqual(
      rules,
      fixture.rules,
      `round trip changed the rules of ${fixture.name}`,
    );
  }
});

test('round-tripped real perspectives always validate', () => {
  for (const fixture of PERSPECTIVE_RULE_FIXTURES) {
    const document = nativeToFriendly(fixture.rules, fixture.aggregation);
    assert.deepEqual(
      validateRuleDocument(document),
      [],
      `${fixture.name} produced validation errors`,
    );
  }
});

test('a rule disabled in the UI stays disabled through a round trip', () => {
  const native = [{ disabledRule: { actionAvailability: 'available' } }];
  const document = nativeToFriendly(native, 'all');
  const node = document.rules[0];
  assert.equal(node.enabled, false);
  assert.equal('type' in node && node.type, 'availability');
  assert.deepEqual(friendlyToNative(document).rules, native);
});

test('unrecognised native rules are preserved verbatim as raw nodes', () => {
  const native = [
    { actionAvailability: 'available' },
    { someFutureOmniFocusRule: { nested: [1, 2, 3] } },
  ];
  const document = nativeToFriendly(native, 'all');
  const raw = document.rules[1];
  assert.equal('type' in raw && raw.type, 'raw');
  assert.deepEqual(friendlyToNative(document).rules, native);
});

test('nested aggregation groups round trip at depth', () => {
  const native = [
    {
      aggregateRules: [
        {
          aggregateRules: [
            { actionDateField: 'defer', actionDateIsToday: true },
            { actionAvailability: 'remaining' },
          ],
          aggregateType: 'all',
        },
        { actionAvailability: 'available' },
      ],
      aggregateType: 'any',
    },
  ];
  const document = nativeToFriendly(native, 'all');
  const group = document.rules[0];
  assert.ok('match' in group && group.match === 'any');
  assert.deepEqual(friendlyToNative(document).rules, native);
});

test('the between date rule keeps both bounds', () => {
  const native = [
    {
      actionDateField: 'due',
      actionDateIsAfterDateSpec: { dynamic: 'today' },
      actionDateIsBeforeDateSpec: { dynamic: 'this week' },
    },
  ];
  const document = nativeToFriendly(native, 'all');
  const node = document.rules[0];
  assert.ok('type' in node && node.type === 'date');
  assert.deepEqual(friendlyToNative(document).rules, native);
});

test('reference ids are resolved to display names for reading', () => {
  const document = nativeToFriendly(
    [{ actionHasAnyOfTags: ['tag-1', 'tag-2'] }],
    'all',
    { 'tag-1': '团队 / 守一' },
  );
  const node = document.rules[0];
  assert.ok('type' in node && node.type === 'tagged-any');
  assert.deepEqual(
    'refs' in node ? node.refs : [],
    [
      { id: 'tag-1', name: '团队 / 守一' },
      { id: 'tag-2', name: null },
    ],
  );
});

test('a reference given only by name becomes a placeholder for the writer', () => {
  const document: PerspectiveRuleDocument = {
    match: 'all',
    rules: [{ type: 'tagged-any', refs: [{ name: '深度工作' }] }],
  };
  assert.deepEqual(friendlyToNative(document).rules, [
    { actionHasAnyOfTags: [{ $ref: { kind: 'tag', name: '深度工作' } }] },
  ]);
});

test('a reference with an id needs no lookup', () => {
  const document: PerspectiveRuleDocument = {
    match: 'all',
    rules: [{ type: 'within-focus', refs: [{ id: 'folder-9', name: 'Work' }] }],
  };
  assert.deepEqual(friendlyToNative(document).rules, [
    { actionWithinFocus: ['folder-9'] },
  ]);
});

/*
 * Validation is the only safety net. OmniFocus accepts any JSON as a rule and
 * then ignores what it does not understand, which silently turns the
 * perspective into "match everything".
 */
test('unknown rule types are rejected', () => {
  const errors = validateRuleDocument({
    match: 'all',
    rules: [{ type: 'not-a-real-rule' }],
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0] as string, /unknown rule type/);
});

test('an invalid enum value is rejected', () => {
  const errors = validateRuleDocument({
    match: 'all',
    rules: [{ type: 'availability', value: 'sometimes' }],
  });
  assert.match(errors[0] as string, /availability/);
});

test('the documented but non-functional "changed" date field is rejected', () => {
  const errors = validateRuleDocument({
    match: 'all',
    rules: [{ type: 'date', field: 'changed', when: 'today' }],
  });
  assert.match(errors[0] as string, /ignored by the filter engine/);
});

test('rule keys the filter engine ignores are rejected inside raw nodes', () => {
  for (const key of DEAD_RULE_KEYS) {
    const errors = validateRuleDocument({
      match: 'all',
      rules: [{ type: 'raw', native: { [key]: true } }],
    });
    assert.equal(errors.length, 1, `${key} should be rejected`);
    assert.match(errors[0] as string, /match everything/);
  }
});

test('a between rule missing one bound is rejected', () => {
  const errors = validateRuleDocument({
    match: 'all',
    rules: [
      { type: 'date', field: 'due', when: { between: { after: 'today' } } },
    ],
  });
  assert.match(errors.join(' '), /between\.before/);
});

test('an unknown relative unit is rejected', () => {
  const errors = validateRuleDocument({
    match: 'all',
    rules: [
      {
        type: 'date',
        field: 'due',
        when: { inTheNext: { amount: 3, unit: 'fortnight' } },
      },
    ],
  });
  assert.match(errors.join(' '), /unit/);
});

test('empty reference and term lists are rejected', () => {
  assert.match(
    validateRuleDocument({
      match: 'all',
      rules: [{ type: 'tagged-any', refs: [] }],
    }).join(' '),
    /non-empty/,
  );
  assert.match(
    validateRuleDocument({
      match: 'all',
      rules: [{ type: 'search', terms: [] }],
    }).join(' '),
    /non-empty/,
  );
});

test('a reference without an id or a name is rejected', () => {
  const errors = validateRuleDocument({
    match: 'all',
    rules: [{ type: 'tagged-any', refs: [{}] }],
  });
  assert.match(errors.join(' '), /needs an "id" or a "name"/);
});

test('rule nesting deeper than the bound is rejected', () => {
  let node: Record<string, unknown> = { type: 'availability', value: 'available' };
  for (let depth = 0; depth < MAX_RULE_DEPTH + 2; depth += 1) {
    node = { match: 'all', rules: [node] };
  }
  const errors = validateRuleDocument({ match: 'all', rules: [node] });
  assert.match(errors.join(' '), /nesting exceeds/);
});

test('an empty group is rejected', () => {
  const errors = validateRuleDocument({
    match: 'all',
    rules: [{ match: 'any', rules: [] }],
  });
  assert.match(errors.join(' '), /at least one rule/);
});

/* Diagnostics catch perspectives that are structurally guaranteed to be empty. */
test('contradictory availability under "all" is reported', () => {
  const findings = diagnoseRuleDocument({
    match: 'all',
    rules: [
      { type: 'availability', value: 'available' },
      { type: 'availability', value: 'completed' },
    ],
  });
  assert.match(findings.join(' '), /matches nothing/);
});

test('a contradiction inside a nested group is reported', () => {
  const findings = diagnoseRuleDocument({
    match: 'any',
    rules: [
      {
        match: 'all',
        rules: [
          { type: 'untagged' },
          { type: 'tagged-any', refs: [{ id: 'tag-1' }] },
        ],
      },
    ],
  });
  assert.match(findings.join(' '), /untagged and to carry a tag/);
});

test('a disabled rule does not trigger a contradiction', () => {
  const findings = diagnoseRuleDocument({
    match: 'all',
    rules: [
      { type: 'availability', value: 'available' },
      { type: 'availability', value: 'completed', enabled: false },
    ],
  });
  assert.deepEqual(findings, []);
});

test('a perspective whose rules are all disabled is reported', () => {
  const findings = diagnoseRuleDocument({
    match: 'all',
    rules: [{ type: 'availability', value: 'available', enabled: false }],
  });
  assert.match(findings.join(' '), /matches every item/);
});

test('rules are rendered as a readable outline', () => {
  const text = describeRuleDocument({
    match: 'all',
    rules: [
      { type: 'availability', value: 'available' },
      {
        match: 'any',
        rules: [{ type: 'date', field: 'due', when: 'today' }],
      },
      { type: 'tagged-any', refs: [{ id: 'tag-1', name: 'Deep Work' }] },
    ],
  });
  assert.match(text, /Match ALL/);
  assert.match(text, /availability is available/);
  assert.match(text, /ANY of:/);
  assert.match(text, /due date is today/);
  assert.match(text, /tagged with any of: Deep Work/);
});

test('an unresolved reference is rendered visibly rather than silently', () => {
  const text = describeRuleDocument({
    match: 'all',
    rules: [{ type: 'tagged-any', refs: [{ id: 'gone-1', name: null }] }],
  });
  assert.match(text, /<unresolved gone-1>/);
});
