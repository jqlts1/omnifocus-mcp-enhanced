import { z } from 'zod';
import {
  getPerspective,
  listPerspectives,
  updatePerspective,
} from '../primitives/managePerspectives.js';
import {
  type PerspectiveRuleDocument,
  describeRuleDocument,
} from '../primitives/perspectiveRuleDsl.js';
import type { ToolHandlerExtra } from './toolHandler.js';

const refSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .optional()
      .describe('OmniFocus primary key. Preferred: needs no name lookup.'),
    name: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Display name, resolved when no id is given. Tags accept a full path such as "团队 / 守一". Ambiguous names are rejected.',
      ),
  })
  .strict();

const relativeSpanSchema = z
  .object({
    amount: z.number().positive(),
    unit: z.enum(['year', 'month', 'week', 'day', 'hour']),
  })
  .strict();

const dateWhenSchema = z.union([
  z.literal('today'),
  z.literal('tomorrow'),
  z.literal('yesterday'),
  z
    .object({
      on: z
        .string()
        .min(1)
        .describe('Date phrase OmniFocus parses, e.g. "today" or "next monday".'),
    })
    .strict(),
  z.object({ inThePast: relativeSpanSchema }).strict(),
  z.object({ inTheNext: relativeSpanSchema }).strict(),
  z
    .object({
      between: z
        .object({
          after: z.string().min(1).nullable(),
          before: z.string().min(1).nullable(),
        })
        .strict()
        .describe(
          'Date window. Use null for an unbounded side. Both keys are always required: OmniFocus ignores the rule if either is missing.',
        ),
    })
    .strict(),
]);

const FLAG_TYPES = [
  'repeats',
  'is-leaf',
  'is-group',
  'is-project',
  'is-project-or-group',
  'has-due-date',
  'has-defer-date',
  'has-planned-date',
  'has-duration',
  'untagged',
  'in-inbox',
  'in-single-actions-list',
] as const;

const enabledField = z
  .boolean()
  .optional()
  .describe(
    'False keeps the rule stored but switched off, matching the OmniFocus UI toggle. Defaults to true.',
  );

const leafSchema = z.union([
  z.object({ type: z.enum(FLAG_TYPES), enabled: enabledField }).strict(),
  z
    .object({
      type: z.literal('availability'),
      value: z.enum([
        'firstAvailable',
        'available',
        'remaining',
        'completed',
        'dropped',
      ]),
      enabled: enabledField,
    })
    .strict(),
  z
    .object({
      type: z.literal('status'),
      value: z.enum(['due', 'flagged']),
      enabled: enabledField,
    })
    .strict(),
  z
    .object({
      type: z.literal('tag-status'),
      value: z.enum(['active', 'remaining', 'onHold', 'dropped', 'stalled']),
      enabled: enabledField,
    })
    .strict(),
  z
    .object({
      type: z.literal('project-status'),
      value: z.enum([
        'active',
        'remaining',
        'onHold',
        'completed',
        'dropped',
        'stalled',
        'pending',
      ]),
      enabled: enabledField,
    })
    .strict(),
  z
    .object({
      type: z.enum(['tagged-any', 'tagged-all', 'within-focus']),
      refs: z.array(refSchema).min(1),
      enabled: enabledField,
    })
    .strict(),
  z
    .object({
      type: z.literal('search'),
      terms: z.array(z.string().min(1)).min(1),
      enabled: enabledField,
    })
    .strict(),
  z
    .object({
      type: z.literal('within-duration'),
      minutes: z.number().positive(),
      enabled: enabledField,
    })
    .strict(),
  z
    .object({
      type: z.literal('date'),
      field: z
        .enum(['due', 'defer', 'planned', 'completed', 'added', 'dropped'])
        .describe(
          'Omni documents a "changed" field but the filter engine ignores it, so it is not accepted.',
        ),
      when: dateWhenSchema,
      enabled: enabledField,
    })
    .strict(),
  z
    .object({
      type: z.literal('raw'),
      native: z
        .record(z.unknown())
        .describe(
          'A rule this tool does not model, preserved verbatim from a previous read. Do not invent these.',
        ),
      enabled: enabledField,
    })
    .strict(),
]);

type RuleNodeInput =
  | z.infer<typeof leafSchema>
  | { match: 'all' | 'any' | 'none'; rules: RuleNodeInput[]; enabled?: boolean };

const ruleNodeSchema: z.ZodType<RuleNodeInput> = z.lazy(() =>
  z.union([
    leafSchema,
    z
      .object({
        match: z.enum(['all', 'any', 'none']),
        rules: z.array(ruleNodeSchema).min(1),
        enabled: enabledField,
      })
      .strict(),
  ]),
);

const ruleDocumentSchema = z
  .object({
    match: z
      .enum(['all', 'any', 'none'])
      .describe('How the top-level rules combine.'),
    rules: z.array(ruleNodeSchema),
  })
  .strict();

export const inputSchema = z
  .object({
    action: z
      .enum(['list', 'get', 'update'])
      .describe(
        'list: every custom perspective. get: one perspective with its rules explained. update: rewrite name, rules, aggregation, or icon colour in place.',
      ),
    id: z
      .string()
      .min(1)
      .optional()
      .describe('Perspective identifier (get/update). Preferred over name.'),
    name: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Perspective name (get/update). This is a perspective, not a tag.',
      ),
    newName: z.string().min(1).optional().describe('Rename the perspective (update).'),
    rules: ruleDocumentSchema
      .optional()
      .describe(
        'Complete replacement rule document (update). Always read the perspective first and send the full tree back, including any "raw" rules, or they will be lost.',
      ),
    iconColor: z
      .string()
      .regex(/^#?[0-9a-fA-F]{6}$/)
      .optional()
      .describe('Perspective icon colour as a hex string such as "#3399EE".'),
    dryRun: z
      .boolean()
      .optional()
      .describe('Validate and report the diff without writing (update).'),
  })
  .strict();

export const inputShape = inputSchema.shape;

export const schema = inputSchema.superRefine((args, ctx) => {
  if ((args.action === 'get' || args.action === 'update') && !args.id && !args.name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['id'],
      message: `id or name is required when action is ${args.action}`,
    });
  }
  if (
    args.action === 'update' &&
    args.rules === undefined &&
    args.newName === undefined &&
    args.iconColor === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rules'],
      message: 'update requires at least one of rules, newName, or iconColor',
    });
  }
});

interface PerspectiveDependencies {
  listPerspectives: typeof listPerspectives;
  getPerspective: typeof getPerspective;
  updatePerspective: typeof updatePerspective;
}

const defaultDependencies: PerspectiveDependencies = {
  listPerspectives,
  getPerspective,
  updatePerspective,
};

export function createHandler(dependencies: PerspectiveDependencies) {
  return async (
    rawArgs: z.input<typeof inputSchema>,
    _extra: ToolHandlerExtra,
  ) => {
    const parsed = schema.safeParse(rawArgs);
    if (!parsed.success) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Invalid manage_perspectives arguments: ${parsed.error.issues
              .map((issue) => issue.message)
              .join('; ')}`,
          },
        ],
        isError: true,
      };
    }
    const args = parsed.data;

    try {
      switch (args.action) {
        case 'list': {
          const perspectives = await dependencies.listPerspectives();
          if (perspectives.length === 0) {
            return {
              content: [
                { type: 'text' as const, text: 'No custom perspectives found.' },
              ],
            };
          }
          const duplicates = perspectives
            .map((entry) => entry.name)
            .filter((name, index, all) => all.indexOf(name) !== index);
          const lines = [
            `# Custom perspectives (${perspectives.length})`,
            '',
            ...perspectives.map(
              (entry) =>
                `- ${entry.name} (id:${entry.identifier}, match:${
                  entry.aggregation ?? 'n/a'
                }, rules:${entry.ruleCount})`,
            ),
          ];
          if (duplicates.length > 0) {
            lines.push(
              '',
              `⚠️ Duplicate names: ${[...new Set(duplicates)].join(
                ', ',
              )}. Reference these by id.`,
            );
          }
          return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
        }

        case 'get': {
          const detail = await dependencies.getPerspective({
            id: args.id,
            name: args.name,
          });
          const lines = [
            `# Perspective: ${detail.name}`,
            '',
            `- id: ${detail.identifier}`,
            '',
            '## Rules',
            '',
            describeRuleDocument(detail.document),
            '',
            '## Editable rule document',
            '',
            'Send this back to `update` with your changes applied.',
            '',
            '```json',
            JSON.stringify(detail.document, null, 2),
            '```',
          ];
          if (detail.diagnostics.length > 0) {
            lines.push(
              '',
              '## Diagnostics',
              '',
              ...detail.diagnostics.map((finding) => `- ${finding}`),
            );
          }
          return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
        }

        case 'update': {
          const result = await dependencies.updatePerspective({
            id: args.id,
            name: args.name,
            newName: args.newName,
            rules: args.rules as PerspectiveRuleDocument | undefined,
            iconColor: args.iconColor,
            dryRun: args.dryRun,
          });

          const heading = result.dryRun
            ? `Dry run for "${result.name}" — nothing was written.`
            : `✅ Perspective "${result.name}" updated.`;
          const lines = [heading, '', `- id: ${result.identifier}`];
          if (!result.dryRun) {
            lines.push(
              `- display refreshed: ${
                result.refreshedDisplay
                  ? 'yes'
                  : 'not shown in any window, nothing to refresh'
              }`,
            );
          }
          lines.push(
            '',
            '## Changes',
            '',
            ...(result.changes.length > 0
              ? result.changes.map((change) => `- ${change}`)
              : ['- none']),
            '',
            `## Rules ${result.dryRun ? 'that would apply' : 'now in effect'}`,
            '',
            describeRuleDocument(result.after),
          );
          return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
        }
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      console.error(`Tool execution error: ${error.message}`);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error in perspective ${args.action}: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  };
}

export const handler = createHandler(defaultDependencies);
