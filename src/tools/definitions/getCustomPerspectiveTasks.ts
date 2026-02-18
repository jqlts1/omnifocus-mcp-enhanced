import { z } from 'zod';
import { getCustomPerspectiveTasks } from '../primitives/getCustomPerspectiveTasks.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { PerspectiveDisplayMode } from '../primitives/perspectiveTaskTree.js';

export const schema = z.object({
  perspectiveName: z.string().describe("Exact name of the OmniFocus custom perspective (e.g., '今日工作安排', '今日复盘', '本周项目'). This is NOT a tag name."),
  hideCompleted: z.boolean().optional().describe("Whether to hide completed tasks. Set to false to show all tasks including completed ones (default: true)"),
  limit: z.number().optional().describe("Maximum number of tasks to return in flat view mode (default: 1000, ignored in hierarchy mode)"),
  displayMode: z.enum(['project_tree', 'task_tree', 'flat']).optional().describe("Display mode for perspective tasks: project_tree (group by project + task hierarchy), task_tree (global task hierarchy), or flat (simple list). Default: project_tree"),
  showHierarchy: z.boolean().optional().describe("Display tasks in hierarchical tree structure showing parent-child relationships. Use this when user wants '层级显示' or 'tree view' (default: false)"),
  groupByProject: z.boolean().optional().describe("Legacy parameter. Group tasks by project when displayMode is not provided. Default: true")
});

export function resolveCustomPerspectiveDisplayMode(args: Partial<z.infer<typeof schema>>): PerspectiveDisplayMode {
  if (args.displayMode) {
    return args.displayMode;
  }

  if (args.showHierarchy) {
    return 'task_tree';
  }

  if (args.groupByProject === false) {
    return 'flat';
  }

  return 'project_tree';
}

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    const result = await getCustomPerspectiveTasks({
      perspectiveName: args.perspectiveName,
      hideCompleted: args.hideCompleted !== false, // Default to true
      limit: args.limit || 1000,
      displayMode: resolveCustomPerspectiveDisplayMode(args),
      showHierarchy: args.showHierarchy || false, // Default to false
      groupByProject: args.groupByProject !== false // Default to true
    });

    return {
      content: [{
        type: "text" as const,
        text: result
      }]
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      content: [{
        type: "text" as const,
        text: `Error getting custom perspective tasks: ${errorMessage}`
      }],
      isError: true
    };
  }
}
