import { z } from 'zod';
import { batchRemoveItems } from '../primitives/batchRemoveItems.js';
import type { ToolHandlerExtra } from './toolHandler.js';

const itemSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .describe('Stable ID of the task or project to remove'),
    itemType: z
      .enum(['task', 'project'])
      .describe("Type of item to remove ('task' or 'project')"),
  })
  .strict();

export const schema = z.object({
  items: z
    .array(itemSchema)
    .min(1)
    .max(100)
    .superRefine((items, context) => {
      const seen = new Set<string>();
      items.forEach((item, index) => {
        const key = `${item.itemType}:${item.id}`;
        if (seen.has(key)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, 'id'],
            message: `Duplicate item: ${key}`,
          });
        }
        seen.add(key);
      });
    })
    .describe(
      'Confirmed tasks or projects to remove. The complete batch is validated before deletion.',
    ),
});

export async function handler(
  args: z.infer<typeof schema>,
  _extra: ToolHandlerExtra,
) {
  try {
    const result = await batchRemoveItems(args.items);
    if (!result.success || !result.results) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to remove batch: ${result.error || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    const details = result.results
      .map((item) => {
        const cascade =
          item.cascadeCount > 0
            ? `; removed ${item.cascadeCount} contained ${item.cascadeCount === 1 ? 'item' : 'items'}`
            : '';
        return `- ✅ ${item.itemType}: "${item.name}" (id: ${item.id}${cascade})`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text' as const,
          text: `✅ Removed and verified ${result.removedCount} items.\n\n${details}`,
        },
      ],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error processing batch removal: ${message}`,
        },
      ],
      isError: true,
    };
  }
}
