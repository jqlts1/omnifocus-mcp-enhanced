import { z } from 'zod';
import { getInboxTasks } from '../primitives/getInboxTasks.js';
import { getFlaggedTasks } from '../primitives/getFlaggedTasks.js';
import { getForecastTasks } from '../primitives/getForecastTasks.js';
import { getTasksByTag } from '../primitives/getTasksByTag.js';
import { getCustomPerspectiveTasks } from '../primitives/getCustomPerspectiveTasks.js';
import { resolveCustomPerspectiveDisplayMode } from './getCustomPerspectiveTasks.js';
import type { ToolHandlerExtra } from './toolHandler.js';

export const schema = z.object({
  source: z
    .enum(['inbox', 'flagged', 'forecast', 'tag', 'custom'])
    .describe(
      'Which task view to read: inbox, flagged, forecast (upcoming), tag (by tag name), or custom (OmniFocus custom perspective)',
    ),
  tagName: z
    .string()
    .optional()
    .describe(
      'Tag name to filter by (required when source is "tag"). Partial match by default.',
    ),
  perspectiveName: z
    .string()
    .optional()
    .describe(
      'Exact name of an OmniFocus custom perspective (required when source is custom). E.g. 今日工作安排, 今日复盘.',
    ),
  days: z
    .number()
    .min(1)
    .max(30)
    .optional()
    .describe('Forecast lookahead days (default: 7, only used when source is "forecast")'),
  hideCompleted: z
    .boolean()
    .optional()
    .describe('Hide completed tasks (default: true)'),
  projectFilter: z
    .string()
    .optional()
    .describe('Filter by project name (only used when source is "flagged")'),
  exactMatch: z
    .boolean()
    .optional()
    .describe('Require exact tag name match (default: false, only used when source is "tag")'),
  showSubtasks: z
    .boolean()
    .optional()
    .describe("Expand each matching task's subtask tree (default: false)"),
  maxSubtaskDepth: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Maximum subtask levels to expand; omitted means unlimited'),
  displayMode: z
    .enum(['project_tree', 'task_tree', 'flat'])
    .optional()
    .describe(
      'Display mode for custom perspective tasks: project_tree (default), task_tree, or flat',
    ),
  showHierarchy: z
    .boolean()
    .optional()
    .describe(
      'Legacy: display tasks in hierarchical tree structure (only when source is custom). Prefer displayMode=task_tree.',
    ),
  groupByProject: z
    .boolean()
    .optional()
    .describe(
      'Legacy: group tasks by project (only when source is custom). Default: true. Prefer displayMode.',
    ),
  includeDeferredOnly: z
    .boolean()
    .optional()
    .describe(
      'Show only deferred tasks becoming available (default: false, only when source is "forecast")',
    ),
  limit: z
    .number()
    .optional()
    .describe(
      'Maximum tasks to return in flat custom perspective mode (default: 1000)',
    ),
});

export async function handler(
  args: z.infer<typeof schema>,
  _extra: ToolHandlerExtra,
) {
  try {
    const hideCompleted = args.hideCompleted !== false;
    const showSubtasks = args.showSubtasks === true;

    let result: string;

    switch (args.source) {
      case 'inbox':
        result = await getInboxTasks({
          hideCompleted,
          showSubtasks,
          maxSubtaskDepth: args.maxSubtaskDepth,
        });
        break;

      case 'flagged':
        result = await getFlaggedTasks({
          hideCompleted,
          projectFilter: args.projectFilter,
          showSubtasks,
          maxSubtaskDepth: args.maxSubtaskDepth,
        });
        break;

      case 'forecast':
        result = await getForecastTasks({
          days: args.days || 7,
          hideCompleted,
          includeDeferredOnly: args.includeDeferredOnly || false,
          showSubtasks,
          maxSubtaskDepth: args.maxSubtaskDepth,
        });
        break;

      case 'tag': {
        if (!args.tagName) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: tagName is required when source is "tag".',
              },
            ],
            isError: true,
          };
        }
        result = await getTasksByTag({
          tagName: args.tagName,
          hideCompleted,
          exactMatch: args.exactMatch || false,
          showSubtasks,
          maxSubtaskDepth: args.maxSubtaskDepth,
        });
        break;
      }

      case 'custom': {
        if (!args.perspectiveName) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: perspectiveName is required when source is "custom".',
              },
            ],
            isError: true,
          };
        }
        result = await getCustomPerspectiveTasks({
          perspectiveName: args.perspectiveName,
          hideCompleted,
          limit: args.limit || 1000,
          displayMode: resolveCustomPerspectiveDisplayMode(args),
          showHierarchy: args.showHierarchy || false,
          groupByProject: args.groupByProject !== false,
        });
        break;
      }
    }

    return {
      content: [{ type: 'text' as const, text: result }],
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting tasks (${args.source}): ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
