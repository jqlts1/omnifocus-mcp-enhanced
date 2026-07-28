import { z } from 'zod';
import type { ToolHandlerExtra } from './toolHandler.js';
import { markProjectsReviewed } from '../primitives/markProjectsReviewed.js';

export const schema = z
  .object({
    projectIds: z
      .array(z.string().min(1))
      .min(1)
      .max(100)
      .superRefine((ids, context) => {
        const seen = new Set<string>();
        ids.forEach((id, index) => {
          if (seen.has(id)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [index],
              message: `Duplicate project ID: ${id}`,
            });
          }
          seen.add(id);
        });
      })
      .describe(
        'Stable IDs of projects the user explicitly confirmed as reviewed.',
      ),
  })
  .strict();

export async function handler(
  args: z.infer<typeof schema>,
  extra: ToolHandlerExtra,
) {
  try {
    const result = await markProjectsReviewed(args.projectIds);
    if (!result.success || !result.projects) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to mark projects reviewed: ${result.error || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    const lines = result.projects.map(
      (project) =>
        `- ${project.name} (${project.id}): next review ${new Date(project.nextReviewDate).toLocaleDateString()}`,
    );
    return {
      content: [
        {
          type: 'text' as const,
          text: `Marked and verified ${result.count || result.projects.length} project(s) reviewed.\n\n${lines.join('\n')}`,
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error marking projects reviewed: ${message}`,
        },
      ],
      isError: true,
    };
  }
}
