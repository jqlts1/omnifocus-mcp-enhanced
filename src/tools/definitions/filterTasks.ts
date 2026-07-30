import { z } from 'zod';
import { filterTasks } from '../primitives/filterTasks.js';
import type { ToolHandlerExtra } from './toolHandler.js';

// 任务状态枚举
const TaskStatusEnum = z.enum([
  'Available',
  'Next',
  'Blocked',
  'DueSoon',
  'Overdue',
  'Completed',
  'Dropped',
]);

// 透视范围枚举
const PerspectiveEnum = z.enum(['inbox', 'flagged', 'all']);

export const schema = z.object({
  // 🎯 任务状态过滤
  taskStatus: z
    .array(TaskStatusEnum)
    .optional()
    .describe('Filter by task status. Can specify multiple statuses'),

  // 📍 透视范围
  perspective: PerspectiveEnum.optional().describe(
    'Limit search to specific perspective: inbox, flagged, all tasks',
  ),

  // 📁 项目/标签过滤
  projectFilter: z
    .string()
    .optional()
    .describe('Filter by project name (partial match)'),
  tagFilter: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Filter by tag name(s). Can be single tag or array of tags'),
  exactTagMatch: z
    .boolean()
    .optional()
    .describe(
      'Set to true for exact tag name match, false for partial (default: false)',
    ),

  // 📅 截止日期过滤
  dueBefore: z
    .string()
    .optional()
    .describe(
      'Show tasks due strictly before this date/time (ISO format: YYYY-MM-DD or full ISO)',
    ),
  dueAfter: z
    .string()
    .optional()
    .describe(
      'Show tasks due strictly after this date/time (ISO format: YYYY-MM-DD or full ISO)',
    ),
  dueToday: z.boolean().optional().describe('Show tasks due today'),
  dueThisWeek: z.boolean().optional().describe('Show tasks due this week'),
  dueThisMonth: z.boolean().optional().describe('Show tasks due this month'),
  overdue: z.boolean().optional().describe('Show overdue tasks only'),

  // 🚀 推迟日期过滤
  deferBefore: z
    .string()
    .optional()
    .describe(
      'Show tasks with defer date strictly before this date/time (ISO format: YYYY-MM-DD or full ISO)',
    ),
  deferAfter: z
    .string()
    .optional()
    .describe(
      'Show tasks with defer date strictly after this date/time (ISO format: YYYY-MM-DD or full ISO)',
    ),
  deferToday: z.boolean().optional().describe('Show tasks deferred to today'),
  deferThisWeek: z
    .boolean()
    .optional()
    .describe('Show tasks deferred to this week'),
  deferAvailable: z
    .boolean()
    .optional()
    .describe('Show tasks whose defer date has passed (now available)'),

  // 🗓 计划日期过滤
  plannedBefore: z
    .string()
    .optional()
    .describe(
      'Show tasks planned strictly before this date/time (ISO format: YYYY-MM-DD or full ISO)',
    ),
  plannedAfter: z
    .string()
    .optional()
    .describe(
      'Show tasks planned strictly after this date/time (ISO format: YYYY-MM-DD or full ISO)',
    ),
  plannedToday: z.boolean().optional().describe('Show tasks planned for today'),
  plannedThisWeek: z
    .boolean()
    .optional()
    .describe('Show tasks planned for this week'),
  plannedThisMonth: z
    .boolean()
    .optional()
    .describe('Show tasks planned for this month'),

  // ✅ 完成日期过滤
  completedBefore: z
    .string()
    .optional()
    .describe(
      'Show tasks completed strictly before this date/time (ISO format: YYYY-MM-DD or full ISO)',
    ),
  completedAfter: z
    .string()
    .optional()
    .describe(
      'Show tasks completed strictly after this date/time (ISO format: YYYY-MM-DD or full ISO)',
    ),
  completedToday: z.boolean().optional().describe('Show tasks completed today'),
  completedThisWeek: z
    .boolean()
    .optional()
    .describe('Show tasks completed this week'),
  completedThisMonth: z
    .boolean()
    .optional()
    .describe('Show tasks completed this month'),

  // 🆕 创建日期过滤
  createdBefore: z
    .string()
    .optional()
    .describe(
      'Show tasks created strictly before this date/time (ISO format: YYYY-MM-DD or full ISO)',
    ),
  createdAfter: z
    .string()
    .optional()
    .describe(
      'Show tasks created strictly after this date/time (ISO format: YYYY-MM-DD or full ISO)',
    ),

  // 🔄 修改日期过滤
  modifiedBefore: z
    .string()
    .optional()
    .describe(
      'Show tasks last modified strictly before this date/time (ISO format: YYYY-MM-DD or full ISO)',
    ),
  modifiedAfter: z
    .string()
    .optional()
    .describe(
      'Show tasks last modified strictly after this date/time (ISO format: YYYY-MM-DD or full ISO)',
    ),

  // 🚩 其他维度
  flagged: z.boolean().optional().describe('Filter by flagged status'),
  searchText: z.string().optional().describe('Search in task names and notes'),
  hasEstimate: z
    .boolean()
    .optional()
    .describe('Filter tasks that have time estimates'),
  estimateMin: z.number().optional().describe('Minimum estimated minutes'),
  estimateMax: z.number().optional().describe('Maximum estimated minutes'),
  hasNote: z.boolean().optional().describe('Filter tasks that have notes'),
  inInbox: z.boolean().optional().describe('Filter tasks in inbox'),

  // 📊 输出控制
  limit: z
    .number()
    .max(1000)
    .optional()
    .describe('Maximum number of tasks to return (default: 100)'),
  sortBy: z
    .enum([
      'name',
      'dueDate',
      'deferDate',
      'plannedDate',
      'completedDate',
      'createdDate',
      'modifiedDate',
      'flagged',
      'project',
    ])
    .optional()
    .describe('Sort results by field'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .describe('Sort order (default: asc)'),
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
  outputMode: z
    .enum(['detailed', 'compact'])
    .optional()
    .describe(
      'Output detail: detailed (default) or compact for broad planning queries',
    ),
  cursor: z
    .string()
    .max(2048)
    .optional()
    .describe(
      'Opaque continuation cursor returned by a previous filter_tasks page',
    ),
});

export async function handler(
  args: z.infer<typeof schema>,
  extra: ToolHandlerExtra,
) {
  try {
    const result = await filterTasks(args);

    return {
      content: [
        {
          type: 'text' as const,
          text: result,
        },
      ],
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error filtering tasks: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
