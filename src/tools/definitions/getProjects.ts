import { z } from 'zod';
import { getProjects } from '../primitives/getProjects.js';
import { getProjectsDueForReview } from '../primitives/getProjectsDueForReview.js';
import type { ToolHandlerExtra } from './toolHandler.js';

const inputSchema = z
  .object({
    view: z
      .enum(['all', 'due_for_review'])
      .optional()
      .describe('Project view: all (default) or due_for_review.'),
    status: z
      .array(z.enum(['Active', 'OnHold', 'Done', 'Dropped']))
      .optional()
      .describe('Project statuses to include (all view only).'),
    folderName: z
      .string()
      .min(1)
      .optional()
      .describe('Folder-name filter (all view only).'),
    includeReviewData: z
      .boolean()
      .optional()
      .describe('Include review fields (default: true; all view only).'),
    includeOnHold: z
      .boolean()
      .optional()
      .describe('Include on-hold projects (due_for_review view only).'),
  })
  .strict();

export const inputShape = inputSchema.shape;

export const schema = inputSchema.superRefine((args, ctx) => {
  const view = args.view ?? 'all';
  const invalidFields =
    view === 'all'
      ? (['includeOnHold'] as const)
      : (['status', 'folderName', 'includeReviewData'] as const);
  for (const field of invalidFields) {
    if (args[field] !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${field} is not valid when view is ${view}`,
      });
    }
  }
});

interface ProjectDependencies {
  getProjects: typeof getProjects;
  getProjectsDueForReview: typeof getProjectsDueForReview;
}

const defaultDependencies: ProjectDependencies = {
  getProjects,
  getProjectsDueForReview,
};

function validationError(error: z.ZodError) {
  return {
    content: [
      {
        type: 'text' as const,
        text: `Invalid get_projects arguments: ${error.issues
          .map((issue) => issue.message)
          .join('; ')}`,
      },
    ],
    isError: true,
  };
}

export function createHandler(dependencies: ProjectDependencies) {
  return async (rawArgs: z.input<typeof inputSchema>, _extra: ToolHandlerExtra) => {
    const parsed = schema.safeParse(rawArgs);
    if (!parsed.success) return validationError(parsed.error);
    const args = parsed.data;
    const view = args.view ?? 'all';

    try {
      const result =
        view === 'due_for_review'
          ? await dependencies.getProjectsDueForReview({
              includeOnHold: args.includeOnHold ?? false,
            })
          : await dependencies.getProjects({
              status: args.status,
              folderName: args.folderName,
              includeReviewData: args.includeReviewData !== false,
            });
      return { content: [{ type: 'text' as const, text: result }] };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error getting projects (${view}): ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  };
}

export const handler = createHandler(defaultDependencies);
