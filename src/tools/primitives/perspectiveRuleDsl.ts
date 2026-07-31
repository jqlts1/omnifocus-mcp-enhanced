/**
 * Translation between OmniFocus's native custom-perspective rule archive and a
 * readable, name-based rule document.
 *
 * The native archive is an untyped JSON blob. OmniFocus performs NO validation
 * when it is written: an unknown rule key is stored verbatim and then silently
 * ignored by the filter engine, which makes the perspective match everything.
 * A typo therefore cannot be detected by reading the value back, so every rule
 * this module emits must be validated here before it is written.
 *
 * The vocabulary below was verified against OmniFocus 4.8.12 by applying each
 * candidate rule to a live perspective and observing whether the filter engine
 * changed the matched set. Keys present in the application binary but ignored
 * by the engine are deliberately excluded and are listed in DEAD_RULE_KEYS.
 */

export type Aggregation = 'all' | 'any' | 'none';

export const AGGREGATIONS: readonly Aggregation[] = ['all', 'any', 'none'];

/** Maximum nesting depth accepted for a rule tree. */
export const MAX_RULE_DEPTH = 10;

/**
 * Rule keys that exist in the OmniFocus binary but that the filter engine
 * ignores. Writing one produces a perspective that silently matches
 * everything, so they are rejected rather than passed through.
 */
export const DEAD_RULE_KEYS: readonly string[] = [
  'actionHasDateToday',
  'actionHasDateTomorrow',
  'actionHasDateYesterday',
  'actionHasDateOnDateSpec',
  'actionHasDateInThePast',
  'actionHasDateInTheNext',
  'actionHasDateBetweenDateSpecs',
];

export type AvailabilityValue =
  | 'firstAvailable'
  | 'available'
  | 'remaining'
  | 'completed'
  | 'dropped';

export type StatusValue = 'due' | 'flagged';

export type TagStatusValue =
  | 'active'
  | 'remaining'
  | 'onHold'
  | 'dropped'
  | 'stalled';

export type ProjectStatusValue =
  | 'active'
  | 'remaining'
  | 'onHold'
  | 'completed'
  | 'dropped'
  | 'stalled'
  | 'pending';

/**
 * Date fields the engine honours. "changed" appears in Omni's published
 * documentation but the engine ignores it, so it is not accepted.
 */
export type DateField =
  | 'due'
  | 'defer'
  | 'planned'
  | 'completed'
  | 'added'
  | 'dropped';

export type RelativeUnit = 'year' | 'month' | 'week' | 'day' | 'hour';

export const AVAILABILITY_VALUES: readonly AvailabilityValue[] = [
  'firstAvailable',
  'available',
  'remaining',
  'completed',
  'dropped',
];
export const STATUS_VALUES: readonly StatusValue[] = ['due', 'flagged'];
export const TAG_STATUS_VALUES: readonly TagStatusValue[] = [
  'active',
  'remaining',
  'onHold',
  'dropped',
  'stalled',
];
export const PROJECT_STATUS_VALUES: readonly ProjectStatusValue[] = [
  'active',
  'remaining',
  'onHold',
  'completed',
  'dropped',
  'stalled',
  'pending',
];
export const DATE_FIELDS: readonly DateField[] = [
  'due',
  'defer',
  'planned',
  'completed',
  'added',
  'dropped',
];
export const RELATIVE_UNITS: readonly RelativeUnit[] = [
  'year',
  'month',
  'week',
  'day',
  'hour',
];

/** A tag, project, or folder referenced by a rule. */
export interface RuleRef {
  /** OmniFocus primary key. Preferred when present: it needs no lookup. */
  id?: string;
  /** Display name. Resolved to an id at write time when no id is given. */
  name?: string | null;
}

export interface RelativeSpan {
  amount: number;
  unit: RelativeUnit;
}

export type DateWhen =
  | 'today'
  | 'tomorrow'
  | 'yesterday'
  | { on: string }
  | { inThePast: RelativeSpan }
  | { inTheNext: RelativeSpan }
  /**
   * A date window. Either bound may be null, meaning unbounded on that side;
   * OmniFocus stores an unbounded bound as an empty spec. Both bounds null is
   * legal and degenerates to "this date field is set". The engine ignores the
   * rule entirely unless both bound keys are present, so both are always
   * written.
   */
  | { between: { after: string | null; before: string | null } };

interface NodeBase {
  /** Absent or true means active. False maps to the native disabledRule wrapper. */
  enabled?: boolean;
}

export interface GroupNode extends NodeBase {
  match: Aggregation;
  rules: RuleNode[];
}

export interface FlagNode extends NodeBase {
  type: FlagType;
}

export interface AvailabilityNode extends NodeBase {
  type: 'availability';
  value: AvailabilityValue;
}

export interface StatusNode extends NodeBase {
  type: 'status';
  value: StatusValue;
}

export interface TagStatusNode extends NodeBase {
  type: 'tag-status';
  value: TagStatusValue;
}

export interface ProjectStatusNode extends NodeBase {
  type: 'project-status';
  value: ProjectStatusValue;
}

export interface RefNode extends NodeBase {
  type: 'tagged-any' | 'tagged-all' | 'within-focus';
  refs: RuleRef[];
}

export interface SearchNode extends NodeBase {
  type: 'search';
  terms: string[];
}

export interface DurationNode extends NodeBase {
  type: 'within-duration';
  minutes: number;
}

export interface DateNode extends NodeBase {
  type: 'date';
  field: DateField;
  when: DateWhen;
}

/** A native rule this module does not model. Preserved verbatim. */
export interface RawNode extends NodeBase {
  type: 'raw';
  native: Record<string, unknown>;
}

export type LeafNode =
  | FlagNode
  | AvailabilityNode
  | StatusNode
  | TagStatusNode
  | ProjectStatusNode
  | RefNode
  | SearchNode
  | DurationNode
  | DateNode
  | RawNode;

export type RuleNode = GroupNode | LeafNode;

export interface PerspectiveRuleDocument {
  match: Aggregation;
  rules: RuleNode[];
}

export type NativeRule = Record<string, unknown>;

/** Rules whose native value is always boolean true. */
export type FlagType =
  | 'repeats'
  | 'is-leaf'
  | 'is-group'
  | 'is-project'
  | 'is-project-or-group'
  | 'has-due-date'
  | 'has-defer-date'
  | 'has-planned-date'
  | 'has-duration'
  | 'untagged'
  | 'in-inbox'
  | 'in-single-actions-list';

const FLAG_RULES: Record<FlagType, string> = {
  repeats: 'actionRepeats',
  'is-leaf': 'actionIsLeaf',
  'is-group': 'actionIsGroup',
  'is-project': 'actionIsProject',
  'is-project-or-group': 'actionIsProjectOrGroup',
  'has-due-date': 'actionHasDueDate',
  'has-defer-date': 'actionHasDeferDate',
  'has-planned-date': 'actionHasPlannedDate',
  'has-duration': 'actionHasDuration',
  untagged: 'actionIsUntagged',
  'in-inbox': 'actionHasNoProject',
  'in-single-actions-list': 'actionIsInSingleActionsList',
};

const FLAG_BY_NATIVE: Record<string, FlagType | undefined> = {
  actionRepeats: 'repeats',
  actionIsLeaf: 'is-leaf',
  actionIsGroup: 'is-group',
  actionIsProject: 'is-project',
  actionIsProjectOrGroup: 'is-project-or-group',
  actionHasDueDate: 'has-due-date',
  actionHasDeferDate: 'has-defer-date',
  actionHasPlannedDate: 'has-planned-date',
  actionHasDuration: 'has-duration',
  actionIsUntagged: 'untagged',
  actionHasNoProject: 'in-inbox',
  actionIsInSingleActionsList: 'in-single-actions-list',
};

const ENUM_RULES = {
  availability: {
    key: 'actionAvailability',
    values: AVAILABILITY_VALUES as readonly string[],
  },
  status: { key: 'actionStatus', values: STATUS_VALUES as readonly string[] },
  'tag-status': {
    key: 'actionHasTagWithStatus',
    values: TAG_STATUS_VALUES as readonly string[],
  },
  'project-status': {
    key: 'actionHasProjectWithStatus',
    values: PROJECT_STATUS_VALUES as readonly string[],
  },
} as const;

type EnumType = keyof typeof ENUM_RULES;

const ENUM_BY_NATIVE: Record<string, EnumType | undefined> = {
  actionAvailability: 'availability',
  actionStatus: 'status',
  actionHasTagWithStatus: 'tag-status',
  actionHasProjectWithStatus: 'project-status',
};

const REF_RULES = {
  'tagged-any': { key: 'actionHasAnyOfTags', kind: 'tag' },
  'tagged-all': { key: 'actionHasAllOfTags', kind: 'tag' },
  'within-focus': { key: 'actionWithinFocus', kind: 'focus' },
} as const;

type RefType = keyof typeof REF_RULES;

const REF_BY_NATIVE: Record<string, RefType | undefined> = {
  actionHasAnyOfTags: 'tagged-any',
  actionHasAllOfTags: 'tagged-all',
  actionWithinFocus: 'within-focus',
};

/** Reference kind used by the OmniJS resolver: tags, or folders/projects. */
export type RefKind = (typeof REF_RULES)[RefType]['kind'];

const DATE_FIELD_KEY = 'actionDateField';
const DATE_PREDICATE_KEYS = [
  'actionDateIsToday',
  'actionDateIsTomorrow',
  'actionDateIsYesterday',
  'actionDateIsOnDateSpec',
  'actionDateIsInThePast',
  'actionDateIsInTheNext',
  'actionDateIsAfterDateSpec',
  'actionDateIsBeforeDateSpec',
] as const;

const AGGREGATE_RULES_KEY = 'aggregateRules';
const AGGREGATE_TYPE_KEY = 'aggregateType';
const DISABLED_RULE_KEY = 'disabledRule';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value)
  );
}

function isAggregation(value: unknown): value is Aggregation {
  return (
    value === 'all' || value === 'any' || value === 'none'
  );
}

/* ------------------------------------------------------------------ *
 * native -> friendly
 * ------------------------------------------------------------------ */

/** Maps an OmniFocus primary key to a display name. */
export type RefNameLookup = Record<string, string | undefined>;

function nativeDateWhen(rule: NativeRule): DateWhen | null {
  if (rule.actionDateIsToday === true) return 'today';
  if (rule.actionDateIsTomorrow === true) return 'tomorrow';
  if (rule.actionDateIsYesterday === true) return 'yesterday';

  const on = rule.actionDateIsOnDateSpec;
  if (isPlainObject(on)) {
    return { on: typeof on.dynamic === 'string' ? on.dynamic : '' };
  }

  const past = rule.actionDateIsInThePast;
  if (isPlainObject(past)) {
    const amount = past.relativeBeforeAmount;
    const unit = past.relativeComponent;
    if (typeof amount === 'number' && isRelativeUnit(unit)) {
      return { inThePast: { amount, unit } };
    }
    return null;
  }

  const next = rule.actionDateIsInTheNext;
  if (isPlainObject(next)) {
    const amount = next.relativeAfterAmount;
    const unit = next.relativeComponent;
    if (typeof amount === 'number' && isRelativeUnit(unit)) {
      return { inTheNext: { amount, unit } };
    }
    return null;
  }

  // Both bound keys must be present; an empty spec means unbounded.
  const hasAfter = Object.prototype.hasOwnProperty.call(
    rule,
    'actionDateIsAfterDateSpec',
  );
  const hasBefore = Object.prototype.hasOwnProperty.call(
    rule,
    'actionDateIsBeforeDateSpec',
  );
  const after = rule.actionDateIsAfterDateSpec;
  const before = rule.actionDateIsBeforeDateSpec;
  if (hasAfter && hasBefore && isPlainObject(after) && isPlainObject(before)) {
    return {
      between: {
        after: typeof after.dynamic === 'string' ? after.dynamic : null,
        before: typeof before.dynamic === 'string' ? before.dynamic : null,
      },
    };
  }

  return null;
}

function isRelativeUnit(value: unknown): value is RelativeUnit {
  return (
    typeof value === 'string' &&
    (RELATIVE_UNITS as readonly string[]).includes(value)
  );
}

function isDateField(value: unknown): value is DateField {
  return (
    typeof value === 'string' && (DATE_FIELDS as readonly string[]).includes(value)
  );
}

function raw(rule: NativeRule): RawNode {
  return { type: 'raw', native: rule };
}

function nativeRuleToNode(
  rule: unknown,
  names: RefNameLookup,
  depth: number,
): RuleNode {
  if (!isPlainObject(rule)) {
    return raw({ value: rule } as NativeRule);
  }

  const keys = Object.keys(rule);

  // A rule the user switched off in the OmniFocus UI.
  if (keys.length === 1 && keys[0] === DISABLED_RULE_KEY) {
    const inner = nativeRuleToNode(rule[DISABLED_RULE_KEY], names, depth);
    return { ...inner, enabled: false } as RuleNode;
  }

  // Nested aggregation group.
  if (Object.prototype.hasOwnProperty.call(rule, AGGREGATE_RULES_KEY)) {
    const children = rule[AGGREGATE_RULES_KEY];
    if (Array.isArray(children) && depth < MAX_RULE_DEPTH) {
      const type = rule[AGGREGATE_TYPE_KEY];
      return {
        match: isAggregation(type) ? type : 'all',
        rules: children.map((child) =>
          nativeRuleToNode(child, names, depth + 1),
        ),
      };
    }
    return raw(rule);
  }

  // Date rule: a field plus exactly one predicate (or the between pair).
  if (Object.prototype.hasOwnProperty.call(rule, DATE_FIELD_KEY)) {
    const field = rule[DATE_FIELD_KEY];
    const when = nativeDateWhen(rule);
    const known = new Set<string>([
      DATE_FIELD_KEY,
      ...(DATE_PREDICATE_KEYS as readonly string[]),
    ]);
    const unexpected = keys.some((key) => !known.has(key));
    if (isDateField(field) && when !== null && !unexpected) {
      return { type: 'date', field, when };
    }
    return raw(rule);
  }

  if (keys.length !== 1) return raw(rule);
  const key = keys[0] as string;
  const value = rule[key];

  const flag = FLAG_BY_NATIVE[key];
  if (flag && value === true) return { type: flag };

  const enumType = ENUM_BY_NATIVE[key];
  if (enumType) {
    const allowed = ENUM_RULES[enumType].values;
    if (typeof value === 'string' && allowed.includes(value)) {
      return { type: enumType, value } as LeafNode;
    }
    return raw(rule);
  }

  const refType = REF_BY_NATIVE[key];
  if (refType && Array.isArray(value)) {
    return {
      type: refType,
      refs: value.map((id) => ({
        id: String(id),
        name: names[String(id)] ?? null,
      })),
    };
  }

  if (key === 'actionMatchingSearch' && Array.isArray(value)) {
    return { type: 'search', terms: value.map((term) => String(term)) };
  }

  if (key === 'actionWithinDuration' && typeof value === 'number') {
    return { type: 'within-duration', minutes: value };
  }

  return raw(rule);
}

/** Converts a native rule archive into the readable document form. */
export function nativeToFriendly(
  nativeRules: unknown,
  aggregation: unknown,
  names: RefNameLookup = {},
): PerspectiveRuleDocument {
  const rules = Array.isArray(nativeRules) ? nativeRules : [];
  return {
    match: isAggregation(aggregation) ? aggregation : 'all',
    rules: rules.map((rule) => nativeRuleToNode(rule, names, 0)),
  };
}

/* ------------------------------------------------------------------ *
 * friendly -> native
 * ------------------------------------------------------------------ */

/**
 * Placeholder emitted for a reference given by name only. The OmniJS writer
 * replaces it with the resolved primary key, or fails when the name is unknown
 * or ambiguous.
 */
export interface RefPlaceholder {
  $ref: { kind: RefKind; name: string };
}

function refToNative(ref: RuleRef, kind: RefKind): string | RefPlaceholder {
  if (typeof ref.id === 'string' && ref.id.length > 0) return ref.id;
  return { $ref: { kind, name: String(ref.name ?? '') } };
}

function dateWhenToNative(when: DateWhen): NativeRule {
  if (when === 'today') return { actionDateIsToday: true };
  if (when === 'tomorrow') return { actionDateIsTomorrow: true };
  if (when === 'yesterday') return { actionDateIsYesterday: true };
  if ('on' in when) return { actionDateIsOnDateSpec: { dynamic: when.on } };
  if ('inThePast' in when) {
    return {
      actionDateIsInThePast: {
        relativeBeforeAmount: when.inThePast.amount,
        relativeComponent: when.inThePast.unit,
      },
    };
  }
  if ('inTheNext' in when) {
    return {
      actionDateIsInTheNext: {
        relativeAfterAmount: when.inTheNext.amount,
        relativeComponent: when.inTheNext.unit,
      },
    };
  }
  // An unbounded side is stored as an empty spec, and both keys must be
  // written: OmniFocus ignores the rule outright if either key is missing.
  return {
    actionDateIsAfterDateSpec:
      when.between.after === null ? {} : { dynamic: when.between.after },
    actionDateIsBeforeDateSpec:
      when.between.before === null ? {} : { dynamic: when.between.before },
  };
}

function nodeToNativeRule(node: RuleNode): NativeRule {
  const enabled = node.enabled !== false;
  const inner = activeNodeToNative(node);
  return enabled ? inner : { [DISABLED_RULE_KEY]: inner };
}

function activeNodeToNative(node: RuleNode): NativeRule {
  if ('match' in node) {
    return {
      [AGGREGATE_RULES_KEY]: node.rules.map(nodeToNativeRule),
      [AGGREGATE_TYPE_KEY]: node.match,
    };
  }

  switch (node.type) {
    case 'raw':
      return node.native;
    case 'availability':
    case 'status':
    case 'tag-status':
    case 'project-status':
      return { [ENUM_RULES[node.type].key]: node.value };
    case 'tagged-any':
    case 'tagged-all':
    case 'within-focus':
      return {
        [REF_RULES[node.type].key]: node.refs.map((ref) =>
          refToNative(ref, REF_RULES[node.type].kind),
        ),
      };
    case 'search':
      return { actionMatchingSearch: node.terms };
    case 'within-duration':
      return { actionWithinDuration: node.minutes };
    case 'date':
      return { [DATE_FIELD_KEY]: node.field, ...dateWhenToNative(node.when) };
    default:
      return { [FLAG_RULES[node.type]]: true };
  }
}

/** Converts a rule document into the native archive OmniFocus stores. */
export function friendlyToNative(document: PerspectiveRuleDocument): {
  aggregation: Aggregation;
  rules: NativeRule[];
} {
  return {
    aggregation: document.match,
    rules: document.rules.map(nodeToNativeRule),
  };
}

/* ------------------------------------------------------------------ *
 * validation
 * ------------------------------------------------------------------ */

function validateNode(
  node: unknown,
  path: number[],
  depth: number,
  errors: string[],
): void {
  const where =
    path.length === 0 ? 'rules' : `rules[${path.join('][')}]`;

  if (!isPlainObject(node)) {
    errors.push(`${where}: expected a rule object`);
    return;
  }

  if (node.enabled !== undefined && typeof node.enabled !== 'boolean') {
    errors.push(`${where}: "enabled" must be a boolean`);
  }

  if ('match' in node) {
    if (!isAggregation(node.match)) {
      errors.push(`${where}: "match" must be one of ${AGGREGATIONS.join(', ')}`);
    }
    if (!Array.isArray(node.rules)) {
      errors.push(`${where}: a group requires a "rules" array`);
      return;
    }
    if (depth >= MAX_RULE_DEPTH) {
      errors.push(`${where}: rule nesting exceeds ${MAX_RULE_DEPTH} levels`);
      return;
    }
    if (node.rules.length === 0) {
      errors.push(`${where}: a group must contain at least one rule`);
    }
    node.rules.forEach((child, index) =>
      validateNode(child, [...path, index], depth + 1, errors),
    );
    return;
  }

  const type = node.type;
  if (typeof type !== 'string') {
    errors.push(`${where}: missing "type" (or "match" for a group)`);
    return;
  }

  if (type === 'raw') {
    if (!isPlainObject(node.native)) {
      errors.push(`${where}: raw rules require a "native" object`);
      return;
    }
    for (const key of Object.keys(node.native)) {
      if (DEAD_RULE_KEYS.includes(key)) {
        errors.push(
          `${where}: "${key}" is ignored by the OmniFocus filter engine and would make this perspective match everything`,
        );
      }
    }
    return;
  }

  if (type in FLAG_RULES) return;

  if (type in ENUM_RULES) {
    const allowed = ENUM_RULES[type as EnumType].values;
    if (typeof node.value !== 'string' || !allowed.includes(node.value)) {
      errors.push(
        `${where}: "${type}" requires value one of ${allowed.join(', ')}`,
      );
    }
    return;
  }

  if (type in REF_RULES) {
    if (!Array.isArray(node.refs) || node.refs.length === 0) {
      errors.push(`${where}: "${type}" requires a non-empty "refs" array`);
      return;
    }
    node.refs.forEach((ref, index) => {
      if (!isPlainObject(ref)) {
        errors.push(`${where}.refs[${index}]: expected {id} or {name}`);
        return;
      }
      const hasId = typeof ref.id === 'string' && ref.id.length > 0;
      const hasName = typeof ref.name === 'string' && ref.name.length > 0;
      if (!hasId && !hasName) {
        errors.push(`${where}.refs[${index}]: needs an "id" or a "name"`);
      }
    });
    return;
  }

  if (type === 'search') {
    const terms = node.terms;
    if (
      !Array.isArray(terms) ||
      terms.length === 0 ||
      terms.some((term) => typeof term !== 'string' || term.length === 0)
    ) {
      errors.push(`${where}: "search" requires a non-empty array of terms`);
    }
    return;
  }

  if (type === 'within-duration') {
    if (
      typeof node.minutes !== 'number' ||
      !Number.isFinite(node.minutes) ||
      node.minutes <= 0
    ) {
      errors.push(`${where}: "within-duration" requires positive "minutes"`);
    }
    return;
  }

  if (type === 'date') {
    if (!isDateField(node.field)) {
      errors.push(
        `${where}: "date" requires field one of ${DATE_FIELDS.join(', ')}` +
          (node.field === 'changed'
            ? ' ("changed" is documented by Omni but ignored by the filter engine)'
            : ''),
      );
    }
    validateDateWhen(node.when, where, errors);
    return;
  }

  errors.push(`${where}: unknown rule type "${type}"`);
}

function validateDateWhen(when: unknown, where: string, errors: string[]): void {
  if (when === 'today' || when === 'tomorrow' || when === 'yesterday') return;

  if (!isPlainObject(when)) {
    errors.push(
      `${where}: "when" must be today, tomorrow, yesterday, or an object with on / inThePast / inTheNext / between`,
    );
    return;
  }

  if ('on' in when) {
    if (typeof when.on !== 'string' || when.on.length === 0) {
      errors.push(`${where}: "on" requires a date phrase such as "today"`);
    }
    return;
  }

  for (const key of ['inThePast', 'inTheNext'] as const) {
    if (key in when) {
      const span = when[key];
      if (!isPlainObject(span)) {
        errors.push(`${where}: "${key}" requires {amount, unit}`);
        return;
      }
      if (
        typeof span.amount !== 'number' ||
        !Number.isFinite(span.amount) ||
        span.amount <= 0
      ) {
        errors.push(`${where}: "${key}.amount" must be a positive number`);
      }
      if (!isRelativeUnit(span.unit)) {
        errors.push(
          `${where}: "${key}.unit" must be one of ${RELATIVE_UNITS.join(', ')}`,
        );
      }
      return;
    }
  }

  if ('between' in when) {
    const range = when.between;
    if (!isPlainObject(range)) {
      errors.push(`${where}: "between" requires {after, before}`);
      return;
    }
    // Either side may be null (unbounded); both keys must still be supplied.
    for (const bound of ['after', 'before'] as const) {
      const value = range[bound];
      if (value !== null && typeof value !== 'string') {
        errors.push(
          `${where}: "between.${bound}" must be a date phrase or null for unbounded`,
        );
      } else if (typeof value === 'string' && value.length === 0) {
        errors.push(
          `${where}: "between.${bound}" must be a non-empty phrase; use null for unbounded`,
        );
      }
    }
    if (!('after' in range) || !('before' in range)) {
      errors.push(
        `${where}: "between" needs both "after" and "before"; OmniFocus ignores the rule when either is missing`,
      );
    }
    return;
  }

  errors.push(
    `${where}: "when" must use one of on, inThePast, inTheNext, between`,
  );
}

/** Returns a list of human-readable problems; empty means the document is safe to write. */
export function validateRuleDocument(document: unknown): string[] {
  const errors: string[] = [];

  if (!isPlainObject(document)) {
    return ['rules document must be an object with "match" and "rules"'];
  }
  if (!isAggregation(document.match)) {
    errors.push(`match: must be one of ${AGGREGATIONS.join(', ')}`);
  }
  if (!Array.isArray(document.rules)) {
    errors.push('rules: must be an array');
    return errors;
  }
  document.rules.forEach((node, index) =>
    validateNode(node, [index], 1, errors),
  );
  return errors;
}

/* ------------------------------------------------------------------ *
 * rendering
 * ------------------------------------------------------------------ */

function refLabel(ref: RuleRef): string {
  if (ref.name) return ref.name;
  return `<unresolved ${ref.id ?? 'reference'}>`;
}

function whenLabel(when: DateWhen): string {
  if (typeof when === 'string') return `is ${when}`;
  if ('on' in when) return `is on "${when.on}"`;
  if ('inThePast' in when) {
    return `is in the past ${when.inThePast.amount} ${when.inThePast.unit}(s)`;
  }
  if ('inTheNext' in when) {
    return `is in the next ${when.inTheNext.amount} ${when.inTheNext.unit}(s)`;
  }
  const { after, before } = when.between;
  if (after === null && before === null) return 'is set';
  if (after === null) return `is before "${before}"`;
  if (before === null) return `is after "${after}"`;
  return `is between "${after}" and "${before}"`;
}

function nodeLabel(node: RuleNode): string {
  if ('match' in node) return `${node.match.toUpperCase()} of:`;

  switch (node.type) {
    case 'raw':
      return `unrecognised rule ${JSON.stringify(node.native)}`;
    case 'availability':
      return `availability is ${node.value}`;
    case 'status':
      return `status is ${node.value}`;
    case 'tag-status':
      return `has a tag whose status is ${node.value}`;
    case 'project-status':
      return `has a project whose status is ${node.value}`;
    case 'tagged-any':
      return `tagged with any of: ${node.refs.map(refLabel).join(', ')}`;
    case 'tagged-all':
      return `tagged with all of: ${node.refs.map(refLabel).join(', ')}`;
    case 'within-focus':
      return `contained within: ${node.refs.map(refLabel).join(', ')}`;
    case 'search':
      return `matches search: ${node.terms.join(', ')}`;
    case 'within-duration':
      return `estimated duration under ${node.minutes} minutes`;
    case 'date':
      return `${node.field} date ${whenLabel(node.when)}`;
    default:
      return FLAG_LABELS[node.type];
  }
}

const FLAG_LABELS: Record<FlagType, string> = {
  repeats: 'item repeats',
  'is-leaf': 'item is not a project or group',
  'is-group': 'item is a group',
  'is-project': 'item is a project',
  'is-project-or-group': 'item is a project or group',
  'has-due-date': 'has a due date',
  'has-defer-date': 'has a defer date',
  'has-planned-date': 'has a planned date',
  'has-duration': 'has an estimated duration',
  untagged: 'is untagged',
  'in-inbox': 'is in the inbox',
  'in-single-actions-list': 'is in a single actions list',
};

function renderNode(node: RuleNode, indent: string, lines: string[]): void {
  const suffix = node.enabled === false ? '  [disabled]' : '';
  lines.push(`${indent}- ${nodeLabel(node)}${suffix}`);
  if ('match' in node) {
    for (const child of node.rules) renderNode(child, `${indent}  `, lines);
  }
}

/** Renders a rule document as an indented, human-readable outline. */
export function describeRuleDocument(document: PerspectiveRuleDocument): string {
  if (document.rules.length === 0) {
    return 'No filter rules: this perspective matches every item.';
  }
  const lines: string[] = [
    `Match ${document.match.toUpperCase()} of the following:`,
  ];
  for (const node of document.rules) renderNode(node, '', lines);
  return lines.join('\n');
}

/* ------------------------------------------------------------------ *
 * diagnostics
 * ------------------------------------------------------------------ */

/**
 * Flags rule combinations that make a perspective silently match nothing or
 * everything. These are structural faults, detectable without querying tasks.
 */
export function diagnoseRuleDocument(
  document: PerspectiveRuleDocument,
): string[] {
  const findings: string[] = [];

  const inspectGroup = (match: Aggregation, nodes: RuleNode[], where: string) => {
    if (match === 'all') {
      const availabilities = new Set(
        nodes
          .filter(
            (node): node is AvailabilityNode =>
              !('match' in node) &&
              node.type === 'availability' &&
              node.enabled !== false,
          )
          .map((node) => node.value),
      );
      if (availabilities.size > 1) {
        findings.push(
          `${where}: requires all of availability ${[...availabilities].join(
            ' + ',
          )}; an item can only have one availability, so this matches nothing.`,
        );
      }

      const statuses = new Set(
        nodes
          .filter(
            (node): node is StatusNode =>
              !('match' in node) &&
              node.type === 'status' &&
              node.enabled !== false,
          )
          .map((node) => node.value),
      );
      if (statuses.size > 1) {
        findings.push(
          `${where}: requires status ${[...statuses].join(
            ' + ',
          )} simultaneously, which matches nothing.`,
        );
      }

      const hasInbox = nodes.some(
        (node) =>
          !('match' in node) && node.type === 'in-inbox' && node.enabled !== false,
      );
      const hasProjectStatus = nodes.some(
        (node) =>
          !('match' in node) &&
          node.type === 'project-status' &&
          node.enabled !== false,
      );
      if (hasInbox && hasProjectStatus) {
        findings.push(
          `${where}: requires an item to be in the inbox and to have a project, which matches nothing.`,
        );
      }

      const untagged = nodes.some(
        (node) =>
          !('match' in node) && node.type === 'untagged' && node.enabled !== false,
      );
      const taggedWith = nodes.some(
        (node) =>
          !('match' in node) &&
          (node.type === 'tagged-any' || node.type === 'tagged-all') &&
          node.enabled !== false,
      );
      if (untagged && taggedWith) {
        findings.push(
          `${where}: requires an item to be untagged and to carry a tag, which matches nothing.`,
        );
      }
    }

    for (const [index, node] of nodes.entries()) {
      if ('match' in node) {
        inspectGroup(node.match, node.rules, `${where} > group[${index}]`);
      }
    }
  };

  inspectGroup(document.match, document.rules, 'top level');

  const active = document.rules.filter((node) => node.enabled !== false);
  if (document.rules.length > 0 && active.length === 0) {
    findings.push(
      'Every rule is disabled, so this perspective matches every item.',
    );
  }

  const rawNodes: RawNode[] = [];
  const collectRaw = (nodes: RuleNode[]) => {
    for (const node of nodes) {
      if ('match' in node) collectRaw(node.rules);
      else if (node.type === 'raw') rawNodes.push(node);
    }
  };
  collectRaw(document.rules);
  if (rawNodes.length > 0) {
    findings.push(
      `${rawNodes.length} rule(s) are not recognised by this tool and are preserved verbatim: ${rawNodes
        .map((node) => Object.keys(node.native).join('+'))
        .join(', ')}.`,
    );
  }

  return findings;
}

/** Collects every reference that must be resolved by name at write time. */
export function collectUnresolvedRefs(
  document: PerspectiveRuleDocument,
): { kind: RefKind; name: string }[] {
  const pending: { kind: RefKind; name: string }[] = [];
  const walk = (nodes: RuleNode[]) => {
    for (const node of nodes) {
      if ('match' in node) {
        walk(node.rules);
        continue;
      }
      if (node.type in REF_RULES) {
        const refNode = node as RefNode;
        for (const ref of refNode.refs) {
          if (!ref.id && ref.name) {
            pending.push({
              kind: REF_RULES[refNode.type].kind,
              name: ref.name,
            });
          }
        }
      }
    }
  };
  walk(document.rules);
  return pending;
}
